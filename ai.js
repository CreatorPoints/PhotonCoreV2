/* ========================================
   PHOTON CORE — ai.js
   AI Chat with Action Buttons
   FIXED VERSION - [Object object] bug resolved
   ======================================== */

function normalizeTextChunk(value) {
    // Handle null/undefined
    if (value === null || value === undefined) return '';
    
    // Handle primitives
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(normalizeTextChunk).join('');
    }
    
    // Handle objects
    if (typeof value === 'object') {
        // OpenRouter streaming: choices[0].delta.content
        if (value.choices && Array.isArray(value.choices) && value.choices[0]) {
            const choice = value.choices[0];
            if (choice.delta?.content !== undefined) {
                return normalizeTextChunk(choice.delta.content);
            }
            if (choice.message?.content !== undefined) {
                return normalizeTextChunk(choice.message.content);
            }
            if (choice.text !== undefined) {
                return normalizeTextChunk(choice.text);
            }
        }
        
        // Gemini: candidates[0].content.parts[0].text
        if (value.candidates && Array.isArray(value.candidates) && value.candidates[0]) {
            const candidate = value.candidates[0];
            if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
                return candidate.content.parts
                    .map(part => normalizeTextChunk(part?.text ?? part))
                    .join('');
            }
            if (candidate.text !== undefined) {
                return normalizeTextChunk(candidate.text);
            }
        }
        
        // Direct properties (common patterns)
        if (value.text !== undefined) return normalizeTextChunk(value.text);
        if (value.content !== undefined) return normalizeTextChunk(value.content);
        if (value.message !== undefined) return normalizeTextChunk(value.message);
        if (value.delta !== undefined) return normalizeTextChunk(value.delta);
        if (value.response !== undefined) return normalizeTextChunk(value.response);
        if (value.output !== undefined) return normalizeTextChunk(value.output);
        if (value.result !== undefined) return normalizeTextChunk(value.result);
        if (value.data !== undefined) return normalizeTextChunk(value.data);
        
        // Handle parts array (Gemini style)
        if (Array.isArray(value.parts)) {
            return value.parts
                .map(part => normalizeTextChunk(part?.text ?? part))
                .join('');
        }
        
        // Marked.js v4+ token objects - these have 'raw' or 'text' properties
        if (value.raw !== undefined) return normalizeTextChunk(value.raw);
        if (value.tokens !== undefined && Array.isArray(value.tokens)) {
            return value.tokens.map(t => normalizeTextChunk(t.raw ?? t.text ?? t)).join('');
        }
        
        // If it's an empty object, return empty string
        if (Object.keys(value).length === 0) return '';
        
        // Last resort: try JSON.stringify but log a warning
        try {
            const json = JSON.stringify(value);
            // Don't return "[object Object]" or similar
            if (json === '{}' || json === '[]') return '';
            // If it looks like actual content, return it (for debugging)
            console.warn('normalizeTextChunk: Unhandled object structure:', value);
            // Return empty instead of JSON to avoid showing raw JSON in chat
            return '';
        } catch (e) {
            return '';
        }
    }
    
    // Final fallback - but check for [object Object]
    const str = String(value);
    if (str === '[object Object]') {
        console.warn('normalizeTextChunk: Got [object Object], returning empty');
        return '';
    }
    return str;
}

