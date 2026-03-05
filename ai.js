/* ========================================
   PHOTON CORE — ai.js
   AI Chat with Real-Time Streaming + Formatting
   ======================================== */

// === STREAMING MARKDOWN RENDERER ===
class StreamingMarkdownRenderer {
    constructor(targetElement) {
        this.target = targetElement;
        this.buffer = '';
        this.codeBlockOpen = false;
        this.codeBlockLang = '';
        this.codeBlockContent = '';
        this.inlineBuffer = '';
        this.blockBuffer = [];
        this.lastRenderTime = 0;
        this.renderThrottle = 16; // ~60fps
    }

    // Process incoming chunk and render immediately
    appendChunk(chunk) {
        if (!chunk) return;
        
        this.buffer += chunk;
        this.processBuffer();
    }

    processBuffer() {
        const now = Date.now();
        if (now - this.lastRenderTime < this.renderThrottle) {
            requestAnimationFrame(() => this.render());
            return;
        }
        this.lastRenderTime = now;
        this.render();
    }

    render() {
        // Parse and render the full buffer each time for consistency
        const html = this.parseMarkdown(this.buffer);
        this.target.innerHTML = html;
        
        // Scroll to bottom
        if (dom.aiChat) {
            dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
        }
    }

    parseMarkdown(text) {
        if (!text) return '';

        let html = '';
        let i = 0;
        const lines = text.split('\n');
        let inCodeBlock = false;
        let codeBlockLang = '';
        let codeBlockLines = [];
        let inList = false;
        let listItems = [];
        let listType = '';

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            const nextLine = lines[lineIdx + 1];

            // Code block start/end
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    // Flush any pending list
                    if (inList) {
                        html += this.renderList(listItems, listType);
                        listItems = [];
                        inList = false;
                    }
                    inCodeBlock = true;
                    codeBlockLang = line.slice(3).trim() || 'plaintext';
                    codeBlockLines = [];
                } else {
                    // End code block
                    html += this.renderCodeBlock(codeBlockLines.join('\n'), codeBlockLang);
                    inCodeBlock = false;
                    codeBlockLang = '';
                    codeBlockLines = [];
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockLines.push(line);
                continue;
            }

