/* ========================================
   PHOTON CORE — boot.js
   ======================================== */

function createParticles(){
    const c=document.getElementById('particles');if(!c)return;
    for(let i=0;i<30;i++){const p=document.createElement('div');p.style.cssText='position:absolute;width:'+(Math.random()*4+1)+'px;height:'+(Math.random()*4+1)+'px;background:rgba(108,92,231,'+(Math.random()*.5+.1)+');border-radius:50%;top:'+(Math.random()*100)+'%;left:'+(Math.random()*100)+'%;animation:pf '+(Math.random()*10+5)+'s ease-in-out infinite '+(Math.random()*5)+'s';c.appendChild(p)}
    document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'@keyframes pf{0%,100%{transform:translate(0,0);opacity:.5}50%{transform:translate('+(Math.random()*60-30)+'px,'+(Math.random()*60-30)+'px);opacity:.3}}'}));
}

function setupTypingListener() {
    // Check if rtdb is available
    if (typeof rtdb === 'undefined' && typeof window.rtdb === 'undefined') {
        console.warn('RTDB not available for typing listener');
        return;
    }
    
    const database = rtdb || window.rtdb;
    
    database.ref('typing').on('value', snap => {
        const typing = snap.val();
        if (!typing || !dom.typingIndicator) return;

        const currentTyping = state.currentChatId ? typing[state.currentChatId] : null;

        if (currentTyping && currentTyping.typing && currentTyping.user !== state.user?.username) {
            if (dom.typingIndicator) dom.typingIndicator.classList.remove('hidden');
            if (dom.typingUser) dom.typingUser.textContent = currentTyping.user + ' via ' + currentTyping.model;
        } else if (!state.isTyping) {
            if (dom.typingIndicator) dom.typingIndicator.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Photon Core...');
    
    // 1. Initialize DOM
    if (typeof initDom === 'function') {
        initDom();
        console.log('✓ DOM initialized');
    }
    
    // 2. Create particles
    createParticles();
    console.log('✓ Particles created');
    
    // 3. Setup auth listeners
    if (typeof setupAuthListeners === 'function') {
        setupAuthListeners();
        console.log('✓ Auth listeners setup');
    }
    
    // 4. Initialize auth
    if (typeof initAuth === 'function') {
        await initAuth();
        console.log('✓ Auth initialized');
    }
    
    // 5. Setup typing listener
    setTimeout(setupTypingListener, 1000);

    // === EVENT LISTENERS ===
    
    if(dom.btnSignIn)dom.btnSignIn.addEventListener('click',()=>{
        sessionStorage.setItem('photon_just_signed_in','true');
        if(typeof handleSignIn==='function')handleSignIn();
    });

    document.querySelectorAll('.nav-item').forEach(i=>{
        if(i.tagName.toUpperCase()==='BUTTON')i.addEventListener('click',()=>{
            if(typeof switchTab==='function')switchTab(i.dataset.tab);
        });
    });

    if(dom.mobileMenuBtn)dom.mobileMenuBtn.addEventListener('click',()=>{
        document.querySelector('.sidebar')?.classList.toggle('open');
        let o=document.querySelector('.sidebar-overlay');
        if(!o){
            o=document.createElement('div');
            o.className='sidebar-overlay';
            o.addEventListener('click',()=>{
                document.querySelector('.sidebar')?.classList.remove('open');
                o.classList.remove('active');
            });
            document.body.appendChild(o);
        }
        o.classList.toggle('active');
    });

    if(dom.aiModelSelect)dom.aiModelSelect.addEventListener('change',()=>{
        state.selectedModel=dom.aiModelSelect.value;
        if(typeof updateBotIdentity==='function')updateBotIdentity();
        if(typeof puter!=='undefined')puter.kv.set('photon_selected_model',state.selectedModel).catch(()=>{});
        showToast('Switched to '+AI_MODELS[state.selectedModel]?.name+' ✨','success');
    });

    if(dom.btnToggleMemory)dom.btnToggleMemory.addEventListener('click',()=>{
        if(dom.memoryList){
            dom.memoryList.classList.toggle('hidden');
            dom.btnToggleMemory.textContent=dom.memoryList.classList.contains('hidden')?'Show':'Hide';
        }
    });
    
    if(dom.btnClearMemory)dom.btnClearMemory.addEventListener('click',async()=>{
        if(!confirm('Clear ALL?'))return;
        try{
            const snap=await db.collection('memories').get();
            const batch=db.batch();
            snap.forEach(doc=>batch.delete(doc.ref));
            await batch.commit();
            showToast('Cleared.','info');
        }catch(e){console.error(e)}
    });
    
    if(dom.btnDismissTip)dom.btnDismissTip.addEventListener('click',()=>{
        if(dom.memoryTipBanner)dom.memoryTipBanner.classList.add('dismissed');
        if(typeof puter!=='undefined')puter.kv.set('photon_tip_dismissed','true').catch(()=>{});
    });

    if(dom.btnNewChat&&typeof createNewChat==='function')dom.btnNewChat.addEventListener('click',createNewChat);
    if(dom.btnAiSend&&typeof sendAiMessage==='function')dom.btnAiSend.addEventListener('click',sendAiMessage);
    if(dom.aiInput)dom.aiInput.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&!e.shiftKey){
            e.preventDefault();
            if(typeof sendAiMessage==='function')sendAiMessage();
        }
    });
    
    document.querySelectorAll('.preset-btn').forEach(b=>b.addEventListener('click',()=>{
        if(dom.aiInput){
            dom.aiInput.value=b.dataset.prompt;
            if(typeof sendAiMessage==='function')sendAiMessage();
        }
    }));
    
    if(dom.btnAiAttach)dom.btnAiAttach.addEventListener('click',()=>dom.aiFileInput?.click());
    if(dom.aiFileInput&&typeof handleFileAttach==='function')dom.aiFileInput.addEventListener('change',handleFileAttach);
    if(dom.btnRemoveAttachment&&typeof clearAttachment==='function')dom.btnRemoveAttachment.addEventListener('click',clearAttachment);

    if(dom.btnPostDiscussion&&typeof postDiscussion==='function')dom.btnPostDiscussion.addEventListener('click',postDiscussion);
    
    document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>{
        document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        state.currentFilter=b.dataset.filter;
        if(typeof renderDiscussions==='function')renderDiscussions();
    }));

    if(dom.btnBrowse)dom.btnBrowse.addEventListener('click',()=>dom.fileInput?.click());
    
    if(dom.uploadZone){
        dom.uploadZone.addEventListener('click',e=>{if(e.target!==dom.btnBrowse)dom.fileInput?.click()});
        dom.uploadZone.addEventListener('dragover',e=>{e.preventDefault();dom.uploadZone.classList.add('drag-over')});
        dom.uploadZone.addEventListener('dragleave',()=>dom.uploadZone.classList.remove('drag-over'));
        dom.uploadZone.addEventListener('drop',e=>{
            e.preventDefault();
            dom.uploadZone.classList.remove('drag-over');
            if(typeof uploadFiles==='function')uploadFiles(e.dataTransfer.files);
        });
    }
    
    if(dom.fileInput)dom.fileInput.addEventListener('change',e=>{
        if(typeof uploadFiles==='function')uploadFiles(e.target.files);
    });
    
    if(dom.btnRefreshFiles&&typeof loadFiles==='function')dom.btnRefreshFiles.addEventListener('click',loadFiles);
    
    if(dom.btnNewFolder)dom.btnNewFolder.addEventListener('click',async()=>{
        const n=prompt('Folder name:');
        if(!n?.trim())return;
        try{
            if(typeof puter!=='undefined')await puter.fs.mkdir('PhotonCore/files/'+n.trim(),{dedupeName:false});
            showToast('Created!','success');
            if(typeof loadFiles==='function')loadFiles();
        }catch(e){showToast('Failed.','error')}
    });
    
    if(dom.btnSaveProfile&&typeof saveProfile==='function')dom.btnSaveProfile.addEventListener('click',saveProfile);
    
    console.log('✅ Photon Core ready!');
});
