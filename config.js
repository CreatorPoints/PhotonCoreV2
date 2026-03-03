/* ========================================
   PHOTON CORE — config.js
   ======================================== */


const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

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

const AI_MODELS = {
'arcee-ai/trinity-large-preview:free': {
  name: 'Trinity Large Preview (Balanced / General Intelligence)',
  provider: 'OpenRouter',
  logo: '🔷',
  badge: 'Free'
},

'arcee-ai/trinity-mini:free': {
  name: 'Trinity Mini (Fast / Lightweight Chat)',
  provider: 'OpenRouter',
  logo: '🔹',
  badge: 'Free'
},

'stepfun/step-3.5-flash:free': {
  name: 'Step 3.5 Flash (Ultra Fast / Short Replies)',
  provider: 'OpenRouter',
  logo: '⚡',
  badge: 'Free'
},

'z-ai/glm-4.5-air:free': {
  name: 'GLM 4.5 Air (Smart / Multilingual)',
  provider: 'OpenRouter',
  logo: '🌪️',
  badge: 'Free'
},

'nvidia/nemotron-3-nano-30b-a3b:free': {
  name: 'Nemotron 30B Nano (Reasoning / Large Context)',
  provider: 'OpenRouter',
  logo: '🟢',
  badge: 'Free'
},

'nvidia/nemotron-nano-9b-v2:free': {
  name: 'Nemotron 9B v2 (Fast / Stable)',
  provider: 'OpenRouter',
  logo: '🟩',
  badge: 'Free'
},

'openai/gpt-oss-120b:free': {
  name: 'GPT-OSS 120B (High Intelligence / Heavy)',
  provider: 'OpenRouter',
  logo: '🧠',
  badge: 'Free'
},

'openai/gpt-oss-20b:free': {
  name: 'GPT-OSS 20B (Balanced / Smart Chat)',
  provider: 'OpenRouter',
  logo: '🧩',
  badge: 'Free'
},

'meta-llama/llama-3.3-70b-instruct:free': {
  name: 'Llama 3.3 70B (Strong Reasoning / Creative)',
  provider: 'OpenRouter',
  logo: '🦙',
  badge: 'Free'
},

'meta-llama/llama-3.2-3b-instruct:free': {
  name: 'Llama 3.2 3B (Lightweight / Quick)',
  provider: 'OpenRouter',
  logo: '🐐',
  badge: 'Free'
},

'google/gemma-3-27b-it:free': {
  name: 'Gemma 3 27B (Detailed / Long Answers)',
  provider: 'OpenRouter',
  logo: '💎',
  badge: 'Free'
},

'google/gemma-3-12b-it:free': {
  name: 'Gemma 3 12B (Balanced / General)',
  provider: 'OpenRouter',
  logo: '🔷',
  badge: 'Free'
},

'google/gemma-3-4b-it:free': {
  name: 'Gemma 3 4B (Light / Fast)',
  provider: 'OpenRouter',
  logo: '🔵',
  badge: 'Free'
},

'google/gemma-3n-e4b-it:free': {
  name: 'Gemma 3n E4B (Efficient / Optimized)',
  provider: 'OpenRouter',
  logo: '🌐',
  badge: 'Free'
},

'google/gemma-3n-e2b-it:free': {
  name: 'Gemma 3n E2B (Ultra Lightweight)',
  provider: 'OpenRouter',
  logo: '🫧',
  badge: 'Free'
},

'qwen/qwen3-coder:free': {
  name: 'Qwen 3 Coder (Coding Specialist)',
  provider: 'OpenRouter',
  logo: '👨‍💻',
  badge: 'Free'
},

'qwen/qwen3-4b:free': {
  name: 'Qwen 3 4B (General / Compact)',
  provider: 'OpenRouter',
  logo: '📘',
  badge: 'Free'
},

'mistralai/mistral-small-3.1-24b-instruct:free': {
  name: 'Mistral Small 3.1 24B (Reasoning / Clean Output)',
  provider: 'OpenRouter',
  logo: '🌀',
  badge: 'Free'
},

'cognitivecomputations/dolphin-mistral-24b-venice-edition:free': {
  name: 'Dolphin Mistral 24B (Creative / Personality)',
  provider: 'OpenRouter',
  logo: '🐬',
  badge: 'Free'
},

'liquid/lfm-2.5-1.2b-thinking:free': {
  name: 'LFM 2.5 Thinking (Step-by-Step Reasoning)',
  provider: 'OpenRouter',
  logo: '🤔',
  badge: 'Free'
},

'liquid/lfm-2.5-1.2b-instruct:free': {
  name: 'LFM 2.5 Instruct (Simple / Fast)',
  provider: 'OpenRouter',
  logo: '📄',
  badge: 'Free'
},

'nousresearch/hermes-3-llama-3.1-405b:free': {
  name: 'Hermes 3 Llama 405B (Massive / Deep Intelligence)',
  provider: 'OpenRouter',
  logo: '🏛️',
  badge: 'Free'
},

'nvidia/llama-nemotron-embed-vl-1b-v2:free': {
  name: 'Nemotron Embed VL (Embeddings / Vision)',
  provider: 'OpenRouter',
  logo: '🖼️',
  badge: 'Free'
},

'openrouter/free': {
  name: 'Select Random (Auto Pick Free Model)',
  provider: 'OpenRouter',
  logo: '🎲',
  badge: 'Free'
}
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

const state = {
    user:null,discussions:[],files:[],aiQueryCount:0,currentFilter:'all',
    selectedModel:DEFAULT_MODEL,memories:[],chatSessions:[],currentChatId:null,
    currentChatMessages:[],filesReady:false,attachedFile:null,attachedFileContent:null,
    attachedFileName:'',isTyping:false,onlineUsers:{}
};

let dom = {};
function initDom(){
    ['auth-screen','app','btn-sign-in','btn-sign-out','user-name','user-avatar',
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
    'toast-container'].forEach(id=>{
        dom[id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=document.getElementById(id);
    });
}

function showToast(m,t='info'){
    if(!dom.toastContainer)return;
    const e=document.createElement('div');e.className='toast '+t;
    e.innerHTML='<span>'+ ({success:'✅',error:'❌',info:'ℹ️'}[t]||'ℹ️') +'</span><span>'+m+'</span>';
    dom.toastContainer.appendChild(e);
    setTimeout(()=>{e.style.animation='to .3s ease forwards';setTimeout(()=>e.remove(),300)},3500);
}
function esc(t){const d=document.createElement('div');d.textContent=t||'';return d.innerHTML}
function fmtDate(iso){const d=new Date(iso),n=new Date(),ms=n-d,min=Math.floor(ms/60000),hr=Math.floor(ms/3600000),day=Math.floor(ms/86400000);if(min<1)return'Now';if(min<60)return min+'m';if(hr<24)return hr+'h';if(day<7)return day+'d';return d.toLocaleDateString()}
function fmtSize(b){if(!b)return'0 B';const s=['B','KB','MB','GB'];const i=Math.floor(Math.log(b)/Math.log(1024));return(b/Math.pow(1024,i)).toFixed(1)+' '+s[i]}
function fileIcon(n,d){if(d)return'📁';const e=n.split('.').pop().toLowerCase();return{png:'🖼️',jpg:'🖼️',jpeg:'🖼️',gif:'🖼️',svg:'🖼️',webp:'🖼️',mp3:'🎵',wav:'🎵',ogg:'🎵',mp4:'🎬',pdf:'📄',doc:'📝',docx:'📝',txt:'📝',zip:'📦',rar:'📦',js:'💻',ts:'💻',py:'💻',cs:'💻',cpp:'💻',html:'🌐',css:'🎨',json:'⚙️',md:'📝',gd:'🎮',godot:'🎮',unity:'🎮',blend:'🎨',psd:'🎨'}[e]||'📄'}
function formatAi(t){let f=esc(t);f=f.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');f=f.replace(/\*(.*?)\*/g,'<em>$1</em>');f=f.replace(/`(.*?)`/g,'<code style="background:rgba(108,92,231,.2);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:.85em">$1</code>');f=f.replace(/\n/g,'<br>');return'<p>'+f+'</p>'}

// === OPENROUTER API (SECURE VIA VERCEL /api/openrouter) ===


// Convert internal messages to OpenRouter format
function toOpenRouterMessages(messages){

    const formatted = [];

    for(const msg of messages){
        formatted.push({
            role: msg.role, // 'system' | 'user' | 'assistant'
            content: msg.content
        });
    }

    // Merge consecutive same-role messages (cleaner context)
    const merged = [];

    for(const msg of formatted){
        if(
            merged.length > 0 &&
            merged[merged.length - 1].role === msg.role
        ){
            merged[merged.length - 1].content += "\n" + msg.content;
        } else {
            merged.push({ ...msg });
        }
    }

    return merged;
}



// ===== NON-STREAMING =====
async function geminiChat(messages, modelId){

    const formattedMessages = toOpenRouterMessages(messages);

    const r = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
            modelId,
            messages: formattedMessages,
            stream: false
        })
    });

    if(!r.ok){
        const err = await r.text().catch(()=> '');
        throw new Error("Server error: " + r.status + " " + err);
    }

    const data = await r.json();

    return data?.choices?.[0]?.message?.content || "No response.";
}




// ===== STREAMING =====
async function* geminiChatStream(messages, modelId){

    const formattedMessages = toOpenRouterMessages(messages);

    const r = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
            modelId,
            messages: formattedMessages,
            stream: true
        })
    });

    if(!r.ok){
        const err = await r.text().catch(()=> '');
        throw new Error("Server error: " + r.status + " " + err);
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while(true){
        const { done, value } = await reader.read();
        if(done) break;

        buffer += decoder.decode(value, { stream:true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for(const line of lines){
            const trimmed = line.trim();
            if(!trimmed || !trimmed.startsWith('data:')) continue;

            const payload = trimmed.replace(/^data:\s*/, '');

            if(payload === '[DONE]') return;

            try{
                const parsed = JSON.parse(payload);
                const text = parsed?.choices?.[0]?.delta?.content;
                if(text) yield text;
            }catch{}
        }
    }
}
