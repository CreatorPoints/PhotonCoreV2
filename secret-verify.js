/* ========================================
   SECRET KEY VERIFICATION
   ======================================== */

(function() {
    // Check if already verified in this session
    const STORAGE_KEY = 'photon_secret_verified';
    
    // Wait for auth state
    function waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = setInterval(() => {
                if (window.auth) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkAuth);
                resolve();
            }, 10000);
        });
    }

    // Create the modal HTML
    function createSecretModal() {
        const overlay = document.createElement('div');
        overlay.className = 'secret-modal-overlay';
        overlay.id = 'secret-modal-overlay';
        
        overlay.innerHTML = `
            <div class="secret-modal">
                <div class="secret-modal-icon">🔐</div>
                <h2 class="secret-modal-title">Access Code Required</h2>
                <p class="secret-modal-subtitle">
                    Enter the team access code to continue to Photon Core.
                </p>
                
                <div class="secret-user-info" id="secret-user-info" style="display: none;">
                    <div class="secret-user-avatar" id="secret-user-avatar">?</div>
                    <div>
                        <div class="secret-user-name" id="secret-user-name">User</div>
                        <div class="secret-user-email" id="secret-user-email">email@example.com</div>
                    </div>
                </div>
                
                <form id="secret-form">
                    <div class="secret-input-wrapper">
                        <input 
                            type="password" 
                            id="secret-input" 
                            class="secret-input" 
                            placeholder="Enter access code"
                            autocomplete="off"
                            autofocus
                        >
                        <button type="button" class="secret-toggle-btn" id="secret-toggle">
                            👁️
                        </button>
                    </div>
                    
                    <div class="secret-error-msg" id="secret-error"></div>
                    
                    <button type="submit" class="secret-submit-btn" id="secret-submit">
                        <span id="secret-submit-text">Verify & Continue</span>
                    </button>
                </form>
                
                <div class="secret-hint">
                    <span class="secret-hint-icon">💡</span>
                    Contact your team admin if you don't have the access code.
                </div>
                
                <button class="secret-logout-btn" id="secret-logout">
                    🚪 Sign out and try different account
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        return overlay;
    }

    // Show modal with user info
    function showSecretModal(user) {
        let overlay = document.getElementById('secret-modal-overlay');
        if (!overlay) {
            overlay = createSecretModal();
        }
        
        // Update user info
        const userInfo = document.getElementById('secret-user-info');
        const avatar = document.getElementById('secret-user-avatar');
        const name = document.getElementById('secret-user-name');
        const email = document.getElementById('secret-user-email');
        
        if (user && userInfo) {
            userInfo.style.display = 'flex';
            
            if (user.photoURL) {
                avatar.innerHTML = `<img src="${user.photoURL}" alt="avatar">`;
            } else {
                avatar.textContent = (user.displayName || user.email || '?').substring(0, 2).toUpperCase();
            }
            
            name.textContent = user.displayName || user.email?.split('@')[0] || 'User';
            email.textContent = user.email || '';
        }
        
        // Show modal
        setTimeout(() => overlay.classList.add('visible'), 10);
        
        // Setup event listeners
        setupSecretModalEvents();
        
        // Focus input
        setTimeout(() => {
            document.getElementById('secret-input')?.focus();
        }, 300);
    }

    // Hide modal
    function hideSecretModal() {
        const overlay = document.getElementById('secret-modal-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // Setup event listeners
    function setupSecretModalEvents() {
        const form = document.getElementById('secret-form');
        const input = document.getElementById('secret-input');
        const toggle = document.getElementById('secret-toggle');
        const logout = document.getElementById('secret-logout');
        
        // Toggle password visibility
        toggle?.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
                toggle.textContent = '🙈';
            } else {
                input.type = 'password';
                toggle.textContent = '👁️';
            }
        });
        
        // Form submit
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await verifySecret();
        });
        
        // Logout button
        logout?.addEventListener('click', async () => {
            try {
                sessionStorage.removeItem(STORAGE_KEY);
                await window.auth.signOut();
                window.location.href = 'index.html';
            } catch (err) {
                console.error('Logout error:', err);
            }
        });
        
        // Clear error on input
        input?.addEventListener('input', () => {
            input.classList.remove('error');
            document.getElementById('secret-error').textContent = '';
        });
    }

    // Verify the secret
    async function verifySecret() {
        const input = document.getElementById('secret-input');
        const submitBtn = document.getElementById('secret-submit');
        const submitText = document.getElementById('secret-submit-text');
        const errorEl = document.getElementById('secret-error');
        
        const secret = input?.value?.trim();
        
        if (!secret) {
            input.classList.add('error');
            errorEl.textContent = '⚠️ Please enter the access code';
            return;
        }
        
        // Show loading
        submitBtn.disabled = true;
        submitText.innerHTML = '<div class="spinner"></div> Verifying...';
        
        try {
            const response = await fetch('/api/verify-secret', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret })
            });
            
            const data = await response.json();
            
            if (data.valid) {
                // Success!
                input.classList.add('success');
                submitText.textContent = '✓ Verified!';
                
                // Store in session
                sessionStorage.setItem(STORAGE_KEY, 'true');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500);
            } else {
                // Invalid
                input.classList.add('error');
                errorEl.textContent = '❌ Invalid access code. Please try again.';
                submitBtn.disabled = false;
                submitText.textContent = 'Verify & Continue';
                
                // Clear input
                input.value = '';
                input.focus();
            }
        } catch (err) {
            console.error('Verification error:', err);
            errorEl.textContent = '⚠️ Connection error. Please try again.';
            submitBtn.disabled = false;
            submitText.textContent = 'Verify & Continue';
        }
    }

    // Check if already verified
    function isVerified() {
        return sessionStorage.getItem(STORAGE_KEY) === 'true';
    }

    // Main init
    async function initSecretVerification() {
        await waitForAuth();
        
        if (!window.auth) {
            console.warn('Auth not available for secret verification');
            return;
        }
        
        // Listen for auth state
        window.auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in
                if (isVerified()) {
                    // Already verified, proceed to dashboard
                    console.log('✓ Secret already verified');
                    
                    // Only redirect if on index page
                    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                    if (currentPage === 'index.html' || currentPage === '') {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    // Need verification
                    console.log('🔐 Secret verification required');
                    showSecretModal(user);
                }
            }
        });
    }

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSecretVerification);
    } else {
        initSecretVerification();
    }

    // Expose for debugging
    window.secretVerify = {
        show: showSecretModal,
        hide: hideSecretModal,
        isVerified,
        reset: () => sessionStorage.removeItem(STORAGE_KEY)
    };
})();
