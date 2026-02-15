/* ========================================
   PHOTON CORE — discussions.js
   Discussions CRUD + Filters
   ======================================== */

function listenDiscussions() {
    db.collection('discussions').orderBy('timestamp', 'desc').limit(100).onSnapshot(snap => {
        state.discussions = [];
        snap.forEach(doc => state.discussions.push({ id: doc.id, ...doc.data() }));
        renderDiscussions();
        if (dom.statDiscussions) dom.statDiscussions.textContent = state.discussions.length;
    });
}

async function postDiscussion() {
    if (!dom.discussionTitle || !dom.discussionBody) return;
    const t = dom.discussionTitle.value.trim(), b = dom.discussionBody.value.trim();
    if (!t || !b) { showToast('Fill both fields.', 'error'); return; }
    await db.collection('discussions').add({
        title: t, body: b,
        category: dom.discussionCategory.value,
        author: state.user?.username || 'Anon',
        timestamp: new Date().toISOString(),
        likes: 0
    });
    addActivity('💬 ' + state.user?.username + ': "' + t + '"');
    dom.discussionTitle.value = '';
    dom.discussionBody.value = '';
    showToast('Posted!', 'success');
}

function renderDiscussions() {
    if (!dom.discussionsList) return;
    const f = state.currentFilter === 'all'
        ? state.discussions
        : state.discussions.filter(d => d.category === state.currentFilter);
    if (!f.length) {
        dom.discussionsList.innerHTML = '<div class="empty-state"><span class="empty-icon">💬</span><p>No discussions.</p></div>';
        return;
    }
    const lb = { general: '💭', 'game-design': '🎮', art: '🎨', code: '💻', marketing: '📢', bugs: '🐛' };
    dom.discussionsList.innerHTML = f.map(d => `
        <div class="discussion-post">
            <div class="discussion-post-header">
                <div class="discussion-author-avatar">${(d.author || '?').substring(0, 2).toUpperCase()}</div>
                <div class="discussion-meta">
                    <span class="discussion-author">${esc(d.author)}</span>
                    <span class="discussion-date">${fmtDate(d.timestamp)}</span>
                </div>
                <span class="discussion-category-tag">${lb[d.category] || '💭'} ${d.category}</span>
            </div>
            <div class="discussion-title">${esc(d.title)}</div>
            <div class="discussion-body">${esc(d.body)}</div>
            <div class="discussion-actions">
                <button class="discussion-action-btn" onclick="likeDisc('${d.id}')">❤️ ${d.likes || 0}</button>
                <button class="discussion-action-btn" onclick="deleteDisc('${d.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function likeDisc(id) {
    await db.collection('discussions').doc(id).update({ likes: firebase.firestore.FieldValue.increment(1) });
}

async function deleteDisc(id) {
    if (!confirm('Delete?')) return;
    await db.collection('discussions').doc(id).delete();
    showToast('Deleted.', 'info');
}