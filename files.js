/* ========================================
   PHOTON CORE — files.js
   Firebase Storage Integration
   ======================================== */

/**
 * Upload files to Firebase Storage
 */
async function uploadFiles(fileList) {
    if (!fileList?.length) return;
    if (!state.user) {
        showToast('Please sign in to upload files.', 'error');
        return;
    }

    for (const file of fileList) {
        try {
            showToast('Uploading ' + file.name + '...', 'info');

            // Create storage reference
            const fileRef = filesRef.child(file.name);
            
            // Upload file
            const snapshot = await fileRef.put(file);
            
            // Get download URL
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            // Save metadata to Firestore
            await db.collection('fileMetadata').doc(file.name).set({
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                downloadURL: downloadURL,
                uploadedBy: state.user.username,
                uploadedById: state.user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            addActivity('📁 ' + state.user.username + ': ' + file.name);
            showToast(file.name + ' uploaded!', 'success');
        } catch (e) {
            console.error('Upload error:', e);
            showToast('Failed: ' + file.name, 'error');
        }
    }

    await loadFiles();
    if (dom.fileInput) dom.fileInput.value = '';
}

/**
 * Load files from Firestore metadata
 */
async function loadFiles() {
    try {
        const snapshot = await db.collection('fileMetadata')
            .orderBy('createdAt', 'desc')
            .get();
        
        state.files = [];
        snapshot.forEach(doc => {
            state.files.push({ id: doc.id, ...doc.data() });
        });
    } catch (e) {
        console.error('Failed to load files:', e);
        state.files = [];
    }

    renderFiles();
    if (dom.statFiles) dom.statFiles.textContent = state.files.length;
}

/**
 * Render files list
 */
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
        const safeId = esc(f.name);
        return `
        <div class="file-card" data-filename="${safeId}">
            <div class="file-icon">${fileIcon(f.name, false)}</div>
            <div class="file-name">${esc(f.name)}</div>
            <div class="file-size">${fmtSize(f.size)}</div>
            <div class="file-meta">
                <span class="file-uploader">👤 ${esc(f.uploadedBy || 'Unknown')}</span>
                <span class="file-date">${fmtDate(f.createdAt)}</span>
            </div>
            <div class="file-actions">
                <button class="file-action-btn download-btn" data-filename="${safeId}" data-url="${esc(f.downloadURL)}">⬇️</button>
                <button class="file-action-btn danger delete-btn" data-filename="${safeId}">🗑️</button>
            </div>
        </div>`;
    }).join('');

    // Download handlers
    dom.filesList.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadFile(btn.dataset.filename, btn.dataset.url);
        });
    });

    // Delete handlers
    dom.filesList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFile(btn.dataset.filename);
        });
    });
}

/**
 * Download file
 */
async function downloadFile(name, url) {
    if (!name) return;

    try {
        // If URL provided, use it directly
        if (url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Downloading: ' + name, 'info');
            return;
        }

        // Otherwise, get URL from storage
        const fileRef = filesRef.child(name);
        const downloadURL = await fileRef.getDownloadURL();
        
        const a = document.createElement('a');
        a.href = downloadURL;
        a.download = name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showToast('Downloading: ' + name, 'info');
    } catch (e) {
        console.error('Download failed:', e);
        showToast('Download failed.', 'error');
    }
}

/**
 * Delete file from Storage and Firestore
 */
async function deleteFile(name) {
    if (!name) return;
    if (!confirm(`Delete "${name}"?`)) return;

    try {
        // Delete from Storage
        const fileRef = filesRef.child(name);
        await fileRef.delete().catch(e => {
            // File might not exist in storage, continue
            console.warn('Storage delete warning:', e);
        });

        // Delete metadata from Firestore
        await db.collection('fileMetadata').doc(name).delete();

        showToast('Deleted: ' + name, 'info');
        addActivity('🗑️ ' + (state.user?.username || 'User') + ' deleted: ' + name);
        await loadFiles();
    } catch (e) {
        console.error('Delete failed:', e);
        showToast('Delete failed.', 'error');
    }
}

/* ==============================
   AI CLOUD OPERATIONS
   ============================== */

async function aiListFiles() {
    try {
        const snapshot = await db.collection('fileMetadata')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            return '📂 Your cloud is empty.';
        }

        let result = '📂 Files in your cloud:\n\n';
        snapshot.forEach(doc => {
            const f = doc.data();
            result += `- 📄 ${f.name} (${fmtSize(f.size)}) - uploaded by ${f.uploadedBy}\n`;
        });

        return result;
    } catch (e) {
        return '⚠️ Error reading cloud: ' + e.message;
    }
}

