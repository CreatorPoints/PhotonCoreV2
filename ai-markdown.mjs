/* Photon Core — full Markdown (GFM+) + syntax-highlighted fences */
import MarkdownIt from 'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/+esm';
import multimdTable from 'https://cdn.jsdelivr.net/npm/markdown-it-multimd-table@4.2.3/+esm';
import markdownItFootnote from 'https://cdn.jsdelivr.net/npm/markdown-it-footnote@4.0.0/+esm';
import markdownItDeflist from 'https://cdn.jsdelivr.net/npm/markdown-it-deflist@3.0.0/+esm';
import markdownItEmoji from 'https://cdn.jsdelivr.net/npm/markdown-it-emoji@3.0.0/+esm';
import markdownItMark from 'https://cdn.jsdelivr.net/npm/markdown-it-mark@4.0.0/+esm';
import markdownItSub from 'https://cdn.jsdelivr.net/npm/markdown-it-sub@2.0.0/+esm';
import markdownItSup from 'https://cdn.jsdelivr.net/npm/markdown-it-sup@2.0.0/+esm';
import markdownItAbbr from 'https://cdn.jsdelivr.net/npm/markdown-it-abbr@2.0.0/+esm';
import markdownItIns from 'https://cdn.jsdelivr.net/npm/markdown-it-ins@4.0.0/+esm';
import taskLists from 'https://cdn.jsdelivr.net/npm/markdown-it-task-lists@2.1.1/+esm';

function escapeHtml(text) {
    const el = document.createElement('div');
    el.textContent = String(text ?? '');
    return el.innerHTML;
}

/** GFM strikethrough: ~~text~~ */
function strikethroughPlugin(md) {
    md.inline.ruler.before('emphasis', 'strikethrough', (state, silent) => {
        const start = state.pos;
        if (state.src.charCodeAt(start) !== 0x7e /* ~ */) return false;
        if (state.src.charCodeAt(start + 1) !== 0x7e) return false;

        let match = start + 2;
        while (match < state.posMax) {
            if (state.src.charCodeAt(match) === 0x7e && state.src.charCodeAt(match + 1) === 0x7e) {
                if (!silent) {
                    const token = state.push('strikethrough_open', 'del', 1);
                    token.markup = '~~';
                    const textToken = state.push('text', '', 0);
                    textToken.content = state.src.slice(start + 2, match);
                    const closeToken = state.push('strikethrough_close', 'del', -1);
                    closeToken.markup = '~~';
                }
                state.pos = match + 2;
                return true;
            }
            match++;
        }
        return false;
    });
}

const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true
});

md.use(strikethroughPlugin);
md.use(multimdTable, { multiline: true, rowspan: true, headerless: true });
md.use(taskLists, { enabled: true, label: true, labelAfter: true });
md.use(markdownItFootnote);
md.use(markdownItDeflist);
md.use(markdownItEmoji, { shortcuts: {} });
md.use(markdownItMark);
md.use(markdownItSub);
md.use(markdownItSup);
md.use(markdownItAbbr);
md.use(markdownItIns);

const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const code = token.content;
    const lang = (token.info || '').trim().split(/\s+/)[0];
    if (typeof window.renderAiCodeBlock === 'function') {
        return window.renderAiCodeBlock(code, lang, { isStreaming: !!env?.isStreaming });
    }
    return defaultFence(tokens, idx, options, env, self);
};

const defaultCodeBlock = md.renderer.rules.code_block;
md.renderer.rules.code_block = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (typeof window.renderAiCodeBlock === 'function') {
        return window.renderAiCodeBlock(token.content, 'plaintext', { isStreaming: !!env?.isStreaming });
    }
    return defaultCodeBlock(tokens, idx, options, env, self);
};

md.renderer.rules.code_inline = (tokens, idx) => {
    return `<code class="inline-code">${escapeHtml(tokens[idx].content)}</code>`;
};

const PURIFY_OPTS = {
    ADD_TAGS: [
        'button', 'input', 'label', 'details', 'summary', 'section', 'article',
        'figure', 'figcaption', 'dl', 'dt', 'dd', 'sup', 'sub', 'mark', 'abbr',
        'ins', 'del', 'kbd', 'samp', 'var', 'footer', 'header', 'nav', 'main',
        'aside', 'colgroup', 'col', 'caption', 'thead', 'tbody', 'tfoot'
    ],
    ADD_ATTR: [
        'target', 'rel', 'data-code', 'data-table', 'data-lang', 'style', 'class',
        'type', 'checked', 'disabled', 'id', 'href', 'src', 'alt', 'title',
        'width', 'height', 'align', 'colspan', 'rowspan', 'start', 'name',
        'aria-hidden', 'role'
    ],
    ALLOW_DATA_ATTR: true
};

function sanitizeAiHtml(html) {
    if (typeof DOMPurify === 'undefined') return html;
    return DOMPurify.sanitize(html, PURIFY_OPTS);
}

function tableToTsv(table) {
    const rows = [...table.querySelectorAll('tr')];
    return rows
        .map((tr) =>
            [...tr.cells]
                .map((cell) => cell.innerText.replace(/\t/g, ' ').replace(/\n/g, ' ').trim())
                .join('\t')
        )
        .join('\n');
}

function wrapTable(table) {
    if (table.closest('.ai-table-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'ai-table-wrap';

    const toolbar = document.createElement('div');
    toolbar.className = 'ai-table-toolbar';

    const label = document.createElement('span');
    label.className = 'ai-table-label';
    label.textContent = 'Table';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'ai-copy-btn ai-table-copy-btn';
    copyBtn.dataset.table = encodeURIComponent(tableToTsv(table));
    copyBtn.innerHTML = '<span class="copy-icon" aria-hidden="true">&#x1F4CB;</span><span class="copy-text">Copy table</span>';

    toolbar.appendChild(label);
    toolbar.appendChild(copyBtn);

    const scroll = document.createElement('div');
    scroll.className = 'ai-table-scroll';
    table.classList.add('ai-table');

    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(toolbar);
    wrap.appendChild(scroll);
    scroll.appendChild(table);
}

function enhanceAiMarkdownDom(root) {
    if (!root) return;
    root.querySelectorAll('table').forEach(wrapTable);

    root.querySelectorAll(
        '.task-list-item input[type="checkbox"], .contains-task-list input[type="checkbox"], .ai-md input[type="checkbox"]'
    ).forEach((input) => {
        input.disabled = true;
        input.setAttribute('aria-hidden', 'true');
    });

    root.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        if (/^https?:\/\//i.test(href) && !a.getAttribute('target')) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        }
    });
}

function parseAiMarkdown(text, options = {}) {
    const raw = String(text ?? '');
    if (!raw.trim()) {
        return options.isStreaming
            ? '<div class="ai-md"><span class="streaming-cursor"></span></div>'
            : '<div class="ai-md"></div>';
    }

    const env = { isStreaming: !!options.isStreaming };
    let html = md.render(raw, env);
    html = sanitizeAiHtml(html);
    if (options.isStreaming) html += '<span class="streaming-cursor"></span>';
    return `<div class="ai-md">${html}</div>`;
}

window.parseAiMarkdown = parseAiMarkdown;
window.sanitizeAiHtml = sanitizeAiHtml;
window.enhanceAiMarkdownDom = enhanceAiMarkdownDom;
window.AI_MARKDOWN_READY = true;
window.dispatchEvent(new Event('ai-markdown-ready'));
