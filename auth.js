/* ========================================
   PHOTON CORE — auth.js
   Puter Authentication + Page Redirect
   ======================================== */

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const isAuthPage = (currentPage === 'index.html' || currentPage === '');
const appPages = ['dashboard.html', 'discussions.html', 'files.html', 'ai.html', 'members.html'];
const isAppPage = appPages.includes(currentPage);

async function initAuth() {
    try {
        const u = await puter.auth.getUser();
        if (u) {
            // User is already logged in
            if (isAuthPage) {
                // On login page but already signed in — go to dashboard
                window.location.href = 'dashboard.html';
                return;
            }
            // On an app page — populate UI
            onAppPageReady(u);
        } else {
            // Not logged in
            if (isAppPage) {
                // Trying to access app page without auth — kick to login
                window.location.href = 'index.html';
                return;
            }
            // On auth page, not logged in — do nothing, show login screen
        }
    } catch (e) {
        if (isAppPage) {
            window.location.href = 'index.html';
            return;
        }
    }
}

async function handleSignIn() {
    try {
        await puter.auth.signIn();
        // After sign in succeeds, just redirect immediately
        window.location.href = 'dashboard.html';
    } catch (e) {
        showToast('Sign in failed.', 'error');
    }
}

function onAppPageReady(user) {
    state.user = user;
    const n = user.username || 'Member';

    if (dom.userName) dom.userName.textContent = n;
    if (dom.userAvatar) dom.userAvatar.textContent = n.substring(0, 2).toUpperCase();
    if (dom.welcomeName) dom.welcomeName.textContent = n;
    if (dom.app) dom.app.classList.remove('hidden');

    // Welcome toast on first load after sign in
    const justSignedIn = sessionStorage.getItem('photon_just_signed_in');
    if (justSignedIn) {
        showToast('Welcome, ' + n + '! ⚡', 'success');
        sessionStorage.removeItem('photon_just_signed_in');
    }

    initAppData();
}

async function initAppData() {
    await ensureBaseFolder();
    loadSavedModel();
    setupPresence();
    listenDiscussions();
    listenMemories();
    listenActivity();
    listenChatSessions();
    loadFiles();
    loadProfile();
    setupPresenceListener();
    loadTipState();
}

async function ensureBaseFolder() {
    try { await puter.fs.mkdir('PhotonCore', { dedupeName: false }); } catch (e) {}
    try { await puter.fs.mkdir('PhotonCore/files', { dedupeName: false }); } catch (e) {}
    state.filesReady = true;
}