async function aiReadFile(name) {
    if (!name) return '⚠️ No file name provided.';

    try {
        // Get file metadata
        const doc = await db.collection('fileMetadata').doc(name).get();
        if (!doc.exists) {
            return '⚠️ File not found: ' + name;
        }

        const metadata = doc.data();
        
        // Check if it's a text file
        const textExtensions = /\.(txt|js|ts|py|html|css|json|md|csv|xml|yaml|yml|log|sh|gd)$/i;
        if (!textExtensions.test(name) && !metadata.type?.startsWith('text/')) {
            return `📄 ${name} is a binary file (${fmtSize(metadata.size)}). Cannot display content.`;
        }

        // Fetch content
        const response = await fetch(metadata.downloadURL);
        const text = await response.text();

        if (text.length > 10000) {
            return `📄 Content of ${name} (first 10000 chars):\n\n${text.substring(0, 10000)}...\n\n[Truncated]`;
        }

        return `📄 Content of ${name}:\n\n${text}`;
    } catch (e) {
        return '⚠️ Error reading file: ' + e.message;
    }
}

async function aiWriteFile(name, content) {
    if (!name) return '⚠️ No file name provided.';
    if (!state.user) return '⚠️ Please sign in to save files.';

    try {
        // Create blob from content
        const blob = new Blob([content || ''], { type: 'text/plain' });
        
        // Upload to storage
        const fileRef = filesRef.child(name);
        const snapshot = await fileRef.put(blob);
        const downloadURL = await snapshot.ref.getDownloadURL();

        // Save metadata
        await db.collection('fileMetadata').doc(name).set({
            name: name,
            size: blob.size,
            type: 'text/plain',
            downloadURL: downloadURL,
            uploadedBy: state.user.username,
            uploadedById: state.user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, { merge: true });

        await loadFiles();
        addActivity('🤖 AI saved: ' + name);

        return `✅ Saved "${name}" to cloud!`;
    } catch (e) {
        return '⚠️ Error saving file: ' + e.message;
    }
}

async function aiDeleteFile(name) {
    if (!name) return '⚠️ No file name provided.';

    try {
        // Delete from Storage
        const fileRef = filesRef.child(name);
        await fileRef.delete().catch(() => {});

        // Delete metadata
        await db.collection('fileMetadata').doc(name).delete();

        await loadFiles();
        addActivity('🤖 AI deleted: ' + name);
        return `🗑️ Deleted "${name}".`;
    } catch (e) {
        return '⚠️ Error deleting file: ' + e.message;
    }
}

/**
 * Upload file for AI (used in chat attachments)
 */
async function uploadFileForAI(file) {
    if (!file) return null;
    if (!state.user) return null;

    try {
        const fileRef = filesRef.child(file.name);
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        await db.collection('fileMetadata').doc(file.name).set({
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            downloadURL: downloadURL,
            uploadedBy: state.user.username,
            uploadedById: state.user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return downloadURL;
    } catch (e) {
        console.error('AI file upload error:', e);
        return null;
    }
}

/* ==============================
   NATURAL LANGUAGE DETECTION
   ============================== */

function detectFileOperation(msg) {
    if (!msg) return null;

    const l = msg.toLowerCase().trim();

    // LIST / CLOUD VIEW
    if (
        /(list|show|display|see|view|check|open).*(cloud|files|storage|directory)/i.test(l) ||
        /(what('| i)?s|whats).*(in|inside).*(cloud|storage)/i.test(l) ||
        l === 'cloud' ||
        l === 'files'
    ) {
        return { op: 'list' };
    }

    // READ FILE
    const readMatch = l.match(
        /(read|open|view|show|get)\s+(?:the\s+)?(?:file\s+)?['"]?([a-zA-Z0-9_\-\.]+)['"]?/
    );
    if (readMatch && readMatch[2]) {
        return { op: 'read', name: readMatch[2] };
    }

    // DELETE FILE
    const deleteMatch = l.match(
        /(delete|remove|erase|trash)\s+(?:the\s+)?(?:file\s+)?['"]?([a-zA-Z0-9_\-\.]+)['"]?/
    );
    if (deleteMatch && deleteMatch[2]) {
        return { op: 'delete', name: deleteMatch[2] };
    }

    // WRITE / CREATE FILE
    const writeMatch = l.match(
        /(create|make|write|generate|save)\s+(?:a\s+)?(?:file\s+)?(?:called\s+|named\s+)?['"]?([a-zA-Z0-9_\-\.]+)['"]?/
    );
    if (writeMatch && writeMatch[2]) {
        return { op: 'write', name: writeMatch[2] };
    }

    // UPLOAD ATTACHED FILE
    if (
        /(upload|add|put|store|save).*(this|attached|file).*(cloud|storage)/i.test(l)
    ) {
        return { op: 'upload-attached' };
    }

    return null;
}
