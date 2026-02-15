/* ========================================
   PHOTON CORE — config.js
   Firebase init, OpenRouter AI Models, State, Utilities
   ======================================== */

// ====== YOUR OPENROUTER API KEY ======
const OPENROUTER_API_KEY = 'YOUR_API_KEY_HERE';  // <-- Paste your key
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_SITE_NAME = 'Photon Core';
const OPENROUTER_SITE_URL = window.location.origin;

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCUNuQNPgQ8P8PPTworUPZ1NFcTAUd2ueU",
    authDomain: "photon-core.firebaseapp.com",
    databaseURL: "https://photon-core-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "photon-core",
    storageBucket: "photon-core.firebasestorage.app",
    messagingSenderId: "353688925540",
    appId: "1:353688925540:web:ec18a3ef1573034bfab671",
    measurementId: "G-3DT2FW953X"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rtdb = firebase.database();

// AI Models — OpenRouter model IDs
const AI_MODELS = {
    // OpenAI GPT-5
    'openai/gpt-5.2': { name: 'GPT-5.2', provider: 'OpenAI', logo: '🟢', badge: 'Latest', desc: 'Most advanced OpenAI.' },
    'openai/gpt-5.2-chatgpt': { name: 'GPT-5.2 Chat', provider: 'OpenAI', logo: '🟢', badge: 'Chat', desc: 'Chat optimized.' },
    'openai/gpt-5.1': { name: 'GPT-5.1', provider: 'OpenAI', logo: '🟢', badge: 'Previous', desc: 'Previous gen.' },
    'openai/gpt-5': { name: 'GPT-5', provider: 'OpenAI', logo: '🟢', badge: 'Base', desc: 'GPT-5 base.' },
    'openai/gpt-5-mini': { name: 'GPT-5 Mini', provider: 'OpenAI', logo: '🟢', badge: 'Light', desc: 'Lightweight.' },

    // OpenAI GPT-4
    'openai/gpt-4.1': { name: 'GPT-4.1', provider: 'OpenAI', logo: '🟢', badge: 'Stable', desc: 'Stable.' },
    'openai/gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', logo: '🟢', badge: 'Fast', desc: 'Multimodal.' },
    'openai/gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'OpenAI', logo: '🟢', badge: 'Mini', desc: 'Light.' },
    'openai/gpt-4.1-mini': { name: 'GPT-4.1 Mini', provider: 'OpenAI', logo: '🟢', badge: 'Mini', desc: 'Fast mini.' },
    'openai/gpt-4.1-nano': { name: 'GPT-4.1 Nano', provider: 'OpenAI', logo: '🟢', badge: 'Nano', desc: 'Ultra fast.' },

    // OpenAI Reasoning
    'openai/o4-mini': { name: 'o4-Mini', provider: 'OpenAI', logo: '🟢', badge: 'Reasoning', desc: 'Latest reasoning.' },
    'openai/o3': { name: 'o3', provider: 'OpenAI', logo: '🟢', badge: 'Reasoning', desc: 'Advanced.' },
    'openai/o3-mini': { name: 'o3-Mini', provider: 'OpenAI', logo: '🟢', badge: 'Light', desc: 'Lighter reasoning.' },
    'openai/o1': { name: 'o1', provider: 'OpenAI', logo: '🟢', badge: 'Reasoning', desc: 'Original reasoning.' },
    'openai/o1-pro': { name: 'o1-Pro', provider: 'OpenAI', logo: '🟢', badge: 'Pro', desc: 'Pro reasoning.' },

    // OpenAI Codex
    'openai/codex-mini': { name: 'Codex Mini', provider: 'OpenAI', logo: '🟢', badge: 'Code', desc: 'Fast code.' },

    // Anthropic Claude
    'anthropic/claude-opus-4': { name: 'Claude Opus 4', provider: 'Anthropic', logo: '🟣', badge: 'Best', desc: 'Most capable.' },
    'anthropic/claude-sonnet-4': { name: 'Claude Sonnet 4', provider: 'Anthropic', logo: '🟣', badge: 'Balanced', desc: 'Balanced.' },
    'anthropic/claude-haiku-4': { name: 'Claude Haiku 4', provider: 'Anthropic', logo: '🟣', badge: 'Fast', desc: 'Ultra fast.' },
    'anthropic/claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', logo: '🟣', badge: 'Writing', desc: 'Writing & code.' },
    'anthropic/claude-3.5-haiku': { name: 'Claude 3.5 Haiku', provider: 'Anthropic', logo: '🟣', badge: 'Fast', desc: 'Fast.' },
    'anthropic/claude-3-opus': { name: 'Claude 3 Opus', provider: 'Anthropic', logo: '🟣', badge: 'V3', desc: 'V3 Opus.' },

    // Google Gemini
    'google/gemini-2.5-pro-preview': { name: 'Gemini 2.5 Pro', provider: 'Google', logo: '🔵', badge: 'Latest', desc: 'Latest Google.' },
    'google/gemini-2.5-flash-preview': { name: 'Gemini 2.5 Flash', provider: 'Google', logo: '🔵', badge: 'Flash', desc: 'Fast.' },
    'google/gemini-2.0-flash-001': { name: 'Gemini 2.0 Flash', provider: 'Google', logo: '🔵', badge: 'Stable', desc: 'Stable.' },
    'google/gemini-2.5-flash-lite-preview': { name: 'Gemini 2.5 Flash Lite', provider: 'Google', logo: '🔵', badge: 'Lite', desc: 'Lightest.' },

    // xAI Grok
    'x-ai/grok-4': { name: 'Grok 4', provider: 'xAI', logo: '⚫', badge: 'Latest', desc: 'Latest Grok.' },
    'x-ai/grok-3': { name: 'Grok 3', provider: 'xAI', logo: '⚫', badge: 'V3', desc: 'Grok 3.' },
    'x-ai/grok-3-mini': { name: 'Grok 3 Mini', provider: 'xAI', logo: '⚫', badge: 'Mini', desc: 'Mini.' },
    'x-ai/grok-3-fast': { name: 'Grok 3 Fast', provider: 'xAI', logo: '⚫', badge: 'Fast', desc: 'Fast.' },

    // Meta LLaMA
    'meta-llama/llama-4-maverick': { name: 'LLaMA 4 Maverick', provider: 'Meta', logo: '🟠', badge: 'Latest', desc: 'Most powerful.' },
    'meta-llama/llama-4-scout': { name: 'LLaMA 4 Scout', provider: 'Meta', logo: '🟠', badge: 'Vision', desc: 'Vision.' },
    'meta-llama/llama-3.3-70b-instruct': { name: 'LLaMA 3.3 70B', provider: 'Meta', logo: '🟠', badge: '70B', desc: 'Large.' },
    'meta-llama/llama-3.1-405b-instruct': { name: 'LLaMA 3.1 405B', provider: 'Meta', logo: '🟠', badge: 'Massive', desc: 'Largest.' },
    'meta-llama/llama-3.1-8b-instruct': { name: 'LLaMA 3.1 8B', provider: 'Meta', logo: '🟠', badge: 'Fast', desc: 'Fast.' },

    // DeepSeek
    'deepseek/deepseek-r1': { name: 'DeepSeek R1', provider: 'DeepSeek', logo: '🔷', badge: 'Reasoning', desc: 'Reasoning.' },
    'deepseek/deepseek-chat': { name: 'DeepSeek V3', provider: 'DeepSeek', logo: '🔷', badge: 'Chat', desc: 'Fast chat.' },
    'deepseek/deepseek-r1-0528': { name: 'DeepSeek R1 0528', provider: 'DeepSeek', logo: '🔷', badge: 'Latest', desc: 'Latest reasoning.' },

    // Qwen
    'qwen/qwen3-235b-a22b': { name: 'Qwen3 235B', provider: 'Qwen', logo: '🟤', badge: 'Massive', desc: 'Largest Qwen.' },
    'qwen/qwen3-32b': { name: 'Qwen3 32B', provider: 'Qwen', logo: '🟤', badge: '32B', desc: 'Medium.' },
    'qwen/qwen3-30b-a3b': { name: 'Qwen3 30B', provider: 'Qwen', logo: '🟤', badge: 'MoE', desc: 'MoE model.' },

    // Mistral
    'mistralai/mistral-large-2411': { name: 'Mistral Large', provider: 'Mistral', logo: '🟡', badge: 'Large', desc: 'Largest Mistral.' },
    'mistralai/mistral-medium-3': { name: 'Mistral Medium', provider: 'Mistral', logo: '🟡', badge: 'Medium', desc: 'Balanced.' },
    'mistralai/mistral-small-3.2': { name: 'Mistral Small', provider: 'Mistral', logo: '🟡', badge: 'Fast', desc: 'Fast.' },
    'mistralai/codestral-2501': { name: 'Codestral', provider: 'Mistral', logo: '🟡', badge: 'Code', desc: 'Code gen.' },

    // Free Models
    'google/gemma-3-27b-it:free': { name: 'Gemma 3 27B', provider: 'Google', logo: '🆓', badge: 'Free', desc: 'Free Google.' },
    'meta-llama/llama-3.1-8b-instruct:free': { name: 'LLaMA 3.1 8B', provider: 'Meta', logo: '🆓', badge: 'Free', desc: 'Free Meta.' },
    'deepseek/deepseek-chat:free': { name: 'DeepSeek V3', provider: 'DeepSeek', logo: '🆓', badge: 'Free', desc: 'Free DeepSeek.' },
    'qwen/qwen3-32b:free': { name: 'Qwen3 32B', provider: 'Qwen', logo: '🆓', badge: 'Free', desc: 'Free Qwen.' },
    'mistralai/mistral-small-3.2:free': { name: 'Mistral Small', provider: 'Mistral', logo: '🆓', badge: 'Free', desc: 'Free Mistral.' }
};

