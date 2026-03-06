/* ========================================
   PHOTON CORE — ai.js
   AI Chat with Action Buttons
   ======================================== */

// === STREAMING MARKDOWN RENDERER ===
class StreamingMarkdownRenderer {
    constructor(targetElement) {
        this.target = targetElement;
        this.buffer = '';
        this.renderThrottle = 16;
        this.lastRenderTime = 0;
    }

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
        const html = this.parseMarkdown(this.buffer);
        this.target.innerHTML = html;
        
        if (dom.aiChat) {
            dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
        }
    }

    parseMarkdown(text) {
        if (!text) return '';

        let html = '';
        const lines = text.split('\n');
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Code block
            if (line.startsWith('```')) {
                const lang = line.slice(3).trim() || 'plaintext';
                const codeLines = [];
                i++;
                
                while (i < lines.length && !lines[i].startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                
                html += this.renderCodeBlock(codeLines.join('\n'), lang, i >= lines.length);
                i++;
                continue;
            }

            // Table detection
            if (line.trim().startsWith('|')) {
                const tableLines = [];
                
                while (i < lines.length && lines[i].trim().startsWith('|')) {
                    tableLines.push(lines[i]);
                    i++;
                }
                
                html += this.renderTable(tableLines);
                continue;
            }

            // Headers
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                html += this.renderHeader(headerMatch[2], level);
                i++;
                continue;
            }

            // Horizontal rule
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
                html += '<hr style="margin:20px 0;border:none;border-top:1px solid rgba(255,255,255,0.1);">';
                i++;
                continue;
            }

            // Unordered list
            const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
            if (ulMatch) {
                const listItems = [];
                
                while (i < lines.length) {
                    const itemMatch = lines[i].match(/^(\s*)[-*+]\s+(.+)$/);
                    if (!itemMatch) break;
                    listItems.push(itemMatch[2]);
                    i++;
                }
                
                html += this.renderList(listItems, 'ul');
                continue;
            }

            // Ordered list
            const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
            if (olMatch) {
                const listItems = [];
                
                while (i < lines.length) {
                    const itemMatch = lines[i].match(/^(\s*)\d+\.\s+(.+)$/);
                    if (!itemMatch) break;
                    listItems.push(itemMatch[2]);
                    i++;
                }
                
                html += this.renderList(listItems, 'ol');
                continue;
            }

            // Blockquote
            const quoteMatch = line.match(/^>\s*(.*)$/);
            if (quoteMatch) {
                html += this.renderBlockquote(quoteMatch[1]);
                i++;
                continue;
            }

            // Empty line
            if (line.trim() === '') {
                i++;
                continue;
            }

            // Regular paragraph
            html += this.renderParagraph(line);
            i++;
        }

        return html;
    }

    renderTable(lines) {
        if (lines.length < 2) return '';

        const rows = lines.map(line => {
            return line.split('|')
                .map(cell => cell.trim())
                .filter(cell => cell !== '');
        });

        const isSeparator = rows[1] && rows[1].every(cell => /^[-:]+$/.test(cell));
        const headerRow = rows[0];
        const dataRows = isSeparator ? rows.slice(2) : rows.slice(1);

        let html = '<div style="overflow-x:auto;margin:20px 0;"><table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.03);border-radius:12px;overflow:hidden;">';

        if (headerRow && headerRow.length > 0) {
            html += '<thead style="background:rgba(108,92,231,0.15);"><tr>';
            headerRow.forEach(cell => {
                html += `<th style="padding:14px 18px;text-align:left;font-weight:600;font-size:14px;border-bottom:2px solid var(--ai-accent);">${this.renderInlineFormatting(cell)}</th>`;
            });
            html += '</tr></thead>';
        }

        html += '<tbody>';
        dataRows.forEach((row, idx) => {
            const bgColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
            html += `<tr style="background:${bgColor};">`;
            row.forEach(cell => {
                html += `<td style="padding:12px 18px;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">${this.renderInlineFormatting(cell)}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';

        return html;
    }

    renderInlineFormatting(text) {
        if (!text) return '';
        
        let result = this.escapeHtml(text);
        
        result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
        result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
        result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
        result = result.replace(/_(.+?)_/g, '<em>$1</em>');
        result = result.replace(/~~(.+?)~~/g, '<del style="opacity:0.7;">$1</del>');
        result = result.replace(/`([^`]+)`/g, '<code style="background:rgba(110,118,129,0.4);padding:3px 7px;border-radius:5px;font-family:\'JetBrains Mono\',Consolas,monospace;font-size:0.9em;color:#e8d4ff;">$1</code>');
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--ai-accent-light);text-decoration:none;border-bottom:1px solid transparent;">$1</a>');
        
        return result;
    }

    renderHeader(text, level) {
        const sizes = { 1: '2em', 2: '1.7em', 3: '1.4em', 4: '1.2em', 5: '1.1em', 6: '1em' };
        const margins = { 1: '28px 0 16px', 2: '24px 0 14px', 3: '20px 0 12px', 4: '16px 0 10px', 5: '14px 0 8px', 6: '12px 0 6px' };
        const formatted = this.renderInlineFormatting(text);
        return `<h${level} style="font-size:${sizes[level]};font-weight:700;margin:${margins[level]};line-height:1.3;color:var(--ai-text-primary);">${formatted}</h${level}>`;
    }

    renderParagraph(text) {
        const formatted = this.renderInlineFormatting(text);
        return `<p style="margin:0 0 14px 0;line-height:1.75;color:var(--ai-text-primary);">${formatted}</p>`;
    }

    renderList(items, type) {
        const tag = type === 'ol' ? 'ol' : 'ul';
        const style = type === 'ol' ? 'list-style:decimal;' : 'list-style:disc;';
        const itemsHtml = items.map(item => 
            `<li style="margin:6px 0;line-height:1.7;color:var(--ai-text-primary);">${this.renderInlineFormatting(item)}</li>`
        ).join('');
        return `<${tag} style="${style}margin:16px 0;padding-left:28px;">${itemsHtml}</${tag}>`;
    }

    renderBlockquote(text) {
        const formatted = this.renderInlineFormatting(text);
        return `<blockquote style="margin:16px 0;padding:12px 20px;border-left:4px solid var(--ai-accent);background:rgba(108,92,231,0.08);border-radius:0 8px 8px 0;color:var(--ai-text-secondary);font-style:italic;">${formatted}</blockquote>`;
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
        const streamingCursor = isStreaming ? '<span style="display:inline-block;width:2px;height:1.2em;background:var(--ai-accent);margin-left:2px;animation:blink 1s infinite;"></span>' : '';

        return `<div class="ai-code-block" style="margin:20px 0;border-radius:12px;overflow:hidden;background:#0a0a12;border:1px solid rgba(108,92,231,0.2);">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:rgba(108,92,231,0.1);border-bottom:1px solid rgba(108,92,231,0.2);">
                <span style="color:var(--ai-accent-light);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${langLabel}</span>
                <button class="ai-copy-btn" data-code="${encodedCode}" style="background:rgba(108,92,231,0.2);border:1px solid rgba(108,92,231,0.3);color:var(--ai-text-secondary);cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;transition:all 0.2s ease;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
            <pre style="margin:0;padding:18px;overflow-x:auto;background:transparent;"><code class="hljs" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:13.5px;line-height:1.6;background:transparent;color:#e8e8f0;">${highlighted}${streamingCursor}</code></pre>
        </div>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    finalize() {
        this.render();
        this.target.querySelectorAll('[style*="animation:blink"]').forEach(el => el.remove());
    }

    getText() {
        return this.buffer;
    }
}

// === MODAL SYSTEM ===

function showModal(options) {
    const overlay = document.getElementById('modal-overlay');
    const dialog = document.getElementById('modal-dialog');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');

    if (!overlay) return;

    title.textContent = options.title || 'Dialog';
    body.innerHTML = options.body || '';
    
    if (options.confirmText) {
        confirmBtn.textContent = options.confirmText;
    }
    
    if (options.cancelText) {
        cancelBtn.textContent = options.cancelText;
    }

    if (options.hideCancel) {
        cancelBtn.style.display = 'none';
    } else {
        cancelBtn.style.display = '';
    }

    if (options.hideConfirm) {
        confirmBtn.style.display = 'none';
    } else {
        confirmBtn.style.display = '';
    }

    // Event handlers
    const cleanup = () => {
        overlay.classList.add('hidden');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        closeBtn.onclick = null;
    };

    closeBtn.onclick = () => {
        cleanup();
        if (options.onCancel) options.onCancel();
    };

    cancelBtn.onclick = () => {
        cleanup();
        if (options.onCancel) options.onCancel();
    };

    confirmBtn.onclick = () => {
        if (options.onConfirm) {
            const result = options.onConfirm();
            if (result !== false) {
                cleanup();
            }
        } else {
            cleanup();
        }
    };

    overlay.classList.remove('hidden');

    // Focus first input if exists
    setTimeout(() => {
        const firstInput = body.querySelector('input, textarea');
        if (firstInput) firstInput.focus();
    }, 100);
}

function hideModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
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

async function addMemory(text, user) {
    if (!text) return;
    if (state.memories.some(m => m.text && m.text.toLowerCase() === text.toLowerCase())) {
        showToast('Memory already exists', 'info');
        return;
    }

    try {
        await db.collection('memories').add({
            text,
            user,
            timestamp: new Date().toISOString()
        });
        showToast('🧠 Saved to memory!', 'success');
    } catch (e) {
        console.error('Failed to add memory:', e);
        showToast('Failed to save memory.', 'error');
    }
}

async function deleteMemory(id) {
    if (!id) return;

    try {
        await db.collection('memories').doc(id).delete();
        showToast('Memory removed.', 'info');
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

// === ACTION BUTTON HANDLERS ===

async function handleActionRemember() {
    const input = document.getElementById('ai-input');
    const text = input?.value?.trim();
    const username = state.user?.username || 'Anonymous';

    if (!text) {
        showModal({
            title: '🧠 Save to Memory',
            body: `
                <div class="modal-field">
                    <label class="modal-label">What should I remember?</label>
                    <textarea class="modal-input modal-textarea" id="remember-input" placeholder="Enter something to remember..."></textarea>
                </div>
            `,
            confirmText: 'Save',
            onConfirm: () => {
                const memoryText = document.getElementById('remember-input')?.value?.trim();
                if (memoryText) {
                    addMemory(memoryText, username);
                    return true;
                }
                showToast('Please enter something to remember', 'error');
                return false;
            }
        });
    } else {
        await addMemory(text, username);
        input.value = '';
        input.style.height = 'auto';
    }
}

async function handleActionAddToCloud() {
    if (!state.attachedFile) {
        showToast('Please attach a file first', 'error');
        return;
    }

    const btn = document.getElementById('btn-action-add-cloud');
    if (btn) {
        btn.classList.add('loading');
        btn.disabled = true;
    }

    try {
        // Use the same upload function as files.js
        if (typeof aiUploadFile === 'function') {
            const url = await aiUploadFile(state.attachedFile);
            if (url) {
                showToast(`☁️ "${state.attachedFileName}" uploaded!`, 'success');
                addSystemMessage(`☁️ Uploaded "${state.attachedFileName}" to cloud storage`);
                clearAttachment();
            } else {
                throw new Error('Upload failed');
            }
        } else {
            // Fallback: convert to base64 and upload via API
            const fileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(state.attachedFile);
            });

            const response = await fetch('/api/files/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileData,
                    fileName: state.attachedFileName,
                    fileType: state.attachedFile.type,
                    uploadedBy: state.user.username,
                    uploadedById: state.user.uid
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            showToast(`☁️ "${state.attachedFileName}" uploaded!`, 'success');
            addSystemMessage(`☁️ Uploaded "${state.attachedFileName}" to cloud storage`);
            clearAttachment();
        }

        // Refresh files list if on files page
        if (typeof loadFiles === 'function') {
            await loadFiles();
        }

    } catch (e) {
        console.error('Upload failed:', e);
        showToast('Upload failed: ' + (e.message || 'Unknown error'), 'error');
    } finally {
        if (btn) {
            btn.classList.remove('loading');
            updateActionButtonStates();
        }
    }
}

async function handleActionListCloud() {
    const btn = document.getElementById('btn-action-list-cloud');
    if (btn) {
        btn.classList.add('loading');
    }

    try {
        const result = await aiListFiles();
        addSystemMessage(result);
    } catch (e) {
        console.error('List files failed:', e);
        showToast('Failed to list files', 'error');
    } finally {
        if (btn) {
            btn.classList.remove('loading');
        }
    }
}

async function handleActionRemoveFromCloud() {
    const btn = document.getElementById('btn-action-remove-cloud');
    if (btn) {
        btn.classList.add('loading');
    }

    try {
        // Get list of files from Supabase
        const response = await fetch('/api/files/list');
        if (!response.ok) throw new Error('Failed to load files');
        
        const data = await response.json();
        const files = data.files || [];

        if (files.length === 0) {
            showModal({
                title: '🗑️ Remove from Cloud',
                body: `
                    <div class="modal-empty">
                        <div class="modal-empty-icon">📂</div>
                        <p>No files in cloud storage</p>
                    </div>
                `,
                hideConfirm: true,
                cancelText: 'Close'
            });
            return;
        }

        // Build file selection list
        const fileListHtml = files.map(f => `
            <div class="file-select-item" data-id="${esc(f.id)}" data-name="${esc(f.name)}" data-path="${esc(f.storage_path)}">
                <span class="file-select-icon">${fileIcon(f.name, false)}</span>
                <div class="file-select-info">
                    <div class="file-select-name">${esc(f.name)}</div>
                    <div class="file-select-size">${fmtSize(f.size || 0)}</div>
                </div>
                <div class="file-select-check"></div>
            </div>
        `).join('');

        showModal({
            title: '🗑️ Remove from Cloud',
            body: `
                <p style="margin-bottom:16px;color:var(--ai-text-secondary);font-size:14px;">Select a file to remove:</p>
                <div class="file-select-list" id="file-select-list">
                    ${fileListHtml}
                </div>
            `,
            confirmText: 'Remove',
            onConfirm: async () => {
                const selected = document.querySelector('.file-select-item.selected');
                if (!selected) {
                    showToast('Please select a file', 'error');
                    return false;
                }

                const fileId = selected.dataset.id;
                const fileName = selected.dataset.name;
                const storagePath = selected.dataset.path;

                try {
                    const deleteResponse = await fetch('/api/files/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: fileId,
                            storagePath: storagePath
                        })
                    });

                    if (!deleteResponse.ok) {
                        const error = await deleteResponse.json();
                        throw new Error(error.error || 'Delete failed');
                    }

                    showToast(`🗑️ "${fileName}" removed`, 'success');
                    
                    if (typeof loadFiles === 'function') {
                        await loadFiles();
                    }

                    addSystemMessage(`🗑️ Removed "${fileName}" from cloud storage`);
                    return true;
                } catch (e) {
                    console.error('Delete failed:', e);
                    showToast('Failed to remove file', 'error');
                    return false;
                }
            }
        });

        // Add click handlers for file selection
        setTimeout(() => {
            document.querySelectorAll('.file-select-item').forEach(item => {
                item.onclick = () => {
                    document.querySelectorAll('.file-select-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                };
            });
        }, 50);

    } catch (e) {
        console.error('Failed to list files:', e);
        showToast('Failed to load files', 'error');
    } finally {
        if (btn) {
            btn.classList.remove('loading');
        }
    }
}

async function handleActionCreateOnCloud() {
    showModal({
        title: '📝 Create File on Cloud',
        body: `
            <div class="modal-field">
                <label class="modal-label">File name (with extension)</label>
                <input type="text" class="modal-input" id="create-filename" placeholder="example.txt">
            </div>
            <div class="modal-field">
                <label class="modal-label">File content</label>
                <textarea class="modal-input modal-textarea" id="create-content" placeholder="Enter file content..."></textarea>
            </div>
        `,
        confirmText: 'Create',
        onConfirm: async () => {
            const filename = document.getElementById('create-filename')?.value?.trim();
            const content = document.getElementById('create-content')?.value || '';

            if (!filename) {
                showToast('Please enter a filename', 'error');
                return false;
            }

            // Validate filename
            if (!/^[\w\-. ]+\.\w+$/.test(filename)) {
                showToast('Invalid filename. Use: name.extension', 'error');
                return false;
            }

            try {
                const response = await fetch('/api/files/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: filename,
                        content: content,
                        uploadedBy: state.user.username,
                        uploadedById: state.user.uid
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Create failed');
                }
                
                showToast(`📝 "${filename}" created!`, 'success');
                
                if (typeof loadFiles === 'function') {
                    await loadFiles();
                }

                addSystemMessage(`📝 Created "${filename}" on cloud storage`);
                return true;
            } catch (e) {
                console.error('Create failed:', e);
                showToast('Failed to create file: ' + (e.message || 'Unknown error'), 'error');
                return false;
            }
        }
    });
}

// Add system message to chat
function addSystemMessage(text) {
    const inner = dom.aiChat?.querySelector('.chat-messages-inner');
    if (!inner) return;

    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.style.display = 'none';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system-message';
    messageDiv.innerHTML = `
        <div class="message-avatar" style="background: rgba(108, 92, 231, 0.2);">⚙️</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">System</span>
            </div>
            <div class="message-text">${formatSystemMessage(text)}</div>
        </div>
    `;

    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator && typingIndicator.parentNode === inner) {
        inner.insertBefore(messageDiv, typingIndicator);
    } else {
        inner.appendChild(messageDiv);
    }

    if (dom.aiChat) {
        dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
    }

    // Also save to chat if active
    if (state.currentChatId) {
        state.currentChatMessages.push({
            text: text,
            sender: 'system',
            author: 'System',
            timestamp: new Date().toISOString()
        });
        saveCurrentChat();
    }
}

function formatSystemMessage(text) {
    // Parse file listings with better formatting
    if (text.includes('📂 Your cloud files')) {
        return text.replace(/\n/g, '<br>');
    }
    return esc(text);
}

// Update action button states based on current state
function updateActionButtonStates() {
    const addCloudBtn = document.getElementById('btn-action-add-cloud');
    
    if (addCloudBtn) {
        if (state.attachedFile) {
            addCloudBtn.disabled = false;
            addCloudBtn.classList.add('active');
        } else {
            addCloudBtn.disabled = true;
            addCloudBtn.classList.remove('active');
        }
    }
}

// === FILE HELPER FUNCTIONS ===

async function aiListFiles() {
    try {
        const response = await fetch('/api/files/list');
        if (!response.ok) throw new Error('Failed to list files');
        
        const data = await response.json();
        const files = data.files || [];

        if (!files.length) {
            return '📂 Your cloud is empty. Upload some files!';
        }

        let result = '📂 **Files in your cloud:**\n\n';
        files.forEach(f => {
            result += `- 📄 **${f.name}** (${fmtSize(f.size)}) - by ${f.uploaded_by}\n`;
        });
        result += `\n📊 **Total:** ${files.length} files`;

        return result;
    } catch (e) {
        console.error('List files error:', e);
        return '⚠️ Error reading cloud: ' + e.message;
    }
}

async function aiReadFile(name) {
    if (!name) return '⚠️ No file name provided.';

    try {
        const response = await fetch(`/api/files/read?name=${encodeURIComponent(name)}`);
        if (!response.ok) {
            const error = await response.json();
            return `⚠️ ${error.error || error.message || 'File not found'}`;
        }
        
        const data = await response.json();
        
        if (data.isBinary) {
            return `📄 **${data.name}** is a binary file (${fmtSize(data.size)}). Cannot display content.`;
        }

        const text = data.content || '';
        if (text.length > 8000) {
            return `📄 **${data.name}** (first 8000 chars):\n\n\`\`\`\n${text.substring(0, 8000)}\n\`\`\`\n\n*[Content truncated]*`;
        }

        return `📄 **${data.name}**:\n\n\`\`\`\n${text}\n\`\`\``;
    } catch (e) {
        console.error('Read file error:', e);
        return '⚠️ Error reading file: ' + e.message;
    }
}

async function aiWriteFile(name, content) {
    if (!name) return '⚠️ No file name provided.';
    if (!state.user) return '⚠️ Please sign in to save files.';

    try {
        const response = await fetch('/api/files/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                content: content || '',
                uploadedBy: state.user.username,
                uploadedById: state.user.uid
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Write failed');
        }

        const data = await response.json();
        
        // Refresh files list if available
        if (typeof loadFiles === 'function') {
            await loadFiles();
        }
        
        if (typeof addActivity === 'function') {
            addActivity(`📝 AI created: ${name}`);
        }

        return `✅ Created "${name}" in cloud storage! (${fmtSize(data.size || 0)})`;
    } catch (e) {
        console.error('Write file error:', e);
        return '⚠️ Error saving file: ' + e.message;
    }
}

async function aiDeleteFile(name) {
    if (!name) return '⚠️ No file name provided.';

    try {
        const response = await fetch('/api/files/delete-by-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            const error = await response.json();
            return `⚠️ ${error.error || error.message || 'Delete failed'}`;
        }

        const data = await response.json();
        
        // Refresh files list if available
        if (typeof loadFiles === 'function') {
            await loadFiles();
        }
        
        if (typeof addActivity === 'function') {
            addActivity(`🗑️ AI deleted: ${data.name}`);
        }

        return `🗑️ Deleted "${data.name}" from cloud storage.`;
    } catch (e) {
        console.error('Delete file error:', e);
        return '⚠️ Error deleting file: ' + e.message;
    }
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

// === CHAT SESSIONS ===

let activeChatUnsubscribe = null;

function listenChatSessions() {
    db.collection('chatSessions')
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .onSnapshot(snap => {
            state.chatSessions = [];
            snap.forEach(doc => state.chatSessions.push({ id: doc.id, ...doc.data() }));
            renderChatHistory();

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
        showToast('New chat created! 💬', 'success');
    } catch (e) {
        console.error('Failed to create chat:', e);
        showToast('Failed to create chat.', 'error');
    }
}

function loadChat(id) {
    if (!id) return;

    if (activeChatUnsubscribe) {
        activeChatUnsubscribe();
        activeChatUnsubscribe = null;
    }

    state.currentChatId = id;
    state.currentChatMessages = [];
    clearChatUI();
    renderChatHistory();

    activeChatUnsubscribe = db.collection('chatSessions').doc(id).onSnapshot(doc => {
        if (!doc.exists) {
            console.warn('Chat document does not exist:', id);
            return;
        }

        const data = doc.data();
        const newMessages = data.messages || [];

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

            state.currentChatMessages = JSON.parse(JSON.stringify(newMessages));

            if (!state.isTyping) {
                clearChatUI();
                newMessages.forEach(m => {
                    if (m.sender === 'system') {
                        addSystemMessage(m.text);
                    } else {
                        appendStatic(m.text, m.sender, m.modelName, m.author, m.memorySaved, m.fileName);
                    }
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
        showToast('Chat deleted.', 'info');
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
    
    const inner = dom.aiChat.querySelector('.chat-messages-inner');
    if (inner) {
        inner.querySelectorAll('.message').forEach(el => el.remove());
        
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
    
    // Update action button states
    updateActionButtonStates();
}

function clearAttachment() {
    state.attachedFile = null;
    state.attachedFileContent = null;
    state.attachedFileName = '';
    
    const preview = document.getElementById('attachment-preview');
    if (preview) preview.classList.add('hidden');
    
    // Update action button states
    updateActionButtonStates();
}

// === AI SEND WITH STREAMING (SIMPLIFIED - NO AUTO FILE/MEMORY DETECTION) ===

async function sendAiMessage() {
    const input = document.getElementById('ai-input');
    if (!input) return;

    const msg = input.value.trim();
    if (!msg && !state.attachedFile) return;

    if (state.isTyping || state.isSending) {
        console.log('⚠️ Already sending, skipping duplicate');
        return;
    }
    state.isSending = true;

    const modelId = state.selectedModel;
    const md = AI_MODELS[modelId];
    const modelName = md?.name || modelId;
    const username = state.user?.username || 'Anon';

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

    // Handle file attachment context (for AI to analyze)
    let displayMsg = msg;
    let fileCtx = '';
    let fileName = '';

    const attachedFile = state.attachedFile;
    const attachedFileName = state.attachedFileName;
    const attachedFileContent = state.attachedFileContent;

    if (attachedFile) {
        fileName = attachedFileName;
        displayMsg = msg || 'Analyze this file: ' + fileName;

        if (attachedFileContent && attachedFileContent.length < 50000) {
            fileCtx = '\n\n--- FILE: ' + fileName + ' ---\n' + attachedFileContent + '\n--- END ---\n';
        } else {
            fileCtx = '\n\n[Attached: ' + fileName + ']';
        }
    }

    // Add user message
    const userMsg = {
        text: displayMsg,
        sender: 'user',
        author: username,
        modelName: '',
        memorySaved: false,
        fileName,
        timestamp: new Date().toISOString()
    };

    state.currentChatMessages.push(userMsg);
    appendUserMessage(displayMsg, username, false, fileName);
    await saveCurrentChat();

    // Clear input and attachment
    input.value = '';
    input.style.height = 'auto';
    clearAttachment();

    // === AI STREAMING RESPONSE ===
    state.isTyping = true;
    
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) typingIndicator.classList.remove('hidden');

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
            const stream = openRouterChatStream(messages, modelId);
            
            for await (const chunk of stream) {
                if (chunk) {
                    fullText += chunk;
                    renderer.appendChunk(chunk);
                }
            }
        } catch (streamError) {
            console.warn('Stream fallback to non-streaming:', streamError);
            fullText = await openRouterChat(messages, modelId);
            renderer.appendChunk(fullText);
        }

        renderer.finalize();

        const modelTag = document.createElement('div');
        modelTag.className = 'ai-model-tag';
        modelTag.innerHTML = `<span>${md?.logo || '🤖'}</span> ${esc(modelName)}`;
        messageDiv.querySelector('.message-content').appendChild(modelTag);

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

    const logoHtml = typeof getAILogo === 'function' 
        ? getAILogo(modelData?.logoKey || getLogoKeyFromModel(state.selectedModel))
        : '🤖';

    messageDiv.innerHTML = `
        <div class="message-avatar">${logoHtml}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${esc(name)}</span>
            </div>
            <div class="message-text"></div>
        </div>
    `;

    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator && typingIndicator.parentNode === inner) {
        inner.insertBefore(messageDiv, typingIndicator);
    } else {
        inner.appendChild(messageDiv);
    }

    const contentTarget = messageDiv.querySelector('.message-text');
    const renderer = new StreamingMarkdownRenderer(contentTarget);

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
        <div class="message-avatar">${esc(avatar)}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${esc(author)}</span>
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
    
    let avatarHtml;
    if (sender === 'user') {
        avatarHtml = esc((author || '??').substring(0, 2).toUpperCase());
    } else {
        avatarHtml = typeof getAILogo === 'function' 
            ? getAILogo(md?.logoKey || getLogoKeyFromModel(state.selectedModel))
            : '🤖';
    }

    let html = `
        <div class="message-avatar">${avatarHtml}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${esc(author || modelName)}</span>
            </div>
    `;

    if (fileName) {
        const icon = typeof fileIcon === 'function' ? fileIcon(fileName, false) : '📄';
        html += `<div class="message-file"><span>${icon}</span> ${esc(fileName)}</div>`;
    }

    if (sender === 'ai') {
        const tempDiv = document.createElement('div');
        const renderer = new StreamingMarkdownRenderer(tempDiv);
        renderer.appendChunk(text);
        renderer.finalize();
        html += `<div class="message-text">${tempDiv.innerHTML}</div>`;
    } else {
        html += `<div class="message-text">${esc(text)}</div>`;
    }

    if (sender === 'ai' && modelName) {
        const logoHtml = typeof getAILogo === 'function' 
            ? getAILogo(md?.logoKey || getLogoKeyFromModel(state.selectedModel))
            : '🤖';
        html += `<div class="ai-model-tag">${logoHtml} ${esc(modelName)}</div>`;
    }

    if (memorySaved) {
        html += '<div class="memory-saved-badge">🧠 Saved to memory</div>';
    }

    html += '</div>';
    messageDiv.innerHTML = html;

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
    setupActionButtons(); // NEW

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

    options.forEach(option => {
        const logoKey = option.dataset.logo || getLogoKeyFromModel(option.dataset.value);
        const iconEl = option.querySelector('.model-option-icon');
        if (iconEl && typeof getAILogo === 'function') {
            iconEl.innerHTML = getAILogo(logoKey);
        }
    });

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

    if (sendBtn.dataset.listenerAttached === 'true') {
        console.log('✓ Input listeners already attached, skipping');
        return;
    }
    sendBtn.dataset.listenerAttached = 'true';

    console.log('✓ Attaching AI input listeners');

    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAiMessage();
        }
    });

    sendBtn.onclick = () => sendAiMessage();

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

// === NEW: SETUP ACTION BUTTONS ===
function setupActionButtons() {
    const rememberBtn = document.getElementById('btn-action-remember');
    const addCloudBtn = document.getElementById('btn-action-add-cloud');
    const listCloudBtn = document.getElementById('btn-action-list-cloud');
    const removeCloudBtn = document.getElementById('btn-action-remove-cloud');
    const createCloudBtn = document.getElementById('btn-action-create-cloud');

    rememberBtn?.addEventListener('click', handleActionRemember);
    addCloudBtn?.addEventListener('click', handleActionAddToCloud);
    listCloudBtn?.addEventListener('click', handleActionListCloud);
    removeCloudBtn?.addEventListener('click', handleActionRemoveFromCloud);
    createCloudBtn?.addEventListener('click', handleActionCreateOnCloud);

    // Initialize button states
    updateActionButtonStates();

    console.log('✓ Action buttons initialized');
}

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
