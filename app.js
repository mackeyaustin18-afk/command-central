// ─────────────────────────────────────────────
//  COMMAND CENTRAL — APP
//  Live Google data + localStorage persistence
// ─────────────────────────────────────────────

// ── State ──
let gToken = null;
let liveEmails = [];
let liveEvents = [];
let liveFiles  = [];
let tasks      = JSON.parse(localStorage.getItem('cc_tasks') || '[]');
let projects   = JSON.parse(localStorage.getItem('cc_projects') || '[]');
let nextTaskId = parseInt(localStorage.getItem('cc_next_task_id') || '1');
let nextProjId = parseInt(localStorage.getItem('cc_next_proj_id') || '1');
let lastSync   = null;
let editingProjId = null;

// Seed default projects if first run
if (projects.length === 0) {
projects = [
{ id: nextProjId++, name: 'Command Central', description: 'Personal productivity hub — live Gmail, Calendar & Drive.', status: 'active', updated: today(), links: [{ label: 'Live app', url: 'https://mackeyaustin18-afk.github.io/command-central/', type: 'deploy' }], color: '#5b4fe8', initials: 'CC' },
{ id: nextProjId++, name: 'Open Claw', description: 'In progress — add notes and links once underway.', status: 'in-progress', updated: 'Soon', links: [], color: '#1a9e75', initials: 'OC' },
];
saveTasks(); saveProjects();
}
// Seed default tasks if first run
if (tasks.length === 0) {
tasks = [
{ id: nextTaskId++, text: 'Check Railway build failure — attractive-mindfulness', tag: 'today', done: false },
{ id: nextTaskId++, text: 'Verify new device login on Link/Stripe', tag: 'today', done: false },
{ id: nextTaskId++, text: 'Bulk unsubscribe from promo emails', tag: 'today', done: false },
{ id: nextTaskId++, text: 'Deploy Command Central to GitHub Pages', tag: 'week', done: false },
];
saveTasks();
}

function saveTasks()   { localStorage.setItem('cc_tasks', JSON.stringify(tasks)); localStorage.setItem('cc_next_task_id', nextTaskId); updateTaskBadge(); }
function saveProjects(){ localStorage.setItem('cc_projects', JSON.stringify(projects)); localStorage.setItem('cc_next_proj_id', nextProjId); updateProjBadge(); }

// ── Init ──
window.addEventListener('DOMContentLoaded', () => {
setDate();
if (!CONFIG.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID')) {
showConfigWarning();
showAppWithSampleData();
return;
}
initGoogleAuth();
});

function showConfigWarning() {
document.getElementById('auth-note').textContent = '⚠ Add your Google Client ID to config.js, then reload.';
document.getElementById('sign-in-btn').disabled = true;
}

function showAppWithSampleData() {
document.getElementById('auth-screen').style.display = 'none';
document.getElementById('app').style.display = 'flex';
document.getElementById('config-warning').style.display = 'flex';
document.getElementById('user-name').textContent = CONFIG.YOUR_NAME;
document.getElementById('user-email').textContent = 'Not connected';
document.getElementById('user-avatar').textContent = CONFIG.YOUR_NAME ? CONFIG.YOUR_NAME[0].toUpperCase() : '?';
renderAll();
  fetchOpsBoard();
}

// ── Google Auth ──
function initGoogleAuth() {
google.accounts.id.initialize({
client_id: CONFIG.GOOGLE_CLIENT_ID,
callback: handleCredential,
});
const token = sessionStorage.getItem('cc_token');
if (token) {
gToken = token;
launchApp();
}
}

