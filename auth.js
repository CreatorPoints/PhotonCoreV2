/* ========================================
   PHOTON CORE — auth.js
   Firebase Authentication
   ======================================== */

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const isAuthPage = (currentPage === 'index.html' || currentPage === '');
const appPages = ['dashboard.html', 'discussions.html', 'files.html', 'ai.html', 'members.html'];
const isAppPage = appPages.includes(currentPage);

let isSignUpMode = false;

/**
 * Wait for Firebase to be ready
 */
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100;
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase === 'undefined') {
                if (attempts >= maxAttempts) {
                    reject(new Error('Firebase SDK not loaded'));
                    return;
                }
                setTimeout(checkFirebase, 100);
                return;
            }
            
            if (typeof initFirebase === 'function' && !window.auth) {
                initFirebase();
            }
            
            if (window.auth && window.db && window.rtdb) {
                console.log('✓ All Firebase services ready');
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Firebase services failed to initialize'));
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        
        checkFirebase();
    });
}

/**
 * Initialize Firebase Auth listener
 */
async function initAuth() {
    try {
        await waitForFirebase();
        console.log('Firebase ready, initializing auth...');
        
        auth.onAuthStateChanged(async (user) => {
            console.log('Auth state changed:', user ? user.email : 'signed out');
            
            if (user) {
                if (isAuthPage) {
                    sessionStorage.setItem('photon_just_signed_in', 'true');
                    return;
                }
                await onAppPageReady(user);
            } else {
                if (isAppPage) {
                    window.location.href = 'index.html';
                    return;
                }
                const authScreen = document.getElementById('auth-screen');
                if (authScreen) authScreen.classList.remove('hidden');
            }
        });
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        showAuthError('Failed to connect. Please refresh the page.');
    }
}

/**
 * Sign in with Google
 */
async function handleGoogleSignIn() {
    const btn = document.getElementById('btn-google-signin');
    
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<div class="spinner"></div> Signing in...`;
        }
        
        showAuthError('');
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        console.log('Starting Google sign-in...');
        const result = await auth.signInWithPopup(provider);
        console.log('Google sign-in successful:', result.user.email);
        
        // Check authorization (uses function from members-list.js or auth-guard.js)
        if (typeof checkEmailAuthorization === 'function') {
            const isAuthorized = await checkEmailAuthorization(result.user);
            if (!isAuthorized) {
                resetGoogleButton(btn);
                return;
            }
        } else if (typeof isEmailAuthorized === 'function') {
            if (!isEmailAuthorized(result.user.email)) {
                showAuthError('Access denied. Email not authorized.');
                await auth.signOut();
                resetGoogleButton(btn);
                return;
            }
        }
        
        await createUserDocument(result.user);
    } catch (e) {
        console.error('Google sign-in error:', e);
        showAuthError(getAuthErrorMessage(e.code));
        resetGoogleButton(btn);
    }
}

function resetGoogleButton(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
            <span class="google-icon" aria-hidden="true">G</span>
            Sign in with Google
        `;
    }
}

/**
 * Sign in with Email/Password
 */
async function handleEmailSignIn(email, password) {
    try {
        showAuthError('');
        console.log('Attempting email sign-in for:', email);
        
        // Check authorization before sign-in
        if (typeof isEmailAuthorized === 'function' && !isEmailAuthorized(email)) {
            const msg = typeof getAuthorizationErrorMessage === 'function' 
                ? getAuthorizationErrorMessage(email) 
                : 'Access denied. Email not authorized.';
            showAuthError(msg);
            throw new Error('UNAUTHORIZED_EMAIL');
        }
        
        await auth.signInWithEmailAndPassword(email, password);
        console.log('Email sign-in successful');
        
    } catch (e) {
        if (e.message === 'UNAUTHORIZED_EMAIL') throw e;
        console.error('Email sign-in error:', e);
        showAuthError(getAuthErrorMessage(e.code));
        throw e;
    }
}

/**
 * Sign up with Email/Password
 */
async function handleEmailSignUp(email, password, displayName) {
    try {
        showAuthError('');
        
        // Check authorization before creating account
        if (typeof isEmailAuthorized === 'function' && !isEmailAuthorized(email)) {
            const msg = typeof getAuthorizationErrorMessage === 'function' 
                ? getAuthorizationErrorMessage(email) 
                : 'Access denied. Email not authorized.';
            showAuthError(msg);
            throw new Error('UNAUTHORIZED_EMAIL');
        }
        
        console.log('Attempting sign-up for:', email);
        
        const result = await auth.createUserWithEmailAndPassword(email, password);
        console.log('Account created successfully');
        
        if (displayName && result.user) {
            await result.user.updateProfile({ displayName });
        }
        
        await createUserDocument(result.user, displayName);
    } catch (e) {
        if (e.message === 'UNAUTHORIZED_EMAIL') throw e;
        console.error('Sign-up error:', e);
        showAuthError(getAuthErrorMessage(e.code));
        throw e;
    }
}

/**
 * Create user document in Firestore
 */
async function createUserDocument(user, displayName) {
    if (!user) return;
    
    try {
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
        } else {
            await userRef.update({ lastSeen: new Date().toISOString() });
        }
    } catch (e) {
        console.error('Error creating user document:', e);
    }
}

