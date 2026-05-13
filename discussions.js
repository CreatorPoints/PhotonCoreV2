/* ========================================
   PHOTON CORE — discussions.js
   ======================================== */

const DISCUSSION_CATEGORIES = {
    general: { icon: '💭', label: 'General' },
    'game-design': { icon: '🎮', label: 'Game Design' },
    art: { icon: '🎨', label: 'Art' },
    code: { icon: '💻', label: 'Code' },
    marketing: { icon: '📢', label: 'Marketing' },
    bugs: { icon: '🐛', label: 'Bugs' }
};

const discussionUiState = {
    initialized: false,
    currentFilter: 'all',
    currentSort: 'hot',
    currentCommentSort: 'top',
    searchQuery: '',
    selectedId: null,
    commentsUnsub: null,
    comments: [],
    showSavedOnly: false,
    savedIds: [],
    collapsedComments: {},
    draftLoaded: false
};

function isDiscussionsPage() {
    return window.location.pathname.endsWith('/discussions.html') || window.location.pathname.endsWith('discussions.html');
}

function discussionCategoryMeta(category) {
    return DISCUSSION_CATEGORIES[category] || DISCUSSION_CATEGORIES.general;
}

function discussionTimestamp(item) {
    return item?.lastActivityAt || item?.updatedAt || item?.createdAt || item?.timestamp || new Date().toISOString();
}

function discussionCreatedAt(item) {
    return item?.createdAt || item?.timestamp || item?.lastActivityAt || new Date().toISOString();
}

function discussionScore(item) {
    const upCount = Array.isArray(item?.upvoters) ? item.upvoters.length : 0;
    const downCount = Array.isArray(item?.downvoters) ? item.downvoters.length : 0;
    if (typeof item?.score === 'number') return item.score;
    return upCount - downCount;
}

function discussionCommentCount(item) {
    if (typeof item?.commentCount === 'number') return item.commentCount;
    if (Array.isArray(item?.comments)) return item.comments.length;
    return 0;
}

function discussionHotScore(item) {
    const score = discussionScore(item);
    const created = new Date(discussionCreatedAt(item)).getTime();
    const hours = Math.max(1, (Date.now() - created) / 3600000);
    return score + discussionCommentCount(item) * 0.7 + (24 / hours);
}

function discussionMatchesSearch(item, query) {
    if (!query) return true;
    const haystack = [
        item.title,
        item.body,
        item.author,
        item.category,
        discussionCategoryMeta(item.category).label
    ].join(' ').toLowerCase();
    return haystack.includes(query);
}

function loadDiscussionPreferences() {
    try {
        const saved = JSON.parse(localStorage.getItem('photon_discussion_prefs') || '{}');
        discussionUiState.currentFilter = saved.currentFilter || discussionUiState.currentFilter;
        discussionUiState.currentSort = saved.currentSort || discussionUiState.currentSort;
        discussionUiState.currentCommentSort = saved.currentCommentSort || discussionUiState.currentCommentSort;
        discussionUiState.showSavedOnly = !!saved.showSavedOnly;
        discussionUiState.savedIds = Array.isArray(saved.savedIds) ? saved.savedIds : [];
    } catch {}
}

function persistDiscussionPreferences() {
    try {
        localStorage.setItem('photon_discussion_prefs', JSON.stringify({
            currentFilter: discussionUiState.currentFilter,
            currentSort: discussionUiState.currentSort,
            currentCommentSort: discussionUiState.currentCommentSort,
            showSavedOnly: discussionUiState.showSavedOnly,
            savedIds: discussionUiState.savedIds
        }));
    } catch {}
}

function loadDiscussionDraft() {
    if (discussionUiState.draftLoaded) return;
    discussionUiState.draftLoaded = true;

    try {
        const draft = JSON.parse(localStorage.getItem('photon_discussion_draft') || '{}');
        if (dom.discussionTitle && draft.title) dom.discussionTitle.value = draft.title;
        if (dom.discussionBody && draft.body) dom.discussionBody.value = draft.body;
        if (dom.discussionCategory && draft.category) dom.discussionCategory.value = draft.category;
        updateDraftState(draft.title || draft.body ? 'Draft restored' : 'Draft not saved');
    } catch {
        updateDraftState('Draft not saved');
    }
}

