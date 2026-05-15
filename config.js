/* ========================================
   PHOTON CORE — config.js
   Firebase Auth + Storage + Firestore
======================================== */

// ========== GLOBAL STATE (MUST BE FIRST) ==========
window.state = {
    user: null,
    discussions: [],
    files: [],
    aiQueryCount: 0,
    currentFilter: 'all',
    selectedModel: null,
    memories: [],
    chatSessions: [],
    currentChatId: null,
    currentChatMessages: [],
    filesReady: false,
    attachedFile: null,
    attachedFileContent: null,
    attachedFileName: '',
    isTyping: false,
    isSending: false,
    onlineUsers: {}
};

window.dom = {};

// Firebase service variables (will be initialized later)
let auth, db, rtdb, storage, storageRef, filesRef;

// ========== FIREBASE CONFIG ==========
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

/**
 * Initialize Firebase - called when Firebase SDK is ready
 */
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded');
        return false;
    }

    try {
        // Initialize Firebase app
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Initialize services
        auth = firebase.auth();
        db = firebase.firestore();
        rtdb = firebase.database();
        storage = firebase.storage();

        // Export globally
        window.auth = auth;
        window.db = db;
        window.rtdb = rtdb;
        window.storage = storage;

        // Storage references
        storageRef = storage.ref();
        filesRef = storageRef.child('files');
        window.storageRef = storageRef;
        window.filesRef = filesRef;

        console.log('✓ Firebase initialized:', {
            auth: !!auth,
            db: !!db,
            rtdb: !!rtdb,
            storage: !!storage
        });

        return true;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        return false;
    }
}

// Try to initialize Firebase immediately if available
if (typeof firebase !== 'undefined') {
    initFirebase();
}

