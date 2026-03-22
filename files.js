/* ========================================
   PHOTON CORE — files.js
   Supabase Storage via Vercel API
======================================== */

const FILE_BUCKET = "photon-files";

// File state
let currentView = 'grid';
let searchQuery = '';
let selectedFile = null;
let fileToDelete = null;
let filesWarningShown = false;

// ========================================
// INITIALIZATION - BULLETPROOF
// ========================================

// Use a flag on window to prevent double init across all scripts
if (window._filesPageInitialized) {
    console.log('📁 Files page already initialized, skipping...');
} else {
    window._filesPageInitialized = true;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFilesPage, { once: true });
    } else {
        initFilesPage();
    }
}

function initFilesPage() {
    if (!document.getElementById('files-list')) return;
    if (window._filesPageSetupDone) return;
    window._filesPageSetupDone = true;
    
    console.log('📁 Initializing Files Page (once)...');
    
    setupUploadZone();
    setupViewToggle();
    setupSearch();
    setupModals();
    
    // Initial load
    loadFiles();
}

// ========================================
// UPLOAD ZONE - CLONE TO REMOVE OLD LISTENERS
// ========================================

function setupUploadZone() {
    const oldUploadZone = document.getElementById('upload-zone');
    const oldFileInput = document.getElementById('file-input');
    const oldUploadBtn = document.getElementById('btn-upload-files');
    
    if (!oldUploadZone || !oldFileInput) return;
    
    // Clone elements to remove ALL existing event listeners
    const uploadZone = oldUploadZone.cloneNode(true);
    oldUploadZone.parentNode.replaceChild(uploadZone, oldUploadZone);
    
    // Clone file input
    const fileInput = oldFileInput.cloneNode(true);
    oldFileInput.parentNode.replaceChild(fileInput, oldFileInput);
    
    // Clone upload button if exists
    let uploadBtn = null;
    if (oldUploadBtn) {
        uploadBtn = oldUploadBtn.cloneNode(true);
        oldUploadBtn.parentNode.replaceChild(uploadBtn, oldUploadBtn);
    }
    
    console.log('📁 Upload zone setup (listeners cleared)');
    
    // Now add fresh listeners
    
    // Upload zone click
    uploadZone.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    // Upload button click
    if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    // File input change - only one listener
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length) {
            uploadFiles(files);
        }
    });
}

// Separate function for file select to avoid duplicates
function handleFileSelect(e) {
    const files = e.target.files;
    console.log('📁 Files selected:', files?.length);
    
    if (files?.length) {
        uploadFiles(Array.from(files));
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
}

// ========================================
// VIEW TOGGLE
// ========================================

function setupViewToggle() {
    const gridBtn = document.getElementById('btn-grid-view');
    const listBtn = document.getElementById('btn-list-view');
    const filesList = document.getElementById('files-list');
    
    if (!gridBtn || !listBtn) return;
    
    // Clone to remove old listeners
    const newGridBtn = gridBtn.cloneNode(true);
    const newListBtn = listBtn.cloneNode(true);
    gridBtn.parentNode.replaceChild(newGridBtn, gridBtn);
    listBtn.parentNode.replaceChild(newListBtn, listBtn);
    
    newGridBtn.addEventListener('click', () => {
        currentView = 'grid';
        newGridBtn.classList.add('active');
        newListBtn.classList.remove('active');
        filesList?.classList.remove('list-view');
        renderFiles();
    });
    
    newListBtn.addEventListener('click', () => {
        currentView = 'list';
        newListBtn.classList.add('active');
        newGridBtn.classList.remove('active');
        filesList?.classList.add('list-view');
        renderFiles();
    });
}

// ========================================
// SEARCH
// ========================================

function setupSearch() {
    const oldSearchInput = document.getElementById('files-search-input');
    if (!oldSearchInput) return;
    
    // Clone to remove old listeners
    const searchInput = oldSearchInput.cloneNode(true);
    oldSearchInput.parentNode.replaceChild(searchInput, oldSearchInput);
    
    let debounceTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderFiles();
        }, 300);
    });
}

// ========================================
// UPLOAD FILES - USING BASE64
// ========================================

let isUploading = false; // Prevent double uploads