function persistDiscussionDraft() {
    try {
        const title = dom.discussionTitle?.value || '';
        const body = dom.discussionBody?.value || '';
        const category = dom.discussionCategory?.value || 'general';

        if (!title.trim() && !body.trim()) {
            localStorage.removeItem('photon_discussion_draft');
            updateDraftState('Draft not saved');
            return;
        }

        localStorage.setItem('photon_discussion_draft', JSON.stringify({ title, body, category }));
        updateDraftState('Draft saved locally');
    } catch {}
}

function clearDiscussionDraft() {
    try {
        localStorage.removeItem('photon_discussion_draft');
    } catch {}
    updateDraftState('Draft cleared');
}

function updateDraftState(text) {
    if (dom.discussionDraftState) dom.discussionDraftState.textContent = text;
}

function discussionBodyHtml(text) {
    const safeText = String(text || '').trim();
    if (!safeText) return '<p class="reddit-empty-copy">No content yet.</p>';
    if (typeof formatAi === 'function') return formatAi(safeText);
    return esc(safeText).replace(/\n/g, '<br>');
}

function discussionReplyCountLabel(count) {
    return `${count} repl${count === 1 ? 'y' : 'ies'}`;
}

function isDiscussionSaved(id) {
    return discussionUiState.savedIds.includes(id);
}

function toggleSavedDiscussion(id) {
    if (!id) return;
    if (isDiscussionSaved(id)) {
        discussionUiState.savedIds = discussionUiState.savedIds.filter(value => value !== id);
    } else {
        discussionUiState.savedIds = [...discussionUiState.savedIds, id];
    }
    persistDiscussionPreferences();
    renderDiscussions();
}

function updateDiscussionHash(id) {
    if (!isDiscussionsPage()) return;
    const nextHash = id ? `thread-${id}` : '';
    if (window.location.hash.replace('#', '') === nextHash) return;
    history.replaceState(null, '', nextHash ? `#${nextHash}` : window.location.pathname.split('/').pop());
}

function selectedDiscussionFromHash() {
    const raw = window.location.hash.replace('#', '');
    if (!raw.startsWith('thread-')) return null;
    return raw.slice('thread-'.length) || null;
}

function getFilteredDiscussions() {
    const search = discussionUiState.searchQuery.toLowerCase();
    let list = [...(state.discussions || [])];

    if (discussionUiState.currentFilter !== 'all') {
        list = list.filter(item => item.category === discussionUiState.currentFilter);
    }

    if (discussionUiState.showSavedOnly) {
        list = list.filter(item => isDiscussionSaved(item.id));
    }

    list = list.filter(item => discussionMatchesSearch(item, search));

    list.sort((left, right) => {
        if (discussionUiState.currentSort === 'new') {
            return new Date(discussionCreatedAt(right)) - new Date(discussionCreatedAt(left));
        }
        if (discussionUiState.currentSort === 'top') {
            return discussionScore(right) - discussionScore(left);
        }
        if (discussionUiState.currentSort === 'active') {
            return new Date(discussionTimestamp(right)) - new Date(discussionTimestamp(left));
        }
        return discussionHotScore(right) - discussionHotScore(left);
    });

    return list;
}

function getDiscussionById(id) {
    return (state.discussions || []).find(item => item.id === id) || null;
}

function updateDiscussionStats() {
    const discussions = state.discussions || [];
    const commentTotal = discussions.reduce((sum, item) => sum + discussionCommentCount(item), 0);
    const activeToday = discussions.filter(item => {
        const time = new Date(discussionTimestamp(item)).getTime();
        return (Date.now() - time) <= 86400000;
    }).length;

    if (dom.discussionStatPosts) dom.discussionStatPosts.textContent = String(discussions.length);
    if (dom.discussionStatComments) dom.discussionStatComments.textContent = String(commentTotal);
    if (dom.discussionStatActive) dom.discussionStatActive.textContent = String(activeToday);
    const filteredCount = getFilteredDiscussions().length;
    if (dom.discussionFeedCount) dom.discussionFeedCount.textContent = `${filteredCount} thread${filteredCount === 1 ? '' : 's'}`;
    if (dom.statDiscussions) dom.statDiscussions.textContent = String(discussions.length);
    if (dom.discussionSavedToggle) dom.discussionSavedToggle.classList.toggle('active', discussionUiState.showSavedOnly);
}