// ========== AI MODELS ==========
const AI_MODELS = {
    // === AUTO ===
    'openrouter/free': {
        name: 'Auto Select Best',
        provider: 'OpenRouter',
        logoKey: 'auto',
        badge: 'Smart',
        desc: 'Automatically picks the best available model',
        api: 'openrouter'
    },

    // === GOOGLE GEMINI (Direct API) ===
    'gemini-2.5-flash': {
        name: 'Gemini 2.5 Flash',
        provider: 'Google',
        logoKey: 'gemini',
        badge: 'Fast',
        desc: 'Latest fast model with great quality',
        api: 'gemini'
    },
    'gemini-2.5-pro': {
        name: 'Gemini 2.5 Pro',
        provider: 'Google',
        logoKey: 'gemini',
        badge: 'Pro',
        desc: 'Most capable Gemini model',
        api: 'gemini'
    },
    'gemini-2.5-flash-lite': {
        name: 'Gemini 2.5 Flash Lite',
        provider: 'Google',
        logoKey: 'gemini',
        badge: 'Lite',
        desc: 'Ultra lightweight',
        api: 'gemini'
    },
    'gemini-2.0-flash-001': {
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        logoKey: 'gemini',
        badge: 'Stable',
        desc: 'Stable fast model',
        api: 'gemini'
    },
    'gemini-2.0-flash-lite-001': {
        name: 'Gemini 2.0 Flash Lite',
        provider: 'Google',
        logoKey: 'gemini',
        badge: 'Lite',
        desc: 'Lightweight and fast',
        api: 'gemini'
    },

    // === OPENROUTER (curated free tier) ===
    'inclusionai/ring-2.6-1t:free': {
        name: 'Ring 2.6 1T',
        provider: 'Inclusion AI',
        logoKey: 'default',
        badge: 'Large',
        desc: 'High-capacity general assistant',
        api: 'openrouter'
    },
    'baidu/cobuddy:free': {
        name: 'CoBuddy',
        provider: 'Baidu',
        logoKey: 'baidu',
        badge: 'Chat',
        desc: 'Conversational helper from Baidu',
        api: 'openrouter'
    },
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': {
        name: 'Nemotron 3 Nano Omni 30B',
        provider: 'NVIDIA',
        logoKey: 'nvidia',
        badge: 'Reasoning',
        desc: 'Omni reasoning-focused Nemotron',
        api: 'openrouter'
    },
    'poolside/laguna-xs.2:free': {
        name: 'Laguna XS.2',
        provider: 'Poolside',
        logoKey: 'poolside',
        badge: 'Code',
        desc: 'Compact coding-oriented model',
        api: 'openrouter'
    },
    'poolside/laguna-m.1:free': {
        name: 'Laguna M.1',
        provider: 'Poolside',
        logoKey: 'poolside',
        badge: 'Code',
        desc: 'Mid-size coding assistant',
        api: 'openrouter'
    },
    'deepseek/deepseek-v4-flash:free': {
        name: 'DeepSeek V4 Flash',
        provider: 'DeepSeek',
        logoKey: 'deepseek',
        badge: 'Fast',
        desc: 'Quick answers with strong reasoning',
        api: 'openrouter'
    },
    'baidu/qianfan-ocr-fast:free': {
        name: 'Qianfan OCR Fast',
        provider: 'Baidu',
        logoKey: 'baidu',
        badge: 'OCR',
        desc: 'Fast text and document understanding',
        api: 'openrouter'
    },
    'google/gemma-4-26b-a4b-it:free': {
        name: 'Gemma 4 26B IT',
        provider: 'Google',
        logoKey: 'google',
        badge: 'MoE',
        desc: 'Gemma 4 instruction-tuned MoE',
        api: 'openrouter'
    },
    'google/gemma-4-31b-it:free': {
        name: 'Gemma 4 31B IT',
        provider: 'Google',
        logoKey: 'google',
        badge: 'Pro',
        desc: 'Larger Gemma 4 for harder tasks',
        api: 'openrouter'
    },
    'arcee-ai/trinity-large-thinking:free': {
        name: 'Trinity Large Thinking',
        provider: 'Arcee AI',
        logoKey: 'arcee',
        badge: 'CoT',
        desc: 'Extended reasoning and analysis',
        api: 'openrouter'
    },
    'nvidia/nemotron-3-super-120b-a12b:free': {
        name: 'Nemotron 3 Super 120B',
        provider: 'NVIDIA',
        logoKey: 'nvidia',
        badge: 'Flagship',
        desc: 'Top-tier Nemotron for complex work',
        api: 'openrouter'
    },
    'nvidia/llama-nemotron-embed-vl-1b-v2:free': {
        name: 'Llama Nemotron Embed VL 1B',
        provider: 'NVIDIA',
        logoKey: 'nvidia',
        badge: 'Embed',
        desc: 'Vision-language embeddings',
        api: 'openrouter'
    },
    'minimax/minimax-m2.5:free': {
        name: 'MiniMax M2.5',
        provider: 'MiniMax',
        logoKey: 'minimax',
        badge: 'General',
        desc: 'Versatile assistant model',
        api: 'openrouter'
    },
    'liquid/lfm-2.5-1.2b-thinking:free': {
        name: 'LFM Thinking',
        provider: 'Liquid',
        logoKey: 'liquid',
        badge: 'CoT',
        desc: 'Chain-of-thought reasoning',
        api: 'openrouter'
    },
    'liquid/lfm-2.5-1.2b-instruct:free': {
        name: 'LFM Instruct',
        provider: 'Liquid',
        logoKey: 'liquid',
        badge: 'Fast',
        desc: 'Quick instruction following',
        api: 'openrouter'
    },
    'nvidia/nemotron-3-nano-30b-a3b:free': {
        name: 'Nemotron 3 Nano 30B',
        provider: 'NVIDIA',
        logoKey: 'nvidia',
        badge: 'Reasoning',
        desc: 'Strong logical reasoning and math',
        api: 'openrouter'
    },
    'nvidia/nemotron-nano-12b-v2-vl:free': {
        name: 'Nemotron Nano 12B VL',
        provider: 'NVIDIA',
        logoKey: 'nvidia',
        badge: 'Vision',
        desc: 'Vision-language understanding',
        api: 'openrouter'
    },
    'qwen/qwen3-next-80b-a3b-instruct:free': {
        name: 'Qwen3 Next 80B',
        provider: 'Alibaba',
        logoKey: 'qwen',
        badge: 'Large',
        desc: 'Advanced reasoning and analysis',
        api: 'openrouter'
    },
    'nvidia/nemotron-nano-9b-v2:free': {
        name: 'Nemotron Nano 9B',
        provider: 'NVIDIA',
        logoKey: 'nvidia',
        badge: 'Balanced',
        desc: 'Well-rounded mid-size model',
        api: 'openrouter'
    },
    'openai/gpt-oss-120b:free': {
        name: 'GPT-OSS 120B',
        provider: 'OpenAI',
        logoKey: 'openai',
        badge: 'Massive',
        desc: 'Large open-weight GPT-class model',
        api: 'openrouter'
    },
    'openai/gpt-oss-20b:free': {
        name: 'GPT-OSS 20B',
        provider: 'OpenAI',
        logoKey: 'openai',
        badge: 'Fast',
        desc: 'Faster open-weight GPT-class model',
        api: 'openrouter'
    },
    'z-ai/glm-4.5-air:free': {
        name: 'GLM 4.5 Air',
        provider: 'Z AI',
        logoKey: 'zai',
        badge: 'Bilingual',
        desc: 'Chinese and English specialist',
        api: 'openrouter'
    },
    'qwen/qwen3-coder:free': {
        name: 'Qwen3 Coder',
        provider: 'Alibaba',
        logoKey: 'coder',
        badge: 'Code',
        desc: 'Specialized for programming',
        api: 'openrouter'
    },
    'cognitivecomputations/dolphin-mistral-24b-venice-edition:free': {
        name: 'Dolphin Mistral 24B',
        provider: 'Cognitive',
        logoKey: 'cognitive',
        badge: 'Creative',
        desc: 'Creative and expressive writing',
        api: 'openrouter'
    },
    'meta-llama/llama-3.3-70b-instruct:free': {
        name: 'LLaMA 3.3 70B',
        provider: 'Meta',
        logoKey: 'meta',
        badge: 'Flagship',
        desc: 'Strong general reasoning and coding',
        api: 'openrouter'
    },
    'meta-llama/llama-3.2-3b-instruct:free': {
        name: 'LLaMA 3.2 3B',
        provider: 'Meta',
        logoKey: 'meta',
        badge: 'Fast',
        desc: 'Very fast for simple tasks',
        api: 'openrouter'
    },
    'nousresearch/hermes-3-llama-3.1-405b:free': {
        name: 'Hermes 3 405B',
        provider: 'Nous Research',
        logoKey: 'nous',
        badge: 'Massive',
        desc: 'Very large open model for quality',
        api: 'openrouter'
    }
};