function startSignIn() {
const btn = document.getElementById('sign-in-btn');
btn.disabled = true;
btn.textContent = 'Opening…';
const client = google.accounts.oauth2.initTokenClient({
client_id: CONFIG.GOOGLE_CLIENT_ID,
scope: [
'https://www.googleapis.com/auth/gmail.readonly',
'https://www.googleapis.com/auth/calendar.readonly',
'https://www.googleapis.com/auth/drive.readonly',
'https://www.googleapis.com/auth/userinfo.profile',
'https://www.googleapis.com/auth/userinfo.email',
].join(' '),
callback: (resp) => {
if (resp.access_token) {
gToken = resp.access_token;
sessionStorage.setItem('cc_token', gToken);
launchApp();
} else {
btn.disabled = false;
btn.textContent = 'Sign in with Google';
alert('Sign-in failed. Check your Client ID in config.js.');}
},
});
client.requestAccessToken();
}

async function launchApp() {
document.getElementById('auth-screen').style.display = 'none';
document.getElementById('app').style.display = 'flex';
await loadUserProfile();
await refreshAll();
}

async function loadUserProfile() {
try {
const r = await gFetch('https://www.googleapis.com/oauth2/v2/userinfo');
if (r.name) {
document.getElementById('user-name').textContent = r.name;
document.getElementById('user-email').textContent = r.email || '';
if (r.picture) {
document.getElementById('user-avatar').innerHTML = `<img src="${r.picture}" alt="">`;
} else {
document.getElementById('user-avatar').textContent = (r.name||'?')[0].toUpperCase();
}
const h = new Date().getHours();
const g = h<12?'Good morning':'Good afternoon';
document.getElementById('page-title').textContent = `${g}, ${r.given_name||r.name}`;
}
} catch(e) { console.warn('Profile fetch failed', e); }
}

function signOut() {
gToken = null;
sessionStorage.removeItem('cc_token');
document.getElementById('app').style.display = 'none';
document.getElementById('auth-screen').style.display = 'flex';
document.getElementById('sign-in-btn').disabled = false;
document.getElementById('sign-in-btn').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign in with Google`;
}

// ── API helper ──
async function gFetch(url) {
const r = await fetch(url, { headers: { Authorization: `Bearer ${gToken}` }});
if (r.status === 401) { signOut(); throw new Error('Token expired'); }
return r.json();
}

// ── Refresh all data ──
async function refreshAll() {
const btn = document.getElementById('refresh-btn');
btn.classList.add('spinning');
try {
await Promise.all([fetchEmails(), fetchEvents(), fetchDrive(), fetchOpsBoard()]);
lastSync = new Date();
document.getElementById('last-sync').textContent = 'Synced ' + lastSync.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
} catch(e) {
console.warn('Refresh error', e);
} finally {
btn.classList.remove('spinning');
}
renderAll();
}

// ── Fetch Gmail ──
async function fetchEmails() {
try {
const data = await gFetch(
`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${CONFIG.EMAIL_COUNT}&q=is:inbox -category:promotions`
);
if (!data.messages) { liveEmails = []; return; }
const details = await Promise.all(
data.messages.slice(0, CONFIG.EMAIL_COUNT).map(m =>
gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)
)
);
liveEmails = details.map(msg => {
const h = {};
(msg.payload?.headers||[]).forEach(x => h[x.name.toLowerCase()] = x.value);
const from = h.from || '';
const name = from.replace(/<.*>/, '').trim().replace(/"/g, '') || from;
const email = (from.match(/<(.+)>/) || [])[1] || from;
const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '??';
const unread = (msg.labelIds||[]).includes('UNREAD');
const ts = parseInt(msg.internalDate);
return {
id: msg.id, from: name, email, initials,
subject: h.subject || '(no subject)',
time: formatTime(ts), unread,
avatarBg: strColor(email, true),
avatarColor: strColor(email, false),
};
});
document.getElementById('badge-inbox').textContent = liveEmails.filter(e=>e.unread).length || '0';
document.getElementById('m-email').textContent = liveEmails.filter(e=>e.unread).length;
} catch(e) { console.warn('Gmail fetch failed', e); }
}

// ── Fetch Calendar ──
async function fetchEvents() {
try {
const now = new Date();
const end = new Date(now); end.setDate(end.getDate() + CONFIG.EVENT_DAYS_AHEAD);
const tmin = now.toISOString();
const tmax = end.toISOString();
const data = await gFetch(
`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${tmin}&timeMax=${tmax}&singleEvents=true&orderBy=startTime&maxResults=20`
);
liveEvents = (data.items||[]).map(ev => {
const start = ev.start?.dateTime || ev.start?.date;
const isAllDay = !ev.start?.dateTime;
const startD = new Date(start);
const dayLabel = getDayLabel(startD);
const timeStr = isAllDay ? 'All day' : startD.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
return {
id: ev.id, name: ev.summary || '(no title)',
time: timeStr, day: dayLabel,
detail: ev.location || (ev.attendees?.length ? `${ev.attendees.length} attendees` : 'Personal'),
color: calColor(ev.colorId),
allDay: isAllDay,
htmlLink: ev.htmlLink,
};
});
const todayEvents = liveEvents.filter(e => e.day === 'Today');
document.getElementById('m-events').textContent = todayEvents.length;
} catch(e) { console.warn('Calendar fetch failed', e); }
}

// ── Fetch Drive ──
async function fetchDrive() {
try {
const data = await gFetch(
`https://www.googleapis.com/drive/v3/files?pageSize=${CONFIG.DRIVE_FILES_COUNT}&orderBy=viewedByMeTime+desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)&q=trashed=false`
);
liveFiles = (data.files||[]).map(f => ({
id: f.id, name: f.name,
meta: 'Modified ' + relTime(f.modifiedTime),
icon: mimeIcon(f.mimeType),
iconBg: mimeBg(f.mimeType),
iconColor: mimeColor(f.mimeType),
url: f.webViewLink,
}));
} catch(e) { console.warn('Drive fetch failed', e); }
}