            // Headers
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                if (inList) {
                    html += this.renderList(listItems, listType);
                    listItems = [];
                    inList = false;
                }
                const level = headerMatch[1].length;
                html += this.renderHeader(headerMatch[2], level);
                continue;
            }

            // Horizontal rule
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
                if (inList) {
                    html += this.renderList(listItems, listType);
                    listItems = [];
                    inList = false;
                }
                html += '<hr style="margin:16px 0;border:none;border-top:1px solid rgba(255,255,255,0.1);">';
                continue;
            }

            // Unordered list
            const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
            if (ulMatch) {
                if (!inList || listType !== 'ul') {
                    if (inList) {
                        html += this.renderList(listItems, listType);
                        listItems = [];
                    }
                    inList = true;
                    listType = 'ul';
                }
                listItems.push(ulMatch[2]);
                continue;
            }

            // Ordered list
            const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
            if (olMatch) {
                if (!inList || listType !== 'ol') {
                    if (inList) {
                        html += this.renderList(listItems, listType);
                        listItems = [];
                    }
                    inList = true;
                    listType = 'ol';
                }
                listItems.push(olMatch[2]);
                continue;
            }

            // Blockquote
            const quoteMatch = line.match(/^>\s*(.*)$/);
            if (quoteMatch) {
                if (inList) {
                    html += this.renderList(listItems, listType);
                    listItems = [];
                    inList = false;
                }
                html += this.renderBlockquote(quoteMatch[1]);
                continue;
            }

            // Empty line
            if (line.trim() === '') {
                if (inList) {
                    html += this.renderList(listItems, listType);
                    listItems = [];
                    inList = false;
                }
                continue;
            }

            // Regular paragraph
            if (inList) {
                html += this.renderList(listItems, listType);
                listItems = [];
                inList = false;
            }
            html += this.renderParagraph(line);
        }

        // Flush remaining content
        if (inCodeBlock && codeBlockLines.length > 0) {
            // Code block still open (streaming) - render partial
            html += this.renderCodeBlock(codeBlockLines.join('\n'), codeBlockLang, true);
        }
        if (inList) {
            html += this.renderList(listItems, listType);
        }

        return html;
    }

    renderInlineFormatting(text) {
        if (!text) return '';
        
        let result = this.escapeHtml(text);
        
        // Bold + Italic (must come first)
        result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
        
        // Bold
        result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
        
        // Italic
        result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
        result = result.replace(/_(.+?)_/g, '<em>$1</em>');
        
        // Strikethrough
        result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
        
        // Inline code
        result = result.replace(/`([^`]+)`/g, '<code style="background:rgba(110,118,129,0.4);padding:2px 6px;border-radius:4px;font-family:\'JetBrains Mono\',Consolas,monospace;font-size:0.875em;">$1</code>');
        
        // Links
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#6c5ce7;text-decoration:none;">$1</a>');
        
        return result;
    }

    renderHeader(text, level) {
        const sizes = { 1: '1.75em', 2: '1.5em', 3: '1.25em', 4: '1.1em', 5: '1em', 6: '0.9em' };
        const formatted = this.renderInlineFormatting(text);
        return `<h${level} style="font-size:${sizes[level]};font-weight:600;margin:20px 0 12px 0;line-height:1.3;">${formatted}</h${level}>`;
    }

    renderParagraph(text) {
        const formatted = this.renderInlineFormatting(text);
        return `<p style="margin:0 0 12px 0;line-height:1.7;">${formatted}</p>`;
    }

    renderList(items, type) {
        const tag = type === 'ol' ? 'ol' : 'ul';
        const itemsHtml = items.map(item => 
            `<li style="margin:4px 0;line-height:1.6;">${this.renderInlineFormatting(item)}</li>`
        ).join('');
        return `<${tag} style="margin:12px 0;padding-left:24px;">${itemsHtml}</${tag}>`;
    }

    renderBlockquote(text) {
        const formatted = this.renderInlineFormatting(text);
        return `<blockquote style="margin:12px 0;padding:8px 16px;border-left:3px solid #6c5ce7;background:rgba(108,92,231,0.1);border-radius:0 4px 4px 0;">${formatted}</blockquote>`;
    }

    renderCodeBlock(code, lang, isStreaming = false) {
        let highlighted;
        
        try {
            if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                highlighted = hljs.highlight(code, { language: lang }).value;
            } else if (typeof hljs !== 'undefined') {
                highlighted = hljs.highlightAuto(code).value;
            } else {
                highlighted = this.escapeHtml(code);
            }
        } catch (e) {
            highlighted = this.escapeHtml(code);
        }

        const langLabel = lang || 'plaintext';
        const encodedCode = encodeURIComponent(code);
        const streamingIndicator = isStreaming ? '<span class="streaming-cursor">▊</span>' : '';

        return `<div class="ai-code-block" style="margin:16px 0;border-radius:8px;overflow:hidden;background:#0d0d0d;border:1px solid rgba(255,255,255,0.1);">
            <div class="ai-code-header" style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.1);">
                <span style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:500;">${langLabel}</span>
                <button class="ai-copy-btn" data-code="${encodedCode}" style="background:transparent;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:4px;transition:all 0.15s ease;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
            <pre style="margin:0;padding:16px;overflow-x:auto;background:transparent;"><code class="hljs" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:13px;line-height:1.5;background:transparent;">${highlighted}${streamingIndicator}</code></pre>
        </div>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Finalize rendering (remove streaming indicators)
    finalize() {
        this.render();
        // Remove any streaming cursors
        this.target.querySelectorAll('.streaming-cursor').forEach(el => el.remove());
    }

    // Get the full text
    getText() {
        return this.buffer;
    }
}


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
    
    const panelCount = document.getElementById('memory-count-panel');
    if (panelCount) {
        panelCount.textContent = state.memories.length;
    }

    if (!dom.memoryList) return;

    const emptyEl = document.getElementById('memory-empty');
    
    if (!state.memories.length) {
        if (emptyEl) emptyEl.style.display = 'block';
        dom.memoryList.querySelectorAll('.memory-item').forEach(el => el.remove());
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    // Clear only memory items, keep tip and empty state
    dom.memoryList.querySelectorAll('.memory-item').forEach(el => el.remove());

    state.memories.forEach(m => {
        const item = document.createElement('div');
        item.className = 'memory-item';
        item.dataset.id = m.id;
        item.innerHTML = `
            <span class="memory-item-text">🧠 ${esc(m.text)}</span>
            <span class="memory-item-user">${esc(m.user)}</span>
            <button class="memory-item-delete" data-id="${esc(m.id)}" aria-label="Delete memory">🗑️</button>
        `;
        dom.memoryList.appendChild(item);
    });

    // Event delegation for delete buttons
    dom.memoryList.querySelectorAll('.memory-item-delete').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            deleteMemory(btn.dataset.id);
        };
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
        dom.chatHistoryList.innerHTML = '<div class="chat-history-section"><div class="chat-history-label">No chats yet</div></div>';
        return;
    }

    // Group by date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const groups = {
        today: [],
        yesterday: [],
        older: []
    };

    state.chatSessions.forEach(c => {
        const date = new Date(c.updatedAt);
        if (date.toDateString() === today.toDateString()) {
            groups.today.push(c);
        } else if (date.toDateString() === yesterday.toDateString()) {
            groups.yesterday.push(c);
        } else {
            groups.older.push(c);
        }
    });

    let html = '';

    if (groups.today.length) {
        html += '<div class="chat-history-section"><div class="chat-history-label">Today</div>';
        html += groups.today.map(c => renderChatItem(c)).join('');
        html += '</div>';
    }

    if (groups.yesterday.length) {
        html += '<div class="chat-history-section"><div class="chat-history-label">Yesterday</div>';
        html += groups.yesterday.map(c => renderChatItem(c)).join('');
        html += '</div>';
    }

    if (groups.older.length) {
        html += '<div class="chat-history-section"><div class="chat-history-label">Previous</div>';
        html += groups.older.map(c => renderChatItem(c)).join('');
        html += '</div>';
    }

    dom.chatHistoryList.innerHTML = html;

    // Event delegation for chat items
    dom.chatHistoryList.querySelectorAll('.chat-item').forEach(item => {
        item.onclick = (e) => {
            if (!e.target.closest('.chat-item-btn')) {
                loadChat(item.dataset.chatId);
            }
        };
    });

    dom.chatHistoryList.querySelectorAll('.chat-item-delete').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(btn.dataset.chatId);
        };
    });
}

