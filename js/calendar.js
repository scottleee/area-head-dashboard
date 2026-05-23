// ═══════════════════════════════════════════════════════
// CALENDAR RENDERING
// ═══════════════════════════════════════════════════════

let miniCalDate = new Date();
let calViewDate = new Date();

function renderMiniCal() {
  const el = document.getElementById('mini-cal');
  if (!el) return;
  const y = miniCalDate.getFullYear(), m = miniCalDate.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = today();
  const eventDays = new Set(
    STORE.events
      .filter(e => e.date && e.date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`))
      .map(e => parseInt(e.date.slice(8)))
  );
  const monthName = miniCalDate.toLocaleString('en-US', { month:'long', year:'numeric' });

  let html = `<div class="mini-cal-header">
    <button class="btn btn-outline btn-xs" onclick="miniCalNav(-1)">‹</button>
    <span>${monthName}</span>
    <button class="btn btn-outline btn-xs" onclick="miniCalNav(1)">›</button>
  </div><div class="mini-cal-grid">`;

  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => html += `<div class="day-label">${d}</div>`);
  for (let i = 0; i < firstDay; i++) html += `<div class="day other-month"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cls = (ds === todayStr ? 'today' : '') + (eventDays.has(d) ? ' has-event' : '');
    html += `<div class="day ${cls}">${d}</div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

window.miniCalNav = function(dir) {
  miniCalDate = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() + dir, 1);
  renderMiniCal();
};

function renderFullCal() {
  const y = calViewDate.getFullYear(), m = calViewDate.getMonth();
  document.getElementById('cal-month-label').textContent =
    calViewDate.toLocaleString('en-US', { month:'long', year:'numeric' });

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = today();

  // Aggregate all dated items
  const allItems = [
    ...STORE.events.map(e => ({ ...e, _type:'event' })),
    ...STORE.reminders.filter(r => !r.done).map(r => ({ ...r, title:'🔔 '+r.title, _type:'reminder' })),
    ...STORE.recurringTasks.filter(r => !r.done && r.due).map(r => ({ ...r, date:r.due, title:'♻ '+r.title, _type:'recurring' })),
    ...STORE.meetings.map(m => ({ ...m, title:'📋 Faculty Meeting', cat:'Meeting', _type:'meeting' }))
  ];

  const byDay = {};
  allItems.forEach(e => {
    if (e.date && e.date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)) {
      const d = parseInt(e.date.slice(8));
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(e);
    }
  });

  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d =>
    html += `<div style="background:var(--navy);color:var(--white);padding:6px;text-align:center;font-size:11px;font-weight:600;letter-spacing:.5px">${d}</div>`
  );
  for (let i = 0; i < firstDay; i++)
    html += `<div style="background:var(--gray-100);min-height:80px;border:1px solid var(--gray-200)"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === todayStr;
    const evs = byDay[d] || [];
    html += `<div style="min-height:80px;border:1px solid var(--gray-200);padding:5px;background:${isToday?'var(--gold-pale)':'var(--white)'}">
      <div style="font-size:12px;font-weight:${isToday?'700':'400'};color:${isToday?'var(--navy)':'var(--gray-600)'}">${d}</div>
      ${evs.slice(0,3).map(e => `<div style="font-size:10px;background:var(--navy);color:var(--white);border-radius:3px;padding:1px 4px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.title}</div>`).join('')}
      ${evs.length > 3 ? `<div style="font-size:9px;color:var(--gray-400)">+${evs.length-3} more</div>` : ''}
    </div>`;
  }
  html += '</div>';
  document.getElementById('full-cal-grid').innerHTML = html;
}

function renderEventsTable() {
  const sorted = [...STORE.events].sort((a, b) => a.date.localeCompare(b.date));
  document.getElementById('events-tbody').innerHTML = sorted.map(e => `<tr>
    <td>${fmtDate(e.date)}</td>
    <td><strong>${e.title}</strong>${e.time ? ' <span class="text-muted">'+e.time+'</span>' : ''}</td>
    <td><span class="pill pill-gray">${e.cat}</span></td>
    <td>${e.gcalId
      ? `<span class="pill pill-green" style="font-size:10px">✓ Synced</span>`
      : `<button class="btn-gcal btn-xs" onclick="syncEventToGcal('${e.id}')">Sync to GCal</button>`
    }</td>
    <td><button class="btn btn-danger btn-xs" onclick="delEvent('${e.id}')">✕</button></td>
  </tr>`).join('') || '<tr><td colspan="5" class="text-muted" style="padding:16px">No events yet.</td></tr>';
}

window.syncEventToGcal = async function(id) {
  const e = STORE.events.find(e => e.id === id);
  if (!e) return;
  const gcalId = await calCreateEvent(e.title, e.date, e.time, e.timeEnd, e.notes, e.cat);
  if (gcalId) { e.gcalId = gcalId; save(); renderEventsTable(); }
};