// === STREAMING MARKDOWN RENDERER ===
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
        if (!safeChunk) return;
        
        // Extra safety check
        if (safeChunk === '[object Object]') {
            console.warn('appendChunk: Blocked [object Object]');
            return;
        }
        
        this.buffer += safeChunk;
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

    render(isFinal = false) {
        const html = this.renderMarkdown(this.buffer, !isFinal);
        this.target.innerHTML = html;
        
        if (dom.aiChat) {
            dom.aiChat.scrollTop = dom.aiChat.scrollHeight;
        }
    }

    renderMarkdown(text, isStreaming) {
        if (!text) return '';

        if (typeof marked !== 'undefined') {
            if (!this.markedRenderer) {
                const renderer = new marked.Renderer();
                const self = this;

                // Handle both marked v4+ (object params) and older versions (separate params)
                renderer.code = function(codeOrToken, infostring, escaped) {
                    let code, lang;
                    
                    // marked v4+ passes an object
                    if (typeof codeOrToken === 'object' && codeOrToken !== null) {
                        code = codeOrToken.text ?? codeOrToken.raw ?? '';
                        lang = codeOrToken.lang ?? codeOrToken.language ?? '';
                    } else {
                        // Older marked versions pass separate params
                        code = codeOrToken ?? '';
                        lang = infostring ?? '';
                    }
                    
                    // Ensure code is a string
                    code = normalizeTextChunk(code);
                    lang = (typeof lang === 'string' ? lang : '').trim();
                    
                    return self.renderCodeBlock(code, lang, false);
                };

                renderer.codespan = function(codeOrToken) {
                    let code;
                    
                    // marked v4+ passes an object
                    if (typeof codeOrToken === 'object' && codeOrToken !== null) {
                        code = codeOrToken.text ?? codeOrToken.raw ?? '';
                    } else {
                        code = codeOrToken ?? '';
                    }
                    
                    code = normalizeTextChunk(code);
                    return `<code class="inline-code">${self.escapeHtml(code)}</code>`;
                };

                renderer.link = function(hrefOrToken, title, text) {
                    let href, linkTitle, linkText;
                    
                    // marked v4+ passes an object
                    if (typeof hrefOrToken === 'object' && hrefOrToken !== null) {
                        href = hrefOrToken.href ?? '';
                        linkTitle = hrefOrToken.title ?? '';
                        linkText = hrefOrToken.text ?? '';
                    } else {
                        href = hrefOrToken ?? '';
                        linkTitle = title ?? '';
                        linkText = text ?? '';
                    }
                    
                    const safeHref = self.escapeHtml(normalizeTextChunk(href));
                    const safeTitle = linkTitle ? ` title="${self.escapeHtml(normalizeTextChunk(linkTitle))}"` : '';
                    const safeText = normalizeTextChunk(linkText);
                    
                    return `<a href="${safeHref}" target="_blank" rel="noopener"${safeTitle}>${safeText}</a>`;
                };

                // Also handle other methods that might receive objects in v4+
                renderer.heading = function(textOrToken, level, raw) {
                    let headingText, headingLevel;
                    
                    if (typeof textOrToken === 'object' && textOrToken !== null) {
                        headingText = textOrToken.text ?? textOrToken.raw ?? '';
                        headingLevel = textOrToken.depth ?? level ?? 1;
                    } else {
                        headingText = textOrToken ?? '';
                        headingLevel = level ?? 1;
                    }
                    
                    headingText = normalizeTextChunk(headingText);
                    return `<h${headingLevel}>${headingText}</h${headingLevel}>`;
                };

                renderer.paragraph = function(textOrToken) {
                    let paraText;
                    
                    if (typeof textOrToken === 'object' && textOrToken !== null) {
                        paraText = textOrToken.text ?? textOrToken.raw ?? '';
                    } else {
                        paraText = textOrToken ?? '';
                    }
                    
                    return `<p>${normalizeTextChunk(paraText)}</p>`;
                };

                renderer.listitem = function(textOrToken) {
                    let itemText;
                    
                    if (typeof textOrToken === 'object' && textOrToken !== null) {
                        itemText = textOrToken.text ?? textOrToken.raw ?? '';
                    } else {
                        itemText = textOrToken ?? '';
                    }
                    
                    return `<li>${normalizeTextChunk(itemText)}</li>\n`;
                };

                renderer.blockquote = function(quoteOrToken) {
                    let quoteText;
                    
                    if (typeof quoteOrToken === 'object' && quoteOrToken !== null) {
                        quoteText = quoteOrToken.text ?? quoteOrToken.raw ?? '';
                    } else {
                        quoteText = quoteOrToken ?? '';
                    }
                    
                    return `<blockquote>${normalizeTextChunk(quoteText)}</blockquote>\n`;
                };

                renderer.strong = function(textOrToken) {
                    let strongText;
                    
                    if (typeof textOrToken === 'object' && textOrToken !== null) {
                        strongText = textOrToken.text ?? textOrToken.raw ?? '';
                    } else {
                        strongText = textOrToken ?? '';
                    }
                    
                    return `<strong>${normalizeTextChunk(strongText)}</strong>`;
                };

                renderer.em = function(textOrToken) {
                    let emText;
                    
                    if (typeof textOrToken === 'object' && textOrToken !== null) {
                        emText = textOrToken.text ?? textOrToken.raw ?? '';
                    } else {
                        emText = textOrToken ?? '';
                    }
                    
                    return `<em>${normalizeTextChunk(emText)}</em>`;
                };

                renderer.del = function(textOrToken) {
                    let delText;
                    
                    if (typeof textOrToken === 'object' && textOrToken !== null) {
                        delText = textOrToken.text ?? textOrToken.raw ?? '';
                    } else {
                        delText = textOrToken ?? '';
                    }
                    
                    return `<del>${normalizeTextChunk(delText)}</del>`;
                };

                renderer.image = function(hrefOrToken, title, text) {
                    let href, imgTitle, imgText;
                    
                    if (typeof hrefOrToken === 'object' && hrefOrToken !== null) {
                        href = hrefOrToken.href ?? '';
                        imgTitle = hrefOrToken.title ?? '';
                        imgText = hrefOrToken.text ?? '';
                    } else {
                        href = hrefOrToken ?? '';
                        imgTitle = title ?? '';
                        imgText = text ?? '';
                    }
                    
                    const safeHref = self.escapeHtml(normalizeTextChunk(href));
                    const safeTitle = imgTitle ? ` title="${self.escapeHtml(normalizeTextChunk(imgTitle))}"` : '';
                    const safeAlt = self.escapeHtml(normalizeTextChunk(imgText));
                    
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

            // Ensure text is a string before parsing
            const rawText = normalizeTextChunk(text);
            
            if (!rawText || rawText === '[object Object]') {
                return isStreaming ? '<span class="streaming-cursor"></span>' : '';
            }
            
            let html = marked.parse(rawText);
            
            if (typeof DOMPurify !== 'undefined') {
                html = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel', 'data-code', 'style'] });
            }

            if (isStreaming) {
                html += '<span class="streaming-cursor"></span>';
            }

            return html;
        }

        return this.parseMarkdown(text);
    }

    parseMarkdown(text) {
        if (!text) return '';
        const rawText = normalizeTextChunk(text);
        if (!rawText || rawText === '[object Object]') return '';
        
        let html = '';
        const lines = rawText.split('\n');
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
        
        // Ensure text is a string
        const safeText = normalizeTextChunk(text);
        if (!safeText || safeText === '[object Object]') return '';
        
        let result = this.escapeHtml(safeText);
        
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
        const safeCode = normalizeTextChunk(code);
        
        // Safety check
        if (!safeCode || safeCode === '[object Object]') {
            return '<div class="ai-code-block"><pre><code>Error: Invalid code block</code></pre></div>';
        }
        
        let highlighted;
        let detectedLang = (typeof lang === 'string' ? lang : '').trim().toLowerCase();

        if (!detectedLang || detectedLang === 'plaintext') {
            const htmlish = /<\s*(!doctype|html|head|body|div|span|p|a|section|main|header|footer|table|tr|td|th|ul|ol|li|script|style)\b/i.test(safeCode);
            if (htmlish) detectedLang = 'html';
        }
        
        try {
            if (typeof hljs !== 'undefined' && detectedLang && hljs.getLanguage(detectedLang)) {
                highlighted = hljs.highlight(safeCode, { language: detectedLang }).value;
            } else if (typeof hljs !== 'undefined') {
                const auto = hljs.highlightAuto(safeCode);
                highlighted = auto.value;
                if (!detectedLang || detectedLang === 'plaintext') {
                    detectedLang = auto.language || detectedLang;
                }
            } else {
                highlighted = this.escapeHtml(safeCode);
            }
        } catch (e) {
            highlighted = this.escapeHtml(safeCode);
        }

        const langLabel = detectedLang || 'plaintext';
        const encodedCode = encodeURIComponent(safeCode);
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
        // Ensure text is a string first
        const safeText = normalizeTextChunk(text);
        if (!safeText || safeText === '[object Object]') return '';
        
        const div = document.createElement('div');
        div.textContent = safeText;
        return div.innerHTML;
    }

    finalize() {
        this.render(true);
        this.target.querySelectorAll('.streaming-cursor').forEach(el => el.remove());
        this.target.querySelectorAll('[style*="animation:blink"]').forEach(el => el.remove());
    }

    getText() {
        return this.buffer;
    }
}

// Rest of the file remains the same...
