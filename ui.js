/* ========================================
   PHOTON CORE — ai.js
   AI Chat via OpenRouter, Memory, Sessions
   ======================================== */

// === SHARED MEMORIES (Firestore) ===
function listenMemories() {
    db.collection('memories').orderBy('timestamp', 'desc').limit(100).onSnapshot(snap => {
        state.memories = [];
        snap.forEach(doc => state.memories.push({ id: doc.id, ...doc.data() }));
        renderMemories();
    });
}

function shouldRemember(msg) {
    const l = msg.toLowerCase();
    const kw = ['remember', "don't forget", 'keep in mind', 'note that', 'important:', 'fyi', 'save this', 'memorize'];
    for (const k of kw) if (l.includes(k)) return true;
    const pats = [/our game is/i, /game name is/i, /project is called/i, /my name is/i, /deadline is/i, /art style/i,
        /we('re| are) using/i, /engine is/i, /we decided/i, /the plan is/i, /from now on/i, /always use/i,
        /our (studio|company|team)/i, /genre is/i, /we('re| are) making/i, /release (date|window)/i,
        /main character/i, /story is about/i];
    return pats.some(p => p.test(msg));
}

function extractMemory(msg) {
    const pats = [/remember\s+that\s+(.+)/i, /remember\s*:\s*(.+)/i, /remember\s+(.+)/i,
        /don't forget\s+(.+)/i, /note that\s+(.+)/i, /important:\s*(.+)/i, /fyi\s*:?\s*(.+)/i];
    for (const p of pats) { const m = msg.match(p); if (m) return m[1].trim(); }
    return msg.trim();
}

async function addMemory(text, user) {
    const exists = state.memories.some(m => m.text.toLowerCase() === text.toLowerCase());
    if (exists) return;
    await db.collection('memories').add({ text, user, timestamp: new Date().toISOString() });
    showToast('🧠 Memory saved!', 'success');
}

async function deleteMemory(id) {
    await db.collection('memories').doc(id).delete();
    showToast('Removed.', 'info');
}

function renderMemories() {
    if (!dom.memoryCount) return;
    dom.memoryCount.textContent = state.memories.length;
    if (!dom.memoryList) return;
    if (!state.memories.length) {
        dom.memoryList.innerHTML = '<div class="empty-state small"><p>No memories.</p></div>';
        return;
    }
    dom.memoryList.innerHTML = state.memories.map(m =>
        `<div class="memory-item">
            <span class="memory-item-text">🧠 ${esc(m.text)}</span>
            <span class="memory-item-user">${esc(m.user)}</span>
            <button class="memory-item-delete" onclick="deleteMemory('${m.id}')">🗑️</button>
        </div>`
    ).join('');
}

function getMemoryContext() {
    if (!state.memories.length) return '';
    return '\n\nTEAM MEMORIES:\n' + state.memories.map(m => '- ' + m.text + ' (by ' + m.user + ')').join('\n') + '\n\nAlways reference these.\n';
}

// === ACTIVITY (Firestore) ===
function listenActivity() {
    db.collection('activity').orderBy('timestamp', 'desc').limit(20).onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        renderActivity(list);
    });
}

async function addActivity(msg) {
    await db.collection('activity').add({ message: msg, timestamp: new Date().toISOString() }).catch(() => {});
}

function renderActivity(list) {
    if (!dom.recentActivity) return;
    if (!list?.length) {
        dom.recentActivity.innerHTML = '<p class="empty-state">No activity.</p>';
        return;
    }
    dom.recentActivity.innerHTML = list.slice(0, 10).map(a =>
        `<div class="activity-item"><span>${esc(a.message)}</span><span class="activity-time">${fmtDate(a.timestamp)}</span></div>`
    ).join('');
}

// === CHAT SESSIONS (Firestore shared) ===
function listenChatSessions() {
    db.collection('chatSessions').orderBy('updatedAt', 'desc').limit(50).onSnapshot(snap => {
        state.chatSessions = [];
        snap.forEach(doc => state.chatSessions.push({ id: doc.id, ...doc.data() }));
        renderChatHistory();
        if (!state.currentChatId && state.chatSessions.length) loadChat(state.chatSessions[0].id);
    });
}

async function createNewChat() {
    const ref = await db.collection('chatSessions').add({
        title: 'New Chat', model: state.selectedModel, messages: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        createdBy: state.user?.username
    });
    state.currentChatId = ref.id;
    state.currentChatMessages = [];
    clearChatUI();
    showToast('New chat! 💬', 'success');
}

function loadChat(id) {
    const c = state.chatSessions.find(x => x.id === id);
    if (!c) return;
    state.currentChatId = id;
    state.currentChatMessages = c.messages || [];
    clearChatUI();
    c.messages.forEach(m => appendStatic(m.text, m.sender, m.modelName, m.author, m.memorySaved, m.fileName));
    renderChatHistory();
}

async function saveCurrentChat() {
    if (!state.currentChatId) return;
    const data = { messages: state.currentChatMessages, updatedAt: new Date().toISOString(), model: state.selectedModel };
    const first = state.currentChatMessages.find(m => m.sender === 'user');
    if (first) data.title = first.text.substring(0, 50) + (first.text.length > 50 ? '...' : '');
    await db.collection('chatSessions').doc(state.currentChatId).update(data).catch(() => {});
}

async function deleteChat(id) {
    if (!confirm('Delete?')) return;
    await db.collection('chatSessions').doc(id).delete();
    if (state.currentChatId === id) {
        state.currentChatId = null;
        state.currentChatMessages = [];
        clearChatUI();
    }
    showToast('Deleted.', 'info');
}

function renderChatHistory() {
    if (!dom.chatHistoryList) return;
    if (!state.chatSessions.length) {
        dom.chatHistoryList.innerHTML = '<div class="empty-state small"><p>No chats</p></div>';
        return;
    }
    dom.chatHistoryList.innerHTML = state.chatSessions.map(c =>
        `<div class="chat-history-item ${c.id === state.currentChatId ? 'active' : ''}" onclick="loadChat('${c.id}')">
            <div class="chat-history-item-title">${esc(c.title || 'Chat')}</div>
            <div class="chat-history-item-meta">
                <span class="chat-history-item-date">${fmtDate(c.updatedAt)}</span>
                <span class="chat-history-item-model">${AI_MODELS[c.model]?.name || c.model}</span>
                <button class="chat-history-item-delete" onclick="event.stopPropagation();deleteChat('${c.id}')">🗑️</button>
            </div>
        </div>`
    ).join('');
}

function clearChatUI() {
    if (!dom.aiChat) return;
    dom.aiChat.innerHTML = `<div class="ai-message ai-welcome"><div class="ai-avatar">🤖</div><div class="ai-bubble"><p>👋 Shared group chat. 📂 File tools. 🧠 Auto-memory. ⚡ Powered by OpenRouter.</p></div></div>`;
}

// === FILE ATTACHMENT ===
async function handleFileAttach(e) {
    const file = e.target.files[0];
    if (!file) return;
    state.attachedFile = file;
    state.attachedFileName = file.name;
    try {
        if (file.type.startsWith('text/') || file.name.match(/\.(js|ts|py|cs|cpp|html|css|json|xml|md|txt|csv|yaml|yml|log|sh|gd)$/i))
            state.attachedFileContent = await file.text();
        else
            state.attachedFileContent = '[File: ' + file.name + ', ' + fmtSize(file.size) + ']';
    } catch (err) {
        state.attachedFileContent = '[File: ' + file.name + ']';
    }
    if (dom.attachmentIcon) dom.attachmentIcon.textContent = fileIcon(file.name, false);
    if (dom.attachmentName) dom.attachmentName.textContent = file.name;
    if (dom.attachmentSize) dom.attachmentSize.textContent = fmtSize(file.size);
    if (dom.aiAttachmentPreview) dom.aiAttachmentPreview.classList.remove('hidden');
    if (dom.aiFileInput) dom.aiFileInput.value = '';
    showToast('📎 ' + file.name + ' attached', 'info');
}

function clearAttachment() {
    state.attachedFile = null;
    state.attachedFileContent = null;
    state.attachedFileName = '';
    if (dom.aiAttachmentPreview) dom.aiAttachmentPreview.classList.add('hidden');
}

// === AI SEND (OpenRouter) ===
async function sendAiMessage() {
    if (!dom.aiInput) return;
    const msg = dom.aiInput.value.trim();
    if (!msg && !state.attachedFile) return;
    if (state.isTyping) return;

    const modelId = state.selectedModel, md = AI_MODELS[modelId];
    const modelName = md?.name || modelId, username = state.user?.username || 'Anon';

    let memorySaved = false;
    if (msg && shouldRemember(msg)) {
        await addMemory(extractMemory(msg), username);
        memorySaved = true;
    }

    let displayMsg = msg, fileCtx = '', fileName = '';
    if (state.attachedFile) {
        fileName = state.attachedFileName;
        displayMsg = msg || 'Analyze: ' + fileName;
        if (state.attachedFileContent && state.attachedFileContent.length < 50000)
            fileCtx = '\n\n--- FILE: ' + fileName + ' ---\n' + state.attachedFileContent + '\n--- END ---\n';
        else
            fileCtx = '\n\n[Attached: ' + fileName + ', ' + fmtSize(state.attachedFile.size) + ']';

        const l = msg.toLowerCase();
        if (l.includes('save to cloud') || l.includes('store this') || l.includes('upload this')) {
            const blob = new Blob([await state.attachedFile.arrayBuffer()], { type: state.attachedFile.type });
            try {
                await puter.fs.write('PhotonCore/files/' + fileName, blob, { dedupeName: false, overwrite: true });
                showToast('☁️ ' + fileName + ' saved!', 'success');
                addActivity('☁️ Saved: ' + fileName);
                loadFiles();
            } catch (e) {
                showToast('Save failed.', 'error');
            }
        }
    }

    state.currentChatMessages.push({
        text: displayMsg, sender: 'user', author: username, modelName: '',
        memorySaved, fileName, timestamp: new Date().toISOString()
    });
    appendStatic(displayMsg, 'user', '', username, memorySaved, fileName);
    dom.aiInput.value = '';
    const savedCtx = fileCtx;
    clearAttachment();

    // Check for file operations
    const fileOp = detectFileOperation(msg);
    let toolResult = '';
    if (fileOp) {
        if (fileOp.op === 'list') toolResult = await aiListFiles();
        else if (fileOp.op === 'read') toolResult = await aiReadFile(fileOp.name);
        else if (fileOp.op === 'delete') toolResult = await aiDeleteFile(fileOp.name);
    }

    state.isTyping = true;
    if (dom.typingIndicator) dom.typingIndicator.classList.remove('hidden');
    if (dom.typingUser) dom.typingUser.textContent = modelName;
    if (dom.aiSendText) dom.aiSendText.classList.add('hidden');
    if (dom.aiLoading) dom.aiLoading.classList.remove('hidden');
    if (dom.btnAiSend) dom.btnAiSend.disabled = true;

    try {
        const memCtx = getMemoryContext();
        let sysPr = 'You are a helpful AI for Photon Studios (6-person indie game dev team). Group chat. Be friendly.' + memCtx;
        if (toolResult) sysPr += '\n\nFILE OPERATION RESULT:\n' + toolResult + '\n\nReport this result to the user naturally.';
        sysPr += '\n\nYou can help users manage cloud files. If they ask to save content as a file, include the content in your response and confirm it was saved.';

        const hist = state.currentChatMessages.filter(m => m.sender === 'user' || m.sender === 'ai').slice(-10)
            .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.sender === 'user' ? '[' + m.author + ']: ' + m.text : m.text }));
        hist[hist.length - 1] = { role: 'user', content: '[' + username + ']: ' + displayMsg + savedCtx };
        const messages = [{ role: 'system', content: sysPr }, ...hist];

        // Check if user wants to write a file
        const writeOp = !fileOp && msg.match(/(?:save|write|create)\s+(?:this\s+)?(?:as|to)\s+['""]?([a-zA-Z0-9_\-\.]+)['""]?/i);

        // ===== OPENROUTER STREAMING =====
        let fullText = '';
        const { div, target, cursor } = createStreamBubble(modelName);

        try {
            const stream = openRouterChatStream(messages, modelId);
            for await (const chunk of stream) {
                if (chunk) {
                    fullText += chunk;
                    target.insertBefore(document.createTextNode(chunk), cursor);
                    dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
                }
            }
        } catch (streamErr) {
            // Fallback to non-streaming if stream fails
            console.warn('Stream failed, falling back:', streamErr);
            fullText = await openRouterChatSimple(messages, modelId);
            target.textContent = fullText;
        }

        cursor.remove();
        target.innerHTML = formatAi(fullText);

        const tag = document.createElement('span');
        tag.className = 'ai-model-tag';
        tag.textContent = (md?.logo || '⚡') + ' ' + modelName;
        div.querySelector('.ai-bubble').appendChild(tag);

        if (toolResult) {
            const tr = document.createElement('div');
            tr.className = 'tool-result';
            tr.textContent = '📂 ' + toolResult.substring(0, 200);
            div.querySelector('.ai-bubble').appendChild(tr);
        }
        dom.aiChat.scrollTop = dom.aiChat.scrollHeight;

        // If write operation detected, extract and save
        if (writeOp) {
            const fname = writeOp[1];
            const result = await aiWriteFile(fname, fullText);
            showToast(result, 'success');
        }

        state.currentChatMessages.push({ text: fullText, sender: 'ai', author: modelName, modelName, timestamp: new Date().toISOString() });
        state.aiQueryCount++;
        if (dom.statAi) dom.statAi.textContent = state.aiQueryCount;
        addActivity('🤖 ' + username + ' → ' + modelName);
        await saveCurrentChat();

    } catch (e) {
        console.error('AI Error:', e);
        appendStatic('❌ Error: ' + (e.message || 'Failed. Try another model!'), 'ai', modelName, modelName);
        showToast('AI failed: ' + (e.message || 'Unknown error'), 'error');
    }

    state.isTyping = false;
    if (dom.typingIndicator) dom.typingIndicator.classList.add('hidden');
    if (dom.aiSendText) dom.aiSendText.classList.remove('hidden');
    if (dom.aiLoading) dom.aiLoading.classList.add('hidden');
    if (dom.btnAiSend) dom.btnAiSend.disabled = false;
}

