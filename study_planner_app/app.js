/* ===========================
   StudyFlow — app.js
   =========================== */

// ============================
// STATE
// ============================
let state = {
  profile: null,
  goals: [],
  tasks: [],
  sessions: [],
  reminders: [],
  streak: 0,
  lastActiveDate: null,
  currentFilter: 'all',
  currentPlannerTab: 'day',
};

// ============================
// INIT
// ============================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setTodayDate();
  setGreeting();
  setDailyQuote();
  buildWeekGrid();
  buildMonthCalendar();
  updateStreak();

  if (state.profile) {
    goToApp();
  }

  // Request notification permission
  if ('Notification' in window) {
    Notification.requestPermission();
  }

  // Check reminders every minute
  setInterval(checkReminders, 60000);
  checkReminders();
});

// ============================
// PERSISTENCE
// ============================
function saveState() {
  localStorage.setItem('studyflow_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('studyflow_state');
  if (saved) {
    state = { ...state, ...JSON.parse(saved) };
  }
}

// ============================
// NAVIGATION
// ============================
function goToProfile() {
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  navigate('profile');
  if (state.profile) fillProfileForm();
}

function goToApp() {
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  navigate('dashboard');
  updateSidebarProfile();
  refreshDashboard();
}

function navigate(page) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Show/hide pages
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // Refresh content
  if (page === 'dashboard') refreshDashboard();
  if (page === 'goals') renderGoals();
  if (page === 'tasks') renderTasks();
  if (page === 'reminders') renderReminders();
  if (page === 'planner') renderPlanner();

  // Close mobile sidebar
  closeSidebar();
}

// ============================
// SIDEBAR (MOBILE)
// ============================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');

  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('visible', sidebar.classList.contains('open'));
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('visible');
}

// ============================
// PROFILE
// ============================
function toggleEducationFields() {
  const type = document.getElementById('p-type').value;
  document.getElementById('f-class').classList.toggle('hidden', type !== 'school');
  document.getElementById('f-semester').classList.toggle('hidden', type !== 'college');
}

function updateAvatarPreview() {
  const name = document.getElementById('p-name').value.trim();
  const initials = getInitials(name);
  document.getElementById('profile-avatar-big').textContent = initials || '?';
  document.getElementById('avatar-name-display').textContent = name || 'Your Name';
}

function saveProfile() {
  const name = document.getElementById('p-name').value.trim();
  const type = document.getElementById('p-type').value;

  if (!name) { showToast('⚠️ Please enter your name.'); return; }
  if (!type) { showToast('⚠️ Please select your institution type.'); return; }

  state.profile = {
    name,
    type,
    institution: document.getElementById('p-institution').value.trim(),
    class: document.getElementById('p-class').value,
    semester: document.getElementById('p-semester').value,
    dept: document.getElementById('p-dept').value.trim(),
    goalText: document.getElementById('p-goal-text').value.trim(),
    dailyHours: parseFloat(document.getElementById('p-hours').value) || 6,
  };

  saveState();
  updateSidebarProfile();
  showToast('✅ Profile saved successfully!');
  setTimeout(() => navigate('dashboard'), 800);
  refreshDashboard();
}

function fillProfileForm() {
  const p = state.profile;
  if (!p) return;
  document.getElementById('p-name').value = p.name || '';
  document.getElementById('p-type').value = p.type || '';
  toggleEducationFields();
  document.getElementById('p-institution').value = p.institution || '';
  document.getElementById('p-class').value = p.class || '';
  document.getElementById('p-semester').value = p.semester || '';
  document.getElementById('p-dept').value = p.dept || '';
  document.getElementById('p-goal-text').value = p.goalText || '';
  document.getElementById('p-hours').value = p.dailyHours || '';
  updateAvatarPreview();
}

