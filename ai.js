/* ========================================
   PHOTON CORE — ai.js
   AI Chat with Real-Time Sync
   ======================================== */

// === MEMORY FUNCTIONS ===

function listenMemories() {
    db.collection('memories')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .onSnapshot(snap => {
            state.memories = [];
            snap.forEach(doc => state.memories.push({ id: doc.id, ...doc.data() }));
            renderMemories();
        }, err => {
            console.error('Memory listener error:', err);
        });
}

function shouldRemember(msg) {
    if (!msg) return false;
    const l = msg.toLowerCase();
    const kw = ['remember', "don't forget", 'keep in mind', 'note that', 'important:', 'fyi', 'save this', 'memorize'];

    for (const k of kw) {
        if (l.includes(k)) return true;
    }

    return [
        /our game is/i,
        /game name is/i,
        /project is called/i,
        /my name is/i,
        /deadline is/i,
        /we decided/i,
        /the plan is/i,
        /from now on/i,
        /our (studio|team)/i,
        /we('re| are) making/i
    ].some(p => p.test(msg));
}

function extractMemory(msg) {
    if (!msg) return '';

    const pats = [
        /remember\s+that\s+(.+)/i,
        /remember\s*:\s*(.+)/i,
        /remember\s+(.+)/i,
        /don't forget\s+(.+)/i,
        /note that\s+(.+)/i,
        /important:\s*(.+)/i
    ];

    for (const p of pats) {
        const m = msg.match(p);
        if (m) return m[1].trim();
    }
    return msg.trim();
}

async function addMemory(text, user) {
    if (!text) return;
    if (state.memories.some(m => m.text && m.text.toLowerCase() === text.toLowerCase())) return;

    try {
        await db.collection('memories').add({
            text,
            user,
            timestamp: new Date().toISOString()
        });
        showToast('🧠 Saved!', 'success');
    } catch (e) {
        console.error('Failed to add memory:', e);
        showToast('Failed to save memory.', 'error');
    }
}

async function deleteMemory(id) {
    if (!id) return;

    try {
        await db.collection('memories').doc(id).delete();
        showToast('Removed.', 'info');
    } catch (e) {
        console.error('Failed to delete memory:', e);
        showToast('Failed to remove memory.', 'error');
    }
}

function renderMemories() {
    if (dom.memoryCount) {
        dom.memoryCount.textContent = state.memories.length;
    }

    if (!dom.memoryList) return;

    if (!state.memories.length) {
        dom.memoryList.innerHTML = '<div class="empty-state small"><p>No memories.</p></div>';
        return;
    }

    dom.memoryList.innerHTML = state.memories.map(m =>
        `<div class="memory-item" data-id="${esc(m.id)}">
            <span class="memory-item-text">🧠 ${esc(m.text)}</span>
            <span class="memory-item-user">${esc(m.user)}</span>
            <button class="memory-item-delete" data-id="${esc(m.id)}" aria-label="Delete memory">🗑️</button>
        </div>`
    ).join('');

    // Event delegation for delete buttons
    dom.memoryList.querySelectorAll('.memory-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteMemory(btn.dataset.id);
        });
    });
}

function getMemoryContext() {
    if (!state.memories || !state.memories.length) return '';
    return '\n\nTEAM MEMORIES:\n' + state.memories.map(m => '- ' + m.text + ' (by ' + m.user + ')').join('\n') + '\n';
}

// === ACTIVITY FUNCTIONS ===

function listenActivity() {
    db.collection('activity')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .onSnapshot(snap => {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            renderActivity(list);
        }, err => {
            console.error('Activity listener error:', err);
        });
}

