/* ========================================
   PHOTON CORE — auth.js
   ======================================== */

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const isAuthPage = (currentPage === 'index.html' || currentPage === '');
const appPages = ['dashboard.html','discussions.html','files.html','ai.html','members.html'];
const isAppPage = appPages.includes(currentPage);

async function initAuth(){
    try{
        const u = await puter.auth.getUser();
        if(u){
            if(isAuthPage){window.location.href='dashboard.html';return}
            onAppPageReady(u);
        }else{
            if(isAppPage){window.location.href='index.html';return}
        }
    }catch(e){
        if(isAppPage){window.location.href='index.html';return}
    }
}

async function handleSignIn(){
    try{await puter.auth.signIn();window.location.href='dashboard.html'}catch(e){showToast('Sign in failed.','error')}
}

function onAppPageReady(user){
    state.user=user;const n=user.username||'Member';
    if(dom.userName)dom.userName.textContent=n;
    if(dom.userAvatar)dom.userAvatar.textContent=n.substring(0,2).toUpperCase();
    if(dom.welcomeName)dom.welcomeName.textContent=n;
    if(dom.app)dom.app.classList.remove('hidden');
    const j=sessionStorage.getItem('photon_just_signed_in');
    if(j){showToast('Welcome, '+n+'! ⚡','success');sessionStorage.removeItem('photon_just_signed_in')}
    initAppData();
}

async function initAppData(){
    await ensureBaseFolder();loadSavedModel();setupPresence();
    listenDiscussions();listenMemories();listenActivity();listenChatSessions();
    loadFiles();loadProfile();setupPresenceListener();loadTipState();
}

async function ensureBaseFolder(){
    try{await puter.fs.mkdir('PhotonCore',{dedupeName:false})}catch(e){}
    try{await puter.fs.mkdir('PhotonCore/files',{dedupeName:false})}catch(e){}
    state.filesReady=true;
}