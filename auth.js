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
        const maxAttempts = 50;
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                typeof auth !== 'undefined' && 
                typeof db !== 'undefined' &&
                typeof state !== 'undefined') {
                console.log('✓ Firebase and state ready');
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Firebase failed to load'));
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        
        checkFirebase();
    });
}

// ... rest of auth.js stays the same ...