// ── Render all panels ──
function renderAll() {
renderOverview();
renderProjects();
renderInbox();
renderCalendar();
renderTasks();
renderDrive();
updateTaskBadge();
updateProjBadge();
}

function renderOverview() {
// Projects strip
document.getElementById('ov-projects').innerHTML = projects.length
? projects.map(renderProjStrip).join('')
: '<div class="empty-row">No projects yet — add one →</div>';
// Inbox
const emails = liveEmails.slice(0, 5);
document.getElementById('ov-inbox').innerHTML = emails.length
? emails.map(renderEmailRow).join('')
: '<div class="loading-row">'+skeletonRows(3)+'</div>';
// Calendar
const todayEvs = liveEvents.filter(e => e.day === 'Today');
document.getElementById('ov-cal').innerHTML = todayEvs.length
? todayEvs.map(renderCalRow).join('')
: liveEvents.length === 0
? skeletonCard(2)
: '<div class="empty-row">No events today.</div>';
// Tasks today
const todayTasks = tasks.filter(t => t.tag === 'today' && !t.done);
document.getElementById('ov-tasks-card').innerHTML = todayTasks.length
? todayTasks.map(t => renderTaskRow(t)).join('')
: '<div class="empty-row">No tasks due today.</div>';
// Metrics
document.getElementById('m-projects').textContent = projects.filter(p=>p.status!=='done').length;
document.getElementById('m-tasks').textContent = tasks.filter(t=>!t.done).length;
}

function renderProjects() {
document.getElementById('full-projects').innerHTML = projects.length
? projects.map(renderProjCard).join('')
: '<div class="empty-row" style="padding:2rem;color:var(--text3)">No projects yet. Hit "+ New project" to add one.</div>';
}

function renderInbox() {
document.getElementById('full-inbox').innerHTML = liveEmails.length
? liveEmails.map(renderEmailRow).join('')
: skeletonCard(8);
}

