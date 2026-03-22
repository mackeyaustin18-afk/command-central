// ── Date & greeting ──
(function() {
  const d = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('page-date').textContent =
    days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
  const h = d.getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('page-title').textContent = greet;
})();

// ── State ──
let tasks = DATA.tasks.map(t => ({...t}));
let projects = DATA.projects.map(p => ({...p, links: [...p.links]}));
let nextProjectId = projects.length + 1;

// ── Helpers ──
const statusLabel = { active:'Active', 'in-progress':'In progress', 'on-hold':'On hold', done:'Done' };
const statusClass = { active:'status-active', 'in-progress':'status-in-progress', 'on-hold':'status-on-hold', done:'status-done' }; Object.keys(window._fd).length