async function addActivity(msg) {
    if (!msg) return;

    try {
        await db.collection('activity').add({
            message: msg,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Failed to add activity:', e);
    }
}

function renderActivity(list) {
    if (!dom.recentActivity) return;

    if (!list || !list.length) {
        dom.recentActivity.innerHTML = '<p class="empty-state">No activity.</p>';
        return;
    }

    dom.recentActivity.innerHTML = list.slice(0, 10).map(a =>
        `<div class="activity-item">
            <span>${esc(a.message || '')}</span>
            <span class="activity-time">${fmtDate(a.timestamp)}</span>
        </div>`
    ).join('');
}

// === CHAT SESSIONS — REAL-TIME ===

let activeChatUnsubscribe = null;

function listenChatSessions() {
    db.collection('chatSessions')
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .onSnapshot(snap => {
            state.chatSessions = [];
            snap.forEach(doc => state.chatSessions.push({ id: doc.id, ...doc.data() }));
            renderChatHistory();

            // Auto-load first chat if none selected
            if (!state.currentChatId && state.chatSessions.length) {
                loadChat(state.chatSessions[0].id);
            }
        }, err => {
            console.error('Chat sessions listener error:', err);
        });
}

async function createNewChat() {
    const username = state.user?.username || 'Anonymous';

    try {
        const ref = await db.collection('chatSessions').add({
            title: 'New Chat',
            model: state.selectedModel,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: username
        });
        loadChat(ref.id);
        showToast('New chat! 💬', 'success');
    } catch (e) {
        console.error('Failed to create chat:', e);
        showToast('Failed to create chat.', 'error');
    }
}

function loadChat(id) {
    if (!id) return;

    // Unsubscribe from previous chat listener
    if (activeChatUnsubscribe) {
        activeChatUnsubscribe();
        activeChatUnsubscribe = null;
    }

    state.currentChatId = id;
    state.currentChatMessages = [];
    clearChatUI();
    renderChatHistory();

    // Start real-time listener on this specific chat
    activeChatUnsubscribe = db.collection('chatSessions').doc(id).onSnapshot(doc => {
        if (!doc.exists) {
            console.warn('Chat document does not exist:', id);
            return;
        }

        const data = doc.data();
        const newMessages = data.messages || [];

        // Deep comparison to detect changes properly
        const currentLength = state.currentChatMessages.length;
        const newLength = newMessages.length;

        let hasChanges = newLength !== currentLength;

        if (!hasChanges && newLength > 0 && currentLength > 0) {
            const lastNew = newMessages[newLength - 1];
            const lastCurrent = state.currentChatMessages[currentLength - 1];
            hasChanges = lastNew.timestamp !== lastCurrent.timestamp ||
                lastNew.text !== lastCurrent.text ||
                lastNew.sender !== lastCurrent.sender;
        }

        if (hasChanges) {
            const shouldScroll = dom.aiChat
                ? (dom.aiChat.scrollTop + dom.aiChat.clientHeight >= dom.aiChat.scrollHeight - 100)
                : true;

            // Clone messages to avoid reference issues
            state.currentChatMessages = JSON.parse(JSON.stringify(newMessages));

            // Only re-render if not currently typing
            if (!state.isTyping) {
                clearChatUI();
                newMessages.forEach(m => {
                    appendStatic(m.text, m.sender, m.modelName, m.author, m.memorySaved, m.fileName);
                });

                if (shouldScroll && dom.aiChat) {
                    dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
                }
            }
        }
    }, err => {
        console.error('Chat listener error:', err);
    });
}

async function saveCurrentChat() {
    if (!state.currentChatId) return;

    const data = {
        messages: state.currentChatMessages,
        updatedAt: new Date().toISOString(),
        model: state.selectedModel
    };

    const first = state.currentChatMessages.find(m => m.sender === 'user');
    if (first && first.text) {
        data.title = first.text.substring(0, 50);
    }

    try {
        await db.collection('chatSessions').doc(state.currentChatId).update(data);
    } catch (e) {
        console.error('Failed to save chat:', e);
    }
}

async function deleteChat(id) {
    if (!id) return;
    if (!confirm('Delete this chat?')) return;

    if (state.currentChatId === id) {
        if (activeChatUnsubscribe) {
            activeChatUnsubscribe();
            activeChatUnsubscribe = null;
        }
        state.currentChatId = null;
        state.currentChatMessages = [];
        clearChatUI();
    }

    try {
        await db.collection('chatSessions').doc(id).delete();
        showToast('Deleted.', 'info');
    } catch (e) {
        console.error('Failed to delete chat:', e);
        showToast('Failed to delete chat.', 'error');
    }
}

function renderChatHistory() {
    if (!dom.chatHistoryList) return;

    if (!state.chatSessions || !state.chatSessions.length) {
        dom.chatHistoryList.innerHTML = '<div class="empty-state small"><p>No chats</p></div>';
        return;
    }

    dom.chatHistoryList.innerHTML = state.chatSessions.map(c =>
        `<div class="chat-history-item ${c.id === state.currentChatId ? 'active' : ''}" data-chat-id="${esc(c.id)}">
            <div class="chat-history-item-title">${esc(c.title || 'Chat')}</div>
            <div class="chat-history-item-meta">
                <span class="chat-history-item-date">${fmtDate(c.updatedAt)}</span>
                <span class="chat-history-item-model">${esc(AI_MODELS[c.model]?.name || c.model || 'Unknown')}</span>
                <button class="chat-history-item-delete" data-chat-id="${esc(c.id)}" aria-label="Delete chat">🗑️</button>
            </div>
        </div>`
    ).join('');

    // Event delegation for chat items
    dom.chatHistoryList.querySelectorAll('.chat-history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('chat-history-item-delete')) {
                loadChat(item.dataset.chatId);
            }
        });
    });

    dom.chatHistoryList.querySelectorAll('.chat-history-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(btn.dataset.chatId);
        });
    });
}