function renderCalendar() {
if (!liveEvents.length) { document.getElementById('full-cal').innerHTML = skeletonCard(5); return; }
const groups = {};
liveEvents.forEach(e => { if (!groups[e.day]) groups[e.day]=[]; groups[e.day].push(e); });
let html = '';
Object.keys(groups).forEach(day => {
html += `<div class="cal-day-header">${day}</div>` + groups[day].map(renderCalRow).join('');
});
document.getElementById('full-cal').innerHTML = html || '<div class="empty-row">No events this week.</div>';
}

function renderTasks(filter = activeFilt()) {
let list;
if (filter==='all') list = tasks;
else if (filter==='done') list = tasks.filter(t=>t.done);
else if (filter==='today') list = tasks.filter(t=>t.tag==='today'&&!t.done);
else if (filter==='week') list = tasks.filter(t=>t.tag==='week'&&!t.done);
document.getElementById('full-tasks').innerHTML = list.length
? list.map(renderTaskRow).join('')
: '<div class="empty-row">Nothing here.</div>';
}

function renderDrive() {
document.getElementById('full-drive').innerHTML = liveFiles.length
? liveFiles.map(renderDriveRow).join('')
: skeletonCard(6);
}

// ── Row renderers ──
function renderEmailRow(e) {
return `<div class="email-row" onclick="window.open('https://mail.google.com/mail/u/0/#inbox/${e.id}','_blank')">
${e.unread?'<div class="unread-dot"></div>':'<div class="read-gap"></div>'}
<div class="email-av" style="background:${e.avatarBg};color:${e.avatarColor}">${e.initials}</div>
<div class="email-body">
<div class="email-from">${esc(e.from)}</div>
<div class="email-subj">${esc(e.subject)}</div>
</div>
<div class="email-time">${e.time}</div>

  </div>`;
}

function renderCalRow(ev) {
return `<div class="cal-row" onclick="ev.htmlLink&&window.open(ev.htmlLink,'_blank')">
<div class="cal-time">${ev.time}</div>
<div class="cal-bar" style="background:${ev.color}"></div>
<div><div class="cal-name">${esc(ev.name)}</div><div class="cal-detail">${esc(ev.detail)}</div></div>

  </div>`;
}

function renderTaskRow(t) {
const tagClass = t.done?'tp-done':({today:'tp-today',week:'tp-week',someday:'tp-someday'}[t.tag]||'tp-someday');
const tagLabel = t.done?'Done':({today:'Today',week:'This week',someday:'Someday'}[t.tag]||t.tag);
return `<div class="task-row" id="tr-${t.id}">
<div class="tcheck ${t.done?'done':''}" onclick="toggleTask(${t.id})"></div>
<div class="task-txt ${t.done?'done':''}">${esc(t.text)}</div>
<span class="tpill ${tagClass}">${tagLabel}</span>

  </div>`;
}

function renderDriveRow(f) {
return `<div class="drive-row" onclick="window.open('${f.url}','_blank')">
<div class="drive-icon" style="background:${f.iconBg};color:${f.iconColor}">${f.icon}</div>
<div class="drive-name">${esc(f.name)}</div>
<div class="drive-meta">${f.meta}</div>

  </div>`;
}

function renderProjStrip(p) {
const lnk = p.links.map(l=>`<a class="ps-link" href="${l.url}" target="_blank">${esc(l.label)}</a>`).join('');
return `<div class="ps-card" style="border-left:3px solid ${p.color}" onclick="gotoPanel('projects')">
<div class="ps-top">
<div class="ps-av" style="background:${p.color}">${p.initials}</div>
<div class="ps-name">${esc(p.name)}</div>
<span class="status-pill ${spClass(p.status)}">${spLabel(p.status)}</span>
</div>
<div class="ps-desc">${esc(p.description)}</div>
<div class="ps-links">${lnk}</div>
<div class="ps-updated">Updated ${p.updated}</div>

  </div>`;
}

