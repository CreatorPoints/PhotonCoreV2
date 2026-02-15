/* ========================================
   PHOTON CORE — config.js
   Firebase init, AI Models, State, Utilities
   ======================================== */

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

// AI Models
const AI_MODELS = {
    'gpt-5.2':{name:'GPT-5.2',provider:'OpenAI',logo:'🟢',badge:'Latest',desc:'Most advanced OpenAI.'},
    'gpt-5.2-chat':{name:'GPT-5.2 Chat',provider:'OpenAI',logo:'🟢',badge:'Chat',desc:'Chat optimized.'},
    'gpt-5.1':{name:'GPT-5.1',provider:'OpenAI',logo:'🟢',badge:'Previous',desc:'Previous gen.'},
    'gpt-5':{name:'GPT-5',provider:'OpenAI',logo:'🟢',badge:'Base',desc:'GPT-5 base.'},
    'gpt-5-mini':{name:'GPT-5 Mini',provider:'OpenAI',logo:'🟢',badge:'Light',desc:'Lightweight.'},
    'gpt-5-nano':{name:'GPT-5 Nano',provider:'OpenAI',logo:'🟢',badge:'Nano',desc:'Ultra fast.'},
    'gpt-4.5-preview':{name:'GPT-4.5',provider:'OpenAI',logo:'🟢',badge:'Preview',desc:'Preview.'},
    'gpt-4.1':{name:'GPT-4.1',provider:'OpenAI',logo:'🟢',badge:'Stable',desc:'Stable.'},
    'gpt-4o':{name:'GPT-4o',provider:'OpenAI',logo:'🟢',badge:'Fast',desc:'Multimodal.'},
    'gpt-4o-mini':{name:'GPT-4o Mini',provider:'OpenAI',logo:'🟢',badge:'Mini',desc:'Light.'},
    'o4-mini':{name:'o4-Mini',provider:'OpenAI',logo:'🟢',badge:'Reasoning',desc:'Latest reasoning.'},
    'o3':{name:'o3',provider:'OpenAI',logo:'🟢',badge:'Reasoning',desc:'Advanced.'},
    'o3-mini':{name:'o3-Mini',provider:'OpenAI',logo:'🟢',badge:'Light',desc:'Lighter reasoning.'},
    'o1':{name:'o1',provider:'OpenAI',logo:'🟢',badge:'Reasoning',desc:'Original reasoning.'},
    'o1-pro':{name:'o1-Pro',provider:'OpenAI',logo:'🟢',badge:'Pro',desc:'Pro reasoning.'},
    'openai/gpt-5.2-codex':{name:'GPT-5.2 Codex',provider:'OpenAI',logo:'🟢',badge:'Code',desc:'Best code gen.'},
    'openai/gpt-5.1-codex':{name:'GPT-5.1 Codex',provider:'OpenAI',logo:'🟢',badge:'Code',desc:'Code gen.'},
    'openai/gpt-5.1-codex-max':{name:'Codex Max',provider:'OpenAI',logo:'🟢',badge:'Max',desc:'Max code.'},
    'openai/codex-mini':{name:'Codex Mini',provider:'OpenAI',logo:'🟢',badge:'Mini',desc:'Fast code.'},
    'claude-opus-4-6':{name:'Claude Opus 4.6',provider:'Anthropic',logo:'🟣',badge:'Best',desc:'Most capable.'},
    'claude-opus-4-5':{name:'Claude Opus 4.5',provider:'Anthropic',logo:'🟣',badge:'Advanced',desc:'Advanced.'},
    'claude-opus-4':{name:'Claude Opus 4',provider:'Anthropic',logo:'🟣',badge:'Base',desc:'Base opus.'},
    'claude-sonnet-4-5':{name:'Claude Sonnet 4.5',provider:'Anthropic',logo:'🟣',badge:'Writing',desc:'Writing & code.'},
    'claude-sonnet-4':{name:'Claude Sonnet 4',provider:'Anthropic',logo:'🟣',badge:'Balanced',desc:'Balanced.'},
    'claude-haiku-4-5':{name:'Claude Haiku 4.5',provider:'Anthropic',logo:'🟣',badge:'Fast',desc:'Ultra fast.'},
    'gemini-3-pro-preview':{name:'Gemini 3 Pro',provider:'Google',logo:'🔵',badge:'Latest',desc:'Latest Google.'},
    'gemini-3-flash-preview':{name:'Gemini 3 Flash',provider:'Google',logo:'🔵',badge:'Flash',desc:'Fast.'},
    'gemini-2.5-pro':{name:'Gemini 2.5 Pro',provider:'Google',logo:'🔵',badge:'Pro',desc:'Stable pro.'},
    'gemini-2.5-flash':{name:'Gemini 2.5 Flash',provider:'Google',logo:'🔵',badge:'Flash',desc:'Fast.'},
    'gemini-2.0-flash':{name:'Gemini 2.0 Flash',provider:'Google',logo:'🔵',badge:'Stable',desc:'Stable.'},
    'x-ai/grok-4-1-fast':{name:'Grok 4.1 Fast',provider:'xAI',logo:'⚫',badge:'Latest',desc:'Latest Grok.'},
    'x-ai/grok-4':{name:'Grok 4',provider:'xAI',logo:'⚫',badge:'Base',desc:'Grok 4.'},
    'x-ai/grok-code-fast-1':{name:'Grok Code',provider:'xAI',logo:'⚫',badge:'Code',desc:'Code Grok.'},
    'x-ai/grok-3':{name:'Grok 3',provider:'xAI',logo:'⚫',badge:'V3',desc:'Grok 3.'},
    'x-ai/grok-3-mini':{name:'Grok 3 Mini',provider:'xAI',logo:'⚫',badge:'Mini',desc:'Mini.'},
    'meta-llama/llama-4-maverick':{name:'LLaMA 4 Maverick',provider:'Meta',logo:'🟠',badge:'Latest',desc:'Most powerful.'},
    'meta-llama/llama-4-scout':{name:'LLaMA 4 Scout',provider:'Meta',logo:'🟠',badge:'Vision',desc:'Vision.'},
    'meta-llama/llama-3.3-70b-instruct':{name:'LLaMA 3.3 70B',provider:'Meta',logo:'🟠',badge:'70B',desc:'Large.'},
    'meta-llama/llama-3.1-405b-instruct':{name:'LLaMA 3.1 405B',provider:'Meta',logo:'🟠',badge:'Massive',desc:'Largest.'},
    'meta-llama/llama-3.1-8b-instruct':{name:'LLaMA 3.1 8B',provider:'Meta',logo:'🟠',badge:'Fast',desc:'Fast.'}
};

// Response Parser
function parseResponse(r, m) {
    if (!r) return 'No response.';
    if (m.startsWith('claude')) return r?.message?.content?.[0]?.text || r?.message?.content || String(r);
    if (m.startsWith('x-ai/') || m.startsWith('meta-llama/')) return r?.message?.content || String(r);
    if (typeof r === 'string') return r;
    if (r?.message?.content) return r.message.content;
    return String(r);
}

// Global State
const state = {
    user: null,
    discussions: [],
    files: [],
    aiQueryCount: 0,
    currentFilter: 'all',
    selectedModel: 'gpt-5.2',
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