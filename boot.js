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
    if (!rtdb || !dom.typingIndicator) return;
    
    rtdb.ref('typing').on('value',snap=>{
        const typing=snap.val();
        if(!typing)return;

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

// Wait for everything to be ready
async function initializeApp() {
    console.log('🚀 Initializing Photon Core...');
    
    // 1. Initialize DOM
    initDom();
    console.log('✓ DOM initialized');
    
    // 2. Create particles
    createParticles();
    console.log('✓ Particles created');
    
    // 3. Wait for Firebase
    try {
        await waitForFirebase();
        console.log('✓ Firebase ready');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        showToast('Failed to connect to services', 'error');
        return;
    }
    
    // 4. Initialize auth
    await initAuth();
    console.log('✓ Auth initialized');
    
    // 5. Start typing listener
    setupTypingListener();
    console.log('✓ Typing listener active');
    
    console.log('✅ Photon Core ready!');
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();

    // ... rest of your event listeners stay the same ...
});
