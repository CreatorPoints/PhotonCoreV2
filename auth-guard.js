/* ========================================
   PHOTON CORE — auth-guard.js
   Email Authorization Guard
======================================== */

/**
 * Check if user email is authorized before completing sign-in
 * @param {Object} user - Firebase user object
 * @returns {Promise<boolean>} - True if authorized
 */
async function checkEmailAuthorization(user) {
    if (!user || !user.email) {
        console.error('No user or email provided');
        return false;
    }

    const email = user.email.toLowerCase().trim();
    
    console.log('Checking authorization for:', email);

    // Check against members list
    if (typeof isEmailAuthorized === 'function') {
        const isAuthorized = isEmailAuthorized(email);
        
        if (!isAuthorized) {
            console.warn('❌ Unauthorized email:', email);
            
            // Sign out the user immediately
            try {
                await auth.signOut();
            } catch (e) {
                console.error('Error signing out unauthorized user:', e);
            }
            
            // Show error message
            if (typeof getAuthorizationErrorMessage === 'function') {
                showAuthError(getAuthorizationErrorMessage(email));
            } else {
                showAuthError(`Access denied. Email "${email}" is not authorized.`);
            }
            
            // Log unauthorized attempt to Firestore
            await logUnauthorizedAttempt(email, user.uid);
            
            return false;
        }
        
        console.log('✓ Email authorized:', email);
        return true;
    } else {
        console.warn('⚠️ isEmailAuthorized function not available, allowing access');
        return true; // Fail open if function not available
    }
}

/**
 * Log unauthorized sign-in attempt to Firestore
 * @param {string} email - Email that attempted sign-in
 * @param {string} uid - User ID
 */
async function logUnauthorizedAttempt(email, uid) {
    if (!db) return;
    
    try {
        await db.collection('unauthorizedAttempts').add({
            email: email,
            uid: uid,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: null // You'd need a backend service to get real IP
        });
        console.log('Logged unauthorized attempt');
    } catch (e) {
        console.error('Failed to log unauthorized attempt:', e);
    }
}

/**
 * Check if user document should be created (only for authorized users)
 * @param {Object} user - Firebase user object
 * @returns {Promise<boolean>} - True if should create document
 */
async function shouldCreateUserDocument(user) {
    if (!user) return false;
    
    // First check email authorization
    const isAuthorized = await checkEmailAuthorization(user);
    if (!isAuthorized) {
        return false;
    }
    
    // Check if user document already exists
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        return !doc.exists; // Only create if doesn't exist
    } catch (e) {
        console.error('Error checking user document:', e);
        return false;
    }
}

/**
 * Enhanced user document creation with authorization check
 * @param {Object} user - Firebase user object
 * @param {string} displayName - Display name (optional)
 * @returns {Promise<boolean>} - True if successful
 */
async function createAuthorizedUserDocument(user, displayName) {
    if (!user) return false;
    
    // Verify authorization first
    const isAuthorized = await checkEmailAuthorization(user);
    if (!isAuthorized) {
        return false;
    }
    
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
                authorized: true,
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            
            await userRef.set(userData);
            console.log('✓ Authorized user document created');
            return true;
        } else {
            // Update last seen
            await userRef.update({ 
                lastSeen: new Date().toISOString(),
                authorized: true
            });
            return true;
        }
    } catch (e) {
        console.error('Error creating user document:', e);
        return false;
    }
}

/**
 * Verify existing user authorization on app load
 * @param {Object} user - Firebase user object
 * @returns {Promise<boolean>} - True if authorized
 */
async function verifyExistingUser(user) {
    if (!user) return false;
    
    const isAuthorized = await checkEmailAuthorization(user);
    
    if (!isAuthorized) {
        console.warn('Existing user no longer authorized, signing out');
        try {
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (e) {
            console.error('Error signing out:', e);
        }
        return false;
    }
    
    return true;
}

// Export functions
window.checkEmailAuthorization = checkEmailAuthorization;
window.logUnauthorizedAttempt = logUnauthorizedAttempt;
window.shouldCreateUserDocument = shouldCreateUserDocument;
window.createAuthorizedUserDocument = createAuthorizedUserDocument;
window.verifyExistingUser = verifyExistingUser;

console.log('✓ Auth guard loaded');
