/* ========================================
   PHOTON CORE — auth.js
   Firebase Authentication
   ======================================== */

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const isAuthPage = (currentPage === 'index.html' || currentPage === '');
const appPages = ['dashboard.html', 'discussions.html', 'files.html', 'ai.html', 'members.html'];
const isAppPage = appPages.includes(currentPage);

// Auth mode state
let isSignUpMode = false;

/**
 * Initialize Firebase Auth listener
 */
function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            if (isAuthPage) {
                window.location.href = 'dashboard.html';
                return;
            }
            await onAppPageReady(user);
        } else {
            // User is signed out
            if (isAppPage) {
                window.location.href = 'index.html';
                return;
            }
            // Show auth screen
            if (dom.authScreen) dom.authScreen.classList.remove('hidden');
        }
    });
}

/**
 * Sign in with Google
 */
async function handleGoogleSignIn() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        // Auth state listener will handle redirect
    } catch (e) {
        console.error('Google sign-in error:', e);
        showAuthError(getAuthErrorMessage(e.code));
    }
}

/**
 * Sign in with Email/Password
 */
async function handleEmailSignIn(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Auth state listener will handle redirect
    } catch (e) {
        console.error('Email sign-in error:', e);
        showAuthError(getAuthErrorMessage(e.code));
    }
}

/**
 * Sign up with Email/Password
 */
async function handleEmailSignUp(email, password, displayName) {
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update display name
        if (displayName && result.user) {
            await result.user.updateProfile({ displayName });
        }
        
        // Create user document in Firestore
        await createUserDocument(result.user, displayName);
        
        // Auth state listener will handle redirect
    } catch (e) {
        console.error('Sign-up error:', e);
        showAuthError(getAuthErrorMessage(e.code));
    }
}

/**
 * Create user document in Firestore
 */
async function createUserDocument(user, displayName) {
    if (!user) return;
    
    const userRef = db.collection('users').doc(user.uid);
    const snapshot = await userRef.get();
    
    if (!snapshot.exists) {
        await userRef.set({
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null,
            role: 'Member',
            status: 'Active',
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        });
    }
}

/**
 * Sign out
 */
async function handleSignOut() {
    try {
        // Clean up presence before signing out
        if (state.user) {
            await rtdb.ref('presence/' + state.user.uid).remove();
        }
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (e) {
        console.error('Sign-out error:', e);
        showToast('Sign out failed.', 'error');
    }
}

/**
 * Toggle between sign-in and sign-up modes
 */
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    
    const usernameField = document.getElementById('auth-username');
    const submitBtn = document.getElementById('btn-email-auth');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    
    if (isSignUpMode) {
        if (usernameField) usernameField.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'Sign Up';
        if (toggleText) toggleText.textContent = 'Already have an account?';
        if (toggleLink) toggleLink.textContent = 'Sign In';
    } else {
        if (usernameField) usernameField.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'Sign In';
        if (toggleText) toggleText.textContent = "Don't have an account?";
        if (toggleLink) toggleLink.textContent = 'Sign Up';
    }
    
    // Clear error
    showAuthError('');
}

/**
 * Show auth error message
 */
function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message;
    }
}

/**
 * Get user-friendly error message
 */
function getAuthErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'Email already in use.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/popup-closed-by-user': 'Sign-in cancelled.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password.'
    };
    return messages[code] || 'Authentication failed. Please try again.';
}

/**
 * Called when user is authenticated and on app page
 */
async function onAppPageReady(firebaseUser) {
    // Get or create user document
    const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
    let userData;
    
    if (userDoc.exists) {
        userData = userDoc.data();
        // Update last seen
        await db.collection('users').doc(firebaseUser.uid).update({
            lastSeen: new Date().toISOString()
        });
    } else {
        // Create new user document
        await createUserDocument(firebaseUser);
        const newDoc = await db.collection('users').doc(firebaseUser.uid).get();
        userData = newDoc.data();
    }
    
    // Set state.user with combined data
    state.user = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        username: userData?.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
        displayName: userData?.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
        photoURL: firebaseUser.photoURL || userData?.photoURL,
        role: userData?.role || 'Member',
        status: userData?.status || 'Active'
    };
    
    // Update UI
    const displayName = state.user.username;
    if (dom.userName) dom.userName.textContent = displayName;
    if (dom.userAvatar) {
        if (state.user.photoURL) {
            dom.userAvatar.innerHTML = `<img src="${state.user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            dom.userAvatar.textContent = displayName.substring(0, 2).toUpperCase();
        }
    }
    if (dom.welcomeName) dom.welcomeName.textContent = displayName;
    if (dom.app) dom.app.classList.remove('hidden');
    if (dom.authScreen) dom.authScreen.classList.add('hidden');
    
    // Check for first-time sign in
    const justSignedIn = sessionStorage.getItem('photon_just_signed_in');
    if (justSignedIn) {
        showToast('Welcome, ' + displayName + '! ⚡', 'success');
        sessionStorage.removeItem('photon_just_signed_in');
    }
    
    // Initialize app data
    await initAppData();
}

/**
 * Initialize app data after auth
 */
async function initAppData() {
    state.filesReady = true;
    loadSavedModel();
    setupPresence();
    listenDiscussions();
    listenMemories();
    listenActivity();
    listenChatSessions();
    loadFiles();
    loadProfile();
    setupPresenceListener();
    loadTipState();
}

/**
 * Setup auth event listeners
 */
function setupAuthListeners() {
    // Google sign-in button
    const googleBtn = document.getElementById('btn-google-signin');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleSignIn);
    }
    
    // Email/password form
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('auth-email')?.value?.trim();
            const password = document.getElementById('auth-password')?.value;
            const username = document.getElementById('auth-username')?.value?.trim();
            
            if (!email || !password) {
                showAuthError('Please fill in all fields.');
                return;
            }
            
            // Disable button during auth
            const submitBtn = document.getElementById('btn-email-auth');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isSignUpMode ? 'Creating account...' : 'Signing in...';
            }
            
            if (isSignUpMode) {
                await handleEmailSignUp(email, password, username);
            } else {
                await handleEmailSignIn(email, password);
            }
            
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
            }
        });
    }
    
    // Sign out button
    if (dom.btnSignOut) {
        dom.btnSignOut.addEventListener('click', handleSignOut);
    }
}
