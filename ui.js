/* ========================================
   PHOTON CORE — ui.js
   ======================================== */

const tabTitles={dashboard:'Dashboard',discussions:'Discussions',files:'Files',ai:'AI Assistant',members:'Members'};

function switchTab(t){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));document.querySelector('.nav-item[data-tab="'+t+'"]')?.classList.add('active');document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));document.getElementById('tab-'+t)?.classList.add('active');if(dom.pageTitle)dom.pageTitle.textContent=tabTitles[t]||'';closeMobileSidebar();if(t==='members')renderMembers()}
function closeMobileSidebar(){document.querySelector('.sidebar')?.classList.remove('open');document.querySelector('.sidebar-overlay')?.classList.remove('active')}

function updateBotIdentity(){const m=AI_MODELS[state.selectedModel];if(!m)return;if(dom.modelActiveBadge)dom.modelActiveBadge.textContent=m.name;if(dom.modelInfoText)dom.modelInfoText.textContent=m.desc;if(dom.botLogo)dom.botLogo.textContent=m.logo;if(dom.botName)dom.botName.textContent=m.name;if(dom.botProvider)dom.botProvider.textContent='by '+m.provider;if(dom.botBadge)dom.botBadge.textContent=m.badge}

async function loadSavedModel(){try{const s=await puter.kv.get('photon_selected_model');if(s&&AI_MODELS[s]){state.selectedModel=s;if(dom.aiModelSelect)dom.aiModelSelect.value=s}else{state.selectedModel=DEFAULT_MODEL;if(dom.aiModelSelect)dom.aiModelSelect.value=DEFAULT_MODEL}}catch(e){state.selectedModel=DEFAULT_MODEL;if(dom.aiModelSelect)dom.aiModelSelect.value=DEFAULT_MODEL}updateBotIdentity()}

function loadTipState(){puter.kv.get('photon_tip_dismissed').then(v=>{if(v==='true'&&dom.memoryTipBanner)dom.memoryTipBanner.classList.add('dismissed')}).catch(()=>{})}

function createParticles(){const c=document.getElementById('particles');if(!c)return;for(let i=0;i<30;i++){const p=document.createElement('div');p.style.cssText='position:absolute;width:'+(Math.random()*4+1)+'px;height:'+(Math.random()*4+1)+'px;background:rgba(108,92,231,'+(Math.random()*.5+.1)+');border-radius:50%;top:'+(Math.random()*100)+'%;left:'+(Math.random()*100)+'%;animation:pf '+(Math.random()*10+5)+'s ease-in-out infinite '+(Math.random()*5)+'s';c.appendChild(p)}document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'@keyframes pf{0%,100%{transform:translate(0,0);opacity:.5}50%{transform:translate('+(Math.random()*60-30)+'px,'+(Math.random()*60-30)+'px);opacity:.3}}'}))}