function createStreamBubble(name) {
    const div = document.createElement('div');
    div.className = 'ai-message';
    const md = AI_MODELS[state.selectedModel];
    div.innerHTML = `<div class="ai-avatar">${md?.logo || '🤖'}</div><div class="ai-bubble"><div class="ai-message-author">${esc(name)}</div><p class="tw-target"></p></div>`;
    dom.aiChat.appendChild(div);
    const target = div.querySelector('.tw-target');
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    target.appendChild(cursor);
    dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
    return { div, target, cursor };
}

function appendStatic(text, sender, modelName = '', author = '', memorySaved = false, fileName = '') {
    if (!dom.aiChat) return;
    const div = document.createElement('div');
    div.className = 'ai-message ' + (sender === 'user' ? 'user-message' : '');
    const md = sender === 'ai' ? AI_MODELS[state.selectedModel] : null;
    const av = sender === 'user' ? (author || '??').substring(0, 2).toUpperCase() : (md?.logo || '🤖');
    div.innerHTML = `<div class="ai-avatar">${av}</div><div class="ai-bubble">
        ${author ? '<div class="ai-message-author">' + (sender === 'user' ? '👤 ' : '') + esc(author) + '</div>' : ''}
        ${fileName ? '<div class="ai-file-bubble"><span>' + fileIcon(fileName, false) + '</span> ' + esc(fileName) + '</div>' : ''}
        ${sender === 'ai' ? formatAi(text) : esc(text)}
        ${sender === 'ai' && modelName ? '<span class="ai-model-tag">' + (md?.logo || '⚡') + ' ' + modelName + '</span>' : ''}
        ${memorySaved ? '<span class="memory-saved-indicator">🧠 Saved</span>' : ''}
    </div>`;
    dom.aiChat.appendChild(div);
    dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
}