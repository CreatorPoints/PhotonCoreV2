/* ========================================
   PHOTON CORE — config.js
   ======================================== */

const GEMINI_API_KEY = 'AIzaSyBm5Eo-KBpq7mXRLruApCykA9vLJPFoE6U';
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
    // Gemini 3
    'gemini-3-pro': {
        name: 'Gemini 3 Pro',
        provider: 'Google',
        logo: '🔵',
        badge: 'Latest',
        desc: 'Latest and most capable Gemini.',
        rpm: 15, rpd: 1500
    },
    'gemini-3-flash': {
        name: 'Gemini 3 Flash',
        provider: 'Google',
        logo: '🔵',
        badge: 'Fast',
        desc: 'Latest fast model.',
        rpm: 5, rpd: 20
    },

    // Gemini 2.5
    'gemini-2.5-pro': {
        name: 'Gemini 2.5 Pro',
        provider: 'Google',
        logo: '🔵',
        badge: 'Pro',
        desc: 'Powerful reasoning and code.',
        rpm: 15, rpd: 1500
    },
    'gemini-2.5-flash': {
        name: 'Gemini 2.5 Flash',
        provider: 'Google',
        logo: '⚡',
        badge: 'Flash',
        desc: 'Fast and smart. Great default.',
        rpm: 5, rpd: 20
    },
    'gemini-2.5-flash-lite': {
        name: 'Gemini 2.5 Flash Lite',
        provider: 'Google',
        logo: '💨',
        badge: 'Lite',
        desc: 'Lightest 2.5 model. Ultra fast.',
        rpm: 10, rpd: 20
    },

    // Gemini 2.0
    'gemini-2.0-flash': {
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        logo: '🔵',
        badge: 'Stable',
        desc: 'Stable and reliable.',
        rpm: 15, rpd: 1500
    },
    'gemini-2.0-flash-exp': {
        name: 'Gemini 2.0 Flash Exp',
        provider: 'Google',
        logo: '🧪',
        badge: 'Experimental',
        desc: 'Experimental features.',
        rpm: 15, rpd: 1500
    },
    'gemini-2.0-flash-lite': {
        name: 'Gemini 2.0 Flash Lite',
        provider: 'Google',
        logo: '💨',
        badge: 'Lite',
        desc: 'Lightest 2.0 model.',
        rpm: 15, rpd: 1500
    },
    'gemini-2.0-pro-exp': {
        name: 'Gemini 2.0 Pro Exp',
        provider: 'Google',
        logo: '🧪',
        badge: 'Pro Exp',
        desc: 'Experimental pro model.',
        rpm: 15, rpd: 1500
    },

    // Gemma (open models)
    'gemma-3-27b': {
        name: 'Gemma 3 27B',
        provider: 'Google',
        logo: '🟢',
        badge: '27B',
        desc: 'Largest open Gemma model.',
        rpm: 30, rpd: 14400
    },
    'gemma-3-12b': {
        name: 'Gemma 3 12B',
        provider: 'Google',
        logo: '🟢',
        badge: '12B',
        desc: 'Medium Gemma model.',
        rpm: 30, rpd: 14400
    },
    'gemma-3-4b': {
        name: 'Gemma 3 4B',
        provider: 'Google',
        logo: '🟢',
        badge: '4B',
        desc: 'Small and fast Gemma.',
        rpm: 30, rpd: 14400
    },
    'gemma-3-2b': {
        name: 'Gemma 3 2B',
        provider: 'Google',
        logo: '🟢',
        badge: '2B',
        desc: 'Tiny Gemma. Ultra fast.',
        rpm: 30, rpd: 14400
    },
    'gemma-3-1b': {
        name: 'Gemma 3 1B',
        provider: 'Google',
        logo: '🟢',
        badge: '1B',
        desc: 'Smallest Gemma.',
        rpm: 30, rpd: 14400
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

// === GEMINI API ===
function toGeminiMessages(messages){
    let systemInstruction='';const contents=[];
    for(const msg of messages){if(msg.role==='system'){systemInstruction=msg.content;continue}contents.push({role:msg.role==='assistant'?'model':'user',parts:[{text:msg.content}]})}
    const merged=[];for(const c of contents){if(merged.length>0&&merged[merged.length-1].role===c.role){merged[merged.length-1].parts[0].text+='\n'+c.parts[0].text}else{merged.push(c)}}
    if(merged.length>0&&merged[0].role==='model'){merged.unshift({role:'user',parts:[{text:'(start)'}]})}
    return{systemInstruction,contents:merged};
}

async function geminiChat(messages,modelId){
    if(!GEMINI_API_KEY||GEMINI_API_KEY==='PASTE-YOUR-KEY-HERE'){throw new Error('Set your Gemini API key in config.js')}
    const{systemInstruction,contents}=toGeminiMessages(messages);
    const url=GEMINI_BASE_URL+modelId+':generateContent?key='+GEMINI_API_KEY;
    const body={contents};if(systemInstruction)body.systemInstruction={parts:[{text:systemInstruction}]};
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok){const err=await r.json().catch(()=>({}));throw new Error(err?.error?.message||'Gemini error: '+r.status)}
    const data=await r.json();return data?.candidates?.[0]?.content?.parts?.[0]?.text||'No response.';
}

async function* geminiChatStream(messages,modelId){
    if(!GEMINI_API_KEY||GEMINI_API_KEY==='PASTE-YOUR-KEY-HERE'){throw new Error('Set your Gemini API key in config.js')}
    const{systemInstruction,contents}=toGeminiMessages(messages);
    const url=GEMINI_BASE_URL+modelId+':streamGenerateContent?alt=sse&key='+GEMINI_API_KEY;
    const body={contents};if(systemInstruction)body.systemInstruction={parts:[{text:systemInstruction}]};
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok){const err=await r.json().catch(()=>({}));throw new Error(err?.error?.message||'Gemini error: '+r.status)}
    const reader=r.body.getReader();const decoder=new TextDecoder();let buffer='';
    while(true){const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';
    for(const line of lines){const trimmed=line.trim();if(!trimmed||!trimmed.startsWith('data: '))continue;const data=trimmed.slice(6);if(data==='[DONE]')return;
    try{const parsed=JSON.parse(data);const text=parsed?.candidates?.[0]?.content?.parts?.[0]?.text;if(text)yield text}catch(e){}}}
}