const DEFAULT_MODEL = 'openrouter/free';
state.selectedModel = DEFAULT_MODEL;

// ========== DOM INITIALIZATION ==========
function initDom() {
    const elementIds = [
        'auth-screen', 'app', 'btn-sign-in', 'btn-sign-out', 'btn-google-signin',
        'btn-email-auth', 'auth-form', 'auth-email', 'auth-password', 'auth-username',
        'auth-error', 'auth-toggle-text', 'auth-toggle-link',
        'user-name', 'user-avatar', 'welcome-name', 'page-title', 'mobile-menu-btn',
        'stat-discussions', 'stat-files', 'stat-ai', 'stat-online', 'online-count',
        'discussion-title', 'discussion-body', 'discussion-category', 'btn-post-discussion',
        'discussions-list', 'discussion-search', 'discussion-sort', 'discussion-thread',
        'discussion-stat-posts', 'discussion-stat-comments', 'discussion-stat-active',
        'discussion-feed-count', 'discussion-compose-avatar', 'discussion-saved-toggle',
        'discussion-jump-compose', 'discussion-comment-sort', 'discussion-draft-state',
        'upload-zone', 'file-input', 'btn-browse', 'btn-new-folder',
        'btn-refresh-files', 'files-list', 'current-path', 'ai-chat', 'ai-input',
        'btn-ai-send', 'ai-send-text', 'ai-loading', 'ai-model-select', 'model-active-badge',
        'model-info-text', 'bot-logo', 'bot-name', 'bot-provider', 'bot-badge',
        'typing-indicator', 'typing-user', 'btn-new-chat', 'chat-history-list',
        'memory-count', 'memory-list', 'btn-toggle-memory', 'btn-clear-memory',
        'btn-dismiss-tip', 'memory-tip-banner', 'btn-ai-attach', 'ai-file-input',
        'ai-attachment-preview', 'attachment-icon', 'attachment-name', 'attachment-size',
        'btn-remove-attachment', 'members-grid', 'profile-name', 'profile-role',
        'profile-status', 'btn-save-profile', 'recent-activity', 'toast-container',
        // New AI page elements
        'btn-send', 'btn-attach', 'btn-memory', 'btn-close-memory',
        'memory-count-panel', 'model-logo-panel', 'model-name-panel',
        'sidebar-overlay', 'ai-sidebar', 'memory-panel',
        'btn-toggle-sidebar', 'model-selector', 'model-selector-btn',
        'model-icon', 'model-name', 'model-dropdown', 'model-dropdown-body',
        'model-search', 'welcome-message', 'memory-tip', 'attachment-preview',
        'btn-action-remember', 'btn-action-web-search', 'btn-action-add-cloud',
        'btn-action-list-cloud', 'btn-action-remove-cloud', 'btn-action-create-cloud'
    ];

    elementIds.forEach(id => {
        const camelCaseId = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const el = document.getElementById(id);
        dom[camelCaseId] = el;
    });

    console.log('✓ DOM initialized:', Object.keys(dom).filter(k => dom[k]).length, 'elements found');
}