function clearChatUI() {
    if (!dom.aiChat) return;
    dom.aiChat.innerHTML = `
        <div class="ai-message ai-welcome">
            <div class="ai-avatar">🤖</div>
            <div class="ai-bubble">
                <p>👋 Ready! Powered by OpenRouter.</p>
            </div>
        </div>`;
}

// === FILE ATTACHMENT ===

async function handleFileAttach(e) {
    const file = e.target?.files?.[0];
    if (!file) return;

    state.attachedFile = file;
    state.attachedFileName = file.name;

    try {
        const textExtensions = /\.(js|ts|py|cs|cpp|html|css|json|xml|md|txt|csv|yaml|yml|log|sh|gd)$/i;

        if (file.type.startsWith('text/') || textExtensions.test(file.name)) {
            state.attachedFileContent = await file.text();
        } else {
            state.attachedFileContent = '[File: ' + file.name + ']';
        }
    } catch (err) {
        console.warn('Failed to read file content:', err);
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

// === AI SEND ===

async function sendAiMessage() {
    if (!dom.aiInput) return;

    const msg = dom.aiInput.value.trim();
    if (!msg && !state.attachedFile) return;
    
    // === PREVENT DOUBLE SEND ===
    if (state.isTyping || state.isSending) {
        console.log('⚠️ Already sending, skipping duplicate');
        return;
    }
    state.isSending = true;
    // ===========================

    const modelId = state.selectedModel;
    const md = AI_MODELS[modelId];
    const modelName = md?.name || modelId;
    const username = state.user?.username || 'Anon';

    // Auto-create chat if none exists
    if (!state.currentChatId) {
        try {
            const ref = await db.collection('chatSessions').add({
                title: 'New Chat',
                model: state.selectedModel,
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: username
            });
            state.currentChatId = ref.id;
            loadChat(ref.id);
            await new Promise(r => setTimeout(r, 100));
        } catch (e) {
            console.error('Failed to create chat:', e);
            showToast('Failed to create chat.', 'error');
            state.isSending = false;  // Unlock on error
            return;
        }
    }

    // Memory detection
    let memorySaved = false;
    if (msg && shouldRemember(msg)) {
        await addMemory(extractMemory(msg), username);
        memorySaved = true;
    }

    // Handle file attachment - save BEFORE clearing
    let displayMsg = msg;
    let fileCtx = '';
    let fileName = '';

    const attachedFile = state.attachedFile;
    const attachedFileName = state.attachedFileName;
    const attachedFileContent = state.attachedFileContent;

    if (attachedFile) {
        fileName = attachedFileName;
        displayMsg = msg || 'Analyze: ' + fileName;

        if (attachedFileContent && attachedFileContent.length < 50000) {
            fileCtx = '\n\n--- FILE: ' + fileName + ' ---\n' + attachedFileContent + '\n--- END ---\n';
        } else {
            fileCtx = '\n\n[Attached: ' + fileName + ']';
        }

        // Handle save to cloud request
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('save to cloud') || lowerMsg.includes('store this')) {
            try {
                const arrayBuffer = await attachedFile.arrayBuffer();
                await puter.fs.write(
                    'PhotonCore/files/' + fileName,
                    new Blob([arrayBuffer], { type: attachedFile.type }),
                    { dedupeName: false, overwrite: true }
                );
                showToast('☁️ Saved!', 'success');
                if (typeof loadFiles === 'function') loadFiles();
            } catch (e) {
                console.error('Failed to save to cloud:', e);
                showToast('Save failed.', 'error');
            }
        }
    }

    // Add user message and save immediately
    const userMsg = {
        text: displayMsg,
        sender: 'user',
        author: username,
        modelName: '',
        memorySaved,
        fileName,
        timestamp: new Date().toISOString()
    };

    state.currentChatMessages.push(userMsg);
    appendStatic(displayMsg, 'user', '', username, memorySaved, fileName);
    await saveCurrentChat();

    // Clear input and attachment
    dom.aiInput.value = '';
    clearAttachment();

    // Detect file operations
    const fileOp = typeof detectFileOperation === 'function' ? detectFileOperation(msg) : null;

    if (fileOp) {
        let result = '';

        try {
            switch (fileOp.op) {
                case 'list':
                    result = await aiListFiles();
                    break;
                case 'read':
                    result = await aiReadFile(fileOp.name);
                    break;
                case 'delete':
                    result = await aiDeleteFile(fileOp.name);
                    break;
                case 'write':
                    result = await aiWriteFile(fileOp.name, msg);
                    break;
                case 'upload-attached':
                    if (!attachedFile) {
                        result = '⚠️ No attached file to upload.';
                    } else {
                        try {
                            const arrayBuffer = await attachedFile.arrayBuffer();
                            await puter.fs.write(
                                'PhotonCore/files/' + attachedFileName,
                                new Blob([arrayBuffer], { type: attachedFile.type }),
                                { dedupeName: false, overwrite: true }
                            );
                            if (typeof loadFiles === 'function') await loadFiles();
                            result = `☁️ Uploaded "${attachedFileName}" to cloud!`;
                        } catch (e) {
                            result = '⚠️ Upload failed: ' + (e.message || 'Unknown error');
                        }
                    }
                    break;
                default:
                    result = '⚠️ Unknown file operation.';
            }
        } catch (e) {
            console.error('File operation error:', e);
            result = '⚠️ Operation failed: ' + (e.message || 'Unknown error');
        }

        const aiMsg = {
            text: result,
            sender: 'ai',
            author: modelName,
            modelName,
            timestamp: new Date().toISOString()
        };

        state.currentChatMessages.push(aiMsg);
        appendStatic(result, 'ai', modelName, modelName);
        await saveCurrentChat();

        addActivity('📂 ' + username + ' used cloud');
        state.aiQueryCount = (state.aiQueryCount || 0) + 1;
        if (dom.statAi) dom.statAi.textContent = state.aiQueryCount;

        state.isSending = false;  // Unlock
        return;
    }

    // === AI RESPONSE ===

    state.isTyping = true;
    if (dom.typingIndicator) dom.typingIndicator.classList.remove('hidden');
    if (dom.typingUser) dom.typingUser.textContent = modelName;
    if (dom.aiSendText) dom.aiSendText.classList.add('hidden');
    if (dom.aiLoading) dom.aiLoading.classList.remove('hidden');
    if (dom.btnAiSend) dom.btnAiSend.disabled = true;

    // Set typing status in Firebase RTDB
    if (state.currentChatId && typeof rtdb !== 'undefined') {
        try {
            await rtdb.ref('typing/' + state.currentChatId).set({
                user: username,
                model: modelName,
                typing: true,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            console.warn('Failed to set typing status:', e);
        }
    }

    try {
        const sysPr = 'You are a helpful AI for Photon Studios (indie game dev team). Group chat. Be friendly.' + getMemoryContext();

        const hist = state.currentChatMessages
            .filter(m => m.sender === 'user' || m.sender === 'ai')
            .slice(-10)
            .map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.sender === 'user' ? '[' + (m.author || 'User') + ']: ' + m.text : m.text
            }));

        if (hist.length > 0) {
            hist[hist.length - 1] = {
                role: 'user',
                content: '[' + username + ']: ' + displayMsg + fileCtx
            };
        }

        const messages = [{ role: 'system', content: sysPr }, ...hist];

        const writeOp = msg.match(/(?:save|write|create)\s+(?:this\s+)?(?:as|to)\s+["']?([a-zA-Z0-9_\-\.]+)["']?/i);

        let fullText = '';
        const { div, target, cursor } = createStreamBubble(modelName);

        try {
            // Try streaming first
            const stream = openRouterChatStream(messages, modelId);
            for await (const chunk of stream) {
                if (chunk) {
                    fullText += chunk;
                    target.insertBefore(document.createTextNode(chunk), cursor);
                    if (dom.aiChat) dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
                }
            }
        } catch (streamError) {
            console.warn('Stream fallback:', streamError);
            // Fallback to non-streaming
            fullText = await openRouterChat(messages, modelId);
            target.textContent = fullText;
        }

        // Finalize the response bubble
        cursor.remove();
        if (typeof formatAi === 'function') {
            target.innerHTML = formatAi(fullText);
        } else {
            target.textContent = fullText;
        }

        // Add model tag
        const tag = document.createElement('span');
        tag.className = 'ai-model-tag';
        tag.textContent = (md?.logo || '🔵') + ' ' + modelName;
        const bubble = div.querySelector('.ai-bubble');
        if (bubble) bubble.appendChild(tag);

        if (dom.aiChat) dom.aiChat.scrollTop = dom.aiChat.scrollHeight;

        // Handle write operation if detected
        if (writeOp && writeOp[1]) {
            try {
                const writeResult = await aiWriteFile(writeOp[1], fullText);
                showToast(writeResult, 'success');
            } catch (e) {
                console.error('Failed to write file:', e);
                showToast('Failed to save file.', 'error');
            }
        }

        // Add AI response and save
        const aiMsg = {
            text: fullText,
            sender: 'ai',
            author: modelName,
            modelName,
            timestamp: new Date().toISOString()
        };

        state.currentChatMessages.push(aiMsg);
        state.aiQueryCount = (state.aiQueryCount || 0) + 1;
        if (dom.statAi) dom.statAi.textContent = state.aiQueryCount;
        addActivity('🤖 ' + username + ' → ' + modelName);
        await saveCurrentChat();

    } catch (e) {
        console.error('AI Error:', e);
        const errorText = '❌ ' + (e.message || 'Request failed.');
        appendStatic(errorText, 'ai', modelName, modelName);
        showToast('AI failed.', 'error');

        state.currentChatMessages.push({
            text: errorText,
            sender: 'ai',
            author: modelName,
            modelName,
            timestamp: new Date().toISOString()
        });
        await saveCurrentChat();
    }

    // Clear typing status
    if (state.currentChatId && typeof rtdb !== 'undefined') {
        try {
            await rtdb.ref('typing/' + state.currentChatId).remove();
        } catch (e) {
            console.warn('Failed to clear typing status:', e);
        }
    }

    // Reset UI state
    state.isTyping = false;
    state.isSending = false;  // UNLOCK
    if (dom.typingIndicator) dom.typingIndicator.classList.add('hidden');
    if (dom.aiSendText) dom.aiSendText.classList.remove('hidden');
    if (dom.aiLoading) dom.aiLoading.classList.add('hidden');
    if (dom.btnAiSend) dom.btnAiSend.disabled = false;
}

function createStreamBubble(name) {
    const div = document.createElement('div');
    div.className = 'ai-message';
    const md = AI_MODELS[state.selectedModel];

    div.innerHTML = `
        <div class="ai-avatar">${md?.logo || '🤖'}</div>
        <div class="ai-bubble">
            <div class="ai-message-author">${esc(name)}</div>
            <p class="tw-target"></p>
        </div>`;

    if (dom.aiChat) {
        dom.aiChat.appendChild(div);
    }

    const target = div.querySelector('.tw-target');
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';

    if (target) {
        target.appendChild(cursor);
    }

    if (dom.aiChat) {
        dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
    }

    return { div, target, cursor };
}

function appendStatic(text, sender, modelName = '', author = '', memorySaved = false, fileName = '') {
    if (!dom.aiChat) return;

    const div = document.createElement('div');
    div.className = 'ai-message ' + (sender === 'user' ? 'user-message' : '');

    const md = sender === 'ai' ? AI_MODELS[state.selectedModel] : null;
    const avatar = sender === 'user'
        ? esc((author || '??').substring(0, 2).toUpperCase())
        : (md?.logo || '🤖');

    let html = `<div class="ai-avatar">${avatar}</div><div class="ai-bubble">`;

    if (author) {
        html += `<div class="ai-message-author">${sender === 'user' ? '👤 ' : ''}${esc(author)}</div>`;
    }

    if (fileName) {
        const icon = typeof fileIcon === 'function' ? fileIcon(fileName, false) : '📄';
        html += `<div class="ai-file-bubble"><span>${icon}</span> ${esc(fileName)}</div>`;
    }

    if (sender === 'ai' && typeof formatAi === 'function') {
        html += formatAi(text);
    } else {
        html += esc(text || '');
    }

    if (sender === 'ai' && modelName) {
        html += `<span class="ai-model-tag">${md?.logo || '🔵'} ${esc(modelName)}</span>`;
    }

    if (memorySaved) {
        html += '<span class="memory-saved-indicator">🧠 Saved</span>';
    }

    html += '</div>';

    div.innerHTML = html;
    dom.aiChat.appendChild(div);
    dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
}

/* ========================================
   AI PAGE CONTROLLER
   New ChatGPT-like UI Integration
   ======================================== */

function initAIPageController() {
    if (!document.querySelector('.ai-page-wrapper')) return; // Only run on AI page
    
    setupAISidebar();
    setupAIModelSelector();
    setupAIMemoryPanel();
    setupAIInput();
    setupAISuggestions();
}

// Sidebar toggle
function setupAISidebar() {
    const sidebar = document.getElementById('ai-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('btn-toggle-sidebar');

    toggleBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
        overlay?.classList.toggle('visible');
    });

    overlay?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        document.getElementById('memory-panel')?.classList.add('collapsed');
        overlay?.classList.remove('visible');
    });
}