function renderChatItem(c) {
    const isActive = c.id === state.currentChatId;
    return `<div class="chat-item ${isActive ? 'active' : ''}" data-chat-id="${esc(c.id)}">
        <span class="chat-item-icon">💬</span>
        <span class="chat-item-title">${esc(c.title || 'New Chat')}</span>
        <button class="chat-item-btn chat-item-delete" data-chat-id="${esc(c.id)}" title="Delete">🗑️</button>
    </div>`;
}

function clearChatUI() {
    if (!dom.aiChat) return;
    
    // Find the welcome message and keep it, or create a fresh one
    const inner = dom.aiChat.querySelector('.chat-messages-inner');
    if (inner) {
        // Remove all messages except welcome
        inner.querySelectorAll('.message').forEach(el => el.remove());
        
        // Show welcome message
        const welcome = document.getElementById('welcome-message');
        if (welcome) {
            welcome.style.display = 'flex';
        }
    }
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

    const preview = document.getElementById('attachment-preview');
    const iconEl = document.getElementById('attachment-icon');
    const nameEl = document.getElementById('attachment-name');
    const sizeEl = document.getElementById('attachment-size');

    if (iconEl) iconEl.textContent = fileIcon(file.name, false);
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = fmtSize(file.size);
    if (preview) preview.classList.remove('hidden');

    const fileInput = document.getElementById('ai-file-input');
    if (fileInput) fileInput.value = '';

    showToast('📎 ' + file.name + ' attached', 'info');
}

function clearAttachment() {
    state.attachedFile = null;
    state.attachedFileContent = null;
    state.attachedFileName = '';
    
    const preview = document.getElementById('attachment-preview');
    if (preview) preview.classList.add('hidden');
}


// === AI SEND WITH STREAMING ===

