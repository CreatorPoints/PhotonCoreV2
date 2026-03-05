/* ========================================
   PHOTON CORE — files.js
   Supabase Storage Integration
   ======================================== */

/* ==============================
   SUPABASE INIT
   ============================== */

const supabase = window.supabase.createClient(
    window.CONFIG?.SUPABASE_URL || window.NEXT_PUBLIC_SUPABASE_URL,
    window.CONFIG?.SUPABASE_ANON_KEY || window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FILE_BUCKET = "photon-files";
const FILE_PATH = "shared";

/* ==============================
   UPLOAD FILES
   ============================== */

/**
 * Upload files to Supabase Storage
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

            // Generate unique file path
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const filePath = `${FILE_PATH}/${fileName}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(FILE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(FILE_BUCKET)
                .getPublicUrl(filePath);

            const downloadURL = urlData.publicUrl;

            // Save metadata to Supabase database
            const { error: dbError } = await supabase
                .from('file_metadata')
                .insert({
                    name: file.name,
                    storage_path: filePath,
                    size: file.size,
                    type: file.type || 'application/octet-stream',
                    download_url: downloadURL,
                    uploaded_by: state.user.username,
                    uploaded_by_id: state.user.uid,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (dbError) throw dbError;

            addActivity('📁 ' + state.user.username + ': ' + file.name);
            showToast(file.name + ' uploaded!', 'success');
        } catch (e) {
            console.error('Upload error:', e);
            showToast('Failed: ' + file.name + ' - ' + e.message, 'error');
        }
    }

    await loadFiles();
    if (dom.fileInput) dom.fileInput.value = '';
}

/* ==============================
   LOAD FILES
   ============================== */

/**
 * Load files from Supabase metadata table
 */
async function loadFiles() {
    try {
        const { data, error } = await supabase
            .from('file_metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        state.files = data.map(f => ({
            id: f.id,
            name: f.name,
            storagePath: f.storage_path,
            size: f.size,
            type: f.type,
            downloadURL: f.download_url,
            uploadedBy: f.uploaded_by,
            uploadedById: f.uploaded_by_id,
            createdAt: f.created_at,
            updatedAt: f.updated_at
        }));
    } catch (e) {
        console.error('Failed to load files:', e);
        state.files = [];
    }

    renderFiles();
    if (dom.statFiles) dom.statFiles.textContent = state.files.length;
}

/* ==============================
   RENDER FILES
   ============================== */

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
        const safePath = esc(f.storagePath || f.name);
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
                <button class="file-action-btn download-btn" 
                        data-filename="${safeId}" 
                        data-url="${esc(f.downloadURL)}"
                        data-path="${safePath}">⬇️</button>
                <button class="file-action-btn danger delete-btn" 
                        data-filename="${safeId}"
                        data-path="${safePath}"
                        data-id="${f.id}">🗑️</button>
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
            deleteFile(btn.dataset.filename, btn.dataset.path, btn.dataset.id);
        });
    });
}

/* ==============================
   DOWNLOAD FILE
   ============================== */

/**
 * Download file from Supabase
 */
async function downloadFile(name, url) {
    if (!name) return;

    try {
        // Use provided URL if available
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

        // Otherwise, fetch from database
        const { data, error } = await supabase
            .from('file_metadata')
            .select('download_url, storage_path')
            .eq('name', name)
            .single();

        if (error) throw error;

        const a = document.createElement('a');
        a.href = data.download_url;
        a.download = name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast('Downloading: ' + name, 'info');
    } catch (e) {
        console.error('Download failed:', e);
        showToast('Download failed: ' + e.message, 'error');
    }
}

/* ==============================
   DELETE FILE
   ============================== */

/**
 * Delete file from Supabase Storage and database
 */
async function deleteFile(name, storagePath, recordId) {
    if (!name) return;
    if (!confirm(`Delete "${name}"?`)) return;

    try {
        // Delete from Supabase Storage
        if (storagePath) {
            const { error: storageError } = await supabase.storage
                .from(FILE_BUCKET)
                .remove([storagePath]);

            if (storageError) {
                console.warn('Storage delete warning:', storageError);
            }
        }

        // Delete metadata from database
        const { error: dbError } = await supabase
            .from('file_metadata')
            .delete()
            .eq('id', recordId);

        if (dbError) throw dbError;

        showToast('Deleted: ' + name, 'info');
        addActivity('🗑️ ' + (state.user?.username || 'User') + ' deleted: ' + name);
        await loadFiles();
    } catch (e) {
        console.error('Delete failed:', e);
        showToast('Delete failed: ' + e.message, 'error');
    }
}

/* ==============================
   AI CLOUD OPERATIONS
   ============================== */

async function aiListFiles() {
    try {
        const { data, error } = await supabase
            .from('file_metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            return '📂 Your cloud is empty.';
        }

        let result = '📂 Files in your cloud:\n\n';
        data.forEach(f => {
            result += `- 📄 ${f.name} (${fmtSize(f.size)}) - uploaded by ${f.uploaded_by}\n`;
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
        const { data: metadata, error: metaError } = await supabase
            .from('file_metadata')
            .select('*')
            .eq('name', name)
            .single();

        if (metaError || !metadata) {
            return '⚠️ File not found: ' + name;
        }

        // Check if it's a text file
        const textExtensions = /\.(txt|js|ts|py|html|css|json|md|csv|xml|yaml|yml|log|sh|gd)$/i;
        if (!textExtensions.test(name) && !metadata.type?.startsWith('text/')) {
            return `📄 ${name} is a binary file (${fmtSize(metadata.size)}). Cannot display content.`;
        }

        // Fetch content from storage
        const { data: fileData, error: storageError } = await supabase.storage
            .from(FILE_BUCKET)
            .download(metadata.storage_path);

        if (storageError) throw storageError;

        const text = await fileData.text();

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

        // Generate file path
        const timestamp = Date.now();
        const fileName = `${timestamp}_${name}`;
        const filePath = `${FILE_PATH}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(FILE_BUCKET)
            .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(FILE_BUCKET)
            .getPublicUrl(filePath);

        // Save metadata (upsert by name)
        const { error: dbError } = await supabase
            .from('file_metadata')
            .upsert({
                name: name,
                storage_path: filePath,
                size: blob.size,
                type: 'text/plain',
                download_url: urlData.publicUrl,
                uploaded_by: state.user.username,
                uploaded_by_id: state.user.uid,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'name'
            });

        if (dbError) throw dbError;

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
        // Get file metadata first
        const { data: metadata, error: metaError } = await supabase
            .from('file_metadata')
            .select('storage_path, id')
            .eq('name', name)
            .single();

        if (metaError || !metadata) {
            return '⚠️ File not found: ' + name;
        }

        // Delete from Storage
        if (metadata.storage_path) {
            await supabase.storage
                .from(FILE_BUCKET)
                .remove([metadata.storage_path]);
        }

        // Delete metadata
        const { error: dbError } = await supabase
            .from('file_metadata')
            .delete()
            .eq('id', metadata.id);

        if (dbError) throw dbError;

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
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `${FILE_PATH}/${fileName}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(FILE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(FILE_BUCKET)
            .getPublicUrl(filePath);

        const downloadURL = urlData.publicUrl;

        // Save metadata
        await supabase
            .from('file_metadata')
            .insert({
                name: file.name,
                storage_path: filePath,
                size: file.size,
                type: file.type || 'application/octet-stream',
                download_url: downloadURL,
                uploaded_by: state.user.username,
                uploaded_by_id: state.user.uid,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
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
