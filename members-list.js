/* ========================================
   PHOTON CORE — members-list.js
   Authorized Members Email List
======================================== */

/**
 * Authorized member emails
 * Add team member emails here
 */
const AUTHORIZED_EMAILS = [
    // Photon Studios Core Team
    'photonstudios.org@gmail.com',
    
    
    // Add your team members' emails below
    'member1@example.com',
    'member2@example.com',
    'youremail@gmail.com',
    
    // Example domains - you can add whole domains too
    // We'll handle domain matching separately
];

/**
 * Authorized email domains (optional)
 * Anyone with these domains can sign in
 */
const AUTHORIZED_DOMAINS = [
    // 'photonstudios.com',  // Uncomment to allow all @photonstudios.com emails
];

/**
 * Check if an email is authorized
 * @param {string} email - Email to check
 * @returns {boolean} - True if authorized
 */
function isEmailAuthorized(email) {
    if (!email) return false;
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check exact email match
    if (AUTHORIZED_EMAILS.some(e => e.toLowerCase() === normalizedEmail)) {
        return true;
    }
    
    // Check domain match
    const domain = normalizedEmail.split('@')[1];
    if (domain && AUTHORIZED_DOMAINS.some(d => d.toLowerCase() === domain)) {
        return true;
    }
    
    return false;
}

/**
 * Get authorization error message
 * @param {string} email - Email that was rejected
 * @returns {string} - Error message
 */
function getAuthorizationErrorMessage(email) {
    return `Access denied. The email "${email}" is not authorized to access Photon Core. Please contact your team administrator.`;
}

// Export functions
window.AUTHORIZED_EMAILS = AUTHORIZED_EMAILS;
window.AUTHORIZED_DOMAINS = AUTHORIZED_DOMAINS;
window.isEmailAuthorized = isEmailAuthorized;
window.getAuthorizationErrorMessage = getAuthorizationErrorMessage;

console.log('✓ Members list loaded:', AUTHORIZED_EMAILS.length, 'authorized emails');