function setSelectedDiscussion(id) {
    discussionUiState.selectedId = id;
    updateDiscussionHash(id);
    renderDiscussions();
    listenDiscussionComments(id);
}

function normalizeDiscussion(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        title: String(data.title || '').trim() || 'Untitled thread',
        body: String(data.body || '').trim(),
        category: data.category || 'general',
        author: data.author || 'Unknown',
        authorId: data.authorId || null,
        createdAt: discussionCreatedAt(data),
        updatedAt: data.updatedAt || data.timestamp || null,
        timestamp: data.timestamp || data.createdAt || null,
        lastActivityAt: data.lastActivityAt || data.updatedAt || data.timestamp || null,
        upvoters: Array.isArray(data.upvoters) ? data.upvoters : [],
        downvoters: Array.isArray(data.downvoters) ? data.downvoters : [],
        score: typeof data.score === 'number' ? data.score : undefined,
        commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0
    };
}

function normalizeComment(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        body: String(data.body || '').trim(),
        author: data.author || 'Unknown',
        authorId: data.authorId || null,
        createdAt: data.createdAt || new Date().toISOString(),
        parentId: data.parentId || null,
        upvoters: Array.isArray(data.upvoters) ? data.upvoters : [],
        downvoters: Array.isArray(data.downvoters) ? data.downvoters : [],
        score: typeof data.score === 'number' ? data.score : undefined
    };
}

