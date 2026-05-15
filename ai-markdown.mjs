import MarkdownIt from 'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/+esm';
import emoji from 'https://cdn.jsdelivr.net/npm/markdown-it-emoji@3.0.0/+esm';
import sub from 'https://cdn.jsdelivr.net/npm/markdown-it-sub@2.0.0/+esm';
import sup from 'https://cdn.jsdelivr.net/npm/markdown-it-sup@2.0.0/+esm';
import mark from 'https://cdn.jsdelivr.net/npm/markdown-it-mark@4.0.0/+esm';
import ins from 'https://cdn.jsdelivr.net/npm/markdown-it-ins@4.0.0/+esm';
import abbr from 'https://cdn.jsdelivr.net/npm/markdown-it-abbr@2.0.0/+esm';
import footnote from 'https://cdn.jsdelivr.net/npm/markdown-it-footnote@4.0.0/+esm';
import taskLists from 'https://cdn.jsdelivr.net/npm/markdown-it-task-lists@2.1.1/+esm';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.0.11/+esm';

/**
 * Robust AI Markdown Parser using markdown-it and custom plugins.
 * Supports GFM, Math (KaTeX), Callouts, Mermaid, and more.
 */

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        const languageClass = lang ? `language-${lang}` : '';
        if (typeof hljs !== 'undefined') {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return `<pre class="hljs"><code class="${languageClass}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
                } catch (__) { }
            } else {
                try {
                    return `<pre class="hljs"><code class="${languageClass}">${hljs.highlightAuto(str).value}</code></pre>`;
                } catch (__) { }
            }
        }
        return `<pre class="hljs"><code class="${languageClass}">${md.utils.escapeHtml(str)}</code></pre>`;
    }
});

// Use plugins
if (typeof emoji === 'function') md.use(emoji);
if (typeof sub === 'function') md.use(sub);
if (typeof sup === 'function') md.use(sup);
if (typeof mark === 'function') md.use(mark);
if (typeof ins === 'function') md.use(ins);
if (typeof abbr === 'function') md.use(abbr);
if (typeof footnote === 'function') md.use(footnote);
if (typeof taskLists === 'function') md.use(taskLists, { label: true, labelAfter: true });

// --- Custom Math Rules ---

function parseMathInline(str, start) {
    let end = str.indexOf("$", start + 1);
    while (end !== -1 && str[end - 1] === "\\") {
        end = str.indexOf("$", end + 1);
    }
    if (end !== -1) {
        const content = str.slice(start + 1, end);
        if (content.includes('\n')) return null;
        if (content.length > 0 &&
            content[0] !== ' ' &&
            content[content.length - 1] !== ' ' &&
            isNaN(content)) {
            return {
                content: content,
                end: end + 1
            };
        }
    }
    return null;
}

md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
    if (state.src[state.pos] !== "$") return false;
    let res = parseMathInline(state.src, state.pos);
    if (!res) return false;
    if (!silent) {
        let token = state.push('math_inline', 'span', 0);
        token.content = res.content;
    }
    state.pos = res.end;
    return true;
});

md.block.ruler.after('blockquote', 'math_block', (state, startLine, endLine, silent) => {
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];
    if (pos + 2 > max || state.src.slice(pos, pos + 2) !== "$$") return false;
    if (silent) return true;

    let firstLine = state.src.slice(pos + 2, max).trim();
    let nextLine = startLine;
    let lastLine = '';
    let found = false;

    if (firstLine.endsWith("$$")) {
        firstLine = firstLine.slice(0, -2);
        found = true;
    }

    while (!found) {
        nextLine++;
        if (nextLine >= endLine) break;
        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];
        let lineText = state.src.slice(pos, max).trim();
        if (lineText.endsWith("$$")) {
            lastLine = lineText.slice(0, -2);
            found = true;
        }
    }

    const token = state.push('math_block', 'div', 0);
    token.block = true;
    let content = '';
    if (startLine === nextLine) {
        content = firstLine;
    } else {
        let middle = state.getLines(startLine + 1, nextLine, state.tShift[startLine], true);
        content = (firstLine ? firstLine + "\n" : "") + middle + (lastLine ? "\n" + lastLine : "");
    }
    token.content = content.trim();
    state.line = nextLine + 1;
    return true;
});

md.renderer.rules.math_inline = (tokens, idx) => {
    const content = tokens[idx].content;
    return `<span class="katex-inline-placeholder" data-math="${md.utils.escapeHtml(content)}">$${md.utils.escapeHtml(content)}$</span>`;
};

md.renderer.rules.math_block = (tokens, idx) => {
    const content = tokens[idx].content;
    return `<div class="katex-block-placeholder" data-math="${md.utils.escapeHtml(content)}">$$${md.utils.escapeHtml(content)}$$</div>`;
};

// --- Custom Callout Rules ---

// GFM-style: > [!TYPE]
md.core.ruler.after('block', 'gfm_callouts', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'blockquote_open') {
            let nextToken = tokens[i + 1];
            if (nextToken && nextToken.type === 'paragraph_open') {
                let inlineToken = tokens[i + 2];
                if (inlineToken && inlineToken.type === 'inline') {
                    let match = inlineToken.content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
                    if (match) {
                        let type = match[1].toLowerCase();
                        if (type === 'caution') type = 'warning';

                        tokens[i].type = 'callout_open';
                        tokens[i].tag = 'div';
                        tokens[i].attrPush(['class', `ai-callout ai-callout-${type}`]);

                        const headerOpen = new state.Token('callout_header_open', 'div', 1);
                        headerOpen.attrPush(['class', 'ai-callout-header']);

                        const iconSpan = new state.Token('callout_icon', 'span', 0);
                        iconSpan.attrPush(['class', 'ai-callout-icon']);

                        const headerText = new state.Token('text', '', 0);
                        headerText.content = match[1].toUpperCase();

                        const headerClose = new state.Token('callout_header_close', 'div', -1);

                        const contentOpen = new state.Token('callout_content_open', 'div', 1);
                        contentOpen.attrPush(['class', 'ai-callout-content']);

                        tokens.splice(i + 1, 0, headerOpen, iconSpan, headerText, headerClose, contentOpen);

                        let depth = 1;
                        for (let j = i + 6; j < tokens.length; j++) {
                            if (tokens[j].type === 'blockquote_open') depth++;
                            if (tokens[j].type === 'blockquote_close') {
                                depth--;
                                if (depth === 0) {
                                    tokens[j].type = 'callout_close';
                                    tokens[j].tag = 'div';
                                    tokens.splice(j, 0, new state.Token('callout_content_close', 'div', -1));
                                    break;
                                }
                            }
                        }

                        inlineToken.content = inlineToken.content.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, '');
                    }
                }
            }
        }
    }
});

// Custom-style: ::: type
md.block.ruler.after('blockquote', 'custom_callouts', (state, startLine, endLine, silent) => {
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];
    if (pos + 3 > max || state.src.slice(pos, pos + 3) !== ':::') return false;
    if (silent) return true;

    let lineText = state.src.slice(pos + 3, max).trim();
    let type = lineText.split(/\s+/)[0].toLowerCase() || 'note';

    let nextLine = startLine;
    while (true) {
        nextLine++;
        if (nextLine >= endLine) break;
        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];
        if (state.src.slice(pos, max).trim() === ':::') break;
    }

    let token = state.push('ai_callout_open', 'div', 1);
    token.attrPush(['class', `ai-callout ai-callout-${type}`]);
    token.block = true;

    let hToken = state.push('ai_callout_header_open', 'div', 1);
    hToken.attrPush(['class', 'ai-callout-header']);

    let iToken = state.push('ai_callout_icon', 'span', 0);
    iToken.attrPush(['class', 'ai-callout-icon']);

    let tToken = state.push('text', '', 0);
    tToken.content = type.toUpperCase();

    state.push('ai_callout_header_close', 'div', -1);

    let cToken = state.push('ai_callout_content_open', 'div', 1);
    cToken.attrPush(['class', 'ai-callout-content']);

    state.md.block.tokenize(state, startLine + 1, nextLine);

    state.push('ai_callout_content_close', 'div', -1);
    token = state.push('ai_callout_close', 'div', -1);
    state.line = nextLine + 1;
    return true;
});

// --- Table and Link Post-processing ---

md.renderer.rules.table_open = () => '<div class="table-wrapper"><table>';
md.renderer.rules.table_close = () => '</table></div><button class="copy-table-btn">Copy Table</button>';

const defaultLinkRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
};
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const aIndex = tokens[idx].attrIndex('href');
    if (aIndex >= 0) {
        const href = tokens[idx].attrs[aIndex][1];
        if (href.startsWith('http')) {
            tokens[idx].attrPush(['target', '_blank']);
            tokens[idx].attrPush(['rel', 'noopener noreferrer']);
        }
    }
    return defaultLinkRender(tokens, idx, options, env, self);
};

md.renderer.rules.code_block = (tokens, idx) => {
    const content = tokens[idx].content;
    if (typeof hljs !== 'undefined') {
        const highlighted = hljs.highlightAuto(content).value;
        return `<pre class="hljs"><code>${highlighted}</code></pre>`;
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(content)}</code></pre>`;
};