// Default model
const DEFAULT_MODEL = 'openai/gpt-4o';

// Global State
const state = {
    user: null,
    discussions: [],
    files: [],
    aiQueryCount: 0,
    currentFilter: 'all',
    selectedModel: DEFAULT_MODEL,
    memories: [],
    chatSessions: [],
    currentChatId: null,
    currentChatMessages: [],
    filesReady: false,
    attachedFile: null,
    attachedFileContent: null,
    attachedFileName: '',
    isTyping: false,
    onlineUsers: {}
};

// Global DOM cache
let dom = {};

function initDom() {
    [
        'auth-screen','app','btn-sign-in','btn-sign-out','user-name','user-avatar',
        'welcome-name','page-title','mobile-menu-btn','stat-discussions','stat-files',
        'stat-ai','stat-online','online-count','discussion-title','discussion-body',
        'discussion-category','btn-post-discussion','discussions-list','upload-zone',
        'file-input','btn-browse','btn-new-folder','btn-refresh-files','files-list',
        'current-path','ai-chat','ai-input','btn-ai-send','ai-send-text','ai-loading',
        'ai-model-select','model-active-badge','model-info-text','bot-logo','bot-name',
        'bot-provider','bot-badge','typing-indicator','typing-user','btn-new-chat',
        'chat-history-list','memory-count','memory-list','btn-toggle-memory',
        'btn-clear-memory','btn-dismiss-tip','memory-tip-banner','btn-ai-attach',
        'ai-file-input','ai-attachment-preview','attachment-icon','attachment-name',
        'attachment-size','btn-remove-attachment','members-grid','profile-name',
        'profile-role','profile-status','btn-save-profile','recent-activity',
        'toast-container'
    ].forEach(id => {
        dom[id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = document.getElementById(id);
    });
}

// === UTILITY FUNCTIONS ===
function showToast(m, t = 'info') {
    if (!dom.toastContainer) return;
    const e = document.createElement('div');
    e.className = `toast ${t}`;
    e.innerHTML = `<span>${{success:'✅',error:'❌',info:'ℹ️'}[t] || 'ℹ️'}</span><span>${m}</span>`;
    dom.toastContainer.appendChild(e);
    setTimeout(() => {
        e.style.animation = 'to .3s ease forwards';
        setTimeout(() => e.remove(), 300);
    }, 3500);
}

function esc(t) {
    const d = document.createElement('div');
    d.textContent = t || '';
    return d.innerHTML;
}

function fmtDate(iso) {
    const d = new Date(iso), n = new Date(), ms = n - d;
    const min = Math.floor(ms / 60000), hr = Math.floor(ms / 3600000), day = Math.floor(ms / 86400000);
    if (min < 1) return 'Now';
    if (min < 60) return min + 'm';
    if (hr < 24) return hr + 'h';
    if (day < 7) return day + 'd';
    return d.toLocaleDateString();
}

function fmtSize(b) {
    if (!b) return '0 B';
    const s = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(1) + ' ' + s[i];
}

function fileIcon(n, d) {
    if (d) return '📁';
    const e = n.split('.').pop().toLowerCase();
    return {
        png:'🖼️',jpg:'🖼️',jpeg:'🖼️',gif:'🖼️',svg:'🖼️',webp:'🖼️',
        mp3:'🎵',wav:'🎵',ogg:'🎵',mp4:'🎬',pdf:'📄',
        doc:'📝',docx:'📝',txt:'📝',zip:'📦',rar:'📦',
        js:'💻',ts:'💻',py:'💻',cs:'💻',cpp:'💻',
        html:'🌐',css:'🎨',json:'⚙️',md:'📝',
        gd:'🎮',godot:'🎮',unity:'🎮',blend:'🎨',psd:'🎨'
    }[e] || '📄';
}

function formatAi(t) {
    let f = esc(t);
    f = f.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    f = f.replace(/\*(.*?)\*/g, '<em>$1</em>');
    f = f.replace(/`(.*?)`/g, '<code style="background:rgba(108,92,231,.2);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:.85em">$1</code>');
    f = f.replace(/\n/g, '<br>');
    return '<p>' + f + '</p>';
}

// === OPENROUTER API HELPER ===
async function openRouterChat(messages, modelId, stream = false) {
    const response = await fetch(OPENROUTER_BASE_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
            'Content-Type': 'application/json',
            'HTTP-Referer': OPENROUTER_SITE_URL,
            'X-Title': OPENROUTER_SITE_NAME
        },
        body: JSON.stringify({
            model: modelId,
            messages: messages,
            stream: stream
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'OpenRouter API error: ' + response.status);
    }

    return response;
}

async function openRouterChatSimple(messages, modelId) {
    const response = await openRouterChat(messages, modelId, false);
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || 'No response.';
}

async function* openRouterChatStream(messages, modelId) {
    const response = await openRouterChat(messages, modelId, true);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;

            try {
                const parsed = JSON.parse(data);
                const content = parsed?.choices?.[0]?.delta?.content;
                if (content) yield content;
            } catch (e) {
                // Skip malformed chunks
            }
        }
    }
}