async function uploadFiles(fileList) {
    if (!fileList?.length) return;
    
    // Prevent double uploads
    if (isUploading) {
        console.log('📁 Already uploading, skipping...');
        return;
    }
    isUploading = true;
    
    console.log('📁 Starting upload of', fileList.length, 'file(s)');
    
    if (!state.user) {
        showToast('Please sign in to upload files.', 'error');
        isUploading = false;
        return;
    }

    const progressContainer = document.getElementById('upload-progress-container');
    const progressFill = document.getElementById('upload-progress-fill');
    const progressCount = document.getElementById('upload-progress-count');
    const progressCurrent = document.getElementById('upload-progress-current');
    
    progressContainer?.classList.remove('hidden');
    
    let uploaded = 0;
    const total = fileList.length;

    for (const file of fileList) {
        try {
            // Update progress UI
            if (progressCount) progressCount.textContent = `${uploaded + 1}/${total}`;
            if (progressCurrent) progressCurrent.textContent = `Uploading: ${file.name}`;
            if (progressFill) progressFill.style.width = `${(uploaded / total) * 100}%`;

            // Check file size (50MB limit)
            if (file.size > 50 * 1024 * 1024) {
                showToast(`${file.name} is too large (max 50MB)`, 'error');
                continue;
            }

            // Convert to base64
            const fileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Upload via API using base64
            const response = await fetch('/api/files/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileData,
                    fileName: file.name,
                    fileType: file.type || 'application/octet-stream',
                    uploadedBy: state.user.username,
                    uploadedById: state.user.uid
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.message || 'Upload failed');
            }

            uploaded++;
            showToast(`✅ ${file.name} uploaded!`, 'success');
            
            if (typeof addActivity === 'function') {
                addActivity(`📁 ${state.user.username} uploaded: ${file.name}`);
            }

        } catch (e) {
            console.error('Upload error:', e);
            showToast(`Failed: ${file.name} - ${e.message}`, 'error');
        }
    }

    // Complete
    if (progressFill) progressFill.style.width = '100%';
    if (progressCurrent) progressCurrent.textContent = 'Upload complete!';
    
    setTimeout(() => {
        progressContainer?.classList.add('hidden');
        if (progressFill) progressFill.style.width = '0%';
    }, 1500);

    await loadFiles();
    
    isUploading = false;
}

// ========================================
// LOAD FILES (via Vercel API)
// ========================================

async function loadFiles() {
    const filesList = document.getElementById('files-list');
    const emptyState = document.getElementById('files-empty');
    const loadingState = document.getElementById('files-loading');

    // Show loading
    loadingState?.classList.remove('hidden');
    emptyState?.classList.add('hidden');
    if (filesList) filesList.innerHTML = '';

    try {
        const response = await fetch('/api/files/list');
        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load files');
        }

        if (!filesWarningShown) {
            if (data?.configured === false) {
                filesWarningShown = true;
                showToast('Files storage is not configured yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.', 'info');
            } else if (data?.error) {
                filesWarningShown = true;
                showToast('Files unavailable: ' + data.error, 'error');
            }
        }

        state.files = (data.files || []).map(f => ({
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

        loadingState?.classList.add('hidden');
        renderFiles();
        updateStats();

    } catch (e) {
        console.error('Failed to load files:', e);
        loadingState?.classList.add('hidden');
        state.files = [];
        renderFiles();
    }
}

// ========================================
// RENDER FILES
// ========================================

function renderFiles() {
    const filesList = document.getElementById('files-list');
    const emptyState = document.getElementById('files-empty');
    
    if (!filesList) return;

    // Filter by search
    let filteredFiles = state.files || [];
    if (searchQuery) {
        filteredFiles = filteredFiles.filter(f => 
            f.name.toLowerCase().includes(searchQuery)
        );
    }

    if (!filteredFiles.length) {
        filesList.innerHTML = '';
        emptyState?.classList.remove('hidden');
        return;
    }

    emptyState?.classList.add('hidden');

    if (currentView === 'grid') {
        filesList.innerHTML = filteredFiles.map(f => renderGridCard(f)).join('');
    } else {
        filesList.innerHTML = filteredFiles.map(f => renderListCard(f)).join('');
    }

    attachFileCardListeners();
}

function renderGridCard(file) {
    return `
        <div class="file-card" data-file-id="${file.id}">
            <div class="file-card-actions">
                <button class="file-action-btn download-btn" data-file-id="${file.id}" title="Download">⬇️</button>
                <button class="file-action-btn danger delete-btn" data-file-id="${file.id}" title="Delete">🗑️</button>
            </div>
            <span class="file-card-icon">${fileIcon(file.name, false)}</span>
            <div class="file-card-name" title="${esc(file.name)}">${esc(file.name)}</div>
            <div class="file-card-meta">
                <span>${fmtSize(file.size)}</span>
                <span>•</span>
                <span>${fmtDate(file.createdAt)}</span>
            </div>
        </div>
    `;
}

function renderListCard(file) {
    return `
        <div class="file-card" data-file-id="${file.id}">
            <span class="file-card-icon">${fileIcon(file.name, false)}</span>
            <div class="file-card-info">
                <div class="file-card-name" title="${esc(file.name)}">${esc(file.name)}</div>
                <div class="file-card-size">${fmtSize(file.size)}</div>
                <div class="file-card-date">${fmtDate(file.createdAt)}</div>
                <div class="file-card-uploader">${esc(file.uploadedBy || 'Unknown')}</div>
            </div>
            <div class="file-card-actions">
                <button class="file-action-btn download-btn" data-file-id="${file.id}" title="Download">⬇️</button>
                <button class="file-action-btn danger delete-btn" data-file-id="${file.id}" title="Delete">🗑️</button>
            </div>
        </div>
    `;
}

function attachFileCardListeners() {
    document.querySelectorAll('.file-card').forEach(card => {
        card.onclick = (e) => {
            if (e.target.closest('.file-action-btn')) return;
            const fileId = card.dataset.fileId;
            const file = state.files.find(f => f.id == fileId);
            if (file) showFilePreview(file);
        };
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const fileId = btn.dataset.fileId;
            const file = state.files.find(f => f.id == fileId);
            if (file) downloadFile(file);
        };
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const fileId = btn.dataset.fileId;
            const file = state.files.find(f => f.id == fileId);
            if (file) confirmDelete(file);
        };
    });
}