function renderProjCard(p) {
const lnk = p.links.map(l=>`<a class="pc-link" href="${l.url}" target="_blank">↗ ${esc(l.label)}</a>`).join('');
return `<div class="pc" style="border-left:4px solid ${p.color}">
<div class="pc-head">
<div class="pc-av" style="background:${p.color}">${p.initials}</div>
<div><div class="pc-name">${esc(p.name)}</div><span class="status-pill ${spClass(p.status)}">${spLabel(p.status)}</span></div>
</div>
<div class="pc-desc">${esc(p.description)}</div>
<div class="pc-links">${lnk}</div>
<div class="pc-foot">
<div class="pc-updated">Updated ${p.updated}</div>
<button class="pc-edit" onclick="editProject(${p.id})">Edit</button>
</div>

  </div>`;
}

// ── Tasks ──
function toggleTask(id) {
const t = tasks.find(t=>t.id===id);
if (!t) return;
t.done = !t.done;
saveTasks();
renderTasks();
renderOverview();
}

function addTask() {
const inp = document.getElementById('new-task-input');
const text = inp.value.trim();
if (!text) return;
tasks.push({ id: nextTaskId++, text, tag: 'today', done: false });
inp.value = '';
saveTasks();
renderTasks();
renderOverview();
}

function updateTaskBadge() {
const n = tasks.filter(t=>!t.done).length;
document.getElementById('badge-tasks').textContent = n;
document.getElementById('m-tasks').textContent = n;
}

// ── Projects ──
function updateProjBadge() {
document.getElementById('badge-projects').textContent = projects.filter(p=>p.status!=='done').length;
}

function openAddProject() {
editingProjId = null;
['pf-name','pf-desc','pf-url','pf-label'].forEach(id => document.getElementById(id).value = '');
document.getElementById('pf-status').value = 'active';
document.getElementById('proj-modal').style.display = 'flex';
}

function editProject(id) {
const p = projects.find(p=>p.id===id);
if (!p) return;
editingProjId = id;
document.getElementById('pf-name').value = p.name;
document.getElementById('pf-desc').value = p.description;
document.getElementById('pf-status').value = p.status;
document.getElementById('pf-url').value = p.links[0]?.url || '';
document.getElementById('pf-label').value = p.links[0]?.label || '';
document.getElementById('proj-modal').style.display = 'flex';
}

function closeAddProject() { document.getElementById('proj-modal').style.display = 'none'; }

const projColors = ['#5b4fe8','#1a9e75','#d85a30','#c07a12','#d4537e','#378add','#7c4fe8'];

function saveProject() {
const name   = document.getElementById('pf-name').value.trim();
if (!name) return;
const desc   = document.getElementById('pf-desc').value.trim();
const status = document.getElementById('pf-status').value;
const url    = document.getElementById('pf-url').value.trim();
const label  = document.getElementById('pf-label').value.trim();
const links  = url ? [{ label: label||'Open', url }] : [];

if (editingProjId) {
const p = projects.find(p=>p.id===editingProjId);
if (p) { p.name=name; p.description=desc; p.status=status; p.links=links; p.updated=today(); }
} else {
const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
const color = projColors[projects.length % projColors.length];
projects.push({ id: nextProjId++, name, description: desc||'No description.', status, updated: today(), links, color, initials });
}
saveProjects();
closeAddProject();
renderProjects();
renderOverview();
}

// ── Panel nav ──
function gotoPanel(name) {
document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
document.getElementById('panel-'+name).classList.add('active');
document.querySelector(`[data-panel="${name}"]`).classList.add('active');
}

document.querySelectorAll('.nav-btn').forEach(btn => {
btn.addEventListener('click', () => gotoPanel(btn.dataset.panel));
});

// ── Task filters ──
document.querySelectorAll('.filt').forEach(btn => {
btn.addEventListener('click', function(){
document.querySelectorAll('.filt').forEach(b=>b.classList.remove('active'));
this.classList.add('active');
renderTasks(this.dataset.f);
});
});

function activeFilt() {
return document.querySelector('.filt.active')?.dataset.f || 'all';
}

