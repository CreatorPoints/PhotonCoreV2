/* ========================================
   PHOTON CORE — presence.js
   ======================================== */

function setupPresence(){
    const uid=state.user?.username;if(!uid)return;
    const ref=rtdb.ref('presence/'+uid);const connRef=rtdb.ref('.info/connected');
    connRef.on('value',snap=>{if(snap.val()){ref.onDisconnect().set({online:false,lastSeen:firebase.database.ServerValue.TIMESTAMP});ref.set({online:true,lastSeen:firebase.database.ServerValue.TIMESTAMP})}});
    setInterval(()=>ref.update({lastSeen:firebase.database.ServerValue.TIMESTAMP}),30000);
}

function setupPresenceListener(){
    rtdb.ref('presence').on('value',snap=>{state.onlineUsers=snap.val()||{};const count=Object.values(state.onlineUsers).filter(u=>u.online).length;if(dom.onlineCount)dom.onlineCount.textContent=count;if(dom.statOnline)dom.statOnline.textContent=count;renderMembers()});
}

async function saveProfile(){
    if(!dom.profileName)return;
    const p={name:dom.profileName.value.trim()||state.user?.username,role:dom.profileRole.value,status:dom.profileStatus.value.trim(),username:state.user?.username,updatedAt:new Date().toISOString()};
    try{await db.collection('members').doc(state.user.username).set(p,{merge:true});showToast('Profile saved! ✅','success')}catch(e){showToast('Failed.','error')}
}

async function loadProfile(){
    if(!dom.profileName)return;
    try{const doc=await db.collection('members').doc(state.user?.username).get();if(doc.exists){const p=doc.data();dom.profileName.value=p.name||'';dom.profileRole.value=p.role||'💻 Developer';dom.profileStatus.value=p.status||''}else{dom.profileName.value=state.user?.username||''}}catch(e){dom.profileName.value=state.user?.username||''}
}

function renderMembers(){
    if(!dom.membersGrid)return;
    db.collection('members').get().then(snap=>{const members=[];snap.forEach(doc=>members.push(doc.data()));
    if(!members.length){dom.membersGrid.innerHTML='<div class="empty-state"><p>No members yet.</p></div>';return}
    dom.membersGrid.innerHTML=members.map(m=>{const pr=state.onlineUsers[m.username];const on=pr?.online===true;const ls=pr?.lastSeen?fmtDate(new Date(pr.lastSeen).toISOString()):'Never';
    return'<div class="member-card '+(on?'is-online':'')+'"><div class="member-online-dot '+(on?'online':'')+'"></div><div class="member-avatar">'+(m.name||'?').substring(0,2).toUpperCase()+'</div><div class="member-info"><span class="member-name">'+esc(m.name||m.username)+'</span><span class="member-role-badge">'+esc(m.role||'Member')+'</span><span class="member-status">'+esc(m.status||'')+'</span><span class="member-last-seen">'+(on?'🟢 Online':'Last seen: '+ls)+'</span></div></div>'}).join('')}).catch(()=>{});
}