/**
 * Parses markdown string to HTML.
 * Includes sanitization to prevent XSS.
 */
export function parseAiMarkdown(markdown, isStreaming = false) {
    if (!markdown) return "";

    let html = md.render(markdown);

    if (isStreaming) {
        html += '<span class="streaming-cursor"></span>';
    }

    if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
        return DOMPurify.sanitize(html, {
            ADD_ATTR: ['target', 'rel', 'data-math'],
            ADD_TAGS: ['use', 'svg', 'foreignobject', 'path', 'g', 'rect', 'circle', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'tspan', 'defs', 'style']
        });
    }
    return html;
}

/**
 * Enhances the DOM element with interactive features like Mermaid, Math, and Copy Table.
 */
export function enhanceAiMarkdownDom(dom, options = {}) {
    // 1. Math Rendering (KaTeX)
    if (typeof katex !== 'undefined') {
        dom.querySelectorAll('.katex-inline-placeholder').forEach(el => {
            try {
                const math = el.dataset.math;
                el.innerHTML = katex.renderToString(math, { throwOnError: false });
                el.classList.remove('katex-inline-placeholder');
                el.classList.add('katex-rendered');
            } catch (e) { }
        });
        dom.querySelectorAll('.katex-block-placeholder').forEach(el => {
            try {
                const math = el.dataset.math;
                el.innerHTML = katex.renderToString(math, { displayMode: true, throwOnError: false });
                el.classList.remove('katex-block-placeholder');
                el.classList.add('katex-rendered');
            } catch (e) { }
        });
    }

    // 2. Mermaid Diagrams
    const mermaidBlocks = dom.querySelectorAll('pre.hljs code.language-mermaid');
    if (mermaidBlocks.length > 0 && typeof mermaid !== 'undefined') {
        if (!options.isStreaming) {
            if (typeof mermaid.initialize === 'function') {
                mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
            }

            mermaidBlocks.forEach((block, index) => {
                const rawCode = block.textContent.trim();
                const id = 'm' + Math.random().toString(36).substr(2, 9);
                const container = document.createElement('div');
                container.className = 'mermaid';
                block.parentElement.parentElement.replaceChild(container, block.parentElement);

                try {
                    mermaid.render(id, rawCode).then(({ svg }) => {
                        container.innerHTML = svg;
                    }).catch(err => {
                        console.error('Mermaid render error:', err);
                        container.innerHTML = `<pre class="mermaid-error">${md.utils.escapeHtml(rawCode)}</pre>`;
                    });
                } catch (e) {
                    console.error('Mermaid exception:', e);
                    container.innerHTML = `<pre class="mermaid-error">${md.utils.escapeHtml(rawCode)}</pre>`;
                }
            });
        }
    }

    // 3. Copy Table Feature
    dom.querySelectorAll('.copy-table-btn').forEach(btn => {
        btn.onclick = () => {
            const table = btn.previousElementSibling.querySelector('table');
            if (table) {
                const tsv = tableToTsv(table);
                navigator.clipboard.writeText(tsv).then(() => {
                    const originalText = btn.innerText;
                    btn.innerText = 'Copied!';
                    setTimeout(() => btn.innerText = originalText, 2000);
                });
            }
        };
    });
}

function tableToTsv(table) {
    const rows = Array.from(table.rows);
    return rows.map(row =>
        Array.from(row.cells).map(cell => cell.innerText.replace(/\t/g, ' ')).join('\t')
    ).join('\n');
}

// Attach to window for non-module script compatibility
if (typeof window !== 'undefined') {
    window.parseAiMarkdown = parseAiMarkdown;
    window.enhanceAiMarkdownDom = enhanceAiMarkdownDom;
}
