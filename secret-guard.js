/* ========================================
   SECRET GUARD - Protects App Pages
   Add this to ALL app pages (not index.html)
   ======================================== */

(function() {
    const STORAGE_KEY = 'photon_secret_verified';
    
    // Check immediately - before anything renders
    function checkAccess() {
        const isVerified = sessionStorage.getItem(STORAGE_KEY) === 'true';
        
        if (!isVerified) {
            console.log('🚫 Not verified - redirecting to login...');
            
            // Hide the page content immediately
            document.documentElement.style.display = 'none';
            
            // Clear any session data
            sessionStorage.removeItem(STORAGE_KEY);
            
            // Redirect to index for verification
            window.location.replace('index.html');
            return false;
        }
        
        console.log('✓ Secret verified - access granted');
        return true;
    }
    
    // Run check immediately
    if (!checkAccess()) {
        // Stop all other scripts from running
        throw new Error('Access denied - redirecting');
    }
    
    // Also verify on auth state change (in case session expires)
    function setupAuthGuard() {
        if (typeof window.auth !== 'undefined' && window.auth) {
            window.auth.onAuthStateChanged((user) => {
                if (!user) {
                    // User signed out
                    sessionStorage.removeItem(STORAGE_KEY);
                    window.location.replace('index.html');
                }
            });
        } else {
            // Wait for auth to be available
            setTimeout(setupAuthGuard, 100);
        }
    }
    
    // Setup auth guard after DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAuthGuard);
    } else {
        setupAuthGuard();
    }
    
    // Expose for debugging
    window.secretGuard = {
        isVerified: () => sessionStorage.getItem(STORAGE_KEY) === 'true',
        revoke: () => {
            sessionStorage.removeItem(STORAGE_KEY);
            window.location.replace('index.html');
        }
    };
})();
