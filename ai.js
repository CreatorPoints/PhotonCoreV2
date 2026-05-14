/* ========================================
   PHOTON CORE — ai.js
   ======================================== */

function normalizeTextChunk(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    if (Array.isArray(value)) {
        return value.map(normalizeTextChunk).join('');
    }

    if (typeof value === 'object') {
        if (value.choices?.[0]) {
            const choice = value.choices[0];
            if (choice.delta?.content !== undefined) return normalizeTextChunk(choice.delta.content);
            if (choice.message?.content !== undefined) return normalizeTextChunk(choice.message.content);
            if (choice.text !== undefined) return normalizeTextChunk(choice.text);
        }

        if (value.candidates?.[0]) {
            const candidate = value.candidates[0];
            if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
                return candidate.content.parts.map(part => normalizeTextChunk(part?.text ?? part)).join('');
            }
            if (candidate.text !== undefined) return normalizeTextChunk(candidate.text);
        }

        if (value.text !== undefined) return normalizeTextChunk(value.text);
        if (value.content !== undefined) return normalizeTextChunk(value.content);
        if (value.message !== undefined) return normalizeTextChunk(value.message);
        if (value.delta !== undefined) return normalizeTextChunk(value.delta);
        if (value.response !== undefined) return normalizeTextChunk(value.response);
        if (value.output !== undefined) return normalizeTextChunk(value.output);
        if (value.result !== undefined) return normalizeTextChunk(value.result);
        if (value.data !== undefined) return normalizeTextChunk(value.data);

        if (Array.isArray(value.parts)) {
            return value.parts.map(part => normalizeTextChunk(part?.text ?? part)).join('');
        }

        if (value.raw !== undefined) return normalizeTextChunk(value.raw);
        if (Array.isArray(value.tokens)) {
            return value.tokens.map(token => normalizeTextChunk(token.raw ?? token.text ?? token)).join('');
        }

        return '';
    }

    const text = String(value);
    return text === '[object Object]' ? '' : text;
}

class StreamingMarkdownRenderer {
    constructor(targetElement) {
        this.target = targetElement;
        this.buffer = '';
        this.renderThrottle = 16;
        this.lastRenderTime = 0;
        this.markedRenderer = null;
    }

    appendChunk(chunk) {
        const safeChunk = normalizeTextChunk(chunk);
        if (!safeChunk || safeChunk === '[object Object]') return;
        this.buffer += safeChunk;
        this.processBuffer();
    }