async function sendAiMessage() {
    const input = document.getElementById('ai-input');
    if (!input) return;

    const msg = input.value.trim();
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

    // Hide welcome message
    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.style.display = 'none';

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
            state.isSending = false;
            return;
        }
    }

    // Memory detection
    let memorySaved = false;
    if (msg && shouldRemember(msg)) {
        await addMemory(extractMemory(msg), username);
        memorySaved = true;
    }

    // Handle file attachment
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
    appendUserMessage(displayMsg, username, memorySaved, fileName);
    await saveCurrentChat();

    // Clear input and attachment
    input.value = '';
    input.style.height = 'auto';
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

        state.isSending = false;
        return;
    }

    // === AI STREAMING RESPONSE ===
    state.isTyping = true;
    
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) typingIndicator.classList.remove('hidden');

    // Create streaming message bubble
    const { messageDiv, contentTarget, renderer } = createStreamingBubble(modelName, md);

    try {
        const sysPr = `You are a helpful AI assistant for Photon Studios (an indie game dev team). You're in a group chat environment. Be friendly, helpful, and concise. Use markdown formatting when appropriate - code blocks with language tags, bold for emphasis, lists for multiple items. ${getMemoryContext()}`;

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

        let fullText = '';

        try {
            // Stream the response
            const stream = openRouterChatStream(messages, modelId);
            
            for await (const chunk of stream) {
                if (chunk) {
                    fullText += chunk;
                    renderer.appendChunk(chunk);
                }
            }
        } catch (streamError) {
            console.warn('Stream fallback to non-streaming:', streamError);
            // Fallback to non-streaming
            fullText = await openRouterChat(messages, modelId);
            renderer.appendChunk(fullText);
        }

        // Finalize the rendering
        renderer.finalize();

        // Add model tag
        const modelTag = document.createElement('div');
        modelTag.className = 'ai-model-tag';
        modelTag.innerHTML = `<span>${md?.logo || '🤖'}</span> ${esc(modelName)}`;
        messageDiv.querySelector('.message-content').appendChild(modelTag);

        // Save AI response
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
        renderer.appendChunk(errorText);
        renderer.finalize();
        showToast('AI request failed.', 'error');

        state.currentChatMessages.push({
            text: errorText,
            sender: 'ai',
            author: modelName,
            modelName,
            timestamp: new Date().toISOString()
        });
        await saveCurrentChat();
    }

    // Reset UI state
    state.isTyping = false;
    state.isSending = false;
    if (typingIndicator) typingIndicator.classList.add('hidden');
}

function createStreamingBubble(name, modelData) {
    const inner = dom.aiChat?.querySelector('.chat-messages-inner');
    if (!inner) {
        return { messageDiv: null, contentTarget: null, renderer: { appendChunk: () => {}, finalize: () => {} } };
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    messageDiv.innerHTML = `
        <div class="message-avatar" style="background: var(--ai-bg-tertiary); border: 1px solid var(--ai-border);">
            ${modelData?.logo || '🤖'}
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${esc(name)}</span>
            </div>
            <div class="message-text"></div>
        </div>
    `;

    // Insert before typing indicator
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator && typingIndicator.parentNode === inner) {
        inner.insertBefore(messageDiv, typingIndicator);
    } else {
        inner.appendChild(messageDiv);
    }

    const contentTarget = messageDiv.querySelector('.message-text');
    const renderer = new StreamingMarkdownRenderer(contentTarget);

    // Scroll to bottom
    if (dom.aiChat) {
        dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
    }

    return { messageDiv, contentTarget, renderer };
}

function appendUserMessage(text, author, memorySaved = false, fileName = '') {
    const inner = dom.aiChat?.querySelector('.chat-messages-inner');
    if (!inner) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';

    const avatar = (author || '??').substring(0, 2).toUpperCase();

    let html = `
        <div class="message-avatar user-avatar">${esc(avatar)}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">👤 ${esc(author)}</span>
            </div>
    `;

    if (fileName) {
        const icon = typeof fileIcon === 'function' ? fileIcon(fileName, false) : '📄';
        html += `<div class="message-file"><span>${icon}</span> ${esc(fileName)}</div>`;
    }

    html += `<div class="message-text">${esc(text)}</div>`;

    if (memorySaved) {
        html += '<div class="memory-saved-badge">🧠 Saved to memory</div>';
    }

    html += '</div>';
    messageDiv.innerHTML = html;

    // Insert before typing indicator
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator && typingIndicator.parentNode === inner) {
        inner.insertBefore(messageDiv, typingIndicator);
    } else {
        inner.appendChild(messageDiv);
    }

    if (dom.aiChat) {
        dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
    }
}

