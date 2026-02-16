/* ========================================
   PHOTON CORE — boot.js
   ======================================== */

function createParticles(){
    const c=document.getElementById('particles');if(!c)return;
    for(let i=0;i<30;i++){const p=document.createElement('div');p.style.cssText='position:absolute;width:'+(Math.random()*4+1)+'px;height:'+(Math.random()*4+1)+'px;background:rgba(108,92,231,'+(Math.random()*.5+.1)+');border-radius:50%;top:'+(Math.random()*100)+'%;left:'+(Math.random()*100)+'%;animation:pf '+(Math.random()*10+5)+'s ease-in-out infinite '+(Math.random()*5)+'s';c.appendChild(p)}
    document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'@keyframes pf{0%,100%{transform:translate(0,0);opacity:.5}50%{transform:translate('+(Math.random()*60-30)+'px,'+(Math.random()*60-30)+'px);opacity:.3}}'}));
}

// Listen for typing indicators from other users
function setupTypingListener(){
    rtdb.ref('typing').on('value',snap=>{
        const typing=snap.val();
        if(!typing||!dom.typingIndicator)return;

        // Find if anyone is typing in current chat
        const currentTyping=state.currentChatId?typing[state.currentChatId]:null;

        if(currentTyping&&currentTyping.typing&&currentTyping.user!==state.user?.username){
            // Someone else is typing
            if(dom.typingIndicator)dom.typingIndicator.classList.remove('hidden');
            if(dom.typingUser)dom.typingUser.textContent=currentTyping.user+' via '+currentTyping.model;
        }else if(!state.isTyping){
            // Nobody typing (and we're not typing either)
            if(dom.typingIndicator)dom.typingIndicator.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded',()=>{
    initDom();createParticles();initAuth();

    // Start typing listener
    setupTypingListener();

    if(dom.btnSignIn)dom.btnSignIn.addEventListener('click',()=>{sessionStorage.setItem('photon_just_signed_in','true');handleSignIn()});
    if(dom.btnSignOut)dom.btnSignOut.addEventListener('click',async()=>{const uid=state.user?.username;if(uid)try{rtdb.ref('presence/'+uid).set({online:false,lastSeen:firebase.database.ServerValue.TIMESTAMP})}catch(e){}try{await puter.auth.signOut()}catch(e){}state.user=null;window.location.href='index.html'});

    document.querySelectorAll('.nav-item').forEach(i=>{if(i.tagName.toUpperCase()==='BUTTON')i.addEventListener('click',()=>switchTab(i.dataset.tab))});

    if(dom.mobileMenuBtn)dom.mobileMenuBtn.addEventListener('click',()=>{document.querySelector('.sidebar')?.classList.toggle('open');let o=document.querySelector('.sidebar-overlay');if(!o){o=document.createElement('div');o.className='sidebar-overlay';o.addEventListener('click',closeMobileSidebar);document.body.appendChild(o)}o.classList.toggle('active')});

    if(dom.aiModelSelect)dom.aiModelSelect.addEventListener('change',()=>{state.selectedModel=dom.aiModelSelect.value;updateBotIdentity();puter.kv.set('photon_selected_model',state.selectedModel).catch(()=>{});showToast('Switched to '+AI_MODELS[state.selectedModel]?.name+' ✨','success')});

    if(dom.btnToggleMemory)dom.btnToggleMemory.addEventListener('click',()=>{if(dom.memoryList){dom.memoryList.classList.toggle('hidden');dom.btnToggleMemory.textContent=dom.memoryList.classList.contains('hidden')?'Show':'Hide'}});
    if(dom.btnClearMemory)dom.btnClearMemory.addEventListener('click',async()=>{if(!confirm('Clear ALL?'))return;const snap=await db.collection('memories').get();const batch=db.batch();snap.forEach(doc=>batch.delete(doc.ref));await batch.commit();showToast('Cleared.','info')});
    if(dom.btnDismissTip)dom.btnDismissTip.addEventListener('click',()=>{if(dom.memoryTipBanner)dom.memoryTipBanner.classList.add('dismissed');puter.kv.set('photon_tip_dismissed','true').catch(()=>{})});

    if(dom.btnNewChat)dom.btnNewChat.addEventListener('click',createNewChat);
    if(dom.btnAiSend)dom.btnAiSend.addEventListener('click',sendAiMessage);
    if(dom.aiInput)dom.aiInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAiMessage()}});
    document.querySelectorAll('.preset-btn').forEach(b=>b.addEventListener('click',()=>{if(dom.aiInput){dom.aiInput.value=b.dataset.prompt;sendAiMessage()}}));
    if(dom.btnAiAttach)dom.btnAiAttach.addEventListener('click',()=>dom.aiFileInput?.click());
    if(dom.aiFileInput)dom.aiFileInput.addEventListener('change',handleFileAttach);
    if(dom.btnRemoveAttachment)dom.btnRemoveAttachment.addEventListener('click',clearAttachment);

    if(dom.btnPostDiscussion)dom.btnPostDiscussion.addEventListener('click',postDiscussion);
    document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.currentFilter=b.dataset.filter;renderDiscussions()}));

    if(dom.btnBrowse)dom.btnBrowse.addEventListener('click',()=>dom.fileInput?.click());
    if(dom.uploadZone){dom.uploadZone.addEventListener('click',e=>{if(e.target!==dom.btnBrowse)dom.fileInput?.click()});dom.uploadZone.addEventListener('dragover',e=>{e.preventDefault();dom.uploadZone.classList.add('drag-over')});dom.uploadZone.addEventListener('dragleave',()=>dom.uploadZone.classList.remove('drag-over'));dom.uploadZone.addEventListener('drop',e=>{e.preventDefault();dom.uploadZone.classList.remove('drag-over');uploadFiles(e.dataTransfer.files)})}
    if(dom.fileInput)dom.fileInput.addEventListener('change',e=>uploadFiles(e.target.files));
    if(dom.btnRefreshFiles)dom.btnRefreshFiles.addEventListener('click',loadFiles);
    if(dom.btnNewFolder)dom.btnNewFolder.addEventListener('click',async()=>{const n=prompt('Folder name:');if(!n?.trim())return;try{await puter.fs.mkdir('PhotonCore/files/'+n.trim(),{dedupeName:false});showToast('Created!','success');loadFiles()}catch(e){showToast('Failed.','error')}});
    if(dom.btnSaveProfile)dom.btnSaveProfile.addEventListener('click',saveProfile);
});
