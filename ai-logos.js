/* ========================================
   AI LOGOS - Emoji Logo Definitions
======================================== */

const AI_LOGOS = {
    // Auto / OpenRouter
    auto: '&#x1F3B2;',

    // Google Gemini
    gemini: '&#x2728;',

    // Meta (LLaMA)
    meta: '&#x1F999;',

    // Google (Gemma)
    google: '&#x1F48E;',

    // NVIDIA
    nvidia: '&#x1F7E2;',

    // Mistral
    mistral: '&#x1F32A;',

    // OpenAI
    openai: '&#x1F9E0;',

    // Qwen (Alibaba)
    qwen: '&#x1F409;',

    // Arcee AI
    arcee: '&#x1F9EC;',

    // StepFun
    stepfun: '&#x26A1;',

    // Liquid AI
    liquid: '&#x1F4A7;',

    // Nous Research
    nous: '&#x1F3DB;',

    // Cognitive / Dolphin
    cognitive: '&#x1F42C;',

    // Z AI / GLM
    zai: '&#x1F534;',

    // Coder (code-focused models)
    coder: '&#x1F4BB;',

    // Default fallback
    default: '&#x1F916;'
};

/**
 * Get AI logo HTML
 * @param {string} logoKey - Logo key from AI_LOGOS
 * @param {string} fallbackEmoji - Fallback emoji if logo not found (HTML entity)
 * @returns {string} HTML string
 */
function getAILogo(logoKey, fallbackEmoji = '&#x1F916;') {
    const emoji = AI_LOGOS[logoKey];
    const finalEmoji = emoji || fallbackEmoji;
    return `<span class="ai-logo ai-logo-emoji" aria-hidden="true">${finalEmoji}</span>`;
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
    if (id.includes('gemini')) return 'gemini';
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