// ── AI Assistant ──
function aiPrompt(text) {
gotoPanel('assistant');
document.getElementById('ai-input').value = text;
document.getElementById('ai-input').focus();
}

function sendAIInput() {
const inp = document.getElementById('ai-input');
const text = inp.value.trim();
if (!text) return;
inp.value = '';
sendAI(text);
}

function sendAI(text) {
gotoPanel('assistant');
appendMsg(text, 'user');
setTimeout(() => appendMsg(aiReply(text), 'bot'), 500);
}

function appendMsg(text, role) {
const msgs = document.getElementById('ai-msgs');
const div = document.createElement('div');
div.className = `ai-msg ai-msg-${role} clearfix`;
div.innerHTML = `<div class="ai-bubble">${text}</div>`;
msgs.appendChild(div);
msgs.scrollTop = msgs.scrollHeight;
}

function aiReply(text) {
const t = text.toLowerCase();
if (t.includes('email') || t.includes('inbox')) {
const unread = liveEmails.filter(e=>e.unread);
if (!unread.length) return `Your inbox looks clear — no unread emails right now. Want me to help draft a new message?`;
return `You have <strong>${unread.length} unread emails</strong>. Most recent: <em>${esc(unread[0].from)}</em> — "${esc(unread[0].subject)}". Want me to draft a reply?`;
}
if (t.includes('project')) {
const list = projects.map(p=>`<strong>${esc(p.name)}</strong> (${spLabel(p.status)})`).join(', ');
return `You have ${projects.length} project${projects.length!==1?'s':''}: ${list}. Want to update any of them or break one into tasks?`;
}
if (t.includes('task') || t.includes('focus') || t.includes('today') || t.includes('prioritize')) {
const due = tasks.filter(t=>t.tag==='today'&&!t.done);
if (!due.length) return `No tasks due today — you're either all caught up or haven't added any yet. Want me to help you plan?`;
return `You have <strong>${due.length} task${due.length!==1?'s':''} due today</strong>: ${due.map(t=>`<em>${esc(t.text)}</em>`).join(', ')}. Want me to help prioritize or break any of them down?`;
}
if (t.includes('calendar') || t.includes('event') || t.includes('week') || t.includes('schedule') || t.includes('meeting')) {
const todayEvs = liveEvents.filter(e=>e.day==='Today');
if (!todayEvs.length) return `Your calendar looks clear today. Want me to help you block some focus time or add an event?`;
return `You have <strong>${todayEvs.length} event${todayEvs.length!==1?'s':''} today</strong>: ${todayEvs.map(e=>`<em>${esc(e.name)}</em> at ${e.time}`).join(', ')}. Want me to help with anything specific?`;
}
if (t.includes('drive') || t.includes('file') || t.includes('doc')) {
if (!liveFiles.length) return `No Drive files loaded yet — try hitting Refresh to sync your Drive.`;
return `Your most recently accessed file is <strong>${esc(liveFiles[0].name)}</strong>. You have ${liveFiles.length} recent files loaded. Want me to help find something specific?`;
}
if (t.includes('draft') || t.includes('write') || t.includes('compose') || t.includes('reply')) {
return `Sure — who are you writing to and what's the message? Give me a few details and I'll draft something clean for you.`;
}
return `I'm working with your live data from Gmail, Calendar, and Drive. Ask me about your emails, tasks, projects, events, or files and I'll give you a real answer based on what's loaded.`;
}

