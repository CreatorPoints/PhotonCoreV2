/* ========================================
   PHOTON CORE — config.js
   ======================================== */

const OPENROUTER_API_KEY = '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';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_SITE_NAME = 'Photon Core';
const OPENROUTER_SITE_URL = window.location.origin;

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
        name: 'Trinity Large',
        provider: 'Arcee AI',
        logo: '🆓',
        badge: 'Free',
        desc: 'Free powerful model by Arcee AI.'
    }
};

const DEFAULT_MODEL = 'arcee-ai/trinity-large-preview:free';

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

async function openRouterChat(messages,modelId,stream=false){
    if(!OPENROUTER_API_KEY||OPENROUTER_API_KEY==='PASTE-YOUR-KEY-HERE'){throw new Error('Set your OpenRouter API key in config.js')}
    const r=await fetch(OPENROUTER_BASE_URL,{method:'POST',headers:{'Authorization':'Bearer '+OPENROUTER_API_KEY,'Content-Type':'application/json','HTTP-Referer':OPENROUTER_SITE_URL,'X-Title':OPENROUTER_SITE_NAME},body:JSON.stringify({model:modelId,messages:messages,stream:stream})});
    if(!r.ok){const err=await r.json().catch(()=>({}));throw new Error(err?.error?.message||'API error: '+r.status)}
    return r;
}
async function openRouterChatSimple(messages,modelId){const r=await openRouterChat(messages,modelId,false);const d=await r.json();return d?.choices?.[0]?.message?.content||'No response.'}
async function* openRouterChatStream(messages,modelId){
    const r=await openRouterChat(messages,modelId,true);const reader=r.body.getReader();const decoder=new TextDecoder();let buffer='';
    while(true){const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';
    for(const line of lines){const trimmed=line.trim();if(!trimmed||!trimmed.startsWith('data: '))continue;const data=trimmed.slice(6);if(data==='[DONE]')return;
    try{const parsed=JSON.parse(data);const content=parsed?.choices?.[0]?.delta?.content;if(content)yield content}catch(e){}}}
}