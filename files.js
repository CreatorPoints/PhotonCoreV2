/* ========================================
   PHOTON CORE — files.js
   ======================================== */

async function uploadFiles(fl){
    if(!fl?.length)return;if(!state.filesReady)await ensureBaseFolder();
    for(const f of fl){try{showToast('Uploading '+f.name+'...','info');const blob=new Blob([await f.arrayBuffer()],{type:f.type});await puter.fs.write('PhotonCore/files/'+f.name,blob,{dedupeName:false,overwrite:true});addActivity('📁 '+state.user?.username+': '+f.name);showToast(f.name+' uploaded!','success')}catch(e){showToast('Failed: '+f.name,'error')}}
    loadFiles();if(dom.fileInput)dom.fileInput.value='';
}

async function loadFiles(){
    try{const i=await puter.fs.readdir('PhotonCore/files');state.files=i||[];renderFiles();if(dom.statFiles)dom.statFiles.textContent=state.files.length}catch(e){state.files=[];renderFiles();if(dom.statFiles)dom.statFiles.textContent=0}
}

function renderFiles(){
    if(!dom.filesList)return;
    if(!state.files.length){dom.filesList.innerHTML='<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">📂</span><p>No files.</p></div>';return}
    dom.filesList.innerHTML=state.files.map(f=>{const s=esc(f.name).replace(/'/g,"\\'");return'<div class="file-card"><div class="file-icon">'+fileIcon(f.name,f.is_dir)+'</div><div class="file-name">'+esc(f.name)+'</div><div class="file-size">'+(f.is_dir?'Folder':fmtSize(f.size))+'</div><div class="file-actions">'+(!f.is_dir?'<button class="file-action-btn" onclick="downloadFile(\''+s+'\')">⬇️</button>':'')+'<button class="file-action-btn danger" onclick="deleteFile(\''+s+'\','+f.is_dir+')">🗑️</button></div></div>'}).join('');
}

async function downloadFile(n){try{const b=await puter.fs.read('PhotonCore/files/'+n);const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=n;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)}catch(e){showToast('Failed.','error')}}
async function deleteFile(n,d){if(!confirm('Delete "'+n+'"?'))return;try{await puter.fs.delete('PhotonCore/files/'+n,{recursive:d});showToast('Deleted.','info');loadFiles()}catch(e){showToast('Failed.','error')}}

async function aiListFiles(){try{const items=await puter.fs.readdir('PhotonCore/files');if(!items?.length)return'No files.';return'Files:\n'+items.map(f=>'- '+(f.is_dir?'📁':'📄')+' '+f.name+(f.is_dir?'':' ('+fmtSize(f.size)+')')).join('\n')}catch(e){return'Error: '+e.message}}
async function aiReadFile(name){try{const blob=await puter.fs.read('PhotonCore/files/'+name);return'Content of '+name+':\n\n'+await blob.text()}catch(e){return'Error: '+e.message}}
async function aiWriteFile(name,content){try{await puter.fs.write('PhotonCore/files/'+name,new Blob([content],{type:'text/plain'}),{dedupeName:false,overwrite:true});loadFiles();addActivity('🤖 AI saved: '+name);return'✅ Saved "'+name+'"!'}catch(e){return'Error: '+e.message}}
async function aiDeleteFile(name){try{await puter.fs.delete('PhotonCore/files/'+name);loadFiles();addActivity('🤖 AI deleted: '+name);return'✅ Deleted "'+name+'".'}catch(e){return'Error: '+e.message}}

function detectFileOperation(msg){const l=msg.toLowerCase();if(l.match(/list\s*(my\s*)?(cloud\s*)?files/i)||l.match(/show\s*(my\s*)?(cloud\s*)?files/i))return{op:'list'};const rm=msg.match(/(?:read|open|show|get)\s+(?:the\s+)?(?:file\s+)?['""]?([a-zA-Z0-9_\-\.]+)['""]?/i);if(rm)return{op:'read',name:rm[1]};const wm=msg.match(/(?:save|write|create)\s+(?:this\s+)?(?:as|to)?\s*['""]?([a-zA-Z0-9_\-\.]+)['""]?/i);if(wm)return{op:'write',name:wm[1]};const dm=msg.match(/(?:delete|remove)\s+(?:the\s+)?(?:file\s+)?['""]?([a-zA-Z0-9_\-\.]+)['""]?/i);if(dm)return{op:'delete',name:dm[1]};return null}