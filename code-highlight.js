/* ========================================
   PHOTON CORE — code-highlight.js
   Context-aware syntax highlighting for AI code blocks
   ======================================== */

/** Map fence labels / file extensions to highlight.js language ids */
const HIGHLIGHT_LANG_ALIASES = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    python3: 'python',
    python2: 'python',
    rb: 'ruby',
    erb: 'ruby',
    html: 'html',
    htm: 'html',
    xhtml: 'html',
    svg: 'xml',
    vue: 'xml',
    svelte: 'xml',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    fish: 'bash',
    ps1: 'powershell',
    pwsh: 'powershell',
    yml: 'yaml',
    md: 'markdown',
    mdx: 'markdown',
    cs: 'csharp',
    'c#': 'csharp',
    dotnet: 'csharp',
    cpp: 'cpp',
    'c++': 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    h: 'c',
    golang: 'go',
    rs: 'rust',
    kt: 'kotlin',
    kts: 'kotlin',
    swift: 'swift',
    java: 'java',
    php: 'php',
    sql: 'sql',
    mysql: 'sql',
    pgsql: 'sql',
    postgres: 'sql',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    json: 'json',
    jsonc: 'json',
    xml: 'xml',
    docker: 'dockerfile',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    mk: 'makefile',
    tex: 'latex',
    lua: 'lua',
    r: 'r',
    perl: 'perl',
    pl: 'perl',
    wasm: 'wasm',
    graphql: 'graphql',
    gql: 'graphql',
    ini: 'ini',
    toml: 'ini',
    env: 'bash',
    bat: 'dos',
    cmd: 'dos',
    vb: 'vbnet',
    vbnet: 'vbnet',
    objc: 'objectivec',
    'objective-c': 'objectivec',
    diff: 'diff',
    patch: 'diff',
    text: 'plaintext',
    plaintext: 'plaintext',
    txt: 'plaintext',
    console: 'javascript'
};

function escapeCodeHtml(text) {
    const el = document.createElement('div');
    el.textContent = String(text ?? '');
    return el.innerHTML;
}

function normalizeFenceLanguage(lang) {
    const raw = String(lang || '').trim().toLowerCase();
    if (!raw) return '';
    const base = raw.split(/[\s,.:;[{]/)[0];
    return HIGHLIGHT_LANG_ALIASES[base] || base;
}

function hljsLanguageId(lang) {
    if (typeof hljs === 'undefined' || !lang) return '';
    let normalized = normalizeFenceLanguage(lang);
    if (normalized === 'html' && !hljs.getLanguage('html') && hljs.getLanguage('xml')) {
        normalized = 'xml';
    }
    if (normalized && hljs.getLanguage(normalized)) return normalized;
    return '';
}

function getHighlightAutoLanguages() {
    if (typeof hljs !== 'undefined' && typeof hljs.listLanguages === 'function') {
        return hljs.listLanguages();
    }
    return [
        'javascript', 'typescript', 'python', 'ruby', 'xml', 'html', 'css',
        'json', 'bash', 'sql', 'java', 'go', 'rust', 'php', 'csharp', 'cpp',
        'c', 'kotlin', 'swift', 'yaml', 'markdown', 'dockerfile', 'graphql',
        'lua', 'r', 'perl', 'scss', 'less', 'wasm', 'objectivec', 'vbnet',
        'powershell', 'ini', 'diff', 'latex', 'makefile', 'dos', 'plaintext'
    ];
}

function highlightCodeSource(code, lang) {
    const safeCode = String(code ?? '');
    if (!safeCode) {
        return { html: '', language: 'plaintext' };
    }

    if (typeof hljs === 'undefined') {
        return { html: escapeCodeHtml(safeCode), language: normalizeFenceLanguage(lang) || 'plaintext' };
    }

    const explicit = hljsLanguageId(lang);
    try {
        if (explicit) {
            return {
                html: hljs.highlight(safeCode, { language: explicit }).value,
                language: explicit
            };
        }

        const auto = hljs.highlightAuto(safeCode, getHighlightAutoLanguages());
        return {
            html: auto.value,
            language: auto.language || 'plaintext'
        };
    } catch {
        return {
            html: escapeCodeHtml(safeCode),
            language: explicit || normalizeFenceLanguage(lang) || 'plaintext'
        };
    }
}

function renderAiCodeBlock(code, lang, options = {}) {
    const safeCode = String(code ?? '');
    if (!safeCode) {
        return '<div class="ai-code-block"><pre class="ai-code-block-pre"><code>Empty code block</code></pre></div>';
    }

    const { html: highlighted, language } = highlightCodeSource(safeCode, lang);
    const langLabel = language || 'plaintext';
    const encodedCode = encodeURIComponent(safeCode);
    const streamingCursor = options.isStreaming ? '<span class="streaming-cursor"></span>' : '';

    return `<div class="ai-code-block" data-lang="${langLabel}">
            <div class="ai-code-block-header">
                <span class="ai-code-block-lang">${langLabel}</span>
                <button type="button" class="ai-copy-btn" data-code="${encodedCode}">
                    <span class="copy-icon" aria-hidden="true">&#x1F4CB;</span>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
            <pre class="ai-code-block-pre"><code class="hljs language-${langLabel}">${highlighted}${streamingCursor}</code></pre>
        </div>`;
}

window.normalizeFenceLanguage = normalizeFenceLanguage;
window.highlightCodeSource = highlightCodeSource;
window.renderAiCodeBlock = renderAiCodeBlock;