function appendStatic(text, sender, modelName = '', author = '', memorySaved = false, fileName = '') {
    const inner = dom.aiChat?.querySelector('.chat-messages-inner');
    if (!inner) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (sender === 'user' ? 'user-message' : 'ai-message');

    const md = sender === 'ai' ? AI_MODELS[state.selectedModel] : null;
    const avatar = sender === 'user'
        ? esc((author || '??').substring(0, 2).toUpperCase())
        : (md?.logo || '🤖');

    let html = `
        <div class="message-avatar ${sender === 'user' ? 'user-avatar' : ''}" ${sender === 'ai' ? 'style="background: var(--ai-bg-tertiary); border: 1px solid var(--ai-border);"' : ''}>
            ${avatar}
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${sender === 'user' ? '👤 ' : ''}${esc(author || modelName)}</span>
            </div>
    `;

    if (fileName) {
        const icon = typeof fileIcon === 'function' ? fileIcon(fileName, false) : '📄';
        html += `<div class="message-file"><span>${icon}</span> ${esc(fileName)}</div>`;
    }

    if (sender === 'ai') {
        // Use streaming renderer for consistent formatting
        const tempDiv = document.createElement('div');
        const renderer = new StreamingMarkdownRenderer(tempDiv);
        renderer.appendChunk(text);
        renderer.finalize();
        html += `<div class="message-text">${tempDiv.innerHTML}</div>`;
    } else {
        html += `<div class="message-text">${esc(text)}</div>`;
    }

    if (sender === 'ai' && modelName) {
        html += `<div class="ai-model-tag"><span>${md?.logo || '🤖'}</span> ${esc(modelName)}</div>`;
    }

    if (memorySaved) {
        html += '<div class="memory-saved-badge">🧠 Saved to memory</div>';
    }

    html += '</div>';
    messageDiv.innerHTML = html;

    // Insert before typing indicator
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator && typingIndicator.parentNode === inner) {
        inner.insertBefore(messageDiv, typingIndicator);
    } else {
        inner.appendChild(messageDiv);
    }

    if (dom.aiChat) {
        dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
    }
}


/* ========================================
   AI PAGE CONTROLLER
   ChatGPT-like UI Integration
======================================== */

function initAIPageController() {
    if (!document.querySelector('.ai-page-wrapper')) return;

    console.log('🎨 Initializing AI Page Controller...');

    setupAISidebar();
    setupAIModelSelector();
    setupAIMemoryPanel();
    setupAIInput();
    setupAISuggestions();
    setupCopyButtons();

    console.log('✅ AI Page Controller ready!');
}

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

    // New chat button
    const newChatBtn = document.getElementById('btn-new-chat');
    newChatBtn?.addEventListener('click', () => {
        createNewChat();
        sidebar?.classList.remove('open');
        overlay?.classList.remove('visible');
    });
}

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
        
        document.querySelectorAll('.model-group').forEach(group => {
            let hasVisible = false;
            group.querySelectorAll('.model-option').forEach(option => {
                const name = option.dataset.name?.toLowerCase() || '';
                const desc = option.querySelector('.model-option-desc')?.textContent?.toLowerCase() || '';
                const visible = name.includes(query) || desc.includes(query);
                option.style.display = visible ? '' : 'none';
                if (visible) hasVisible = true;
            });
            group.style.display = hasVisible ? '' : 'none';
        });
    });
}

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

function setupAIInput() {
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('btn-send');
    const attachBtn = document.getElementById('btn-attach');
    const fileInput = document.getElementById('ai-file-input');
    const removeBtn = document.getElementById('btn-remove-attachment');

    if (!input || !sendBtn) return;

    // Prevent duplicate listeners
    if (sendBtn.dataset.listenerAttached === 'true') {
        console.log('✓ Input listeners already attached, skipping');
        return;
    }
    sendBtn.dataset.listenerAttached = 'true';

    console.log('✓ Attaching AI input listeners');

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

    // Send button
    sendBtn.onclick = () => sendAiMessage();

    // Attachments
    if (attachBtn) attachBtn.onclick = () => fileInput?.click();
    if (fileInput) fileInput.onchange = handleFileAttach;
    if (removeBtn) removeBtn.onclick = clearAttachment;
}

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

// Event delegation for copy buttons (works for dynamically created buttons)
function setupCopyButtons() {
    document.addEventListener('click', function(e) {
        const copyBtn = e.target.closest('.ai-copy-btn');
        if (copyBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            const code = decodeURIComponent(copyBtn.dataset.code || '');
            const copyText = copyBtn.querySelector('.copy-text');
            
            navigator.clipboard.writeText(code).then(() => {
                if (copyText) {
                    copyText.textContent = 'Copied!';
                    copyBtn.style.color = '#10b981';
                }
                setTimeout(() => {
                    if (copyText) {
                        copyText.textContent = 'Copy';
                        copyBtn.style.color = '';
                    }
                }, 2000);
            }).catch(() => {
                showToast('Failed to copy', 'error');
            });
        }
    });
}


// Auto-init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIPageController);
} else {
    initAIPageController();
}