/**
 * Sign out
 */
async function handleSignOut() {
    try {
        if (state.user && typeof rtdb !== 'undefined') {
            await rtdb.ref('presence/' + state.user.uid).remove();
        }
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (e) {
        console.error('Sign-out error:', e);
        if (typeof showToast === 'function') {
            showToast('Sign out failed.', 'error');
        }
    }
}

/**
 * Toggle auth mode
 */
window.toggleAuthMode = function() {
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
    
    showAuthError('');
};

/**
 * Show auth error
 */
function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message || '';
        if (message) {
            errorEl.classList.add('shake');
            setTimeout(() => errorEl.classList.remove('shake'), 500);
        }
    }
}

/**
 * Get error message
 */
function getAuthErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'Email already in use.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/popup-blocked': 'Sign-in popup was blocked.',
        'auth/network-request-failed': 'Network error.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password.'
    };
    return messages[code] || 'Authentication failed. Please try again.';
}

/**
 * Called when user is authenticated on app page
 */
async function onAppPageReady(firebaseUser) {
    try {
        // Verify authorization
        if (typeof isEmailAuthorized === 'function' && !isEmailAuthorized(firebaseUser.email)) {
            console.warn('User not authorized, signing out');
            await auth.signOut();
            window.location.href = 'index.html';
            return;
        }
        
        const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
        let userData;
        
        if (userDoc.exists) {
            userData = userDoc.data();
            await db.collection('users').doc(firebaseUser.uid).update({
                lastSeen: new Date().toISOString()
            });
        } else {
            await createUserDocument(firebaseUser);
            const newDoc = await db.collection('users').doc(firebaseUser.uid).get();
            userData = newDoc.data();
        }
        
        state.user = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: userData?.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
            displayName: userData?.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL || userData?.photoURL,
            role: userData?.role || 'Member',
            status: userData?.status || 'Active'
        };
        
        console.log('User state set:', state.user);
        
        const displayName = state.user.username;
        
        // Update UI elements
        if (dom.userName) dom.userName.textContent = displayName;
        if (dom.userAvatar) {
            if (state.user.photoURL) {
                dom.userAvatar.innerHTML = `<img src="${state.user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                dom.userAvatar.textContent = displayName.substring(0, 2).toUpperCase();
            }
        }
        if (dom.welcomeName) dom.welcomeName.textContent = displayName;
        
        const sidebarAvatar = document.getElementById('user-avatar');
        const sidebarName = document.getElementById('user-name');
        if (sidebarAvatar) {
            if (state.user.photoURL) {
                sidebarAvatar.innerHTML = `<img src="${state.user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                sidebarAvatar.textContent = displayName.substring(0, 2).toUpperCase();
            }
        }
        if (sidebarName) sidebarName.textContent = displayName;
        
        const appEl = document.getElementById('app');
        const authEl = document.getElementById('auth-screen');
        if (appEl) appEl.classList.remove('hidden');
        if (authEl) authEl.classList.add('hidden');
        
        const justSignedIn = sessionStorage.getItem('photon_just_signed_in');
        if (justSignedIn && typeof showToast === 'function') {
            showToast('Welcome, ' + displayName + '! ⚡', 'success');
            sessionStorage.removeItem('photon_just_signed_in');
        }
        
        await initAppData();
        
    } catch (error) {
        console.error('Error in onAppPageReady:', error);
    }
}

/**
 * Initialize app data
 */
async function initAppData() {
    state.filesReady = true;
    
    if (typeof loadSavedModel === 'function') loadSavedModel();
    if (typeof setupPresence === 'function') setupPresence();
    if (typeof listenDiscussions === 'function') listenDiscussions();
    if (typeof listenMemories === 'function') listenMemories();
    if (typeof listenActivity === 'function') listenActivity();
    if (typeof listenChatSessions === 'function') listenChatSessions();
    if (typeof loadFiles === 'function') loadFiles();
    if (typeof loadProfile === 'function') loadProfile();
    if (typeof setupPresenceListener === 'function') setupPresenceListener();
    if (typeof loadTipState === 'function') loadTipState();
    
    console.log('App data initialization complete');
}

/**
 * Setup auth listeners
 */
function setupAuthListeners() {
    console.log('Setting up auth listeners...');
    
    const googleBtn = document.getElementById('btn-google-signin');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleGoogleSignIn();
        });
        console.log('Google sign-in listener attached');
    }
    
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
            
            if (isSignUpMode && !username) {
                showAuthError('Please enter a display name.');
                return;
            }
            
            const submitBtn = document.getElementById('btn-email-auth');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isSignUpMode ? 'Creating account...' : 'Signing in...';
            }
            
            try {
                if (isSignUpMode) {
                    await handleEmailSignUp(email, password, username);
                } else {
                    await handleEmailSignIn(email, password);
                }
            } catch (error) {
                // Error already shown
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
            }
        });
        console.log('Auth form listener attached');
    }
    
    const signOutBtn = document.getElementById('btn-sign-out');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
}

window.initAuth = initAuth;
window.handleSignOut = handleSignOut;
window.handleGoogleSignIn = handleGoogleSignIn;
window.setupAuthListeners = setupAuthListeners;

console.log('✓ Auth.js loaded');