    /** Clear partial output when retrying another model after a failed stream. */
    reset() {
        this.buffer = '';
        this.lastRenderTime = 0;
        if (this.target) {
            this.target.innerHTML = '';
        }
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

    render(isFinal = false) {
        this.target.innerHTML = this.renderMarkdown(this.buffer, !isFinal);
        if (dom.aiChat) dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
    }

    renderMarkdown(text, isStreaming) {
        const rawText = normalizeTextChunk(text);
        if (!rawText) return isStreaming ? '<span class="streaming-cursor"></span>' : '';

        if (typeof marked !== 'undefined') {
            if (!this.markedRenderer) {
                const renderer = new marked.Renderer();
                const self = this;

                renderer.code = function(codeOrToken, infostring) {
                    let code;
                    let lang;

                    if (typeof codeOrToken === 'object' && codeOrToken !== null) {
                        code = codeOrToken.text ?? codeOrToken.raw ?? '';
                        lang = codeOrToken.lang ?? codeOrToken.language ?? '';
                    } else {
                        code = codeOrToken ?? '';
                        lang = infostring ?? '';
                    }

                    return self.renderCodeBlock(normalizeTextChunk(code), String(lang || '').trim(), false);
                };

                renderer.codespan = function(codeOrToken) {
                    const code = typeof codeOrToken === 'object' && codeOrToken !== null
                        ? (codeOrToken.text ?? codeOrToken.raw ?? '')
                        : (codeOrToken ?? '');
                    return `<code class="inline-code">${self.escapeHtml(normalizeTextChunk(code))}</code>`;
                };

                renderer.link = function(hrefOrToken, title, textValue) {
                    let href;
                    let linkTitle;
                    let linkText;

                    if (typeof hrefOrToken === 'object' && hrefOrToken !== null) {
                        href = hrefOrToken.href ?? '';
                        linkTitle = hrefOrToken.title ?? '';
                        linkText = hrefOrToken.text ?? '';
                    } else {
                        href = hrefOrToken ?? '';
                        linkTitle = title ?? '';
                        linkText = textValue ?? '';
                    }

                    const safeHref = self.escapeHtml(normalizeTextChunk(href));
                    const safeTitle = linkTitle ? ` title="${self.escapeHtml(normalizeTextChunk(linkTitle))}"` : '';
                    return `<a href="${safeHref}" target="_blank" rel="noopener"${safeTitle}>${normalizeTextChunk(linkText)}</a>`;
                };

                renderer.paragraph = function(textOrToken) {
                    const paragraphText = typeof textOrToken === 'object' && textOrToken !== null
                        ? (textOrToken.text ?? textOrToken.raw ?? '')
                        : (textOrToken ?? '');
                    return `<p>${normalizeTextChunk(paragraphText)}</p>`;
                };

                renderer.heading = function(textOrToken, level) {
                    const headingText = typeof textOrToken === 'object' && textOrToken !== null
                        ? (textOrToken.text ?? textOrToken.raw ?? '')
                        : (textOrToken ?? '');
                    const headingLevel = typeof textOrToken === 'object' && textOrToken !== null
                        ? (textOrToken.depth ?? level ?? 1)
                        : (level ?? 1);
                    return `<h${headingLevel}>${normalizeTextChunk(headingText)}</h${headingLevel}>`;
                };

                renderer.listitem = function(textOrToken) {
                    const itemText = typeof textOrToken === 'object' && textOrToken !== null
                        ? (textOrToken.text ?? textOrToken.raw ?? '')
                        : (textOrToken ?? '');
                    return `<li>${normalizeTextChunk(itemText)}</li>`;
                };

                renderer.blockquote = function(quoteOrToken) {
                    const quoteText = typeof quoteOrToken === 'object' && quoteOrToken !== null
                        ? (quoteOrToken.text ?? quoteOrToken.raw ?? '')
                        : (quoteOrToken ?? '');
                    return `<blockquote>${normalizeTextChunk(quoteText)}</blockquote>`;
                };

                renderer.strong = function(textOrToken) {
                    const strongText = typeof textOrToken === 'object' && textOrToken !== null
                        ? (textOrToken.text ?? textOrToken.raw ?? '')
                        : (textOrToken ?? '');
                    return `<strong>${normalizeTextChunk(strongText)}</strong>`;
                };

                renderer.em = function(textOrToken) {
                    const emText = typeof textOrToken === 'object' && textOrToken !== null
                        ? (textOrToken.text ?? textOrToken.raw ?? '')
                        : (textOrToken ?? '');
                    return `<em>${normalizeTextChunk(emText)}</em>`;
                };

                renderer.del = function(textOrToken) {
                    const delText = typeof textOrToken === 'object' && textOrToken !== null
                        ? (textOrToken.text ?? textOrToken.raw ?? '')
                        : (textOrToken ?? '');
                    return `<del>${normalizeTextChunk(delText)}</del>`;
                };

                renderer.hr = function() {
                    return '<hr>';
                };

                renderer.image = function(hrefOrToken, title, textValue) {
                    let href;
                    let imageTitle;
                    let altText;

                    if (typeof hrefOrToken === 'object' && hrefOrToken !== null) {
                        href = hrefOrToken.href ?? '';
                        imageTitle = hrefOrToken.title ?? '';
                        altText = hrefOrToken.text ?? '';
                    } else {
                        href = hrefOrToken ?? '';
                        imageTitle = title ?? '';
                        altText = textValue ?? '';
                    }

                    const safeHref = self.escapeHtml(normalizeTextChunk(href));
                    const safeAlt = self.escapeHtml(normalizeTextChunk(altText));
                    const safeTitle = imageTitle ? ` title="${self.escapeHtml(normalizeTextChunk(imageTitle))}"` : '';
                    return `<img src="${safeHref}" alt="${safeAlt}"${safeTitle}>`;
                };

                this.markedRenderer = renderer;
            }

            marked.setOptions({
                renderer: this.markedRenderer,
                gfm: true,
                breaks: true,
                headerIds: false,
                mangle: false
            });

            let html = marked.parse(rawText);
            if (typeof DOMPurify !== 'undefined') {
                html = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel', 'data-code', 'style', 'class'] });
            }
            if (isStreaming) html += '<span class="streaming-cursor"></span>';
            return `<div class="ai-md">${html}</div>`;
        }

        return `<div class="ai-md">${this.escapeHtml(rawText).replace(/\n/g, '<br>')}</div>`;
    }

    renderCodeBlock(code, lang, isStreaming = false) {
        const safeCode = normalizeTextChunk(code);
        if (!safeCode) {
            return '<div class="ai-code-block"><pre><code>Empty code block</code></pre></div>';
        }

        let highlighted;
        let detectedLang = String(lang || '').trim().toLowerCase();

        try {
            if (typeof hljs !== 'undefined' && detectedLang && hljs.getLanguage(detectedLang)) {
                highlighted = hljs.highlight(safeCode, { language: detectedLang }).value;
            } else if (typeof hljs !== 'undefined') {
                const auto = hljs.highlightAuto(safeCode);
                highlighted = auto.value;
                if (!detectedLang) detectedLang = auto.language || 'plaintext';
            } else {
                highlighted = this.escapeHtml(safeCode);
            }
        } catch {
            highlighted = this.escapeHtml(safeCode);
        }

        const encodedCode = encodeURIComponent(safeCode);
        const langLabel = detectedLang || 'plaintext';
        const streamingCursor = isStreaming ? '<span class="streaming-cursor"></span>' : '';

        return `<div class="ai-code-block" style="margin:20px 0;border-radius:12px;overflow:hidden;background:#0a0a12;border:1px solid rgba(108,92,231,0.2);">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:rgba(108,92,231,0.1);border-bottom:1px solid rgba(108,92,231,0.2);">
                <span style="color:var(--ai-accent-light);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${langLabel}</span>
                <button class="ai-copy-btn" data-code="${encodedCode}" style="background:rgba(108,92,231,0.2);border:1px solid rgba(108,92,231,0.3);color:var(--ai-text-secondary);cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;transition:all 0.2s ease;">
                    <span class="copy-icon" aria-hidden="true">&#x1F4CB;</span>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
            <pre style="margin:0;padding:18px;overflow-x:auto;background:transparent;"><code class="hljs" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:13.5px;line-height:1.6;background:transparent;color:#e8e8f0;">${highlighted}${streamingCursor}</code></pre>
        </div>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = normalizeTextChunk(text);
        return div.innerHTML;
    }

    finalize() {
        this.render(true);
        this.target.querySelectorAll('.streaming-cursor').forEach(el => el.remove());
    }

    getText() {
        return this.buffer;
    }
}

window.StreamingMarkdownRenderer = StreamingMarkdownRenderer;

const AI_PAGE_STATE = {
    initialized: false,
    memoriesUnsub: null,
    chatsUnsub: null,
    webSearchEnabled: false,
    currentRenderer: null
};

const AUTO_MODEL_POOL = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-coder:free',
    'google/gemma-4-31b-it:free',
    'deepseek/deepseek-v4-flash:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'openai/gpt-oss-120b:free'
];

const WEB_SEARCH_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_ORDER = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite-001'
];
const OPENROUTER_FALLBACK_ORDER = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-coder:free',
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'openai/gpt-oss-120b:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'deepseek/deepseek-v4-flash:free',
    'openai/gpt-oss-20b:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'z-ai/glm-4.5-air:free'
];

function isAiPage() {
    const path = (window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
    return path.endsWith('/ai') || path.endsWith('/ai.html');
}

function getMessagesInner() {
    return document.querySelector('#ai-chat .chat-messages-inner');
}

function scrollChatToBottom() {
    if (dom.aiChat) dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
}

function getAiInputElement() {
    return dom.aiInput || document.getElementById('ai-input');
}

function getRelevantMemories(limit = 12) {
    if (!Array.isArray(state.memories) || !state.memories.length) return [];
    return state.memories
        .filter(memory => normalizeTextChunk(memory?.text).trim())
        .sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0))
        .slice(-limit);
}

function buildMemorySystemMessage() {
    const memories = getRelevantMemories();
    if (!memories.length) return null;

    const memoryLines = memories.map((memory, index) => {
        const createdAt = memory.createdAt ? new Date(memory.createdAt).toLocaleString() : 'Unknown time';
        return `${index + 1}. ${normalizeTextChunk(memory.text)} (saved ${createdAt})`;
    }).join('\n');

    return [
        'You are Photon Core AI inside a shared team workspace.',
        'Use the team memory below as trusted project context whenever the user asks about prior work, current plans, what the team was building, past decisions, or saved facts.',
        'If the answer is not present in the chat or memory, say that clearly instead of inventing it.',
        'Team memory:',
        memoryLines
    ].join('\n\n');
}

function buildRequestMessages(userMessageId) {
    const messages = [];
    const memorySystemMessage = buildMemorySystemMessage();

    if (memorySystemMessage) {
        messages.push({
            role: 'system',
            content: memorySystemMessage
        });
    }

    state.currentChatMessages.forEach(message => {
        messages.push({
            role: message.role,
            content: message.id === userMessageId
                ? buildPromptWithAttachment(message.content)
                : normalizeTextChunk(message.content)
        });
    });

    return messages;
}

function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getModelMeta(modelId) {
    return AI_MODELS?.[modelId] || AI_MODELS?.[DEFAULT_MODEL] || null;
}

function getAllModelEntries() {
    return Object.entries(AI_MODELS || {});
}

function getModelIcon(modelId) {
    const model = getModelMeta(modelId);
    const logoKey = model?.logoKey || (typeof getLogoKeyFromModel === 'function' ? getLogoKeyFromModel(modelId) : 'default');
    const logo = window.AI_LOGOS?.[logoKey] || window.AI_LOGOS?.default || '&#x1F916;';
    const temp = document.createElement('div');
    temp.innerHTML = logo;
    return temp.textContent || '🤖';
}

function getModelName(modelId) {
    return getModelMeta(modelId)?.name || modelId || 'Assistant';
}

function updateSelectedModelUi() {
    const model = getModelMeta(state.selectedModel);
    if (!model) return;

    const icon = getModelIcon(state.selectedModel);
    if (dom.modelIcon) dom.modelIcon.textContent = icon;
    if (dom.modelName) dom.modelName.textContent = model.name;
    if (dom.modelLogoPanel) dom.modelLogoPanel.textContent = icon;
    if (dom.modelNamePanel) dom.modelNamePanel.textContent = model.name;

    const providerEl = document.querySelector('.model-info-card .model-provider');
    if (providerEl) providerEl.textContent = `${model.provider} • ${model.badge || 'AI'}`;
}

function renderModelOptions(filterText = '') {
    if (!dom.modelDropdownBody) return;

    const search = String(filterText || '').trim().toLowerCase();
    const entries = getAllModelEntries().filter(([id, meta]) => {
        if (!search) return true;
        return [id, meta.name, meta.provider, meta.desc, meta.badge]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(search);
    });

    const providerPriority = [
        'OpenRouter', 'Google', 'Meta', 'OpenAI', 'Alibaba', 'NVIDIA', 'Baidu', 'DeepSeek',
        'Poolside', 'MiniMax', 'Inclusion AI', 'Arcee AI', 'Z AI', 'Liquid', 'Nous Research', 'Cognitive', 'Mistral AI', 'StepFun'
    ];
    const grouped = new Map();

    entries
        .sort((left, right) => {
            const leftPriority = providerPriority.indexOf(left[1].provider);
            const rightPriority = providerPriority.indexOf(right[1].provider);
            const providerDelta = (leftPriority === -1 ? 999 : leftPriority) - (rightPriority === -1 ? 999 : rightPriority);
            if (providerDelta !== 0) return providerDelta;
            return left[1].name.localeCompare(right[1].name);
        })
        .forEach(([id, meta]) => {
            const key = meta.provider || 'Other';
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push([id, meta]);
        });

    const totalLabel = `<div class="model-group-summary">${entries.length} model${entries.length === 1 ? '' : 's'} available</div>`;
    const groupsHtml = [...grouped.entries()].map(([provider, models]) => `
        <div class="model-group">
            <div class="model-group-label">${esc(provider)} <span class="model-group-count">${models.length}</span></div>
            ${models.map(([id, meta]) => {
                const selectedClass = id === state.selectedModel ? ' selected' : '';
                const icon = getModelIcon(id);
                return `<button class="model-option${selectedClass}" type="button" data-model-id="${esc(id)}">
                    <span class="model-option-icon">${esc(icon)}</span>
                    <span class="model-option-info">
                        <div class="model-option-name">${esc(meta.name)}</div>
                        <div class="model-option-desc">${esc(meta.desc || '')}</div>
                    </span>
                    <span class="model-option-badge">${esc(meta.badge || 'AI')}</span>
                </button>`;
            }).join('')}
        </div>
    `).join('');

    dom.modelDropdownBody.innerHTML = entries.length
        ? `${totalLabel}${groupsHtml}`
        : '<div class="model-empty-state">No models match that search.</div>';
}

function closeModelDropdown() {
    dom.modelSelector?.classList.remove('open');
}

function toggleModelDropdown() {
    if (!dom.modelSelector) return;
    dom.modelSelector.classList.toggle('open');
}

function getChatTitle(text) {
    const safeText = normalizeTextChunk(text).replace(/\s+/g, ' ').trim();
    return safeText.slice(0, 48) || 'New Chat';
}

function updateWelcomeVisibility() {
    const welcome = document.getElementById('welcome-message');
    if (!welcome) return;

    const hasMessages = Array.isArray(state.currentChatMessages) && state.currentChatMessages.length > 0;
    welcome.classList.toggle('hidden', hasMessages);
}

function renderMessageContent(target, text) {
    const normalized = normalizeTextChunk(text);
    if (!normalized) {
        target.textContent = '';
        return;
    }

    if (typeof formatAi === 'function') {
        target.innerHTML = formatAi(normalized);
    } else {
        target.textContent = normalized;
    }
}

function createMessageElement(message, options = {}) {
    const role = message.role === 'user' ? 'user-message' : 'ai-message';
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;
    if (message.id) wrapper.dataset.messageId = message.id;

    const avatarText = message.role === 'user'
        ? (state.user?.username || 'You').slice(0, 2).toUpperCase()
        : getModelIcon(message.modelId || state.selectedModel);

    const authorText = message.role === 'user'
        ? (state.user?.username || 'You')
        : getModelName(message.modelId || state.selectedModel);

    wrapper.innerHTML = `
        <div class="message-avatar">${esc(avatarText)}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${esc(authorText)}</span>
            </div>
            <div class="message-text"></div>
        </div>
    `;

    const textEl = wrapper.querySelector('.message-text');

    if (options.streaming) {
        const renderer = new StreamingMarkdownRenderer(textEl);
        AI_PAGE_STATE.currentRenderer = renderer;
        return { element: wrapper, textEl, renderer };
    }

    renderMessageContent(textEl, message.content);
    return { element: wrapper, textEl, renderer: null };
}

function insertMessageElement(messageElement) {
    const container = getMessagesInner();
    if (!container) return;

    const typingIndicator = dom.typingIndicator;
    if (typingIndicator && typingIndicator.parentElement === container) {
        container.insertBefore(messageElement, typingIndicator);
    } else {
        container.appendChild(messageElement);
    }

    scrollChatToBottom();
}

function renderCurrentChat() {
    const container = getMessagesInner();
    if (!container) return;

    Array.from(container.querySelectorAll('.message')).forEach(el => el.remove());
    state.currentChatMessages.forEach(message => {
        const { element } = createMessageElement(message);
        insertMessageElement(element);
    });

    updateWelcomeVisibility();
    scrollChatToBottom();
}

function setMemoryPanelOpen(isOpen) {
    if (!dom.memoryPanel || !dom.btnMemory) return;

    const mobile = window.matchMedia('(max-width: 1100px)').matches;

    if (mobile) {
        dom.memoryPanel.classList.toggle('open', isOpen);
        dom.memoryPanel.classList.toggle('collapsed', !isOpen);
    } else {
        dom.memoryPanel.classList.toggle('collapsed', !isOpen);
        dom.memoryPanel.classList.remove('open');
    }

    dom.btnMemory.classList.toggle('active', isOpen);
}

function isMemoryPanelOpen() {
    if (!dom.memoryPanel) return false;
    const mobile = window.matchMedia('(max-width: 1100px)').matches;
    return mobile
        ? dom.memoryPanel.classList.contains('open')
        : !dom.memoryPanel.classList.contains('collapsed');
}

function toggleSidebar(forceOpen) {
    if (!dom.aiSidebar || !dom.sidebarOverlay) return;

    const shouldOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : !dom.aiSidebar.classList.contains('open');

    dom.aiSidebar.classList.toggle('open', shouldOpen);
    dom.sidebarOverlay.classList.toggle('active', shouldOpen);
}

function clearComposer() {
    const input = getAiInputElement();
    if (input) {
        input.value = '';
        input.style.height = 'auto';
    }
}

function autoresizeInput() {
    const input = getAiInputElement();
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
}

function setSendingState(isSending) {
    state.isSending = isSending;
    if (dom.btnSend) dom.btnSend.disabled = isSending;
    const input = getAiInputElement();
    if (input) input.disabled = isSending;
    if (dom.typingIndicator) dom.typingIndicator.classList.toggle('hidden', !isSending);
}

function ensureCurrentChat() {
    if (state.currentChatId) return state.currentChatId;

    const chatId = generateId('chat');
    state.currentChatId = chatId;
    state.currentChatMessages = [];
    state.chatCreatedAt = new Date().toISOString();
    updateWelcomeVisibility();
    return chatId;
}

async function persistCurrentChat() {
    if (!window.db || !state.user || !state.currentChatId) return;

    const firstUserMessage = state.currentChatMessages.find(message => message.role === 'user');
    const title = getChatTitle(firstUserMessage?.content || 'New Chat');

    await db.collection('ai_chats').doc(state.currentChatId).set({
        id: state.currentChatId,
        userId: state.user.uid,
        username: state.user.username,
        title,
        modelId: state.selectedModel,
        webSearchEnabled: !!AI_PAGE_STATE.webSearchEnabled,
        updatedAt: new Date().toISOString(),
        createdAt: state.chatCreatedAt || new Date().toISOString(),
        messages: state.currentChatMessages.map(message => ({
            id: message.id,
            role: message.role,
            content: normalizeTextChunk(message.content),
            createdAt: message.createdAt,
            modelId: message.modelId || null
        }))
    }, { merge: true });
}

function normalizeStoredMessages(messages) {
    if (!Array.isArray(messages)) return [];

    return messages
        .filter(message => message && message.role)
        .map(message => ({
            id: message.id || generateId('msg'),
            role: message.role,
            content: normalizeTextChunk(message.content),
            createdAt: message.createdAt || new Date().toISOString(),
            modelId: message.modelId || null
        }))
        .filter(message => message.content);
}

function renderChatHistory() {
    if (!dom.chatHistoryList) return;

    const sessions = [...(state.chatSessions || [])].sort((left, right) => {
        return new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0);
    });

    const header = '<div class="chat-history-section"><div class="chat-history-label">Recent Chats</div></div>';

    if (!sessions.length) {
        dom.chatHistoryList.innerHTML = `${header}<div class="chat-item"><div class="chat-item-content"><div class="chat-item-title">No chats yet</div><div class="chat-item-meta">Start a conversation to save it here.</div></div></div>`;
        return;
    }

    dom.chatHistoryList.innerHTML = header + sessions.map(session => {
        const title = getChatTitle(session.title || session.messages?.[0]?.content || 'New Chat');
        const isActive = session.id === state.currentChatId ? ' active' : '';
        const modelName = getModelName(session.modelId || DEFAULT_MODEL);
        return `<div class="chat-item${isActive}" data-chat-id="${esc(session.id)}">
            <div class="chat-item-icon">${esc(getModelIcon(session.modelId || DEFAULT_MODEL))}</div>
            <div class="chat-item-content">
                <div class="chat-item-title">${esc(title)}</div>
                <div class="chat-item-meta">${esc(modelName)}</div>
            </div>
            <div class="chat-item-actions">
                <button class="chat-item-btn delete" type="button" data-delete-chat="${esc(session.id)}" title="Delete chat">✕</button>
            </div>
        </div>`;
    }).join('');
}

async function deleteChat(chatId) {
    if (!window.db || !chatId) return;

    await db.collection('ai_chats').doc(chatId).delete();

    if (state.currentChatId === chatId) {
        state.currentChatId = null;
        state.currentChatMessages = [];
        state.chatCreatedAt = null;
        renderCurrentChat();
        updateWelcomeVisibility();
    }
}

async function selectChat(chatId) {
    const session = (state.chatSessions || []).find(item => item.id === chatId);
    if (!session) return;

    state.currentChatId = session.id;
    state.chatCreatedAt = session.createdAt || new Date().toISOString();
    state.currentChatMessages = normalizeStoredMessages(session.messages);
    state.selectedModel = session.modelId && AI_MODELS?.[session.modelId] ? session.modelId : state.selectedModel;

    try {
        localStorage.setItem('photon_selected_model', state.selectedModel);
    } catch {}

    updateSelectedModelUi();
    renderModelOptions(dom.modelSearch?.value || '');
    renderCurrentChat();
    renderChatHistory();
}

function createNewChat() {
    state.currentChatId = generateId('chat');
    state.currentChatMessages = [];
    state.chatCreatedAt = new Date().toISOString();
    renderCurrentChat();
    renderChatHistory();
    updateWelcomeVisibility();
    clearComposer();
    dom.aiInput?.focus();
}

function getSelectedModelForRequest() {
    if (AI_PAGE_STATE.webSearchEnabled) {
        return WEB_SEARCH_MODEL;
    }

    if (state.selectedModel === DEFAULT_MODEL) {
        const index = Math.floor(Math.random() * AUTO_MODEL_POOL.length);
        return AUTO_MODEL_POOL[index];
    }

    return state.selectedModel;
}

function getModelFallbackCandidates(primaryModel) {
    if (AI_PAGE_STATE.webSearchEnabled) {
        return [WEB_SEARCH_MODEL];
    }

    if (primaryModel === DEFAULT_MODEL) {
        return [...AUTO_MODEL_POOL];
    }

    const orderedPool = isGeminiModel(primaryModel)
        ? GEMINI_FALLBACK_ORDER
        : OPENROUTER_FALLBACK_ORDER;

    const knownModels = getAllModelEntries()
        .map(([id]) => id)
        .filter(id => id !== DEFAULT_MODEL && (isGeminiModel(primaryModel) ? isGeminiModel(id) : !isGeminiModel(id)));

    return [primaryModel, ...orderedPool, ...knownModels].filter((modelId, index, array) => {
        return AI_MODELS?.[modelId] && array.indexOf(modelId) === index;
    });
}

function extractModelErrorStatus(error) {
    const message = normalizeTextChunk(error?.message || '');
    const statusMatch = message.match(/\b(404|429|500|503)\b/);
    return statusMatch ? Number(statusMatch[1]) : null;
}

function isRetryableModelError(error) {
    const status = extractModelErrorStatus(error);
    return status === 404 || status === 429;
}

/**
 * @param {object} messages
 * @param {string} preferredModel
 * @param {{ onChunk?: (text: string) => void, onBeforeRetry?: () => void } | null} streamHooks
 *        When onChunk is set, each streamed token is forwarded for live UI updates.
 */
async function requestAssistantReplyWithFallback(messages, preferredModel, streamHooks = null) {
    const onChunk = typeof streamHooks?.onChunk === 'function' ? streamHooks.onChunk : null;
    const onBeforeRetry = typeof streamHooks?.onBeforeRetry === 'function' ? streamHooks.onBeforeRetry : null;

    const candidates = getModelFallbackCandidates(preferredModel);
    let lastError = null;

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        try {
            let fullResponse = '';
            for await (const chunk of streamAssistantReply(messages, candidate)) {
                const safeChunk = normalizeTextChunk(chunk);
                if (!safeChunk) continue;
                fullResponse += safeChunk;
                if (onChunk) onChunk(safeChunk);
            }

            if (!normalizeTextChunk(fullResponse).trim()) {
                fullResponse = normalizeTextChunk(await getAssistantReplyOnce(messages, candidate));
                if (fullResponse && onChunk) {
                    onChunk(fullResponse);
                }
            }

            if (normalizeTextChunk(fullResponse).trim()) {
                return {
                    modelId: candidate,
                    text: normalizeTextChunk(fullResponse)
                };
            }
        } catch (error) {
            lastError = error;
            const willRetry = isRetryableModelError(error) && index < candidates.length - 1;
            if (willRetry && onBeforeRetry) {
                onBeforeRetry();
            }
            if (!isRetryableModelError(error) || index === candidates.length - 1) {
                break;
            }
        }
    }

    throw lastError || new Error('No available AI model responded.');
}

function isGeminiModel(modelId) {
    return String(modelId || '').toLowerCase().includes('gemini');
}

async function* streamAssistantReply(messages, requestModel) {
    if (AI_PAGE_STATE.webSearchEnabled) {
        const lastUserMessage = [...messages].reverse().find(message => message.role === 'user');
        const query = normalizeTextChunk(lastUserMessage?.content);
        yield* geminiWebSearchStream(query, requestModel);
        return;
    }

    if (isGeminiModel(requestModel)) {
        yield* geminiChatStream(messages, requestModel);
        return;
    }

    yield* openRouterChatStream(messages, requestModel);
}

async function getAssistantReplyOnce(messages, requestModel) {
    if (AI_PAGE_STATE.webSearchEnabled) {
        const lastUserMessage = [...messages].reverse().find(message => message.role === 'user');
        const query = normalizeTextChunk(lastUserMessage?.content);
        const data = await geminiWebSearch(query, requestModel);
        return normalizeTextChunk(
            data?.choices?.[0]?.message?.content
            || data?.message?.content
            || data?.text
            || data?.content
            || ''
        );
    }

    if (isGeminiModel(requestModel)) {
        return normalizeTextChunk(await geminiChat(messages, requestModel));
    }

    return normalizeTextChunk(await openRouterChat(messages, requestModel));
}

function buildPromptWithAttachment(inputText) {
    const safeInput = normalizeTextChunk(inputText);
    if (!state.attachedFile) return safeInput;

    const attachmentLabel = `[Attached file: ${state.attachedFile.name || 'file'}]`;
    const fileText = normalizeTextChunk(state.attachedFileContent);

    if (!fileText) return `${safeInput}\n\n${attachmentLabel}`;

    return `${safeInput}\n\n${attachmentLabel}\n\n${fileText}`;
}

async function sendAiMessage() {
    if (state.isSending) return;

    const inputEl = getAiInputElement();
    const inputText = normalizeTextChunk(inputEl?.value || '').trim();
    if (!inputText && !state.attachedFile) return;

    ensureCurrentChat();
    setSendingState(true);

    const userMessage = {
        id: generateId('msg'),
        role: 'user',
        content: inputText || `Attached ${state.attachedFile?.name || 'file'}`,
        createdAt: new Date().toISOString(),
        modelId: null
    };

    state.currentChatMessages.push(userMessage);
    const { element: userElement } = createMessageElement(userMessage);
    insertMessageElement(userElement);
    updateWelcomeVisibility();

    const requestModel = getSelectedModelForRequest();
    const requestMessages = buildRequestMessages(userMessage.id);

    clearComposer();
    clearAttachment();

    const assistantMessage = {
        id: generateId('msg'),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        modelId: requestModel
    };

    const assistantView = createMessageElement(assistantMessage, { streaming: true });
    insertMessageElement(assistantView.element);

    try {
        const result = await requestAssistantReplyWithFallback(requestMessages, requestModel, {
            onChunk: (text) => assistantView.renderer.appendChunk(text),
            onBeforeRetry: () => assistantView.renderer.reset()
        });
        const safeResponse = normalizeTextChunk(result?.text).trim();
        assistantMessage.modelId = result?.modelId || requestModel;
        assistantView.renderer.finalize();
        assistantMessage.content = safeResponse || 'No response.';

        if (!safeResponse) {
            renderMessageContent(assistantView.textEl, assistantMessage.content);
        }

        state.currentChatMessages.push(assistantMessage);
        state.aiQueryCount = (state.aiQueryCount || 0) + 1;
        if (dom.statAi) dom.statAi.textContent = String(state.aiQueryCount);

        await persistCurrentChat();
        if (assistantMessage.modelId !== requestModel) {
            showToast(`Switched to ${getModelName(assistantMessage.modelId)} after ${getModelName(requestModel)} was unavailable.`, 'info');
        }
        showToast('Reply ready.', 'success');
    } catch (error) {
        assistantMessage.content = `Sorry - the AI request failed.\n\n${normalizeTextChunk(error?.message || 'Unknown error')}`;
        renderMessageContent(assistantView.textEl, assistantMessage.content);
        state.currentChatMessages.push(assistantMessage);
        await persistCurrentChat();
        showToast('AI request failed.', 'error');
    } finally {
        AI_PAGE_STATE.currentRenderer = null;
        setSendingState(false);
        renderChatHistory();
        scrollChatToBottom();
    }
}

function renderMemories() {
    if (!dom.memoryList) return;

    const memories = Array.isArray(state.memories) ? state.memories : [];
    const tipHtml = dom.memoryTip?.outerHTML || '';

    if (!memories.length) {
        dom.memoryList.innerHTML = `${tipHtml}<div class="memory-empty" id="memory-empty">
            <span class="memory-empty-icon">🧠</span>
            <p>No memories saved yet</p>
            <p style="font-size: 12px; margin-top: 4px;">Use the Remember button to save team memories</p>
        </div>`;
    } else {
        dom.memoryList.innerHTML = tipHtml + memories.map(memory => `
            <div class="memory-item" data-memory-id="${esc(memory.id)}">
                <div class="memory-item-text">${esc(memory.text)}</div>
                <button class="memory-item-delete" type="button" data-delete-memory="${esc(memory.id)}" title="Delete memory">✕</button>
            </div>
        `).join('');
    }

    if (dom.memoryCount) dom.memoryCount.textContent = String(memories.length);
    if (dom.memoryCountPanel) dom.memoryCountPanel.textContent = String(memories.length);

    try {
        if (localStorage.getItem('photon_tip_dismissed') === 'true') {
            document.getElementById('memory-tip')?.classList.add('hidden');
        }
    } catch {}
}

async function rememberCurrentInput() {
    if (!window.db || !state.user) {
        showToast('Please wait for sign-in to finish.', 'info');
        return;
    }

    const text = normalizeTextChunk(dom.aiInput?.value || '').trim()
        || normalizeTextChunk(state.currentChatMessages[state.currentChatMessages.length - 1]?.content || '').trim();

    if (!text) {
        showToast('Nothing to save yet.', 'info');
        return;
    }

    await db.collection('memories').add({
        text,
        userId: state.user.uid,
        username: state.user.username,
        createdAt: new Date().toISOString()
    });

    showToast('Saved to team memory.', 'success');
}

async function deleteMemory(memoryId) {
    if (!window.db || !memoryId) return;
    await db.collection('memories').doc(memoryId).delete();
}

function listenMemories() {
    if (!isAiPage() || !window.db || AI_PAGE_STATE.memoriesUnsub) return;

    AI_PAGE_STATE.memoriesUnsub = db.collection('memories').onSnapshot(snapshot => {
        const memories = [];
        snapshot.forEach(doc => {
            const data = doc.data() || {};
            const text = normalizeTextChunk(data.text).trim();
            if (!text) return;

            memories.push({
                id: doc.id,
                text,
                username: data.username || 'Unknown',
                createdAt: data.createdAt || null
            });
        });

        memories.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
        state.memories = memories.slice(0, 50);
        renderMemories();
    }, error => {
        console.error('Memory listener error:', error);
    });
}

function listenChatSessions() {
    if (!isAiPage() || !window.db || !state.user || AI_PAGE_STATE.chatsUnsub) return;

    AI_PAGE_STATE.chatsUnsub = db.collection('ai_chats')
        .where('userId', '==', state.user.uid)
        .onSnapshot(snapshot => {
            const sessions = [];

            snapshot.forEach(doc => {
                const data = doc.data() || {};
                sessions.push({
                    id: doc.id,
                    title: data.title || 'New Chat',
                    modelId: data.modelId || DEFAULT_MODEL,
                    createdAt: data.createdAt || null,
                    updatedAt: data.updatedAt || null,
                    messages: normalizeStoredMessages(data.messages)
                });
            });

            sessions.sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));
            state.chatSessions = sessions;

            if (!state.currentChatId && sessions.length) {
                const latest = sessions[0];
                state.currentChatId = latest.id;
                state.chatCreatedAt = latest.createdAt || new Date().toISOString();
                state.currentChatMessages = normalizeStoredMessages(latest.messages);
            }

            renderChatHistory();
            renderCurrentChat();
        }, error => {
            console.error('Chat listener error:', error);
        });
}

function bindAiPageEvents() {
    const input = getAiInputElement();

    if (dom.btnSend) dom.btnSend.addEventListener('click', sendAiMessage);

    if (input) {
        input.addEventListener('input', autoresizeInput);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendAiMessage();
            }
        });
    }

    if (dom.btnNewChat) dom.btnNewChat.addEventListener('click', createNewChat);
    if (dom.btnMemory) dom.btnMemory.addEventListener('click', () => setMemoryPanelOpen(!isMemoryPanelOpen()));
    if (dom.btnCloseMemory) dom.btnCloseMemory.addEventListener('click', () => setMemoryPanelOpen(false));
    if (dom.btnToggleSidebar) dom.btnToggleSidebar.addEventListener('click', () => toggleSidebar());
    if (dom.sidebarOverlay) dom.sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

    if (dom.modelSelectorBtn) dom.modelSelectorBtn.addEventListener('click', toggleModelDropdown);
    if (dom.modelSearch) dom.modelSearch.addEventListener('input', event => renderModelOptions(event.target.value));

    document.addEventListener('click', event => {
        if (!dom.modelSelector?.contains(event.target)) closeModelDropdown();

        const modelOption = event.target.closest('[data-model-id]');
        if (modelOption) {
            const nextModel = modelOption.dataset.modelId;
            if (AI_MODELS?.[nextModel]) {
                state.selectedModel = nextModel;
                try {
                    localStorage.setItem('photon_selected_model', nextModel);
                } catch {}
                updateSelectedModelUi();
                renderModelOptions(dom.modelSearch?.value || '');
                closeModelDropdown();
                showToast(`Using ${getModelName(nextModel)}.`, 'success');
            }
        }

        const chatItem = event.target.closest('[data-chat-id]');
        if (chatItem && !event.target.closest('[data-delete-chat]')) {
            selectChat(chatItem.dataset.chatId);
            if (window.matchMedia('(max-width: 1100px)').matches) toggleSidebar(false);
        }

        const deleteChatBtn = event.target.closest('[data-delete-chat]');
        if (deleteChatBtn) {
            event.stopPropagation();
            deleteChat(deleteChatBtn.dataset.deleteChat).catch(error => {
                console.error('Delete chat error:', error);
                showToast('Could not delete chat.', 'error');
            });
        }

        const deleteMemoryBtn = event.target.closest('[data-delete-memory]');
        if (deleteMemoryBtn) {
            deleteMemory(deleteMemoryBtn.dataset.deleteMemory).catch(error => {
                console.error('Delete memory error:', error);
                showToast('Could not delete memory.', 'error');
            });
        }

        const dismissTipBtn = event.target.closest('#btn-dismiss-tip');
        if (dismissTipBtn) {
            const tip = document.getElementById('memory-tip');
            if (tip) tip.classList.add('hidden');
            try {
                localStorage.setItem('photon_tip_dismissed', 'true');
            } catch {}
        }

        if (event.target.closest('#btn-send')) {
            sendAiMessage();
        }
    });

    document.addEventListener('keydown', event => {
        const activeInput = getAiInputElement();
        if (!activeInput) return;
        if (document.activeElement !== activeInput) return;
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        sendAiMessage();
    });

    document.querySelectorAll('.suggestion-chip').forEach(button => {
        button.addEventListener('click', () => {
            const composer = getAiInputElement();
            if (!composer) return;
            composer.value = button.dataset.prompt || '';
            autoresizeInput();
            composer.focus();
        });
    });

    if (dom.btnActionRemember) {
        dom.btnActionRemember.addEventListener('click', () => {
            rememberCurrentInput().catch(error => {
                console.error('Remember error:', error);
                showToast('Could not save memory.', 'error');
            });
        });
    }

    if (dom.btnActionWebSearch) {
        dom.btnActionWebSearch.addEventListener('click', () => {
            AI_PAGE_STATE.webSearchEnabled = !AI_PAGE_STATE.webSearchEnabled;
            dom.btnActionWebSearch.classList.toggle('active', AI_PAGE_STATE.webSearchEnabled);
            const modeText = AI_PAGE_STATE.webSearchEnabled ? 'Web search is on.' : 'Web search is off.';
            showToast(modeText, 'info');
        });
    }

    ['btnActionListCloud', 'btnActionRemoveCloud', 'btnActionCreateCloud', 'btnActionAddCloud'].forEach(key => {
        if (dom[key]) {
            dom[key].addEventListener('click', () => {
                showToast('Cloud file actions are not part of this fix yet.', 'info');
            });
        }
    });

    if (dom.btnAttach) dom.btnAttach.addEventListener('click', () => dom.aiFileInput?.click());
    if (dom.aiFileInput) dom.aiFileInput.addEventListener('change', handleFileAttach);
    if (dom.btnRemoveAttachment) dom.btnRemoveAttachment.addEventListener('click', clearAttachment);
}

async function handleFileAttach(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    state.attachedFile = file;
    state.attachedFileName = file.name;
    state.attachedFileContent = '';

    if (dom.attachmentName) dom.attachmentName.textContent = file.name;
    if (dom.attachmentSize) dom.attachmentSize.textContent = fmtSize(file.size || 0);
    if (dom.attachmentIcon) dom.attachmentIcon.textContent = fileIcon(file.name, false);
    if (dom.attachmentPreview) {
        dom.attachmentPreview.classList.remove('hidden');
        dom.attachmentPreview.classList.add('visible');
    }
    if (dom.btnActionAddCloud) dom.btnActionAddCloud.disabled = false;

    const canReadAsText = file.type.startsWith('text/')
        || /\.(txt|md|js|ts|json|html|css|py|java|cs|cpp|xml|yaml|yml)$/i.test(file.name);

    if (canReadAsText) {
        try {
            state.attachedFileContent = await file.text();
        } catch {
            state.attachedFileContent = '';
        }
    }
}

function clearAttachment() {
    state.attachedFile = null;
    state.attachedFileName = '';
    state.attachedFileContent = null;

    if (dom.aiFileInput) dom.aiFileInput.value = '';
    if (dom.attachmentPreview) {
        dom.attachmentPreview.classList.remove('visible');
        dom.attachmentPreview.classList.add('hidden');
    }
    if (dom.btnActionAddCloud) dom.btnActionAddCloud.disabled = true;
}

function initAiPage() {
    if (!isAiPage() || AI_PAGE_STATE.initialized) return;
    AI_PAGE_STATE.initialized = true;

    if (typeof initDom === 'function' && !dom.btnSend) {
        initDom();
    }

    try {
        const savedModel = localStorage.getItem('photon_selected_model');
        if (savedModel && AI_MODELS?.[savedModel]) {
            state.selectedModel = savedModel;
        }
    } catch {}

    if (!state.selectedModel || !AI_MODELS?.[state.selectedModel]) {
        state.selectedModel = DEFAULT_MODEL;
    }

    renderModelOptions();
    updateSelectedModelUi();
    renderChatHistory();
    renderMemories();
    setMemoryPanelOpen(false);
    bindAiPageEvents();
    autoresizeInput();

    const bootstrapData = () => {
        if (!window.db || !state.user) return false;
        listenMemories();
        listenChatSessions();
        return true;
    };

    if (!bootstrapData()) {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            if (bootstrapData() || attempts > 100) clearInterval(timer);
        }, 300);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiPage);
} else {
    initAiPage();
}

window.createNewChat = createNewChat;
window.listenMemories = listenMemories;
window.listenChatSessions = listenChatSessions;
window.sendAiMessage = sendAiMessage;
window.clearAttachment = clearAttachment;
