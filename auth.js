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
 * Wait for Firebase to be ready
 */
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // Increased attempts
        
        const checkFirebase = () => {
            attempts++;
            
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                if (attempts >= maxAttempts) {
                    reject(new Error('Firebase SDK not loaded'));
                    return;
                }
                setTimeout(checkFirebase, 100);
                return;
            }
            
            // Try to initialize Firebase if not done
            if (typeof initFirebase === 'function' && !window.auth) {
                initFirebase();
            }
            
            // Check if all services are ready
            if (window.auth && window.db && window.rtdb) {
                console.log('✓ All Firebase services ready');
                resolve();
            } else if (attempts >= maxAttempts) {
                // List which services failed
                console.error('Firebase services status:', {
                    auth: !!window.auth,
                    db: !!window.db,
                    rtdb: !!window.rtdb,
                    storage: !!window.storage
                });
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
        // Don't redirect here - let secret-verify.js handle it
        // window.location.href = 'dashboard.html';
        return;
    }
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
            btn.innerHTML = `
                <svg class="spinner" viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width: 20px; height: 20px;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
                </svg>
                Signing in...
            `;
        }
        
        showAuthError('');
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        console.log('Starting Google sign-in...');
        const result = await auth.signInWithPopup(provider);
        console.log('Google sign-in successful:', result.user.email);
        
        await createUserDocument(result.user);
    } catch (e) {
        console.error('Google sign-in error:', e);
        showAuthError(getAuthErrorMessage(e.code));
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
            `;
        }
    }
}

/**
 * Sign in with Email/Password
 */
async function handleEmailSignIn(email, password) {
    try {
        showAuthError('');
        console.log('Attempting email sign-in for:', email);
        await auth.signInWithEmailAndPassword(email, password);
        console.log('Email sign-in successful');
    } catch (e) {
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
        console.log('Attempting sign-up for:', email);
        
        const result = await auth.createUserWithEmailAndPassword(email, password);
        console.log('Account created successfully');
        
        if (displayName && result.user) {
            await result.user.updateProfile({ displayName });
            console.log('Display name updated');
        }
        
        await createUserDocument(result.user, displayName);
        console.log('User document created');
    } catch (e) {
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
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: displayName || user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                role: 'Member',
                status: 'Active',
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            await userRef.set(userData);
            console.log('User document created:', userData);
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
 * Toggle between sign-in and sign-up modes
 */
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    
    const usernameField = document.getElementById('auth-username');
    const submitBtn = document.getElementById('btn-email-auth');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    const passwordField = document.getElementById('auth-password');
    
    if (isSignUpMode) {
        if (usernameField) usernameField.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'Sign Up';
        if (toggleText) toggleText.textContent = 'Already have an account?';
        if (toggleLink) toggleLink.textContent = 'Sign In';
        if (passwordField) passwordField.setAttribute('minlength', '6');
    } else {
        if (usernameField) usernameField.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'Sign In';
        if (toggleText) toggleText.textContent = "Don't have an account?";
        if (toggleLink) toggleLink.textContent = 'Sign Up';
        if (passwordField) passwordField.removeAttribute('minlength');
    }
    
    showAuthError('');
};

/**
 * Show auth error message
 */
function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message || '';
        if (message) {
            errorEl.style.animation = 'shake 0.5s ease';
            setTimeout(() => errorEl.style.animation = '', 500);
        }
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
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/cancelled-popup-request': 'Sign-in cancelled.',
        'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled.',
        'auth/unauthorized-domain': 'This domain is not authorized for sign-in.'
    };
    return messages[code] || `Authentication failed (${code || 'unknown error'}). Please try again.`;
}

/**
 * Called when user is authenticated and on app page
 */
async function onAppPageReady(firebaseUser) {
    try {
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
        
        // Update UI
        if (dom.userName) dom.userName.textContent = displayName;
        if (dom.userAvatar) {
            if (state.user.photoURL) {
                dom.userAvatar.innerHTML = `<img src="${state.user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                dom.userAvatar.textContent = displayName.substring(0, 2).toUpperCase();
            }
        }
        if (dom.welcomeName) dom.welcomeName.textContent = displayName;
        
        // For new AI page
        const sidebarAvatar = document.getElementById('user-avatar');
        const sidebarName = document.getElementById('user-name');
        if (sidebarAvatar && state.user.photoURL) {
            sidebarAvatar.innerHTML = `<img src="${state.user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else if (sidebarAvatar) {
            sidebarAvatar.textContent = displayName.substring(0, 2).toUpperCase();
        }
        if (sidebarName) sidebarName.textContent = displayName;
        
        // Show app, hide auth
        const appEl = document.getElementById('app');
        const authEl = document.getElementById('auth-screen');
        if (appEl) appEl.classList.remove('hidden');
        if (authEl) authEl.classList.add('hidden');
        
        // Welcome toast
        const justSignedIn = sessionStorage.getItem('photon_just_signed_in');
        if (justSignedIn && typeof showToast === 'function') {
            showToast('Welcome, ' + displayName + '! ⚡', 'success');
            sessionStorage.removeItem('photon_just_signed_in');
        }
        
        // Initialize app data
        await initAppData();
        
    } catch (error) {
        console.error('Error in onAppPageReady:', error);
    }
}

/**
 * Initialize app data after auth
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
 * Setup auth event listeners
 */
function setupAuthListeners() {
    console.log('Setting up auth listeners...');
    
    // Google sign-in button
    const googleBtn = document.getElementById('btn-google-signin');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Google button clicked');
            handleGoogleSignIn();
        });
        console.log('Google sign-in listener attached');
    }
    
    // Email/password form
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted');
            
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
    
    // Sign out button
    const signOutBtn = document.getElementById('btn-sign-out');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
}

// Make functions globally accessible
window.initAuth = initAuth;
window.handleSignOut = handleSignOut;
window.handleGoogleSignIn = handleGoogleSignIn;
window.setupAuthListeners = setupAuthListeners;

console.log('✓ Auth.js loaded');