function renderDiscussionFeed() {
    if (!dom.discussionsList) return;

    const items = getFilteredDiscussions();
    updateDiscussionStats();

    if (!items.length) {
        dom.discussionsList.innerHTML = '<div class="empty-state"><span class="empty-icon">🧵</span><p>No threads match this view yet.</p></div>';
        return;
    }

    dom.discussionsList.innerHTML = items.map(item => {
        const category = discussionCategoryMeta(item.category);
        const isActive = item.id === discussionUiState.selectedId ? ' active' : '';
        const score = discussionScore(item);
        const comments = discussionCommentCount(item);
        const bodyPreview = esc(item.body).replace(/\n/g, '<br>');
        const upvoted = item.upvoters.includes(state.user?.uid) ? ' active' : '';
        const downvoted = item.downvoters.includes(state.user?.uid) ? ' active' : '';
        const saved = isDiscussionSaved(item.id) ? ' active' : '';
        const hotBadge = discussionHotScore(item) > 15 ? '<span class="reddit-post-badge hot">Hot</span>' : '';
        const savedBadge = isDiscussionSaved(item.id) ? '<span class="reddit-post-badge saved">Saved</span>' : '';
        const op = item.authorId === state.user?.uid ? '<span class="reddit-post-badge op">You</span>' : '';

        return `
            <article class="reddit-post-card${isActive}" data-discussion-id="${esc(item.id)}">
                <div class="reddit-vote-rail">
                    <button class="reddit-vote-btn${upvoted}" type="button" data-vote-discussion="${esc(item.id)}" data-vote-direction="up" title="Upvote">▲</button>
                    <span class="reddit-vote-score">${score}</span>
                    <button class="reddit-vote-btn${downvoted}" type="button" data-vote-discussion="${esc(item.id)}" data-vote-direction="down" title="Downvote">▼</button>
                </div>
                <div class="reddit-post-main">
                    <div class="reddit-post-meta">
                        <span class="reddit-flair">${category.icon} ${esc(category.label)}</span>
                        <span>Posted by ${esc(item.author)}</span>
                        <span>${fmtDate(discussionCreatedAt(item))}</span>
                        <span>${discussionReplyCountLabel(comments)}</span>
                        ${hotBadge}
                        ${savedBadge}
                        ${op}
                    </div>
                    <h3 class="reddit-post-title">${esc(item.title)}</h3>
                    <div class="reddit-post-body">${bodyPreview}</div>
                    <div class="reddit-post-footer">
                        <button class="reddit-inline-action" type="button" data-open-discussion="${esc(item.id)}">Open thread</button>
                        <button class="reddit-inline-action" type="button" data-focus-reply="${esc(item.id)}">Reply</button>
                        <button class="reddit-inline-action${saved}" type="button" data-save-discussion="${esc(item.id)}">${isDiscussionSaved(item.id) ? '★ Saved' : '☆ Save'}</button>
                        <button class="reddit-inline-action" type="button" data-copy-thread="${esc(item.id)}">Copy link</button>
                        ${item.authorId === state.user?.uid ? `<button class="reddit-inline-action danger" type="button" data-delete-discussion="${esc(item.id)}">Delete</button>` : ''}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function buildCommentTree(comments, parentId = null, depth = 0) {
    const branches = comments
        .filter(comment => comment.parentId === parentId)
        .map(comment => ({ ...comment, depth, children: buildCommentTree(comments, comment.id, depth + 1) }));

    branches.sort((left, right) => {
        if (discussionUiState.currentCommentSort === 'new') {
            return new Date(right.createdAt) - new Date(left.createdAt);
        }
        if (discussionUiState.currentCommentSort === 'old') {
            return new Date(left.createdAt) - new Date(right.createdAt);
        }
        return discussionScore(right) - discussionScore(left);
    });

    return branches;
}

function collectCommentDescendants(parentId, comments, bucket = []) {
    comments
        .filter(comment => comment.parentId === parentId)
        .forEach(comment => {
            bucket.push(comment);
            collectCommentDescendants(comment.id, comments, bucket);
        });
    return bucket;
}

function renderCommentBranch(branch) {
    const score = discussionScore(branch);
    const upvoted = branch.upvoters.includes(state.user?.uid) ? ' active' : '';
    const downvoted = branch.downvoters.includes(state.user?.uid) ? ' active' : '';
    const isCollapsed = !!discussionUiState.collapsedComments[branch.id];
    const childrenCount = branch.children.length;

    return `
        <div class="reddit-comment${isCollapsed ? ' collapsed' : ''}" style="--comment-depth:${branch.depth};">
            <div class="reddit-comment-votes">
                <button class="reddit-vote-btn${upvoted}" type="button" data-vote-comment="${esc(branch.id)}" data-vote-direction="up">▲</button>
                <span class="reddit-comment-score">${score}</span>
                <button class="reddit-vote-btn${downvoted}" type="button" data-vote-comment="${esc(branch.id)}" data-vote-direction="down">▼</button>
            </div>
            <div class="reddit-comment-body-wrap">
                <div class="reddit-comment-meta">
                    <span class="reddit-comment-author">${esc(branch.author)}</span>
                    ${branch.authorId && branch.authorId === getDiscussionById(discussionUiState.selectedId)?.authorId ? '<span class="reddit-op-badge">OP</span>' : ''}
                    <span>${fmtDate(branch.createdAt)}</span>
                    ${childrenCount ? `<button class="reddit-inline-action compact" type="button" data-toggle-comment="${esc(branch.id)}">${isCollapsed ? `Expand ${childrenCount}` : `Collapse ${childrenCount}`}</button>` : ''}
                </div>
                <div class="reddit-comment-body">${discussionBodyHtml(branch.body)}</div>
                <div class="reddit-comment-actions${isCollapsed ? ' hidden' : ''}">
                    <button class="reddit-inline-action" type="button" data-reply-comment="${esc(branch.id)}">Reply</button>
                    ${branch.authorId === state.user?.uid ? `<button class="reddit-inline-action danger" type="button" data-delete-comment="${esc(branch.id)}">Delete</button>` : ''}
                </div>
                <div class="reddit-comment-reply-box hidden${isCollapsed ? ' hidden' : ''}" id="reply-box-${esc(branch.id)}">
                    <textarea class="textarea reddit-input reddit-reply-input" rows="3" id="reply-text-${esc(branch.id)}" placeholder="Add your reply..."></textarea>
                    <div class="reddit-reply-actions">
                        <button class="btn btn-secondary" type="button" data-cancel-reply="${esc(branch.id)}">Cancel</button>
                        <button class="btn btn-primary" type="button" data-submit-reply="${esc(branch.id)}">Reply</button>
                    </div>
                </div>
                <div class="reddit-comment-children${isCollapsed ? ' hidden' : ''}">
                    ${branch.children.map(renderCommentBranch).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderDiscussionThread() {
    const threadEl = document.getElementById('discussion-thread');
    if (!threadEl) return;

    const discussion = getDiscussionById(discussionUiState.selectedId);
    if (!discussion) {
        threadEl.innerHTML = `
            <div class="reddit-thread-empty" id="discussion-thread-empty">
                <div class="reddit-thread-empty-icon">🧵</div>
                <h3>Select a thread</h3>
                <p>Open a post on the left to read the full discussion and reply like a proper thread.</p>
            </div>
        `;
        return;
    }

    const category = discussionCategoryMeta(discussion.category);
    const commentsTree = buildCommentTree(discussionUiState.comments);
    const score = discussionScore(discussion);
    const commentCount = discussionCommentCount(discussion);
    const upvoted = discussion.upvoters.includes(state.user?.uid) ? ' active' : '';
    const downvoted = discussion.downvoters.includes(state.user?.uid) ? ' active' : '';
    const saved = isDiscussionSaved(discussion.id) ? ' active' : '';

    threadEl.innerHTML = `
        <div class="reddit-thread-card">
            <div class="reddit-thread-head">
                <span class="reddit-flair">${category.icon} ${esc(category.label)}</span>
                <span class="reddit-thread-meta">u/${esc(discussion.author)} • ${fmtDate(discussionCreatedAt(discussion))}</span>
            </div>
            <h3 class="reddit-thread-title">${esc(discussion.title)}</h3>
            <div class="reddit-thread-body">${discussionBodyHtml(discussion.body)}</div>
            <div class="reddit-thread-actions">
                <div class="reddit-thread-score">
                    <button class="reddit-vote-btn${upvoted}" type="button" data-vote-discussion="${esc(discussion.id)}" data-vote-direction="up">▲</button>
                    <span>${score}</span>
                    <button class="reddit-vote-btn${downvoted}" type="button" data-vote-discussion="${esc(discussion.id)}" data-vote-direction="down">▼</button>
                </div>
                <span class="reddit-thread-count">${discussionReplyCountLabel(commentCount)}</span>
                <span class="reddit-thread-count">Last active ${fmtDate(discussionTimestamp(discussion))}</span>
                <button class="reddit-inline-action${saved}" type="button" data-save-discussion="${esc(discussion.id)}">${isDiscussionSaved(discussion.id) ? '★ Saved' : '☆ Save'}</button>
                <button class="reddit-inline-action" type="button" data-copy-thread="${esc(discussion.id)}">Copy link</button>
            </div>
        </div>

        <div class="reddit-comment-composer">
            <h4>Join the thread</h4>
            <textarea class="textarea reddit-input" id="discussion-comment-body" rows="4" placeholder="Add your reply to this thread..."></textarea>
            <div class="reddit-reply-actions">
                <button class="btn btn-primary" type="button" id="btn-post-comment">Post Reply</button>
            </div>
        </div>

        <div class="reddit-comment-section">
            <div class="reddit-comment-header">
                <h4>Replies</h4>
                <span>${discussionUiState.comments.length} total</span>
            </div>
            <div class="reddit-comment-list">
                ${commentsTree.length ? commentsTree.map(renderCommentBranch).join('') : '<div class="empty-state"><span class="empty-icon">💬</span><p>No replies yet. Be the first one.</p></div>'}
            </div>
        </div>
    `;
}

function renderDiscussions() {
    if (!isDiscussionsPage()) return;
    renderDiscussionFeed();
    renderDiscussionThread();
}

async function postDiscussion() {
    if (!dom.discussionTitle || !dom.discussionBody || !window.db || !state.user) return;

    const title = dom.discussionTitle.value.trim();
    const body = dom.discussionBody.value.trim();
    const category = dom.discussionCategory?.value || 'general';

    if (!title || !body) {
        showToast('Add both a title and some context.', 'error');
        return;
    }

    const now = new Date().toISOString();
    const payload = {
        title,
        body,
        category,
        author: state.user.username || 'Anon',
        authorId: state.user.uid,
        createdAt: now,
        updatedAt: now,
        timestamp: now,
        lastActivityAt: now,
        upvoters: [],
        downvoters: [],
        score: 0,
        commentCount: 0
    };

    const created = await db.collection('discussions').add(payload);
    dom.discussionTitle.value = '';
    dom.discussionBody.value = '';
    clearDiscussionDraft();
    setSelectedDiscussion(created.id);

    if (typeof addActivity === 'function') {
        addActivity(`💬 ${state.user.username} started: "${title}"`);
    }

    showToast('Thread posted.', 'success');
}

async function applyVote(collectionRef, item, direction) {
    if (!window.db || !state.user?.uid || !item?.id) return;

    const uid = state.user.uid;
    const up = Array.isArray(item.upvoters) ? item.upvoters : [];
    const down = Array.isArray(item.downvoters) ? item.downvoters : [];
    let nextUp = up.filter(value => value !== uid);
    let nextDown = down.filter(value => value !== uid);

    if (direction === 'up' && !up.includes(uid)) nextUp.push(uid);
    if (direction === 'down' && !down.includes(uid)) nextDown.push(uid);

    await collectionRef.doc(item.id).update({
        upvoters: nextUp,
        downvoters: nextDown,
        score: nextUp.length - nextDown.length,
        lastActivityAt: new Date().toISOString()
    });
}

async function voteDiscussion(id, direction) {
    const discussion = getDiscussionById(id);
    if (!discussion) return;
    await applyVote(db.collection('discussions'), discussion, direction);
}

async function voteComment(id, direction) {
    const comment = discussionUiState.comments.find(item => item.id === id);
    if (!comment || !discussionUiState.selectedId) return;
    const ref = db.collection('discussions').doc(discussionUiState.selectedId).collection('comments');
    await applyVote(ref, comment, direction);
}

async function postComment(parentId = null) {
    if (!window.db || !state.user || !discussionUiState.selectedId) return;

    const input = parentId
        ? document.getElementById(`reply-text-${parentId}`)
        : document.getElementById('discussion-comment-body');

    const body = input?.value?.trim() || '';
    if (!body) {
        showToast('Write a reply first.', 'error');
        return;
    }

    const now = new Date().toISOString();
    const discussionRef = db.collection('discussions').doc(discussionUiState.selectedId);

    await discussionRef.collection('comments').add({
        body,
        author: state.user.username || 'Anon',
        authorId: state.user.uid,
        createdAt: now,
        parentId,
        upvoters: [],
        downvoters: [],
        score: 0
    });

    const discussion = getDiscussionById(discussionUiState.selectedId);
    await discussionRef.update({
        commentCount: discussionCommentCount(discussion) + 1,
        lastActivityAt: now,
        updatedAt: now
    });

    input.value = '';
    if (parentId) {
        document.getElementById(`reply-box-${parentId}`)?.classList.add('hidden');
    }

    showToast('Reply posted.', 'success');
}

async function deleteDiscussion(id) {
    const discussion = getDiscussionById(id);
    if (!discussion || discussion.authorId !== state.user?.uid) return;
    if (!confirm('Delete this thread and its replies?')) return;

    const commentsSnap = await db.collection('discussions').doc(id).collection('comments').get();
    const batch = db.batch();
    commentsSnap.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('discussions').doc(id));
    await batch.commit();

    if (discussionUiState.selectedId === id) {
        discussionUiState.selectedId = null;
        discussionUiState.comments = [];
        if (discussionUiState.commentsUnsub) {
            discussionUiState.commentsUnsub();
            discussionUiState.commentsUnsub = null;
        }
    }

    showToast('Thread deleted.', 'info');
}

async function deleteComment(id) {
    if (!discussionUiState.selectedId) return;
    const comment = discussionUiState.comments.find(item => item.id === id);
    if (!comment || comment.authorId !== state.user?.uid) return;
    if (!confirm('Delete this reply?')) return;

    const discussionRef = db.collection('discussions').doc(discussionUiState.selectedId);
    const commentRef = discussionRef.collection('comments').doc(id);
    const descendants = collectCommentDescendants(id, discussionUiState.comments);
    const batch = db.batch();

    batch.delete(commentRef);
    descendants.forEach(child => {
        batch.delete(discussionRef.collection('comments').doc(child.id));
    });

    const removedCount = 1 + descendants.length;
    const discussion = getDiscussionById(discussionUiState.selectedId);

    batch.update(discussionRef, {
        commentCount: Math.max(0, discussionCommentCount(discussion) - removedCount),
        lastActivityAt: new Date().toISOString()
    });

    await batch.commit();
    showToast('Reply deleted.', 'info');
}

async function copyDiscussionLink(id) {
    const url = `${window.location.href.split('#')[0]}#thread-${id}`;
    await navigator.clipboard.writeText(url);
    showToast('Thread link copied.', 'success');
}

function listenDiscussionComments(id) {
    if (discussionUiState.commentsUnsub) {
        discussionUiState.commentsUnsub();
        discussionUiState.commentsUnsub = null;
    }

    discussionUiState.comments = [];
    if (!id || !window.db) {
        renderDiscussionThread();
        return;
    }

    discussionUiState.commentsUnsub = db.collection('discussions').doc(id).collection('comments')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            discussionUiState.comments = [];
            snapshot.forEach(doc => {
                const comment = normalizeComment(doc);
                if (comment.body) discussionUiState.comments.push(comment);
            });
            renderDiscussionThread();
        }, error => {
            console.error('Comment listener error:', error);
        });
}

function listenDiscussions() {
    if (!window.db) return;

    db.collection('discussions')
        .orderBy('timestamp', 'desc')
        .limit(200)
        .onSnapshot(snapshot => {
            state.discussions = [];
            snapshot.forEach(doc => state.discussions.push(normalizeDiscussion(doc)));

            const hashedId = selectedDiscussionFromHash();
            if (hashedId && getDiscussionById(hashedId)) {
                discussionUiState.selectedId = hashedId;
            } else if (!discussionUiState.selectedId && state.discussions.length) {
                discussionUiState.selectedId = getFilteredDiscussions()[0]?.id || state.discussions[0].id;
            }

            if (discussionUiState.selectedId && !getDiscussionById(discussionUiState.selectedId)) {
                discussionUiState.selectedId = getFilteredDiscussions()[0]?.id || null;
            }

            updateDiscussionHash(discussionUiState.selectedId);

            renderDiscussions();

            if (discussionUiState.selectedId && !discussionUiState.commentsUnsub) {
                listenDiscussionComments(discussionUiState.selectedId);
            }
        }, error => {
            console.error('Discussion listener error:', error);
            showToast('Could not load discussions.', 'error');
        });
}

function bindDiscussionUi() {
    if (discussionUiState.initialized || !isDiscussionsPage()) return;
    discussionUiState.initialized = true;

    dom.discussionSearch?.addEventListener('input', event => {
        discussionUiState.searchQuery = event.target.value.trim();
        renderDiscussions();
    });

    dom.discussionSort?.addEventListener('change', event => {
        discussionUiState.currentSort = event.target.value;
        persistDiscussionPreferences();
        renderDiscussions();
    });

    dom.discussionCommentSort?.addEventListener('change', event => {
        discussionUiState.currentCommentSort = event.target.value;
        persistDiscussionPreferences();
        renderDiscussionThread();
    });

    dom.discussionSavedToggle?.addEventListener('click', () => {
        discussionUiState.showSavedOnly = !discussionUiState.showSavedOnly;
        persistDiscussionPreferences();
        renderDiscussions();
    });

    dom.discussionJumpCompose?.addEventListener('click', () => {
        document.querySelector('.reddit-compose-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        dom.discussionTitle?.focus();
    });

    [dom.discussionTitle, dom.discussionBody, dom.discussionCategory].forEach(input => {
        input?.addEventListener('input', persistDiscussionDraft);
        input?.addEventListener('change', persistDiscussionDraft);
    });

    document.getElementById('discussion-category-rail')?.addEventListener('click', event => {
        const button = event.target.closest('[data-discussion-filter]');
        if (!button) return;

        discussionUiState.currentFilter = button.dataset.discussionFilter || 'all';
        persistDiscussionPreferences();
        document.querySelectorAll('[data-discussion-filter]').forEach(chip => {
            chip.classList.toggle('active', chip === button);
        });
        renderDiscussions();
    });

    document.addEventListener('click', event => {
        const open = event.target.closest('[data-open-discussion], [data-discussion-id]');
        if (open) {
            const id = open.dataset.openDiscussion || open.dataset.discussionId;
            if (id) setSelectedDiscussion(id);
        }

        const voteDiscussionBtn = event.target.closest('[data-vote-discussion]');
        if (voteDiscussionBtn) {
            voteDiscussion(voteDiscussionBtn.dataset.voteDiscussion, voteDiscussionBtn.dataset.voteDirection).catch(error => {
                console.error('Discussion vote error:', error);
                showToast('Could not update vote.', 'error');
            });
        }

        const voteCommentBtn = event.target.closest('[data-vote-comment]');
        if (voteCommentBtn) {
            voteComment(voteCommentBtn.dataset.voteComment, voteCommentBtn.dataset.voteDirection).catch(error => {
                console.error('Comment vote error:', error);
                showToast('Could not update vote.', 'error');
            });
        }

        const focusReplyBtn = event.target.closest('[data-focus-reply]');
        if (focusReplyBtn) {
            const id = focusReplyBtn.dataset.focusReply;
            if (discussionUiState.selectedId !== id) setSelectedDiscussion(id);
            setTimeout(() => document.getElementById('discussion-comment-body')?.focus(), 50);
        }

        const saveDiscussionBtn = event.target.closest('[data-save-discussion]');
        if (saveDiscussionBtn) {
            toggleSavedDiscussion(saveDiscussionBtn.dataset.saveDiscussion);
        }

        const copyThreadBtn = event.target.closest('[data-copy-thread]');
        if (copyThreadBtn) {
            copyDiscussionLink(copyThreadBtn.dataset.copyThread).catch(error => {
                console.error('Copy thread error:', error);
                showToast('Could not copy link.', 'error');
            });
        }

        const replyBtn = event.target.closest('[data-reply-comment]');
        if (replyBtn) {
            const box = document.getElementById(`reply-box-${replyBtn.dataset.replyComment}`);
            box?.classList.toggle('hidden');
        }

        const cancelReplyBtn = event.target.closest('[data-cancel-reply]');
        if (cancelReplyBtn) {
            document.getElementById(`reply-box-${cancelReplyBtn.dataset.cancelReply}`)?.classList.add('hidden');
        }

        const toggleCommentBtn = event.target.closest('[data-toggle-comment]');
        if (toggleCommentBtn) {
            const id = toggleCommentBtn.dataset.toggleComment;
            discussionUiState.collapsedComments[id] = !discussionUiState.collapsedComments[id];
            renderDiscussionThread();
        }

        const submitReplyBtn = event.target.closest('[data-submit-reply]');
        if (submitReplyBtn) {
            postComment(submitReplyBtn.dataset.submitReply).catch(error => {
                console.error('Reply post error:', error);
                showToast('Could not post reply.', 'error');
            });
        }

        const deleteDiscussionBtn = event.target.closest('[data-delete-discussion]');
        if (deleteDiscussionBtn) {
            deleteDiscussion(deleteDiscussionBtn.dataset.deleteDiscussion).catch(error => {
                console.error('Delete discussion error:', error);
                showToast('Could not delete thread.', 'error');
            });
        }

        const deleteCommentBtn = event.target.closest('[data-delete-comment]');
        if (deleteCommentBtn) {
            deleteComment(deleteCommentBtn.dataset.deleteComment).catch(error => {
                console.error('Delete comment error:', error);
                showToast('Could not delete reply.', 'error');
            });
        }

        if (event.target.id === 'btn-post-comment') {
            postComment().catch(error => {
                console.error('Comment post error:', error);
                showToast('Could not post reply.', 'error');
            });
        }
    });

    window.addEventListener('hashchange', () => {
        const hashId = selectedDiscussionFromHash();
        if (hashId && hashId !== discussionUiState.selectedId) {
            setSelectedDiscussion(hashId);
        }
    });
}

function initializeDiscussionPage() {
    if (!isDiscussionsPage()) return;
    if (typeof initDom === 'function' && !dom.discussionsList) initDom();
    loadDiscussionPreferences();
    bindDiscussionUi();
    loadDiscussionDraft();

    if (dom.discussionComposeAvatar) {
        const initials = (state.user?.username || 'PC').slice(0, 2).toUpperCase();
        dom.discussionComposeAvatar.textContent = initials;
    }

    if (dom.discussionSort) dom.discussionSort.value = discussionUiState.currentSort;
    if (dom.discussionCommentSort) dom.discussionCommentSort.value = discussionUiState.currentCommentSort;
    document.querySelectorAll('[data-discussion-filter]').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.discussionFilter === discussionUiState.currentFilter);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDiscussionPage);
} else {
    initializeDiscussionPage();
}

window.listenDiscussions = listenDiscussions;
window.postDiscussion = postDiscussion;
window.renderDiscussions = renderDiscussions;
window.likeDisc = voteDiscussion;
window.deleteDisc = deleteDiscussion;