function updateSidebarProfile() {
  const p = state.profile;
  if (!p) return;
  const initials = getInitials(p.name);
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('mobile-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent = p.name;

  let sub = '';
  if (p.type === 'school' && p.class) sub = p.class;
  else if (p.type === 'college' && p.semester) sub = p.semester;
  if (p.dept) sub += (sub ? ' • ' : '') + p.dept;
  document.getElementById('sidebar-class').textContent = sub || '—';
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ============================
// DASHBOARD
// ============================
function refreshDashboard() {
  setGreeting();
  updateStatCards();
  renderDashTasks();
  renderDashGoals();
}

function setGreeting() {
  const hour = new Date().getHours();
  const name = state.profile?.name?.split(' ')[0] || 'Student';
  let emoji = '☀️';
  let time = 'Morning';
  if (hour >= 12 && hour < 17) { time = 'Afternoon'; emoji = '🌤️'; }
  else if (hour >= 17 && hour < 21) { time = 'Evening'; emoji = '🌆'; }
  else if (hour >= 21 || hour < 5) { time = 'Night'; emoji = '🌙'; }
  const el = document.getElementById('greeting');
  if (el) el.textContent = `Good ${time}, ${name}! ${emoji}`;
}

function setTodayDate() {
  const el = document.getElementById('today-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function updateStatCards() {
  const today = todayStr();
  const todayTasks = state.tasks.filter(t => t.date === today);
  const doneTasks = todayTasks.filter(t => t.done);
  const studyHours = state.sessions
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + calcDuration(s.start, s.end), 0);

  document.getElementById('stat-goals').textContent = state.goals.length;
  document.getElementById('stat-tasks').textContent = todayTasks.length;
  document.getElementById('stat-done').textContent = doneTasks.length;
  document.getElementById('stat-hours').textContent = studyHours.toFixed(1) + 'h';
}

function renderDashTasks() {
  const container = document.getElementById('dash-tasks-list');
  const today = todayStr();
  const items = state.tasks.filter(t => t.date === today).slice(0, 5);

  if (!items.length) {
    container.innerHTML = `<div class="empty-state-small">No tasks today. <a onclick="navigate('tasks')">Add one →</a></div>`;
    return;
  }

  container.innerHTML = items.map(t => `
    <div class="task-item ${t.done ? 'done' : ''}" style="padding:0.6rem 0.8rem;">
      <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')">
        ${t.done ? '<i class="fa fa-check"></i>' : ''}
      </div>
      <div class="task-info">
        <div class="task-name">${escHtml(t.name)}</div>
        ${t.subject ? `<div class="task-meta"><span>${escHtml(t.subject)}</span></div>` : ''}
      </div>
      <div class="p-dot p-${t.priority}"></div>
    </div>
  `).join('');
}

function renderDashGoals() {
  const container = document.getElementById('dash-goals-list');
  const items = state.goals.slice(0, 4);

  if (!items.length) {
    container.innerHTML = `<div class="empty-state-small">No goals yet. <a onclick="navigate('goals')">Add one →</a></div>`;
    return;
  }

  container.innerHTML = items.map(g => `
    <div style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem 0; border-bottom:1px solid var(--border);">
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.88rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(g.title)}</div>
        ${g.subject ? `<div style="font-size:0.74rem; color:var(--accent);">${escHtml(g.subject)}</div>` : ''}
      </div>
      <span class="priority-badge badge-${g.priority}">${g.priority}</span>
    </div>
  `).join('');
}

const quotes = [
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "Study hard, for the well is deep and our brains are shallow.", author: "Richard Baxter" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
  { text: "Genius is 1% inspiration and 99% perspiration.", author: "Thomas Edison" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
];

function setDailyQuote() {
  const idx = new Date().getDate() % quotes.length;
  const q = quotes[idx];
  const qEl = document.getElementById('daily-quote');
  const aEl = document.getElementById('quote-author');
  if (qEl) qEl.textContent = q.text;
  if (aEl) aEl.textContent = '— ' + q.author;
}

// ============================
// GOALS
// ============================
function addGoal() {
  const title = document.getElementById('g-title').value.trim();
  if (!title) { showToast('⚠️ Goal title is required.'); return; }

  const goal = {
    id: uid(),
    title,
    subject: document.getElementById('g-subject').value.trim(),
    date: document.getElementById('g-date').value,
    hours: parseFloat(document.getElementById('g-hours').value) || 0,
    priority: document.getElementById('g-priority').value,
    notes: document.getElementById('g-notes').value.trim(),
    progress: 0,
    createdAt: Date.now(),
  };

  state.goals.push(goal);
  saveState();
  closeModal('goal-modal');
  clearForm(['g-title','g-subject','g-date','g-hours','g-notes']);
  renderGoals();
  showToast('🎯 Goal added!');
}

function renderGoals() {
  const container = document.getElementById('goals-list');
  if (!state.goals.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>No goals yet. Set your first study goal!</p></div>`;
    return;
  }

  container.innerHTML = state.goals.map(g => {
    const daysLeft = g.date ? Math.ceil((new Date(g.date) - new Date()) / 86400000) : null;
    const progress = Math.min(100, g.progress || 0);
    return `
      <div class="goal-card ${g.priority}">
        <div class="goal-card-top">
          <div class="goal-card-title">${escHtml(g.title)}</div>
          <span class="priority-badge badge-${g.priority}">${g.priority}</span>
        </div>
        ${g.subject ? `<div class="goal-card-subject">📘 ${escHtml(g.subject)}</div>` : ''}
        <div class="goal-card-meta">
          ${g.date ? `<span>📅 ${formatDate(g.date)}</span>` : ''}
          ${daysLeft !== null ? `<span>${daysLeft > 0 ? daysLeft + ' days left' : daysLeft === 0 ? 'Due today!' : 'Overdue'}</span>` : ''}
          ${g.hours ? `<span>⏱ ${g.hours}h/day</span>` : ''}
        </div>
        ${g.notes ? `<p style="font-size:0.82rem; color:var(--text2); margin-top:0.3rem;">${escHtml(g.notes)}</p>` : ''}
        <div class="goal-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
          <div class="progress-text">${progress}% complete</div>
        </div>
        <div class="goal-actions">
          <button class="icon-btn" onclick="updateGoalProgress('${g.id}')" title="Update Progress">
            <i class="fa fa-chart-simple"></i>
          </button>
          <button class="icon-btn delete" onclick="deleteGoal('${g.id}')" title="Delete">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function updateGoalProgress(id) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  const val = prompt(`Update progress for "${goal.title}" (0-100%):`, goal.progress || 0);
  if (val === null) return;
  const num = Math.min(100, Math.max(0, parseInt(val) || 0));
  goal.progress = num;
  saveState();
  renderGoals();
  showToast(`📊 Progress updated to ${num}%`);
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  renderGoals();
  showToast('🗑️ Goal deleted.');
}

// ============================
// TASKS
// ============================
function addTask() {
  const name = document.getElementById('t-name').value.trim();
  if (!name) { showToast('⚠️ Task name is required.'); return; }

  const hasReminder = document.getElementById('t-reminder-toggle').checked;
  const task = {
    id: uid(),
    name,
    subject: document.getElementById('t-subject').value.trim(),
    date: document.getElementById('t-date').value || todayStr(),
    priority: document.getElementById('t-priority').value,
    time: parseInt(document.getElementById('t-time').value) || 0,
    notes: document.getElementById('t-notes').value.trim(),
    done: false,
    reminderTime: hasReminder ? document.getElementById('t-reminder-time').value : null,
    createdAt: Date.now(),
  };

  state.tasks.push(task);

  // Auto-create reminder
  if (task.reminderTime) {
    state.reminders.push({
      id: uid(),
      title: '📌 Task: ' + task.name,
      date: task.date,
      time: task.reminderTime,
      repeat: 'none',
      note: task.subject || '',
      fired: false,
    });
  }

  saveState();
  closeModal('task-modal');
  clearForm(['t-name','t-subject','t-date','t-time','t-notes','t-reminder-time']);
  document.getElementById('t-reminder-toggle').checked = false;
  document.getElementById('t-reminder-time-field').classList.add('hidden');
  renderTasks();
  showToast('✅ Task added!');
}

function toggleTaskReminder() {
  const checked = document.getElementById('t-reminder-toggle').checked;
  document.getElementById('t-reminder-time-field').classList.toggle('hidden', !checked);
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveState();
  renderTasks();
  renderDashTasks();
  updateStatCards();
  if (task.done) showToast('🎉 Task completed!');
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderTasks();
  updateStatCards();
  showToast('🗑️ Task deleted.');
}

function filterTasks(filter, btn) {
  state.currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById('tasks-list');
  let items = [...state.tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pd = { high: 0, medium: 1, low: 2 };
    return pd[a.priority] - pd[b.priority];
  });

  const f = state.currentFilter;
  if (f === 'pending') items = items.filter(t => !t.done);
  else if (f === 'done') items = items.filter(t => t.done);
  else if (f === 'high') items = items.filter(t => t.priority === 'high');
  else if (f === 'medium') items = items.filter(t => t.priority === 'medium');
  else if (f === 'low') items = items.filter(t => t.priority === 'low');

  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>No tasks here.</p></div>`;
    return;
  }

  container.innerHTML = items.map(t => `
    <div class="task-item ${t.done ? 'done' : ''}">
      <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')">
        ${t.done ? '<i class="fa fa-check"></i>' : ''}
      </div>
      <div class="task-info">
        <div class="task-name">${escHtml(t.name)}</div>
        <div class="task-meta">
          ${t.subject ? `<span>📘 ${escHtml(t.subject)}</span>` : ''}
          ${t.date ? `<span>📅 ${formatDate(t.date)}</span>` : ''}
          ${t.time ? `<span>⏱ ${t.time} min</span>` : ''}
          ${t.reminderTime ? `<span>🔔 ${t.reminderTime}</span>` : ''}
        </div>
        ${t.notes ? `<div style="font-size:0.78rem;color:var(--text3);margin-top:0.2rem;">${escHtml(t.notes)}</div>` : ''}
      </div>
      <div class="task-right">
        <div class="p-dot p-${t.priority}" title="${t.priority} priority"></div>
        <button class="icon-btn delete" onclick="deleteTask('${t.id}')"><i class="fa fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

// ============================
// PLANNER / SESSIONS
// ============================
function addSession() {
  const title = document.getElementById('s-title').value.trim();
  if (!title) { showToast('⚠️ Session title is required.'); return; }

  const session = {
    id: uid(),
    title,
    subject: document.getElementById('s-subject').value.trim(),
    date: document.getElementById('s-date').value || todayStr(),
    start: document.getElementById('s-start').value,
    end: document.getElementById('s-end').value,
    type: document.getElementById('s-type').value,
    notes: document.getElementById('s-notes').value.trim(),
    createdAt: Date.now(),
  };

  state.sessions.push(session);
  saveState();
  closeModal('session-modal');
  clearForm(['s-title','s-subject','s-date','s-start','s-end','s-notes']);
  renderPlanner();
  showToast('📅 Session scheduled!');
}

function deleteSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  saveState();
  renderPlanner();
  showToast('🗑️ Session removed.');
}

function switchPlannerTab(tab, btn) {
  state.currentPlannerTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.planner-view').forEach(v => v.classList.remove('active-view'));
  document.getElementById('planner-' + tab).classList.add('active-view');
  renderPlanner();
}

function renderPlanner() {
  renderDayView();
  renderWeekView();
  renderMonthView();
}

function renderDayView() {
  const container = document.getElementById('day-schedule');
  const today = todayStr();
  const items = state.sessions
    .filter(s => s.date === today)
    .sort((a, b) => a.start.localeCompare(b.start));

  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>No sessions for today. Add a study session!</p></div>`;
    return;
  }

  const icons = { study: '📖', revision: '🔁', practice: '✏️', exam: '📝', break: '☕' };
  container.innerHTML = items.map(s => `
    <div class="session-card">
      <div class="session-time">${s.start || '--:--'} – ${s.end || '--:--'}</div>
      <div class="session-type-icon">${icons[s.type] || '📖'}</div>
      <div class="session-info">
        <div class="session-title">${escHtml(s.title)}</div>
        <div class="session-subject">${escHtml(s.subject || '')} ${s.notes ? '· ' + escHtml(s.notes.slice(0, 60)) : ''}</div>
      </div>
      <button class="session-delete" onclick="deleteSession('${s.id}')"><i class="fa fa-xmark"></i></button>
    </div>
  `).join('');
}

function renderWeekView() {
  const grid = document.getElementById('week-grid');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  grid.innerHTML = days.map((day, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    const sessions = state.sessions.filter(s => s.date === ds);
    const isToday = ds === todayStr();
    return `
      <div class="week-day ${isToday ? 'today' : ''}">
        <div class="week-day-header">${day}<br/><span style="font-size:0.85em;color:var(--text)">${d.getDate()}</span></div>
        ${sessions.map(s => `<div class="week-session-mini" title="${escHtml(s.title)}">${escHtml(s.title)}</div>`).join('')}
        ${!sessions.length ? '<div style="font-size:0.7rem;color:var(--text3)">Free</div>' : ''}
      </div>
    `;
  }).join('');
}

function buildWeekGrid() { renderWeekView(); }

function renderMonthView() {
  const cal = document.getElementById('month-calendar');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    .map(d => `<div style="text-align:center;font-size:0.7rem;font-weight:700;color:var(--text3);padding:0.3rem;">${d}</div>`)
    .join('');

  // empty cells
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="month-cell" style="opacity:0.3;"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const sessions = state.sessions.filter(s => s.date === ds);
    const isToday = ds === todayStr();
    html += `
      <div class="month-cell ${isToday ? 'today' : ''}">
        <div class="month-cell-day" style="${isToday ? 'color:var(--accent);font-weight:700;' : ''}">${day}</div>
        ${sessions.map(() => '<span class="month-session-dot"></span>').join('')}
      </div>
    `;
  }

  cal.innerHTML = html;
}

function buildMonthCalendar() { renderMonthView(); }

// ============================
// REMINDERS
// ============================
function addReminder() {
  const title = document.getElementById('r-title').value.trim();
  const time = document.getElementById('r-time').value;
  if (!title) { showToast('⚠️ Reminder title is required.'); return; }
  if (!time) { showToast('⚠️ Please set a time for the reminder.'); return; }

  const reminder = {
    id: uid(),
    title,
    date: document.getElementById('r-date').value || todayStr(),
    time,
    repeat: document.getElementById('r-repeat').value,
    note: document.getElementById('r-note').value.trim(),
    fired: false,
    createdAt: Date.now(),
  };

  state.reminders.push(reminder);
  saveState();
  closeModal('reminder-modal');
  clearForm(['r-title','r-date','r-time','r-note']);
  renderReminders();
  showToast('🔔 Reminder set!');
}

function deleteReminder(id) {
  state.reminders = state.reminders.filter(r => r.id !== id);
  saveState();
  renderReminders();
  showToast('🗑️ Reminder deleted.');
}

function renderReminders() {
  const container = document.getElementById('reminders-list');
  const sorted = [...state.reminders].sort((a, b) => a.time.localeCompare(b.time));

  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><p>No reminders set. Stay on track by adding reminders!</p></div>`;
    return;
  }

  const repeatLabels = { none: 'Once', daily: 'Daily', weekly: 'Weekly', weekdays: 'Weekdays Only' };
  container.innerHTML = sorted.map(r => `
    <div class="reminder-item">
      <div class="reminder-icon">🔔</div>
      <div class="reminder-info">
        <div class="reminder-title">${escHtml(r.title)}</div>
        <div class="reminder-time">${r.time}${r.date ? ' · ' + formatDate(r.date) : ''}</div>
        <div class="reminder-repeat">${repeatLabels[r.repeat] || 'Once'} ${r.note ? '· ' + escHtml(r.note) : ''}</div>
      </div>
      <button class="reminder-delete" onclick="deleteReminder('${r.id}')"><i class="fa fa-trash"></i></button>
    </div>
  `).join('');
}

function checkReminders() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const today = todayStr();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

  state.reminders.forEach(r => {
    if (r.fired && r.repeat === 'none') return;
    if (r.time !== currentTime) return;

    let shouldFire = false;
    if (r.repeat === 'none' && r.date === today && !r.fired) shouldFire = true;
    else if (r.repeat === 'daily') shouldFire = true;
    else if (r.repeat === 'weekly' && r.date) {
      const rDay = new Date(r.date).getDay();
      if (dayOfWeek === rDay) shouldFire = true;
    }
    else if (r.repeat === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) shouldFire = true;

    if (shouldFire) {
      r.fired = true;
      saveState();
      fireNotification(r.title, r.note || 'Time to study!');
      showToast(`🔔 Reminder: ${r.title}`);
    }
  });
}

function fireNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('StudyFlow: ' + title, { body, icon: '' });
  }
}

// ============================
// STREAK
// ============================
function updateStreak() {
  const today = todayStr();
  if (state.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    if (state.lastActiveDate === yStr) {
      state.streak = (state.streak || 0) + 1;
    } else if (state.lastActiveDate !== today) {
      state.streak = 1;
    }
    state.lastActiveDate = today;
    saveState();
  }
  const el = document.getElementById('streak-num');
  if (el) el.textContent = state.streak || 1;
}

// ============================
// MODALS
// ============================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ============================
// UTILS
// ============================
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function calcDuration(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function clearForm(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Keyboard shortcut: Escape closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }
});

function logout() {
  if (!confirm('Log out? Your data will be saved.')) return;
  state.profile = null;
  saveState();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('splash-screen').classList.remove('hidden');
}