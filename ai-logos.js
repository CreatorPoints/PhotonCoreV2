/* ========================================
   AI LOGOS - SVG Logo Definitions
======================================== */

const AI_LOGOS = {
    // Meta (LLaMA)
    meta: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" fill="url(#meta-gradient)"/>
        <path d="M15.5 8C14.5 8 13.6 8.5 12.9 9.3C12.2 8.5 11.3 8 10.3 8C8.5 8 7 9.8 7 12.2C7 14.9 9 17 12 17C15 17 17 14.9 17 12.2C17 9.8 15.5 8 15.5 8ZM12 15.5C10.2 15.5 8.8 14 8.8 12.2C8.8 10.6 9.7 9.5 10.5 9.5C11.1 9.5 11.7 10 12 10.8C12.3 10 12.9 9.5 13.5 9.5C14.3 9.5 15.2 10.6 15.2 12.2C15.2 14 13.8 15.5 12 15.5Z" fill="white"/>
        <defs>
            <linearGradient id="meta-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#0668E1"/>
                <stop offset="1" stop-color="#1877F2"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Google (Gemma)
    google: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
        <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.13 18.63 6.72 16.69 5.84 14.09H2.18V16.94C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
        <path d="M5.84 14.09C5.62 13.43 5.49 12.73 5.49 12C5.49 11.27 5.62 10.57 5.84 9.91V7.06H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.94L5.84 14.09Z" fill="#FBBC05"/>
        <path d="M12 5.38C13.62 5.38 15.06 5.94 16.21 7.02L19.36 3.87C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.06L5.84 9.91C6.72 7.31 9.13 5.38 12 5.38Z" fill="#EA4335"/>
    </svg>`,

    // NVIDIA
    nvidia: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#76B900"/>
        <path d="M9.5 7V17L6 14V10L9.5 7ZM10.5 7L14 10V14L10.5 17V7ZM15 10L18 7V17L15 14V10Z" fill="white"/>
    </svg>`,

    // Mistral AI
    mistral: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#1a1a2e"/>
        <rect x="4" y="5" width="4" height="4" fill="#FF7000"/>
        <rect x="10" y="5" width="4" height="4" fill="#FF7000"/>
        <rect x="16" y="5" width="4" height="4" fill="white"/>
        <rect x="4" y="10" width="4" height="4" fill="#FF7000"/>
        <rect x="10" y="10" width="4" height="4" fill="white"/>
        <rect x="16" y="10" width="4" height="4" fill="#FF7000"/>
        <rect x="4" y="15" width="4" height="4" fill="white"/>
        <rect x="10" y="15" width="4" height="4" fill="#FF7000"/>
        <rect x="16" y="15" width="4" height="4" fill="#FF7000"/>
    </svg>`,

    // OpenAI
    openai: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.2 8.3C21.9 7.2 21.3 6.2 20.5 5.4C19.7 4.6 18.7 4 17.6 3.7C16.5 3.4 15.3 3.3 14.2 3.6C13.4 2.6 12.3 1.9 11.1 1.5C9.9 1.1 8.6 1.1 7.4 1.4C6.2 1.7 5.1 2.4 4.3 3.3C3.5 4.2 2.9 5.4 2.7 6.6C1.6 6.9 0.6 7.5 -0.1 8.3C-0.8 9.1 -1.3 10.1 -1.4 11.2C-1.5 12.3 -1.3 13.4 -0.8 14.4C-0.3 15.4 0.5 16.2 1.4 16.8C1.7 17.9 2.3 18.9 3.1 19.7C3.9 20.5 4.9 21.1 6 21.4C7.1 21.7 8.3 21.8 9.4 21.5C10.2 22.5 11.3 23.2 12.5 23.6C13.7 24 15 24 16.2 23.7C17.4 23.4 18.5 22.7 19.3 21.8C20.1 20.9 20.7 19.7 20.9 18.5C22 18.2 23 17.6 23.7 16.8C24.4 16 24.9 15 25 13.9C25.1 12.8 24.9 11.7 24.4 10.7C23.9 9.7 23.1 8.9 22.2 8.3Z" fill="#10A37F"/>
        <path d="M11.3 18.5L7.2 16V11L11.3 13.5V18.5ZM12.3 12.5L8.2 10L12.3 7.5L16.4 10L12.3 12.5ZM17.3 16L13.2 18.5V13.5L17.3 11V16Z" fill="white"/>
    </svg>`,

    // Qwen (Alibaba)
    qwen: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="url(#qwen-gradient)"/>
        <path d="M8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 16L15 19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="2" fill="white"/>
        <defs>
            <linearGradient id="qwen-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#615EFF"/>
                <stop offset="1" stop-color="#8B5CF6"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Arcee AI
    arcee: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="url(#arcee-gradient)"/>
        <path d="M12 6L7 8.5V15.5L12 18L17 15.5V8.5L12 6Z" fill="white" fill-opacity="0.9"/>
        <path d="M12 10L9.5 11.25V13.75L12 15L14.5 13.75V11.25L12 10Z" fill="url(#arcee-gradient)"/>
        <defs>
            <linearGradient id="arcee-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#FF4D4D"/>
                <stop offset="1" stop-color="#FF6B6B"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Auto/OpenRouter
    auto: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="url(#auto-gradient)"/>
        <path d="M12 6V12L16 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="2" fill="white"/>
        <path d="M12 4V5M12 19V20M4 12H5M19 12H20M6.34 6.34L7.05 7.05M16.95 16.95L17.66 17.66M6.34 17.66L7.05 16.95M16.95 7.05L17.66 6.34" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <defs>
            <linearGradient id="auto-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#6c5ce7"/>
                <stop offset="1" stop-color="#a855f7"/>
            </linearGradient>
        </defs>
    </svg>`,

    // StepFun
    stepfun: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="url(#step-gradient)"/>
        <path d="M7 14L10 11L13 14L17 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="17" cy="10" r="1.5" fill="white"/>
        <defs>
            <linearGradient id="step-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#FFD700"/>
                <stop offset="1" stop-color="#FFA500"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Liquid AI
    liquid: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="url(#liquid-gradient)"/>
        <path d="M12 5C12 5 8 10 8 13C8 15.21 9.79 17 12 17C14.21 17 16 15.21 16 13C16 10 12 5 12 5Z" fill="white"/>
        <circle cx="12" cy="13" r="2" fill="url(#liquid-gradient)"/>
        <defs>
            <linearGradient id="liquid-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#00D4FF"/>
                <stop offset="1" stop-color="#0099FF"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Nous Research
    nous: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#nous-gradient)"/>
        <path d="M7 17V7L12 12L17 7V17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
            <linearGradient id="nous-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#9D4EDD"/>
                <stop offset="1" stop-color="#7B2CBF"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Dolphin/Cognitive
    cognitive: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="url(#dolphin-gradient)"/>
        <path d="M6 12C6 12 8 8 12 8C16 8 17 10 18 12C18 12 16 11 14 12C12 13 10 14 8 13C6 12 6 12 6 12Z" fill="white"/>
        <circle cx="15" cy="10" r="1" fill="#1a1a2e"/>
        <path d="M18 12C18 12 19 14 18 16C17 18 15 18 15 18" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <defs>
            <linearGradient id="dolphin-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#00CED1"/>
                <stop offset="1" stop-color="#20B2AA"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Z AI / GLM
    zai: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="url(#zai-gradient)"/>
        <path d="M7 8H17L7 16H17" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
            <linearGradient id="zai-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#DE2910"/>
                <stop offset="1" stop-color="#FF4500"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Coder (for code-focused models)
    coder: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#coder-gradient)"/>
        <path d="M8 8L4 12L8 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 8L20 12L16 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 6L10 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <defs>
            <linearGradient id="coder-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#3B82F6"/>
                <stop offset="1" stop-color="#8B5CF6"/>
            </linearGradient>
        </defs>
    </svg>`,

    // Default fallback
    default: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="url(#default-gradient)"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
        <path d="M6 18C6 15.79 8.69 14 12 14C15.31 14 18 15.79 18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <defs>
            <linearGradient id="default-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stop-color="#6B7280"/>
                <stop offset="1" stop-color="#9CA3AF"/>
            </linearGradient>
        </defs>
    </svg>`
};

/**
 * Get AI logo HTML
 * @param {string} logoKey - Logo key from AI_LOGOS
 * @param {string} fallbackEmoji - Fallback emoji if logo not found
 * @returns {string} HTML string
 */
function getAILogo(logoKey, fallbackEmoji = '🤖') {
    const svg = AI_LOGOS[logoKey];
    if (svg) {
        return `<span class="ai-logo">${svg}</span>`;
    }
    return fallbackEmoji;
}

/**
 * Get logo key from model ID
 * @param {string} modelId - Model ID string
 * @returns {string} Logo key
 */
function getLogoKeyFromModel(modelId) {
    if (!modelId) return 'default';
    
    const id = modelId.toLowerCase();
    
    if (id.includes('openrouter/free') || id.includes('auto')) return 'auto';
    if (id.includes('meta-llama') || id.includes('llama')) return 'meta';
    if (id.includes('google') || id.includes('gemma')) return 'google';
    if (id.includes('nvidia') || id.includes('nemotron')) return 'nvidia';
    if (id.includes('mistral')) return 'mistral';
    if (id.includes('openai') || id.includes('gpt-oss')) return 'openai';
    if (id.includes('qwen')) return id.includes('coder') ? 'coder' : 'qwen';
    if (id.includes('arcee') || id.includes('trinity')) return 'arcee';
    if (id.includes('stepfun') || id.includes('step-')) return 'stepfun';
    if (id.includes('liquid') || id.includes('lfm')) return 'liquid';
    if (id.includes('nous') || id.includes('hermes')) return 'nous';
    if (id.includes('dolphin') || id.includes('cognitive')) return 'cognitive';
    if (id.includes('z-ai') || id.includes('glm')) return 'zai';
    
    return 'default';
}

// Make functions globally available
window.AI_LOGOS = AI_LOGOS;
window.getAILogo = getAILogo;
window.getLogoKeyFromModel = getLogoKeyFromModel;