// ========================================
// UPDATE STATS
// ========================================

function updateStats() {
    const totalCount = document.getElementById('files-total-count');
    const totalSize = document.getElementById('files-total-size');
    const statFiles = document.getElementById('stat-files');
    
    const count = state.files?.length || 0;
    const size = state.files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0;
    
    if (totalCount) totalCount.textContent = count;
    if (totalSize) totalSize.textContent = fmtSize(size);
    if (statFiles) statFiles.textContent = count;
}

// ========================================
// MODALS
// ========================================

let modalsSetup = false;

function setupModals() {
    if (modalsSetup) return;
    modalsSetup = true;
    
    const fileModal = document.getElementById('file-modal');
    const modalClose = document.getElementById('modal-close');
    const modalBtnDownload = document.getElementById('modal-btn-download');
    const modalBtnCopyLink = document.getElementById('modal-btn-copy-link');
    
    if (modalClose) {
        modalClose.onclick = () => fileModal?.classList.add('hidden');
    }
    
    if (fileModal) {
        fileModal.onclick = (e) => {
            if (e.target === fileModal) fileModal.classList.add('hidden');
        };
    }
    
    if (modalBtnDownload) {
        modalBtnDownload.onclick = () => {
            if (selectedFile) downloadFile(selectedFile);
        };
    }
    
    if (modalBtnCopyLink) {
        modalBtnCopyLink.onclick = () => {
            if (selectedFile?.downloadURL) {
                navigator.clipboard.writeText(selectedFile.downloadURL)
                    .then(() => showToast('Link copied!', 'success'))
                    .catch(() => showToast('Failed to copy', 'error'));
            }
        };
    }

    const deleteModal = document.getElementById('delete-modal');
    const deleteCancel = document.getElementById('delete-cancel');
    const deleteConfirm = document.getElementById('delete-confirm');
    
    if (deleteCancel) {
        deleteCancel.onclick = () => {
            deleteModal?.classList.add('hidden');
            fileToDelete = null;
        };
    }
    
    if (deleteConfirm) {
        deleteConfirm.onclick = async () => {
            if (fileToDelete) {
                await deleteFile(fileToDelete);
                deleteModal?.classList.add('hidden');
                fileToDelete = null;
            }
        };
    }
}

