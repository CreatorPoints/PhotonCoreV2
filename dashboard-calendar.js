/* ========================================
   PHOTON CORE - dashboard-calendar.js
   Local calendar with reminders + notifications
======================================== */

(function initDashboardCalendar() {
    const calendarCard = document.getElementById('calendar-card');
    if (!calendarCard) return;

    const dom = {
        grid: document.getElementById('calendar-grid'),
        monthLabel: document.getElementById('cal-month-label'),
        prevBtn: document.getElementById('cal-prev'),
        nextBtn: document.getElementById('cal-next'),
        title: document.getElementById('calendar-title'),
        date: document.getElementById('calendar-date'),
        time: document.getElementById('calendar-time'),
        type: document.getElementById('calendar-type'),
        remind: document.getElementById('calendar-remind'),
        notes: document.getElementById('calendar-notes'),
        addBtn: document.getElementById('calendar-add-btn'),
        eventsList: document.getElementById('calendar-events-list'),
        upcomingList: document.getElementById('calendar-upcoming-list'),
        selectedLabel: document.getElementById('calendar-selected-label'),
        notifyBtn: document.getElementById('calendar-notify-btn'),
        notifyStatus: document.getElementById('calendar-notify-status')
    };

    if (!dom.grid || !dom.monthLabel || !dom.prevBtn || !dom.nextBtn) return;

    const STORAGE_KEY = 'photon_calendar_events_v1';
    const VIEW_KEY = 'photon_calendar_view_v1';
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const REMINDER_POLL_MS = 30000;

    const calendar = {
        view: new Date(),
        selected: new Date(),
        events: []
    };

    const safeEsc = typeof esc === 'function' ? esc : (t) => {
        const d = document.createElement('div');
        d.textContent = String(t ?? '');
        return d.innerHTML;
    };

    function toDateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function parseDateKey(key) {
        const [y, m, d] = key.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function loadEvents() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            calendar.events = raw ? JSON.parse(raw) : [];
        } catch (e) {
            calendar.events = [];
        }
    }

    function saveEvents() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(calendar.events));
        } catch (e) {}
    }

    function loadView() {
        try {
            const raw = localStorage.getItem(VIEW_KEY);
            if (raw) {
                const parts = raw.split('-').map(Number);
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    calendar.view = new Date(parts[0], parts[1] - 1, 1);
                }
            }
        } catch (e) {}
    }

    function saveView() {
        try {
            const y = calendar.view.getFullYear();
            const m = String(calendar.view.getMonth() + 1).padStart(2, '0');
            localStorage.setItem(VIEW_KEY, `${y}-${m}`);
        } catch (e) {}
    }

    function getEventDateTime(evt) {
        const [y, m, d] = evt.date.split('-').map(Number);
        let hh = 9;
        let mm = 0;
        if (evt.time) {
            const parts = evt.time.split(':').map(Number);
            if (!isNaN(parts[0])) hh = parts[0];
            if (!isNaN(parts[1])) mm = parts[1];
        }
        return new Date(y, m - 1, d, hh, mm, 0, 0);
    }

    function renderGrid() {
        const year = calendar.view.getFullYear();
        const month = calendar.view.getMonth();
        const first = new Date(year, month, 1);
        const startDay = first.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        dom.monthLabel.textContent = calendar.view.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric'
        });

        dom.grid.innerHTML = WEEKDAYS.map(d => `<div class="calendar-weekday">${d}</div>`).join('');

        const totalCells = 42;
        const todayKey = toDateKey(new Date());
        const selectedKey = toDateKey(calendar.selected);

        for (let i = 0; i < totalCells; i++) {
            let dayNum;
            let cellMonth = month;
            let cellYear = year;
            let isOther = false;

            if (i < startDay) {
                dayNum = daysInPrevMonth - startDay + i + 1;
                cellMonth = month - 1;
                isOther = true;
            } else if (i < startDay + daysInMonth) {
                dayNum = i - startDay + 1;
            } else {
                dayNum = i - (startDay + daysInMonth) + 1;
                cellMonth = month + 1;
                isOther = true;
            }

            const cellDate = new Date(cellYear, cellMonth, dayNum);
            const cellKey = toDateKey(cellDate);
            const hasEvents = calendar.events.some(e => e.date === cellKey && !e.completed);

            const cell = document.createElement('button');
            cell.className = 'calendar-day' + (isOther ? ' is-other' : '') +
                (cellKey === todayKey ? ' is-today' : '') +
                (cellKey === selectedKey ? ' is-selected' : '');
            cell.type = 'button';
            cell.dataset.date = cellKey;
            cell.innerHTML = `<span class="calendar-day-number">${dayNum}</span>${hasEvents ? '<span class="calendar-dot"></span>' : ''}`;
            dom.grid.appendChild(cell);
        }
    }

    function renderSelectedEvents() {
        if (!dom.eventsList || !dom.selectedLabel) return;

        const selectedKey = toDateKey(calendar.selected);
        const selectedEvents = calendar.events
            .filter(e => e.date === selectedKey)
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        dom.selectedLabel.textContent = calendar.selected.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        if (!selectedEvents.length) {
            dom.eventsList.innerHTML = '<p class="empty-state">No events for this day.</p>';
            return;
        }

        dom.eventsList.innerHTML = selectedEvents.map(e => renderEventItem(e)).join('');
    }

    function renderUpcoming() {
        if (!dom.upcomingList) return;
        const now = Date.now();
        const upcoming = calendar.events
            .filter(e => !e.completed && getEventDateTime(e).getTime() >= now)
            .sort((a, b) => getEventDateTime(a) - getEventDateTime(b))
            .slice(0, 5);

        if (!upcoming.length) {
            dom.upcomingList.innerHTML = '<p class="empty-state">No upcoming events.</p>';
            return;
        }

        dom.upcomingList.innerHTML = upcoming.map(e => renderEventItem(e, true)).join('');
    }

    function renderEventItem(e, showDate) {
        const timeLabel = e.time ? e.time : 'All day';
        const dateLabel = showDate ? parseDateKey(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
        const overdue = !e.completed && getEventDateTime(e).getTime() < Date.now();
        const meta = [e.type, e.notes ? e.notes : null, dateLabel].filter(Boolean).join(' | ');

        return `
            <div class="calendar-event ${e.type} ${e.completed ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}" data-id="${e.id}">
                <div class="calendar-event-time">${timeLabel}</div>
                <div class="calendar-event-info">
                    <div class="calendar-event-title">${safeEsc(e.title)}</div>
                    <div class="calendar-event-meta">${safeEsc(meta)}</div>
                </div>
                <div class="calendar-event-actions">
                    <button class="calendar-event-btn" data-action="toggle" title="Mark done">Done</button>
                    <button class="calendar-event-btn danger" data-action="delete" title="Delete">Del</button>
                </div>
            </div>
        `;
    }

    function addEvent() {
        const title = dom.title?.value?.trim();
        const date = dom.date?.value;
        const time = dom.time?.value || '';
        const type = dom.type?.value || 'event';
        const remind = dom.remind?.value || 'none';
        const notes = dom.notes?.value?.trim() || '';

        if (!title || !date) {
            showToast('Add a title and date for the event.', 'error');
            return;
        }

        const event = {
            id: 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            title,
            date,
            time,
            type,
            notes,
            remindMinutes: remind === 'none' ? null : Number(remind),
            completed: false,
            notified: false,
            createdAt: new Date().toISOString()
        };

        calendar.events.push(event);
        saveEvents();
        renderGrid();
        renderSelectedEvents();
        renderUpcoming();
        showToast('Event added to calendar.', 'success');

        if (dom.title) dom.title.value = '';
        if (dom.time) dom.time.value = '';
        if (dom.notes) dom.notes.value = '';
    }

    function handleGridClick(e) {
        const btn = e.target.closest('.calendar-day');
        if (!btn) return;
        const key = btn.dataset.date;
        if (!key) return;
        const nextSelected = parseDateKey(key);
        calendar.selected = nextSelected;
        if (nextSelected.getMonth() !== calendar.view.getMonth() || nextSelected.getFullYear() !== calendar.view.getFullYear()) {
            calendar.view = new Date(nextSelected.getFullYear(), nextSelected.getMonth(), 1);
            saveView();
        }
        if (dom.date) dom.date.value = key;
        renderGrid();
        renderSelectedEvents();
    }

    function handleEventAction(e) {
        const btn = e.target.closest('.calendar-event-btn');
        if (!btn) return;
        const item = e.target.closest('.calendar-event');
        if (!item) return;
        const id = item.dataset.id;
        const action = btn.dataset.action;
        const idx = calendar.events.findIndex(ev => ev.id === id);
        if (idx === -1) return;

        if (action === 'delete') {
            calendar.events.splice(idx, 1);
            saveEvents();
            renderGrid();
            renderSelectedEvents();
            renderUpcoming();
            showToast('Event removed.', 'info');
        }

        if (action === 'toggle') {
            calendar.events[idx].completed = !calendar.events[idx].completed;
            saveEvents();
            renderGrid();
            renderSelectedEvents();
            renderUpcoming();
        }
    }

    function updateNotificationStatus() {
        if (!dom.notifyStatus) return;
        if (!('Notification' in window)) {
            dom.notifyStatus.textContent = 'Notifications not supported in this browser.';
            dom.notifyBtn?.setAttribute('disabled', 'disabled');
            return;
        }

        const status = Notification.permission;
        if (status === 'granted') {
            dom.notifyStatus.textContent = 'Notifications are enabled.';
        } else if (status === 'denied') {
            dom.notifyStatus.textContent = 'Notifications are blocked in browser settings.';
        } else {
            dom.notifyStatus.textContent = 'Notifications are off.';
        }
    }

    function requestNotifications() {
        if (!('Notification' in window)) return;
        Notification.requestPermission().then(() => {
            updateNotificationStatus();
            if (Notification.permission === 'granted') {
                showToast('Notifications enabled.', 'success');
            }
        });
    }

    function fireNotification(evt) {
        const when = getEventDateTime(evt);
        const timeStr = when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const message = `${evt.title} at ${timeStr}`;

        showToast('Reminder: ' + message, 'info');

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Photon Core Reminder', {
                body: message
            });
        }
    }

    function checkReminders() {
        const now = Date.now();
        let changed = false;

        calendar.events.forEach(evt => {
            if (evt.completed || evt.notified || !evt.remindMinutes) return;
            const eventTime = getEventDateTime(evt).getTime();
            const remindTime = eventTime - evt.remindMinutes * 60000;
            if (now >= remindTime && now <= eventTime + 3600000) {
                fireNotification(evt);
                evt.notified = true;
                changed = true;
            }
        });

        if (changed) saveEvents();
    }

    function bindEvents() {
        dom.prevBtn.addEventListener('click', () => {
            calendar.view.setDate(1);
            calendar.view.setMonth(calendar.view.getMonth() - 1);
            saveView();
            renderGrid();
        });

        dom.nextBtn.addEventListener('click', () => {
            calendar.view.setDate(1);
            calendar.view.setMonth(calendar.view.getMonth() + 1);
            saveView();
            renderGrid();
        });

        dom.grid.addEventListener('click', handleGridClick);
        dom.addBtn?.addEventListener('click', addEvent);
        dom.eventsList?.addEventListener('click', handleEventAction);
        dom.upcomingList?.addEventListener('click', handleEventAction);
        dom.notifyBtn?.addEventListener('click', requestNotifications);
    }

    function initDefaults() {
        const todayKey = toDateKey(new Date());
        calendar.selected = parseDateKey(todayKey);
        if (dom.date) dom.date.value = todayKey;
        updateNotificationStatus();
    }

    loadEvents();
    loadView();
    initDefaults();
    renderGrid();
    renderSelectedEvents();
    renderUpcoming();
    bindEvents();
    setInterval(checkReminders, REMINDER_POLL_MS);
})();