// ========== UTILITY FUNCTIONS ==========
function showToast(m, t = 'info') {
    let container = dom.toastContainer || document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        dom.toastContainer = container;
    }

    const e = document.createElement('div');
    e.className = 'toast ' + t;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    e.innerHTML = '<span>' + (icons[t] || 'ℹ️') + '</span><span>' + m + '</span>';
    container.appendChild(e);

    setTimeout(() => {
        e.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => e.remove(), 300);
    }, 3500);
}

window.showToast = showToast;

function esc(t) {
    if (t === null || t === undefined) return '';
    const d = document.createElement('div');
    d.textContent = String(t);
    return d.innerHTML;
}

function fmtDate(iso) {
    if (!iso) return 'Unknown';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Invalid';

    const n = new Date();
    const ms = n - d;
    const min = Math.floor(ms / 60000);
    const hr = Math.floor(ms / 3600000);
    const day = Math.floor(ms / 86400000);

    if (min < 1) return 'Now';
    if (min < 60) return min + 'm';
    if (hr < 24) return hr + 'h';
    if (day < 7) return day + 'd';
    return d.toLocaleDateString();
}

function fmtSize(b) {
    if (!b || b === 0) return '0 B';
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(1) + ' ' + s[i];
}

function fileIcon(n, d) {
    if (d) return '📁';
    if (!n) return '📄';
    const e = n.split('.').pop().toLowerCase();
    const icons = {
        png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
        mp3: '🎵', wav: '🎵', ogg: '🎵', mp4: '🎬',
        pdf: '📄', doc: '📝', docx: '📝', txt: '📝',
        zip: '📦', rar: '📦', '7z': '📦',
        js: '💻', ts: '💻', py: '💻', cs: '💻', cpp: '💻',
        html: '🌐', css: '🎨', json: '⚙️', md: '📝',
        gd: '🎮', godot: '🎮', unity: '🎮', blend: '🎨', psd: '🎨'
    };
    return icons[e] || '📄';
}

