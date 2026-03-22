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

const statusLabel = { active:'Active', 'in-progress':'In progress', 'on-hold':'On hold', done:'Done' };

window.showConnectModal = function() { document.getElementById('connect-modal').style.display='flex'; };
window.hideConnectModal = function() { document.getElementById('connect-modal').style.display='none'; };