// Model selector
function setupAIModelSelector() {
    const selector = document.getElementById('model-selector');
    const btn = document.getElementById('model-selector-btn');
    const search = document.getElementById('model-search');
    const options = document.querySelectorAll('.model-option');

    btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        selector?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!selector?.contains(e.target)) {
            selector?.classList.remove('open');
        }
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            const icon = option.dataset.icon;
            const name = option.dataset.name;

            document.getElementById('model-icon').textContent = icon;
            document.getElementById('model-name').textContent = name;
            document.getElementById('model-logo-panel').textContent = icon;
            document.getElementById('model-name-panel').textContent = name;

            options.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');

            state.selectedModel = value;
            if (typeof puter !== 'undefined') {
                puter.kv.set('photon_selected_model', value).catch(() => {});
            }

            selector?.classList.remove('open');
            showToast(`Switched to ${name} ✨`, 'success');
        });
    });

    search?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        options.forEach(option => {
            const name = option.dataset.name?.toLowerCase() || '';
            const desc = option.querySelector('.model-option-desc')?.textContent?.toLowerCase() || '';
            option.style.display = (name.includes(query) || desc.includes(query)) ? '' : 'none';
        });
    });
}

// Memory panel
function setupAIMemoryPanel() {
    const panel = document.getElementById('memory-panel');
    const memoryBtn = document.getElementById('btn-memory');
    const closeBtn = document.getElementById('btn-close-memory');
    const overlay = document.getElementById('sidebar-overlay');
    const dismissTip = document.getElementById('btn-dismiss-tip');

    memoryBtn?.addEventListener('click', () => {
        panel?.classList.toggle('collapsed');
        panel?.classList.toggle('open');
        
        if (window.innerWidth <= 1024) {
            overlay?.classList.toggle('visible');
        }
    });

    closeBtn?.addEventListener('click', () => {
        panel?.classList.add('collapsed');
        panel?.classList.remove('open');
        overlay?.classList.remove('visible');
    });

    dismissTip?.addEventListener('click', () => {
        document.getElementById('memory-tip')?.remove();
        localStorage.setItem('memoryTipDismissed', 'true');
    });

    if (localStorage.getItem('memoryTipDismissed') === 'true') {
        document.getElementById('memory-tip')?.remove();
    }
}