function coerceText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(coerceText).join('');
    if (typeof value === 'object') {
        if (value.text !== undefined) return coerceText(value.text);
        if (value.content !== undefined) return coerceText(value.content);
        if (Array.isArray(value.parts)) {
            return value.parts.map(part => coerceText(part?.text ?? part)).join('');
        }
        try {
            return JSON.stringify(value, null, 2);
        } catch (e) {
            return '';
        }
    }
    return String(value);
}

function extractTextFromParts(parts) {
    if (!Array.isArray(parts)) return '';
    return parts.map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        if (part && part.text !== undefined) return coerceText(part.text);
        if (part && part.content !== undefined) return coerceText(part.content);
        return '';
    }).join('');
}

function extractTextFromModelResponse(data) {
    if (!data) return '';
    const direct = data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.delta?.content ??
        data?.text ??
        data?.message?.content ??
        data?.content;

    if (direct !== undefined) return coerceText(direct);

    const parts = data?.candidates?.[0]?.content?.parts;
    return extractTextFromParts(parts);
}

// ========== SIMPLE MARKDOWN FORMATTER (FALLBACK) ==========
function formatAi(text) {
    if (!text) return '';
    const rawText = coerceText(text);

    // Prioritize the enhanced parseAiMarkdown
    if (typeof parseAiMarkdown === 'function') {
        const html = parseAiMarkdown(rawText, { isStreaming: false });
        if (typeof enhanceAiMarkdownDom === 'function') {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            enhanceAiMarkdownDom(temp.querySelector('.ai-md') || temp);
            return temp.innerHTML;
        }
        return html;
    }

    // Use StreamingMarkdownRenderer if available (from ai.js)
    if (typeof StreamingMarkdownRenderer !== 'undefined') {
        const tempDiv = document.createElement('div');
        const renderer = new StreamingMarkdownRenderer(tempDiv);
        renderer.appendChunk(rawText);
        renderer.finalize();
        return tempDiv.innerHTML;
    }

    if (typeof marked !== 'undefined') {
        marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
        let html = marked.parse(rawText);
        if (typeof sanitizeAiHtml === 'function') {
            html = sanitizeAiHtml(html);
        } else if (typeof DOMPurify !== 'undefined') {
            html = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel', 'data-code', 'data-table', 'class', 'type', 'checked'], ADD_TAGS: ['button', 'input'] });
        }
        return `<div class="ai-md">${html}</div>`;
    }

    // Basic fallback
    let f = esc(rawText);

    // Bold + Italic
    f = f.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Bold
    f = f.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    f = f.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    f = f.replace(/`([^`]+)`/g, '<code style="background:rgba(108,92,231,.2);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:.85em">$1</code>');

    // Line breaks
    f = f.replace(/\n/g, '<br>');

    return `<div class="ai-md">${f}</div>`;
}
// Copy code handler - called via event delegation
function handleAiCopy(btn) {
    if (!btn) return;

    const copyText = btn.querySelector('.copy-text');
    const defaultLabel = btn.classList.contains('ai-table-copy-btn') ? 'Copy table' : 'Copy';
    let payload = '';

    if (btn.dataset.table) {
        payload = decodeURIComponent(btn.dataset.table);
    } else if (btn.dataset.code) {
        payload = decodeURIComponent(btn.dataset.code);
    } else {
        return;
    }

    navigator.clipboard.writeText(payload).then(() => {
        if (copyText) {
            copyText.textContent = 'Copied!';
            btn.style.color = '#10b981';
        }
        setTimeout(() => {
            if (copyText) {
                copyText.textContent = defaultLabel;
                btn.style.color = '';
            }
        }, 2000);
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

document.addEventListener('click', function(e) {
    const copyBtn = e.target.closest('.ai-copy-btn');
    if (copyBtn) {
        e.preventDefault();
        e.stopPropagation();
        handleAiCopy(copyBtn);
    }
});

// ========== OPENROUTER API ==========
function toOpenRouterMessages(messages) {
    if (!messages || !Array.isArray(messages)) return [];

    const formatted = [];
    for (const msg of messages) {
        if (msg && msg.role && msg.content) {
            formatted.push({ role: msg.role, content: msg.content });
        }
    }

    // Merge consecutive messages from same role
    const merged = [];
    for (const msg of formatted) {
        if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
            merged[merged.length - 1].content += "\n" + msg.content;
        } else {
            merged.push({ ...msg });
        }
    }

    return merged;
}

async function openRouterChat(messages, modelId) {
    const formattedMessages = toOpenRouterMessages(messages);

    const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            modelId,
            messages: formattedMessages,
            stream: false
        })
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error("Server error: " + response.status + " " + err);
    }

    const data = await response.json();
    return extractTextFromModelResponse(data) || "No response.";
}

async function* openRouterChatStream(messages, modelId) {
    const formattedMessages = toOpenRouterMessages(messages);

    const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            modelId,
            messages: formattedMessages,
            stream: true
        })
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error("Server error: " + response.status + " " + err);
    }

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
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const payload = trimmed.replace(/^data:\s*/, '');
            if (payload === '[DONE]') return;

            try {
                const parsed = JSON.parse(payload);
                const text = extractTextFromModelResponse(parsed);
                if (text) yield text;
            } catch {
                // Skip invalid JSON
            }
        }
    }
}

// ========== GEMINI API ==========
async function geminiChat(messages, modelId) {
    const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            modelId,
            messages,
            stream: false
        })
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error("Gemini error: " + response.status + " " + err);
    }

    const data = await response.json();
    return extractTextFromModelResponse(data) || "No response.";
}

async function* geminiChatStream(messages, modelId) {
    const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            modelId,
            messages,
            stream: true
        })
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error("Gemini error: " + response.status + " " + err);
    }

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
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const payload = trimmed.replace(/^data:\s*/, '');
            if (payload === '[DONE]') return;

            try {
                const parsed = JSON.parse(payload);
                const text = extractTextFromModelResponse(parsed);
                if (text) yield text;
            } catch {
                // Skip invalid JSON
            }
        }
    }
}

// Web Search function
async function geminiWebSearch(query, modelId) {
    const response = await fetch("/api/gemini-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query,
            modelId,
            stream: false
        })
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error("Search error: " + response.status + " " + err);
    }

    return await response.json();
}

async function* geminiWebSearchStream(query, modelId) {
    const response = await fetch("/api/gemini-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query,
            modelId,
            stream: true
        })
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error("Search error: " + response.status + " " + err);
    }

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
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const payload = trimmed.replace(/^data:\s*/, '');
            if (payload === '[DONE]') return;

            try {
                const parsed = JSON.parse(payload);
                const text = extractTextFromModelResponse(parsed);
                if (text) yield text;
            } catch {
                // Skip invalid JSON
            }
        }
    }
}

// Export new functions
window.geminiChat = geminiChat;
window.geminiChatStream = geminiChatStream;
window.geminiWebSearch = geminiWebSearch;
window.geminiWebSearchStream = geminiWebSearchStream;


// Make functions globally available
window.initFirebase = initFirebase;
window.initDom = initDom;
window.esc = esc;
window.fmtDate = fmtDate;
window.fmtSize = fmtSize;
window.fileIcon = fileIcon;
window.formatAi = formatAi;
window.openRouterChat = openRouterChat;
window.openRouterChatStream = openRouterChatStream;

console.log('✓ Config.js loaded');