// ── Utilities ──
function today() {
return new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

function setDate() {
const d = new Date();
const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
document.getElementById('page-date').textContent = days[d.getDay()]+', '+months[d.getMonth()]+' '+d.getDate();
const h = d.getHours();
const name = CONFIG.YOUR_NAME || '';
document.getElementById('page-title').textContent = (h<12?'Good morning':h<17?'Good afternoon':'Good evening')+(name?', '+name:'');
}

function getDayLabel(d) {
const now = new Date(); now.setHours(0,0,0,0);
const t = new Date(d); t.setHours(0,0,0,0);
const diff = Math.round((t-now)/86400000);
if (diff===0) return 'Today';
if (diff===1) return 'Tomorrow';
return d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
}

function formatTime(ms) {
const d = new Date(ms), now = new Date();
const diff = now - d;
if (diff < 86400000 && d.getDate()===now.getDate()) return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
if (diff < 172800000) return 'Yesterday';
return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function relTime(iso) {
const d = new Date(iso), now = new Date(), diff = now - d;
if (diff < 3600000) return Math.round(diff/60000)+' min ago';
if (diff < 86400000) return Math.round(diff/3600000)+' hrs ago';
if (diff < 604800000) return Math.round(diff/86400000)+' days ago';
return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function strColor(str, bg) {
let h = 0;
for (let i=0;i<str.length;i++) h = str.charCodeAt(i) + ((h<<5)-h);
const hue = ((h % 360) + 360) % 360;
return bg ? `hsl(${hue},60%,92%)` : `hsl(${hue},60%,35%)`;
}

function calColor(id) {
const map = {'1':'#7986CB','2':'#33B679','3':'#8E24AA','4':'#E67C73','5':'#F6BF26','6':'#F4511E','7':'#039BE5','8':'#616161','9':'#3F51B5','10':'#0B8043','11':'#D50000'};
return map[id] || '#5b4fe8';
}

function mimeIcon(m) {
if (m.includes('spreadsheet')) return 'S';
if (m.includes('presentation')) return 'P';
if (m.includes('document')||m.includes('text')) return 'D';
if (m.includes('pdf')) return 'F';
if (m.includes('image')) return 'I';
return 'F';
}
function mimeBg(m) {
if (m.includes('spreadsheet')) return '#e1f5ee';
if (m.includes('presentation')) return '#faeeda';
if (m.includes('document')) return '#e8f0fe';
if (m.includes('pdf')) return '#fce8e6';
return '#f2f1ee';
}
function mimeColor(m) {
if (m.includes('spreadsheet')) return '#0f6e56';
if (m.includes('presentation')) return '#854f0b';
if (m.includes('document')) return '#1a73e8';
if (m.includes('pdf')) return '#d93025';
return '#5a5a5a';
}

function spClass(s) { return {active:'sp-active','in-progress':'sp-progress','on-hold':'sp-hold',done:'sp-done'}[s]||'sp-progress'; }
function spLabel(s) { return {active:'Active','in-progress':'In progress','on-hold':'On hold',done:'Done'}[s]||s; }

function esc(str) {
return String(str||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}

function skeletonRows(n) {
return Array.from({length:n},(_,i)=>`<div style="display:flex;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--border)"><div class="skeleton" style="width:28px;height:28px;border-radius:50%;flex-shrink:0"></div><div style="flex:1"><div class="skeleton" style="width:40%;margin-bottom:6px"></div><div class="skeleton" style="width:70%"></div></div></div>`).join('');
}
function skeletonCard(n) { return `<div>${skeletonRows(n)}</div>`; }

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND CENTRAL — APP.JS OPS PATCH
// Add this entire block to the bottom of app.js in command-central repo.
// Also: add fetchOpsBoard() call inside refreshAll() (see comment below).
// ─────────────────────────────────────────────────────────────────────────────

// ── Ops state ──
let liveOps = { agents: [], ceo_tasks: [], generated_at: null };

// ── Fetch ops board from cc-sync-api ──
async function fetchOpsBoard() {
  try {
    const r = await fetch(`${CONFIG.SYNC_API}/ops`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    liveOps = await r.json();
    renderOpsBoard();
    // Update badge: count red agents + P0 CEO tasks
    const red = (liveOps.agents || []).filter(a => a.status === 'red').length;
    const p0  = (liveOps.ceo_tasks || []).filter(t => t.priority === 'P0').length;
    const total = red + p0;
    document.getElementById('badge-ops').textContent = total || '—';
  } catch(e) {
    console.warn('Ops board fetch failed', e);
    document.getElementById('badge-ops').textContent = '!';
  }
}

// ── Render ops board ──
function renderOpsBoard() {
  renderCEOTasks();
  renderAgentGrid();
  if (liveOps.generated_at) {
    const d = new Date(liveOps.generated_at);
    document.getElementById('ops-sync-time').textContent =
      'Board: ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// ── CEO task rows ──
function renderCEOTasks() {
  const el = document.getElementById('ops-ceo-tasks');
  if (!el) return;
  const tasks = liveOps.ceo_tasks || [];
  if (!tasks.length) {
    el.innerHTML = '<div class="empty-row">No open CEO tasks.</div>';
    return;
  }
  el.innerHTML = tasks.map(t => {
    const pClass = `cp-${t.priority || 'P3'}`;
    return `
      <div class="ceo-row">
        <span class="ceo-p ${pClass}">${esc(t.priority || '—')}</span>
        <div style="flex:1">
          <div class="ceo-title">${esc(t.title)}</div>
          <div class="ceo-cat">${esc(t.category || '')} · ${esc(t.status || '')}</div>
          ${t.next_action ? `<div class="ceo-action">→ ${esc(t.next_action)}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── Agent status grid ──
function renderAgentGrid() {
  const el = document.getElementById('ops-agent-grid');
  if (!el) return;
  const agents = liveOps.agents || [];
  if (!agents.length) {
    el.innerHTML = '<div class="empty-row">No agent data yet.</div>';
    return;
  }
  el.innerHTML = agents.map(renderAgentCard).join('');
}

function renderAgentCard(agent) {
  const colors = {
    'main': '#5b4fe8',
    'shopify-coo': '#1a9e75',
    'marketing-cmo': '#d85a30',
    'marketing-designer': '#c07a12',
    'finance-cfo': '#3b82f6',
  };
  const initials = {
    'main': 'SA',
    'shopify-coo': 'PX',
    'marketing-cmo': 'MA',
    'marketing-designer': 'IR',
    'finance-cfo': 'CO',
  };
  const dotClass = agent.status === 'green' ? 'dot-green' : agent.status === 'red' ? 'dot-red' : 'dot-yellow';
  const bg = colors[agent.id] || '#5b4fe8';
  const init = initials[agent.id] || (agent.name || '?')[0].toUpperCase();

  return `
    <div class="agent-card">
      <div class="agent-head">
        <div class="agent-av" style="background:${bg}">${init}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px">
            <div class="agent-name">${esc(agent.name)}</div>
            <span class="status-dot ${dotClass}"></span>
          </div>
          <div class="agent-role">${esc(agent.role)}</div>
        </div>
      </div>
      <div class="agent-body">
        <div class="agent-row">
          <span class="agent-label">Focus</span>
          <span class="agent-val">${esc(agent.current_focus || 'Idle')}</span>
        </div>
        <div class="agent-row">
          <span class="agent-label">Next</span>
          <span class="agent-val">${esc(agent.next_priority_item || '—')}</span>
        </div>
        ${agent.blocked_item ? `
        <div class="agent-row">
          <span class="agent-label">Blocked</span>
          <span class="agent-val agent-blocked">${esc(agent.blocked_item)}</span>
        </div>` : ''}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION NOTE — also add fetchOpsBoard() to refreshAll() in app.js:
//
//  async function refreshAll() {
//    ...
//    await Promise.all([fetchEmails(), fetchEvents(), fetchDrive(), fetchOpsBoard()]);
//    ...
//  }
//
// And add it to showAppWithSampleData() call as well so it loads on first render:
//
//  function showAppWithSampleData() {
//    ...
//    renderAll();
//    fetchOpsBoard(); // ← add this line
//  }
// ─────────────────────────────────────────────────────────────────────────────