// Input handling - with duplicate prevention
function setupAIInput() {
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('btn-send');
    const attachBtn = document.getElementById('btn-attach');
    const fileInput = document.getElementById('ai-file-input');
    const removeBtn = document.getElementById('btn-remove-attachment');

    if (!input || !sendBtn) return;
    
    // Prevent duplicate listeners
    if (sendBtn.dataset.listenerAttached === 'true') return;
    sendBtn.dataset.listenerAttached = 'true';

    // Auto-resize textarea
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });

    // Send on Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAiMessage();
        }
    });

    // Send button - use onclick to prevent duplicates
    sendBtn.onclick = () => sendAiMessage();

    // Attachments
    if (attachBtn) attachBtn.onclick = () => fileInput?.click();
    if (fileInput) fileInput.onchange = handleFileAttach;
    if (removeBtn) removeBtn.onclick = clearAttachment;
}

    // Send button
    sendBtn.addEventListener('click', () => sendAiMessage());

    // Attachments
    attachBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', handleFileAttach);
    removeBtn?.addEventListener('click', clearAttachment);
}

// Suggestions
function setupAISuggestions() {
    const chips = document.querySelectorAll('.suggestion-chip');
    const input = document.getElementById('ai-input');

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            if (input && prompt) {
                input.value = prompt;
                input.focus();
                sendAiMessage();
            }
        });
    });
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIPageController);
} else {
    initAIPageController();
}
