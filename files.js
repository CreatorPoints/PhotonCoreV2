/* ========================================
   PHOTON CORE — files.js (Upgraded)
   ======================================== */

/* ==============================
   USER FILE OPERATIONS (UI)
   ============================== */

async function uploadFiles(fl) {
    if (!fl?.length) return;
    if (!state.filesReady) await ensureBaseFolder();

    for (const f of fl) {
        try {
            showToast('Uploading ' + f.name + '...', 'info');

            const blob = new Blob(
                [await f.arrayBuffer()],
                { type: f.type || 'application/octet-stream' }
            );

            await puter.fs.write(
                'PhotonCore/files/' + f.name,
                blob,
                { dedupeName: false, overwrite: true }
            );

            addActivity('📁 ' + (state.user?.username || 'User') + ': ' + f.name);
            showToast(f.name + ' uploaded!', 'success');
        } catch (e) {
            showToast('Failed: ' + f.name, 'error');
        }
    }

    await loadFiles();
    if (dom.fileInput) dom.fileInput.value = '';
}

async function loadFiles() {
    try {
        const items = await puter.fs.readdir('PhotonCore/files');
        state.files = items || [];
    } catch {
        state.files = [];
    }

    renderFiles();
    if (dom.statFiles) dom.statFiles.textContent = state.files.length;
}

function renderFiles() {
    if (!dom.filesList) return;

    if (!state.files.length) {
        dom.filesList.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <span class="empty-icon">📂</span>
                <p>No files in cloud.</p>
            </div>`;
        return;
    }

    dom.filesList.innerHTML = state.files.map(f => {
        const safe = esc(f.name).replace(/'/g, "\\'");
        return `
        <div class="file-card">
            <div class="file-icon">${fileIcon(f.name, f.is_dir)}</div>
            <div class="file-name">${esc(f.name)}</div>
            <div class="file-size">${f.is_dir ? 'Folder' : fmtSize(f.size)}</div>
            <div class="file-actions">
                ${!f.is_dir ? `<button class="file-action-btn" onclick="downloadFile('${safe}')">⬇️</button>` : ''}
                <button class="file-action-btn danger" onclick="deleteFile('${safe}', ${f.is_dir})">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

async function downloadFile(name) {
    try {
        const blob = await puter.fs.read('PhotonCore/files/' + name);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch {
        showToast('Download failed.', 'error');
    }
}

async function deleteFile(name, isDir = false) {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
        await puter.fs.delete('PhotonCore/files/' + name, { recursive: isDir });
        showToast('Deleted.', 'info');
        await loadFiles();
    } catch {
        showToast('Delete failed.', 'error');
    }
}

/* ==============================
   AI CLOUD OPERATIONS
   ============================== */

async function aiListFiles() {
    try {
        const items = await puter.fs.readdir('PhotonCore/files');

        if (!items?.length)
            return '📂 Your cloud is empty.';

        return `📂 Files in your cloud:\n\n` +
            items.map(f =>
                `- ${f.is_dir ? '📁' : '📄'} ${f.name}` +
                (f.is_dir ? '' : ` (${fmtSize(f.size)})`)
            ).join('\n');

    } catch (e) {
        return '⚠️ Error reading cloud: ' + e.message;
    }
}

async function aiReadFile(name) {
    try {
        const blob = await puter.fs.read('PhotonCore/files/' + name);
        const text = await blob.text();
        return `📄 Content of ${name}:\n\n${text}`;
    } catch (e) {
        return '⚠️ Error reading file: ' + e.message;
    }
}

async function aiWriteFile(name, content) {
    try {
        await puter.fs.write(
            'PhotonCore/files/' + name,
            new Blob([content], { type: 'text/plain' }),
            { dedupeName: false, overwrite: true }
        );

        await loadFiles();
        addActivity('🤖 AI saved: ' + name);

        return `✅ Saved "${name}" to cloud!`;
    } catch (e) {
        return '⚠️ Error saving file: ' + e.message;
    }
}

async function aiDeleteFile(name) {
    try {
        await puter.fs.delete('PhotonCore/files/' + name);
        await loadFiles();
        addActivity('🤖 AI deleted: ' + name);
        return `🗑️ Deleted "${name}".`;
    } catch (e) {
        return '⚠️ Error deleting file: ' + e.message;
    }
}

/* ==============================
   NATURAL LANGUAGE DETECTION
   ============================== */

function detectFileOperation(msg) {
    if (!msg) return null;

    const l = msg.toLowerCase().trim();

    /* =========================
       LIST / CLOUD VIEW
    ========================== */

    if (
        /(list|show|display|see|view|check|open).*(cloud|files|storage|directory)/i.test(l) ||
        /(what('| i)?s|whats).*(in|inside).*(cloud|storage)/i.test(l) ||
        l === 'cloud' ||
        l === 'files'
    ) {
        return { op: 'list' };
    }

    /* =========================
       READ FILE
    ========================== */

    const readMatch = l.match(
        /(read|open|view|show|get).*(file)?\s+['"]?([a-zA-Z0-9_\-\.]+)['"]?/
    );
    if (readMatch) {
        return { op: 'read', name: readMatch[3] };
    }

    /* =========================
       DELETE FILE
    ========================== */

    const deleteMatch = l.match(
        /(delete|remove|erase|trash).*(file)?\s+['"]?([a-zA-Z0-9_\-\.]+)['"]?/
    );
    if (deleteMatch) {
        return { op: 'delete', name: deleteMatch[3] };
    }

    /* =========================
       WRITE / CREATE FILE
    ========================== */

    const writeMatch = l.match(
        /(create|make|write|generate|save).*(file)?\s+['"]?([a-zA-Z0-9_\-\.]+)['"]?/
    );
    if (writeMatch) {
        return { op: 'write', name: writeMatch[3] };
    }

    /* =========================
       UPLOAD ATTACHED FILE
    ========================== */

    if (
        /(upload|add|put|store|save).*(this|attached|file).*(cloud|storage)/i.test(l)
    ) {
        return { op: 'upload-attached' };
    }

    return null;
}