async function showFilePreview(file) {
    selectedFile = file;
    
    const modal = document.getElementById('file-modal');
    const modalIcon = document.getElementById('modal-file-icon');
    const modalName = document.getElementById('modal-file-name');
    const modalBody = document.getElementById('modal-body');
    const modalSize = document.getElementById('modal-file-size');
    const modalDate = document.getElementById('modal-file-date');
    const modalUploader = document.getElementById('modal-file-uploader');
    
    if (modalIcon) modalIcon.textContent = fileIcon(file.name, false);
    if (modalName) modalName.textContent = file.name;
    if (modalSize) modalSize.textContent = fmtSize(file.size);
    if (modalDate) modalDate.textContent = fmtDate(file.createdAt);
    if (modalUploader) modalUploader.textContent = `by ${file.uploadedBy || 'Unknown'}`;
    
    if (modalBody) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
        const isText = ['txt', 'md', 'json', 'js', 'ts', 'css', 'html', 'py', 'cs', 'cpp', 'c', 'h', 'xml', 'yaml', 'yml', 'log', 'sh', 'gd'].includes(ext);
        
        if (isImage && file.downloadURL) {
            modalBody.innerHTML = `<img src="${esc(file.downloadURL)}" alt="${esc(file.name)}">`;
        } else if (isText) {
            modalBody.innerHTML = '<div class="loading-spinner"></div>';
            try {
                const response = await fetch(`/api/files/read?id=${file.id}`);
                if (!response.ok) throw new Error('Failed to read file');
                const data = await response.json();
                const text = data.content || '';
                const truncated = text.length > 10000 ? text.substring(0, 10000) + '\n\n... [truncated]' : text;
                modalBody.innerHTML = `<pre>${esc(truncated)}</pre>`;
            } catch (e) {
                modalBody.innerHTML = '<div class="no-preview"><div class="no-preview-icon">⚠️</div><p>Could not load preview</p></div>';
            }
        } else {
            modalBody.innerHTML = `
                <div class="no-preview">
                    <div class="no-preview-icon">${fileIcon(file.name, false)}</div>
                    <p>Preview not available for this file type</p>
                </div>
            `;
        }
    }
    
    modal?.classList.remove('hidden');
}

// ========================================
// DOWNLOAD FILE
// ========================================

function downloadFile(file) {
    if (!file?.downloadURL) {
        showToast('Download URL not available', 'error');
        return;
    }
    
    const a = document.createElement('a');
    a.href = file.downloadURL;
    a.download = file.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast(`Downloading: ${file.name}`, 'info');
}

// ========================================
// DELETE FILE (via Vercel API)
// ========================================

function confirmDelete(file) {
    fileToDelete = file;
    
    const modal = document.getElementById('delete-modal');
    const fileName = document.getElementById('delete-file-name');
    
    if (fileName) fileName.textContent = file.name;
    modal?.classList.remove('hidden');
}

async function deleteFile(file) {
    try {
        const response = await fetch('/api/files/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: file.id,
                storagePath: file.storagePath
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Delete failed');
        }

        showToast(`🗑️ Deleted: ${file.name}`, 'info');
        
        if (typeof addActivity === 'function') {
            addActivity(`🗑️ ${state.user?.username || 'User'} deleted: ${file.name}`);
        }
        
        await loadFiles();

    } catch (e) {
        console.error('Delete failed:', e);
        showToast(`Delete failed: ${e.message}`, 'error');
    }
}

// ========================================
// AI CLOUD OPERATIONS (via Vercel API)
// ========================================

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
        await loadFiles();
        
        if (typeof addActivity === 'function') {
            addActivity(`📝 AI created: ${name}`);
        }

        return `✅ Created "${name}" in cloud storage! (${fmtSize(data.size || 0)})`;
    } catch (e) {
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
        await loadFiles();
        
        if (typeof addActivity === 'function') {
            addActivity(`🗑️ AI deleted: ${data.name}`);
        }

        return `🗑️ Deleted "${data.name}" from cloud storage.`;
    } catch (e) {
        return '⚠️ Error deleting file: ' + e.message;
    }
}

async function aiUploadFile(file) {
    if (!file) return null;
    if (!state.user) return null;

    try {
        const fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const response = await fetch('/api/files/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileData,
                fileName: file.name,
                fileType: file.type || 'application/octet-stream',
                uploadedBy: state.user.username,
                uploadedById: state.user.uid
            })
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        await loadFiles();
        return data.downloadURL;
    } catch (e) {
        console.error('AI file upload error:', e);
        return null;
    }
}

// ========================================
// EXPORTS - Don't re-initialize!
// ========================================

window.aiListFiles = aiListFiles;
window.aiReadFile = aiReadFile;
window.aiWriteFile = aiWriteFile;
window.aiDeleteFile = aiDeleteFile;
window.aiUploadFile = aiUploadFile;
window.loadFiles = loadFiles;

// Remove any duplicate init calls from other scripts
window.initFilesPage = function() {
    console.log('📁 initFilesPage called externally - already initialized');
};
