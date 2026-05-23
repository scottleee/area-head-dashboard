// ═══════════════════════════════════════════════════════
// MAIN APP v3
// ═══════════════════════════════════════════════════════

function initApp() {
  setupNav();
  setupModals();
  setupCalendarNav();
  populateSettings();
  setupEventHandlers();
  renderPage('dashboard');
}

// ── Navigation ──
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('page-' + el.dataset.page).classList.add('active');
      renderPage(el.dataset.page);
    });
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabs = btn.closest('.tabs');
      const page = btn.closest('.page') || document.body;
      tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      page.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('tab-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}
window.navTo = function(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const ni = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (ni) ni.classList.add('active');
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  renderPage(page);
};

function renderPage(page) {
  const map = {
    dashboard: renderDashboard, calendar: renderCalendar, tasks: renderTasks,
    meetings: renderMeetings, rotations: renderRotations, gta: renderGTA,
    studio: renderStudio, students: renderStudents, faculty: renderFaculty,
    presentations: renderPresentations, admissions: renderAdmissions, settings: renderSettings
  };
  if (map[page]) map[page]();
}

// ── Modals ──
function setupModals() {
  window.closeModal = id => document.getElementById(id).classList.remove('open');
  window.openModal = id => document.getElementById(id).classList.add('open');
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
}
function setupCalendarNav() {
  document.getElementById('cal-prev').addEventListener('click', () => { calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()-1, 1); renderFullCal(); });
  document.getElementById('cal-next').addEventListener('click', () => { calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()+1, 1); renderFullCal(); });
}
function esc(s) { return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function semOpts() {
  const s = [];
  for (let y=2023; y<=2032; y++) s.push('Fall '+y, 'Spring '+(y+1), 'Summer '+(y+1));
  return s;
}
function compFaculty() { return STORE.people.filter(p => p.type==='faculty' && Array.isArray(p.areas) && p.areas.includes('Composition')); }
function students() { return STORE.people.filter(p => p.type==='student' && p.active !== false); }
function allStudents() { return STORE.people.filter(p => p.type==='student'); }

// ── Header ──
function updateHeader() {
  document.getElementById('sem-badge').textContent = STORE.settings.currentSemester;
  document.getElementById('today-badge').textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}

// ═══════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════
function renderDashboard() {
  updateHeader();
  const n = today();
  document.getElementById('dash-date-sub').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const upcoming = STORE.events.filter(e=>e.date>=n).length + STORE.meetings.filter(m=>m.date>=n).length;
  const dueRem = STORE.tasks.filter(t=>!t.done && t.due && t.due<=n).length;
  const activeAg = STORE.agendaItems.filter(a=>!a.done).length;
  document.getElementById('stat-row').innerHTML = `
    <div class="stat-box"><div class="sv">${students().length}</div><div class="sl">Active Students</div><div style="font-size:10px;color:var(--gray-400);margin-top:2px">${allStudents().length-students().length} alumni</div></div>
    <div class="stat-box gold"><div class="sv">${upcoming}</div><div class="sl">Upcoming Events</div></div>
    <div class="stat-box red"><div class="sv">${dueRem}</div><div class="sl">Due Tasks</div></div>
    <div class="stat-box green"><div class="sv">${activeAg}</div><div class="sl">Agenda Items</div></div>`;

  const allUpcoming = [
    ...STORE.events.filter(e=>e.date>=n).map(e=>({title:e.title,date:e.date,label:'Event'})),
    ...STORE.meetings.filter(m=>m.date>=n).map(m=>({title:'Faculty Meeting',date:m.date,label:'Meeting',time:m.time})),
  ].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
  const evEl = document.getElementById('upcoming-events-list');
  evEl.innerHTML = allUpcoming.length ? allUpcoming.map(e=>{
    const dt = new Date(e.date+'T00:00:00');
    return `<div class="event-item">
      <div class="event-date-block"><div class="eday">${dt.getDate()}</div><div class="emon">${dt.toLocaleString('en-US',{month:'short'})}</div></div>
      <div class="event-info"><div class="etitle">${e.title}</div><div class="emeta">${e.time||''} <span class="pill pill-gray" style="font-size:9px">${e.label}</span></div></div></div>`;
  }).join('') : '<div class="text-muted">No upcoming events.</div>';
  document.getElementById('badge-events').textContent = allUpcoming.length;

  const dueList = STORE.tasks.filter(t=>!t.done).sort((a,b)=>(a.due||'').localeCompare(b.due||'')).slice(0,6);
  const remEl = document.getElementById('upcoming-reminders-list');
  remEl.innerHTML = dueList.length ? dueList.map(t=>`
    <div class="reminder-item">
      <div class="reminder-urgency urg-${t.urg||'low'}"></div>
      <div style="flex:1"><div style="font-size:13px;font-weight:500">${t.title}</div><div class="text-muted">${t.due?fmtDate(t.due):''} · ${t.freq}</div></div>
    </div>`).join('') : '<div class="text-muted">All clear.</div>';
  document.getElementById('badge-reminders').textContent = dueList.length;

  const agItems = STORE.agendaItems.filter(a=>!a.done).slice(0,5);
  document.getElementById('badge-agenda').textContent = STORE.agendaItems.filter(a=>!a.done).length;
  document.getElementById('dash-agenda-preview').innerHTML = agItems.length ? agItems.map(a=>`
    <div class="agenda-item-row">
      <div class="ai-text">${a.text}<div class="ai-submitter">${a.submitter?'— '+a.submitter:''}</div></div>
      <span class="pill ${a.priority==='High'?'pill-red':a.priority==='Informational'?'pill-blue':'pill-gray'}">${a.priority}</span>
    </div>`).join('') : '<div class="text-muted">No active agenda items.</div>';
  renderMiniCal();
}

// ═══════════════════════════════════
// CALENDAR
// ═══════════════════════════════════
function renderCalendar() { renderFullCal(); renderEventsTable(); }

// ═══════════════════════════════════
// TASKS & REMINDERS (unified)
// ═══════════════════════════════════
function renderTasks() {
  const filter = document.getElementById('tasks-filter').value;
  let list = [...STORE.tasks];
  if (filter === 'pending') list = list.filter(t=>!t.done);
  else if (filter === 'done') list = list.filter(t=>t.done);
  else if (['Semester','Annual','Once'].includes(filter)) list = list.filter(t=>t.freq===filter);
  list.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  document.getElementById('tasks-tbody').innerHTML = list.map(t=>`<tr class="${t.done?'completed':''}">
    <td>${t.due?fmtDate(t.due):'—'}</td>
    <td><strong>${t.title}</strong>${t.notes?`<div class="text-muted" style="font-size:11px">${t.notes}</div>`:''}</td>
    <td><span class="pill pill-gray">${t.freq}</span></td>
    <td><span class="pill ${t.urg==='high'?'pill-red':t.urg==='med'?'pill-gold':'pill-green'}">${t.urg||'low'}</span></td>
    <td>${t.done?'<span class="pill pill-green">Done</span>':'<span class="pill pill-gold">Pending</span>'}</td>
    <td>${t.due?(t.gcalId?'<span class="pill pill-green" style="font-size:10px">✓ Synced</span>':`<button class="btn-gcal btn-xs" onclick="syncTaskToGcal('${t.id}')">Sync</button>`):'—'}</td>
    <td style="display:flex;gap:4px">
      <button class="btn btn-outline btn-xs" onclick="editTask('${t.id}')">✎</button>
      <button class="btn btn-outline btn-xs" onclick="toggleTask('${t.id}')">${t.done?'↩':'✓'}</button>
      <button class="btn btn-danger btn-xs" onclick="delTask('${t.id}')">✕</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="7" class="text-muted" style="padding:16px">No tasks.</td></tr>';
}
window.toggleTask = function(id) { const t=STORE.tasks.find(t=>t.id===id); if(t) t.done=!t.done; save(); renderTasks(); };
window.delTask = async function(id) {
  const t=STORE.tasks.find(t=>t.id===id);
  if(t&&t.gcalId) await calDeleteEvent(t.gcalId);
  STORE.tasks=STORE.tasks.filter(t=>t.id!==id); save(); renderTasks();
};
window.syncTaskToGcal = async function(id) {
  const t=STORE.tasks.find(t=>t.id===id); if(!t||!t.due) return;
  const gcalId = await calCreateReminder(t.title, t.due, t.notes, t.urg||'med');
  if(gcalId){t.gcalId=gcalId; save(); renderTasks();}
};
let _editTaskId = null;
window.editTask = function(id) {
  _editTaskId = id;
  const t = STORE.tasks.find(t=>t.id===id); if(!t) return;
  document.getElementById('modal-task-title').textContent = 'Edit Task';
  document.getElementById('task-title').value = t.title;
  document.getElementById('task-due').value = t.due||'';
  document.getElementById('task-urg').value = t.urg||'med';
  document.getElementById('task-freq').value = t.freq||'Once';
  document.getElementById('task-notes').value = t.notes||'';
  openModal('modal-task');
};

// ═══════════════════════════════════
// MEETINGS
// ═══════════════════════════════════
function renderMeetings() { renderMeetingsSchedule(); renderAgendaItems(); renderMeetingsArchive(); }
function renderMeetingsSchedule() {
  const upcoming = STORE.meetings.filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  document.getElementById('meetings-tbody').innerHTML = upcoming.map(m=>`<tr>
    <td>${fmtDate(m.date)}</td><td>${m.time||'—'}${m.timeEnd?' – '+m.timeEnd:''}</td>
    <td>${m.location||'—'}</td>
    <td>${m.remindDays} days before</td>
    <td>${m.generated?'<span class="pill pill-gray">Recurring</span>':'<span class="pill pill-blue">One-off</span>'}</td>
    <td>${m.gcalId?'<span class="pill pill-green" style="font-size:10px">✓ Synced</span>':`<button class="btn-gcal btn-xs" onclick="syncMeetingToGcal('${m.id}')">Sync</button>`}</td>
    <td style="display:flex;gap:4px">
      <button class="btn btn-danger btn-xs" onclick="delMeeting('${m.id}')">✕</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="7" class="text-muted" style="padding:16px">No upcoming meetings.</td></tr>';
}
window.syncMeetingToGcal = async function(id) {
  const m=STORE.meetings.find(m=>m.id===id); if(!m) return;
  const gcalId = await calCreateEvent('Faculty Meeting', m.date, m.time, m.timeEnd, m.notes||m.location, 'Meeting');
  if(gcalId){m.gcalId=gcalId; save(); renderMeetingsSchedule();}
};
window.delMeeting = async function(id) {
  const m=STORE.meetings.find(m=>m.id===id);
  if(m&&m.gcalId) await calDeleteEvent(m.gcalId);
  STORE.meetings=STORE.meetings.filter(m=>m.id!==id); save(); renderMeetingsSchedule();
};
function renderAgendaItems() {
  const active = STORE.agendaItems.filter(a=>!a.done);
  const done = STORE.agendaItems.filter(a=>a.done);
  const row = a=>`<div class="agenda-item-row">
    <input type="checkbox" ${a.done?'checked':''} onchange="toggleAgendaItem('${a.id}')">
    <div class="ai-text">${a.text}<div class="ai-submitter">${a.submitter?'— '+a.submitter:''}</div></div>
    <span class="pill ${a.priority==='High'?'pill-red':a.priority==='Informational'?'pill-blue':'pill-gray'}">${a.priority}</span>
    <button class="btn btn-danger btn-xs" onclick="delAgendaItem('${a.id}')">✕</button>
  </div>`;
  document.getElementById('agenda-active-list').innerHTML = active.length ? active.map(row).join('') : '<div class="text-muted">No active items.</div>';
  document.getElementById('agenda-completed-list').innerHTML = done.length ? done.map(row).join('') : '<div class="text-muted">None yet.</div>';
}
window.toggleAgendaItem = function(id){const a=STORE.agendaItems.find(a=>a.id===id); if(a) a.done=!a.done; save(); renderAgendaItems();};
window.delAgendaItem = function(id){STORE.agendaItems=STORE.agendaItems.filter(a=>a.id!==id); save(); renderAgendaItems();};
function renderMeetingsArchive() {
  const past = STORE.meetings.filter(m=>m.date<today()).sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('meetings-archive-list').innerHTML = past.length ? past.map(m=>`
    <div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">
      <strong>${fmtDate(m.date)}</strong> ${m.time||''} — ${m.location||''}
      ${m.minutes?`<div style="margin-top:6px;font-size:12px;background:var(--gray-100);padding:8px;border-radius:4px;white-space:pre-wrap">${m.minutes}</div>`:'<div class="text-muted" style="font-size:12px;margin-top:4px">No minutes attached.</div>'}
    </div>`).join('') : '<div class="text-muted">No past meetings.</div>';
}

// ═══════════════════════════════════
// ROTATIONS
// ═══════════════════════════════════
const ROT_2627=[
  {course:'MUC 1211 Comp Skills 1',fall:'Richards',spring:''},{course:'MUC 1212 Comp Skills 2',fall:'',spring:'Weiss'},
  {course:'MUC 2101 Comp Skills 3',fall:'Lee',spring:''},{course:'MUC 2102 Comp Skills 4',fall:'',spring:'TBD'},
  {course:'MUC 4313 Intro to Elec Music',fall:'Tovar-Henao',spring:''},{course:'MUC 4401 Comp of Elec Music',fall:'',spring:'Tovar-Henao'},
  {course:'MUC 5315 Intro to Elec Music (grad)',fall:'Tovar-Henao',spring:''},{course:'MUC 6444 Comp of Elec Music (grad)',fall:'',spring:'Tovar-Henao'},
  {course:'MUT 1001 Rudiments',fall:'GTA',spring:''},{course:'MUT 1111 Theory 1',fall:'Weiss',spring:''},{course:'MUT 1112 Theory 2',fall:'',spring:'Weiss'},
  {course:'MUT 1121 Theory 1 (spring)',fall:'',spring:'GTA'},{course:'MUT 1241L Aural Skills 1 (×4)',fall:'Lowe (×4)',spring:'GTA'},{course:'MUT 1242L Aural Skills 2 (×4)',fall:'',spring:'Lowe (×4)'},
  {course:'MUT 2116 Theory 3',fall:'Adams',spring:''},{course:'MUT 2117 Theory 4',fall:'',spring:'Adams'},{course:'MUT 2246L Aural Skills 3 (×3)',fall:'Hart (×3)',spring:''},{course:'MUT 2247L Aural Skills 4 (×3)',fall:'',spring:'Hart (×3)'},
  {course:'MUT 2641 Jazz Improvisation',fall:'Wilson',spring:''},{course:'MUT 2213L Commercial Aural 1',fall:'Pellegrin',spring:''},{course:'MUT 2215L Commercial Aural 2',fall:'',spring:'Pellegrin'},
  {course:'MUT 3321 Inst & Vocal Arr',fall:'Lee',spring:''},{course:'MUT 3611 Form & Analysis 1',fall:'Pellegrin',spring:''},{course:'MUT 3612 Form & Analysis 2',fall:'',spring:'Pellegrin'},
  {course:'MUT 4401 Counterpoint 1',fall:'Richards',spring:''},{course:'MUT 4402 Counterpoint 2',fall:'',spring:'Richards'},{course:'MUT 6051 Grad Theory Rev',fall:'Adams',spring:''},
  {course:'MUT 6445 Advanced Counterpoint',fall:'',spring:'Richards'},{course:'MUT 6565 19th/20th Styles',fall:'Weiss',spring:''},{course:'MUT 6576 Contemporary Styles',fall:'',spring:'Lee'},
  {course:'MUT 6629 Analytical Techniques',fall:'',spring:'Adams'},{course:'MUT 6936 Theory Seminar (fall)',fall:'Adams',spring:''},{course:'MUT 6936 Theory Seminar (spring)',fall:'',spring:'Pellegrin'},
  {course:'MUS 1360 Intro to Mus Tech',fall:'GTA',spring:'GTA (×2)'},
];
const ROT_2728=[
  {course:'MUC 1211 Comp Skills 1',fall:'Richards',spring:''},{course:'MUC 1212 Comp Skills 2',fall:'',spring:'Weiss'},
  {course:'MUC 2101 Comp Skills 3',fall:'Lee',spring:''},{course:'MUC 2102 Comp Skills 4',fall:'',spring:'TBD'},
  {course:'MUC 6445 Comp of EA/Dig 1',fall:'Tovar-Henao',spring:''},{course:'MUC 6446 Comp of EA/Dig 2',fall:'',spring:'Tovar-Henao'},
  {course:'MUT 1001 Rudiments',fall:'GTA',spring:''},{course:'MUT 1111 Theory 1',fall:'Weiss',spring:''},{course:'MUT 1112 Theory 2',fall:'',spring:'Weiss'},
  {course:'MUT 1121 Theory 1 (spring)',fall:'',spring:'GTA'},{course:'MUT 1241L Aural Skills 1 (×4)',fall:'Lowe (×4)',spring:'GTA'},{course:'MUT 1242L Aural Skills 2 (×4)',fall:'',spring:'Lowe (×4)'},
  {course:'MUT 2116 Theory 3',fall:'Adams',spring:''},{course:'MUT 2117 Theory 4',fall:'',spring:'Adams'},{course:'MUT 2246L Aural Skills 3 (×3)',fall:'Hart (×3)',spring:''},{course:'MUT 2247L Aural Skills 4 (×3)',fall:'',spring:'Hart (×3)'},
  {course:'MUT 2641 Jazz Improvisation',fall:'Wilson',spring:''},{course:'MUT 2213L Commercial Aural 1',fall:'Pellegrin',spring:''},{course:'MUT 2215L Commercial Aural 2',fall:'',spring:'Pellegrin'},
  {course:'MUT 3321 Inst & Vocal Arr',fall:'Lee',spring:''},{course:'MUT 3322 Scoring for Band & Orch',fall:'',spring:'Lee'},{course:'MUT 3611 Form & Analysis 1',fall:'Pellegrin',spring:''},{course:'MUT 3612 Form & Analysis 2',fall:'',spring:'Pellegrin'},
  {course:'MUT 4401 Counterpoint 1',fall:'Richards',spring:''},{course:'MUT 4402 Counterpoint 2',fall:'',spring:'Richards'},{course:'MUT 6051 Grad Theory Rev',fall:'Weiss',spring:''},
  {course:'MUT 6445 Advanced Counterpoint',fall:'',spring:'Richards'},{course:'MUT 6629 Analytical Techniques',fall:'',spring:'Adams'},{course:'MUT 6751 Pedagogy of Theory',fall:'Adams',spring:''},
  {course:'MUT 6936 Theory Seminar (fall)',fall:'Pellegrin',spring:''},{course:'MUT 6936 Theory Seminar (spring)',fall:'',spring:'Lee'},{course:'MUS 1360 Intro to Mus Tech (×2)',fall:'GTA (×2)',spring:'GTA (×2)'},
];
function rotRow(r){return `<tr><td><strong>${r.course}</strong></td>
  <td>${r.fall?`<span class="pill ${r.fall.includes('GTA')?'pill-gold':'pill-navy'}">${r.fall}</span>`:''}</td>
  <td>${r.spring?`<span class="pill ${r.spring.includes('GTA')?'pill-gold':'pill-navy'}">${r.spring}</span>`:''}</td></tr>`;}
function renderRotations() {
  document.getElementById('rot-2627-tbody').innerHTML = ROT_2627.map(rotRow).join('');
  document.getElementById('rot-2728-tbody').innerHTML = ROT_2728.map(rotRow).join('');
  renderScenarios();
}
function renderScenarios() {
  const el = document.getElementById('scenarios-list');
  if(!STORE.rotationScenarios.length){el.innerHTML='<div class="text-muted">No scenarios yet.</div>';return;}
  el.innerHTML=STORE.rotationScenarios.map(sc=>`
    <div class="card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <div style="font-family:'Playfair Display',serif;font-size:15px;font-weight:600">${sc.name}</div>
      <span class="text-muted">created ${fmtDate(sc.created)}</span><div class="spacer"></div>
      <button class="btn btn-danger btn-xs" onclick="delScenario('${sc.id}')">Delete</button>
    </div>${sc.notes?`<div class="text-muted mb-8">${sc.notes}</div>`:''}
    <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Course</th><th>Fall</th><th>Spring</th></tr></thead>
    <tbody>${sc.courses.map((r,i)=>`<tr><td><strong>${r.course}</strong></td>
      <td><input type="text" value="${esc(r.fall||'')}" style="width:140px;font-size:12px" onchange="updateScenarioCourse('${sc.id}',${i},'fall',this.value)"></td>
      <td><input type="text" value="${esc(r.spring||'')}" style="width:140px;font-size:12px" onchange="updateScenarioCourse('${sc.id}',${i},'spring',this.value)"></td>
    </tr>`).join('')}</tbody></table></div></div>`).join('');
}
window.delScenario=function(id){STORE.rotationScenarios=STORE.rotationScenarios.filter(s=>s.id!==id);save();renderScenarios();};
window.updateScenarioCourse=function(scId,idx,field,val){const sc=STORE.rotationScenarios.find(s=>s.id===scId);if(sc&&sc.courses[idx]){sc.courses[idx][field]=val;save();}};

// ═══════════════════════════════════
// GTA
// ═══════════════════════════════════
function renderGTA() {
  const sems=semOpts(), sel=document.getElementById('gta-sem-select');
  const cur=sel.value||STORE.settings.currentSemester;
  sel.innerHTML=sems.map(s=>`<option${s===cur?' selected':''}>${s}</option>`).join('');
  renderGTATable(); renderGTAHistory();
}
function renderGTATable() {
  const sem=document.getElementById('gta-sem-select').value||STORE.settings.currentSemester;
  const asgns=STORE.gtaAssignments.filter(a=>a.semester===sem);
  document.getElementById('gta-tbody').innerHTML=asgns.map(a=>`<tr>
    <td><strong>${a.gta}</strong></td><td>${a.course}</td><td>${a.hours}</td><td>${a.supervisor}</td>
    <td>${a.tor?'<span class="pill pill-gold">ToR</span>':''}</td>
    <td><button class="btn btn-danger btn-xs" onclick="delGTA('${a.id}')">✕</button></td>
  </tr>`).join('')||'<tr><td colspan="6" class="text-muted" style="padding:16px">No assignments.</td></tr>';
}
window.delGTA=function(id){STORE.gtaAssignments=STORE.gtaAssignments.filter(a=>a.id!==id);save();renderGTATable();};
function renderGTAHistory() {
  const sel=document.getElementById('gta-hist-filter');
  const names=[...new Set(STORE.gtaAssignments.map(a=>a.gta))].sort();
  const cur=sel.value;
  sel.innerHTML='<option value="">All</option>'+names.map(n=>`<option${n===cur?' selected':''}>${n}</option>`).join('');
  const list=(sel.value?STORE.gtaAssignments.filter(a=>a.gta===sel.value):[...STORE.gtaAssignments]).sort((a,b)=>a.semester.localeCompare(b.semester));
  document.getElementById('gta-hist-tbody').innerHTML=list.map(a=>`<tr>
    <td>${a.semester}</td><td><strong>${a.gta}</strong></td><td>${a.course}</td>
    <td>${a.hours}</td><td>${a.supervisor}</td><td>${a.tor?'<span class="pill pill-gold">ToR</span>':''}</td>
  </tr>`).join('')||'<tr><td colspan="6" class="text-muted" style="padding:16px">No history.</td></tr>';
}

// ═══════════════════════════════════
// STUDIO
// ═══════════════════════════════════
function renderStudio() {
  const sems=semOpts(),sel=document.getElementById('studio-sem-select');
  const cur=sel.value||STORE.settings.currentSemester;
  sel.innerHTML=sems.map(s=>`<option${s===cur?' selected':''}>${s}</option>`).join('');
  renderStudioTable(); renderStudioHistory();
}
function renderStudioTable() {
  const sem=document.getElementById('studio-sem-select').value||STORE.settings.currentSemester;
  const asgns=STORE.studioAssignments.filter(a=>a.semester===sem);
  const cf=compFaculty();
  const loadMap={};
  cf.forEach(f=>loadMap[f.name]={count:0,min:f.min||0,max:f.max||0});
  asgns.forEach(a=>{if(loadMap[a.faculty])loadMap[a.faculty].count++;});
  const loadHtml=cf.map(f=>{
    const v=loadMap[f.name]||{count:0,min:0,max:0};
    const color=v.max&&v.count>v.max?'var(--red)':v.count>=v.min?'var(--green)':'var(--gold)';
    return `<div style="display:inline-flex;align-items:center;gap:8px;background:var(--gray-100);border-radius:6px;padding:6px 12px;margin:4px">
      <strong style="font-size:13px">${f.name}</strong><span style="font-size:12px;color:${color};font-weight:600">${v.count}/${v.max||'?'}</span></div>`;
  }).join('');
  document.getElementById('studio-load-summary').innerHTML=`<div class="card-title">Faculty Load — ${sem}</div><div>${loadHtml||'<span class="text-muted">No composition faculty configured.</span>'}</div>`;
  document.getElementById('studio-tbody').innerHTML=asgns.map(a=>`<tr>
    <td><strong>${a.student}</strong></td>
    <td>${getStuDegree(a.student)}</td>
    <td>${a.faculty}</td><td>${a.isChair?'<span class="pill pill-gold">Chair</span>':''}</td>
    <td style="font-size:12px">${a.notes||''}</td>
    <td><button class="btn btn-danger btn-xs" onclick="delStudio('${a.id}')">✕</button></td>
  </tr>`).join('')||'<tr><td colspan="6" class="text-muted" style="padding:16px">No assignments.</td></tr>';
}
function getStuDegree(name){const s=STORE.people.find(p=>p.name===name&&p.type==='student');return s?s.degree:'';}
window.delStudio=function(id){STORE.studioAssignments=STORE.studioAssignments.filter(a=>a.id!==id);save();renderStudioTable();};
function renderStudioHistory() {
  const sel=document.getElementById('studio-hist-filter');
  const names=[...new Set(STORE.studioAssignments.map(a=>a.student))].sort();
  const cur=sel.value;
  sel.innerHTML='<option value="">All</option>'+names.map(n=>`<option${n===cur?' selected':''}>${n}</option>`).join('');
  const list=(sel.value?STORE.studioAssignments.filter(a=>a.student===sel.value):[...STORE.studioAssignments]).sort((a,b)=>a.semester.localeCompare(b.semester));
  document.getElementById('studio-hist-tbody').innerHTML=list.map(a=>`<tr>
    <td>${a.semester}</td><td><strong>${a.student}</strong></td><td>${a.faculty}</td>
    <td>${a.isChair?'<span class="pill pill-gold">Chair</span>':''}</td>
  </tr>`).join('')||'<tr><td colspan="4" class="text-muted" style="padding:16px">No history.</td></tr>';
}

// ═══════════════════════════════════
// STUDENTS
// ═══════════════════════════════════
function renderStudents() {
  // Active roster
  const degs = STORE.degrees;
  document.getElementById('stu-deg-filter').innerHTML='<option value="">All degrees</option>'+degs.map(d=>`<option>${d}</option>`).join('');
  const search=(document.getElementById('stu-search').value||'').toLowerCase();
  const degF=document.getElementById('stu-deg-filter').value;
  const list=students().filter(s=>(!search||s.name.toLowerCase().includes(search))&&(!degF||s.degree===degF));
  document.getElementById('students-tbody').innerHTML=list.map(s=>`<tr class="person-row" onclick="openPersonModal('${s.id}')">
    <td><strong>${s.name}</strong></td><td><span class="pill pill-navy">${s.degree||''}</span></td>
    <td>${s.entry||'—'}</td><td>${s.grad||'—'}</td><td>${s.chair||'—'}</td>
    <td>${s.status?`<span class="pill pill-blue" style="font-size:10px">${s.status}</span>`:''}</td>
    <td>${s.hours>0?s.hours:''}</td>
    <td><button class="btn btn-outline btn-xs" onclick="event.stopPropagation();openPersonModal('${s.id}')">✎ Edit</button></td>
  </tr>`).join('')||'<tr><td colspan="8" class="text-muted" style="padding:16px">No active students.</td></tr>';
  // Alumni roster
  renderAlumni();
}

function renderAlumni() {
  const degs = STORE.degrees;
  document.getElementById('alumni-deg-filter').innerHTML='<option value="">All degrees</option>'+degs.map(d=>`<option>${d}</option>`).join('');
  const search=(document.getElementById('alumni-search').value||'').toLowerCase();
  const degF=document.getElementById('alumni-deg-filter').value;
  const exitF=document.getElementById('alumni-exit-filter').value;
  const list=allStudents().filter(s=>s.active===false)
    .filter(s=>(!search||s.name.toLowerCase().includes(search))&&(!degF||s.degree===degF)&&(!exitF||s.exitType===exitF))
    .sort((a,b)=>(b.exitYear||'').localeCompare(a.exitYear||''));
  document.getElementById('alumni-tbody').innerHTML=list.map(s=>`<tr class="person-row" onclick="openPersonModal('${s.id}')">
    <td><strong>${s.name}</strong></td>
    <td><span class="pill pill-gray">${s.degree||''}</span></td>
    <td>${s.entry||'—'}</td>
    <td>${s.exitYear||'—'}</td>
    <td>${s.exitType?`<span class="pill ${s.exitType==='Graduated'?'pill-green':s.exitType==='Left Program'?'pill-red':'pill-gray'}">${s.exitType}</span>`:'—'}</td>
    <td>${s.chair||'—'}</td>
    <td><button class="btn btn-outline btn-xs" onclick="event.stopPropagation();openPersonModal('${s.id}')">✎ Edit</button></td>
  </tr>`).join('')||'<tr><td colspan="7" class="text-muted" style="padding:16px">No alumni records.</td></tr>';
}

// ═══════════════════════════════════
// FACULTY
// ═══════════════════════════════════
function renderFaculty() {
  const areaF=document.getElementById('fac-area-filter').value;
  const list=STORE.people.filter(p=>p.type==='faculty'&&(!areaF||( Array.isArray(p.areas)&&p.areas.includes(areaF))));
  document.getElementById('faculty-tbody').innerHTML=list.map(f=>{
    const areas=(f.areas||[]).map(a=>`<span class="area-tag area-${a==='Composition'?'comp':a==='Theory'?'theory':'aural'}">${a}</span>`).join('');
    const currentLoad=STORE.studioAssignments.filter(a=>a.faculty===f.name&&a.semester===STORE.settings.currentSemester).length;
    return `<tr class="person-row" onclick="openPersonModal('${f.id}')">
      <td><strong>${f.name}</strong></td><td>${f.title||''}</td><td>${areas}</td>
      <td>${f.areas&&f.areas.includes('Composition')?`<span style="font-size:12px">${currentLoad}/${f.max||'?'} (${STORE.settings.currentSemester})</span>`:''}</td>
      <td style="font-size:12px;max-width:200px">${f.notes||''}</td>
      <td><button class="btn btn-outline btn-xs" onclick="event.stopPropagation();openPersonModal('${f.id}')">✎ Edit</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="6" class="text-muted" style="padding:16px">No faculty.</td></tr>';
}

// ═══════════════════════════════════
// PERSON MODAL (shared student/faculty)
// ═══════════════════════════════════
window.openPersonModal = function(id) {
  const p = id ? STORE.people.find(p=>p.id===id) : null;
  const type = p ? p.type : (id === 'new-student' ? 'student' : 'faculty');
  const isActive = !p || p.active !== false;
  document.getElementById('person-id').value = p ? p.id : '';
  document.getElementById('person-type').value = type;
  const alumniTag = p&&p.active===false ? ' 🎓 Alumni' : '';
  document.getElementById('modal-person-title').textContent = p ? `Edit ${p.name}${alumniTag}` : (type==='student'?'Add Student':'Add Faculty');
  document.getElementById('btn-delete-person').style.display = p ? 'inline-flex' : 'none';
  document.getElementById('person-student-fields').style.display = type==='student' ? 'block' : 'none';
  document.getElementById('person-faculty-fields').style.display = type==='faculty' ? 'block' : 'none';

  // Active/inactive toggle button (students only)
  const toggleBtn = document.getElementById('btn-toggle-active');
  if (p && type==='student') {
    toggleBtn.style.display = 'inline-flex';
    if (isActive) {
      toggleBtn.textContent = '🎓 Graduate / Deactivate';
      toggleBtn.className = 'btn btn-outline btn-sm';
    } else {
      toggleBtn.textContent = '↩ Reactivate';
      toggleBtn.className = 'btn btn-gold btn-sm';
    }
  } else {
    toggleBtn.style.display = 'none';
  }

  // Exit fields (alumni only)
  const exitFields = document.getElementById('person-exit-fields');
  exitFields.style.display = (p && type==='student' && !isActive) ? 'block' : 'none';

  // populate degree select
  document.getElementById('person-degree').innerHTML = STORE.degrees.map(d=>`<option${p&&p.degree===d?' selected':''}>${d}</option>`).join('');
  if (type==='student') {
    document.getElementById('person-name').value = p?p.name:'';
    document.getElementById('person-entry').value = p?p.entry||'':'';
    document.getElementById('person-grad').value = p?p.grad||'':'';
    document.getElementById('person-status').value = p?p.status||'':'';
    document.getElementById('person-chair').value = p?p.chair||'':'';
    document.getElementById('person-hours').value = p?p.hours||0:0;
    document.getElementById('person-fellow').value = p&&p.fellow?'1':'0';
    document.getElementById('person-notes').value = p?p.notes||'':'';
    document.getElementById('person-exit-year').value = p?p.exitYear||'':'';
    document.getElementById('person-exit-type').value = p?p.exitType||'Graduated':'Graduated';
  } else {
    document.getElementById('fac-name-p').value = p?p.name:'';
    document.getElementById('fac-title-p').value = p?p.title||'':'';
    document.getElementById('fac-area-comp').checked = p&&p.areas&&p.areas.includes('Composition');
    document.getElementById('fac-area-theory').checked = p&&p.areas&&p.areas.includes('Theory');
    document.getElementById('fac-area-aural').checked = p&&p.areas&&p.areas.includes('Aural Skills');
    document.getElementById('fac-min-p').value = p?p.min||0:0;
    document.getElementById('fac-max-p').value = p?p.max||8:8;
    document.getElementById('person-notes').value = p?p.notes||'':'';
  }
  openModal('modal-person');
};

// ═══════════════════════════════════
// PRESENTATIONS
// ═══════════════════════════════════
function renderPresentations() {
  const semSel=document.getElementById('pres-sem-filter'),stuSel=document.getElementById('pres-stu-filter');
  const sems=[...new Set(STORE.presentations.map(p=>p.semester))].sort();
  const curSem=semSel.value,curStu=stuSel.value;
  semSel.innerHTML='<option value="">All</option>'+sems.map(s=>`<option${s===curSem?' selected':''}>${s}</option>`).join('');
  stuSel.innerHTML='<option value="">All</option>'+allStudents().map(s=>`<option${s.name===curStu?' selected':''}>${s.name}</option>`).join('');
  let list=[...STORE.presentations];
  if(semSel.value) list=list.filter(p=>p.semester===semSel.value);
  if(stuSel.value) list=list.filter(p=>p.student===stuSel.value);
  list.sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('pres-tbody').innerHTML=list.map(p=>`<tr>
    <td>${fmtDate(p.date)}</td><td>${p.semester}</td><td><strong>${p.student}</strong></td>
    <td style="font-size:12px">${p.notes||''}</td>
    <td><button class="btn btn-danger btn-xs" onclick="delPres('${p.id}')">✕</button></td>
  </tr>`).join('')||'<tr><td colspan="5" class="text-muted" style="padding:16px">No presentations logged.</td></tr>';
}
window.delPres=function(id){STORE.presentations=STORE.presentations.filter(p=>p.id!==id);save();renderPresentations();};

// ═══════════════════════════════════
// ADMISSIONS
// ═══════════════════════════════════
const ADM_STAGES=['Under Review','Shortlisted','Interview Scheduled','Interviewed','DMA Form Needed','Offer Extended','Admitted','Declined'];
function renderAdmissions() {
  document.getElementById('app-degree').innerHTML=STORE.degrees.map(d=>`<option>${d}</option>`).join('');
  const cycSel=document.getElementById('adm-cycle-sel');
  cycSel.innerHTML=STORE.admCycles.map(c=>`<option value="${c.id}"${c.id===STORE.settings.currentAdmCycle?' selected':''}>${c.name}</option>`).join('');
  renderAdmKanban(); renderAdmTable();
  // DMA form visibility
  updateDMAVisibility();
}
function updateDMAVisibility() {
  const deg=document.getElementById('app-degree').value;
  document.getElementById('dma-form-row').style.display=deg==='DMA'?'flex':'none';
}
function renderAdmKanban() {
  const apps=STORE.applicants.filter(a=>a.cycle===STORE.settings.currentAdmCycle);
  document.getElementById('adm-kanban').innerHTML=ADM_STAGES.map(stage=>{
    const inStage=apps.filter(a=>a.stage===stage);
    return `<div style="min-width:140px;flex-shrink:0">
      <div style="background:var(--navy);color:var(--white);font-size:10px;font-weight:600;letter-spacing:.5px;padding:5px 8px;border-radius:4px 4px 0 0;text-align:center">${stage}</div>
      <div style="background:var(--gray-100);border:1px solid var(--gray-200);border-top:none;min-height:60px;padding:5px;border-radius:0 0 4px 4px">
        ${inStage.map(a=>`<div style="background:var(--white);border:1px solid var(--gray-200);border-radius:4px;padding:5px 7px;margin-bottom:5px;cursor:pointer" onclick="editApplicant('${a.id}')">
          <div style="font-size:12px;font-weight:600">${a.name}</div><div style="font-size:10px;color:var(--gray-400)">${a.degree}</div></div>`).join('')}
      </div></div>`;
  }).join('');
}
function renderAdmTable() {
  const apps=STORE.applicants.filter(a=>a.cycle===STORE.settings.currentAdmCycle);
  document.getElementById('adm-tbody').innerHTML=apps.map(a=>`<tr>
    <td><strong>${a.name}</strong></td><td><span class="pill pill-navy">${a.degree}</span></td>
    <td><select style="font-size:12px" onchange="updateApplicantStage('${a.id}',this.value)">
      ${ADM_STAGES.map(s=>`<option${s===a.stage?' selected':''}>${s}</option>`).join('')}</select></td>
    <td>${a.focus||''}</td>
    <td>${a.degree==='DMA'&&a.dma?`<span class="pill pill-gold">${a.dma}</span>`:''}</td>
    <td style="max-width:200px"><div style="font-size:12px">${a.notes||''}</div></td>
    <td style="display:flex;gap:4px">
      <button class="btn btn-outline btn-xs" onclick="editApplicant('${a.id}')">✎</button>
      <button class="btn btn-danger btn-xs" onclick="delApplicant('${a.id}')">✕</button>
    </td>
  </tr>`).join('')||'<tr><td colspan="7" class="text-muted" style="padding:16px">No applicants in this cycle.</td></tr>';
}
window.updateApplicantStage=function(id,stage){const a=STORE.applicants.find(a=>a.id===id);if(a){a.stage=stage;save();renderAdmissions();}};
window.delApplicant=function(id){STORE.applicants=STORE.applicants.filter(a=>a.id!==id);save();renderAdmissions();};
window.editApplicant=function(id) {
  const a=STORE.applicants.find(a=>a.id===id); if(!a) return;
  document.getElementById('modal-app-title').textContent='Edit Applicant';
  document.getElementById('app-id').value=a.id;
  document.getElementById('app-degree').innerHTML=STORE.degrees.map(d=>`<option${d===a.degree?' selected':''}>${d}</option>`).join('');
  document.getElementById('app-name').value=a.name;
  document.getElementById('app-focus').value=a.focus||'';
  document.getElementById('app-stage').value=a.stage;
  document.getElementById('app-dma').value=a.dma||'';
  document.getElementById('app-notes').value=a.notes||'';
  updateDMAVisibility();
  openModal('modal-applicant');
};

// ═══════════════════════════════════
// SETTINGS
// ═══════════════════════════════════
function renderSettings() {
  const sems=semOpts();
  const semSel=document.getElementById('setting-current-sem');
  semSel.innerHTML=sems.map(s=>`<option${s===STORE.settings.currentSemester?' selected':''}>${s}</option>`).join('');
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const startSel=document.getElementById('setting-ay-start');
  const endSel=document.getElementById('setting-ay-end');
  startSel.innerHTML=months.map((m,i)=>`<option value="${i+1}"${i+1===STORE.settings.academicYearStart?' selected':''}>${m}</option>`).join('');
  endSel.innerHTML=months.map((m,i)=>`<option value="${i+1}"${i+1===STORE.settings.academicYearEnd?' selected':''}>${m}</option>`).join('');
  const mr=STORE.settings.meetingRecurrence;
  document.getElementById('setting-mr-enabled').value=mr.enabled?'1':'0';
  document.getElementById('setting-mr-dow').value=mr.dayOfWeek;
  document.getElementById('setting-mr-occ').value=mr.weekOccurrence;
  document.getElementById('setting-mr-time').value=mr.time||'';
  document.getElementById('setting-mr-timeend').value=mr.timeEnd||'';
  document.getElementById('setting-mr-loc').value=mr.location||'';
  document.getElementById('setting-mr-remdays').value=mr.agendaReminderDays||7;
  renderDegreesList();
  updateHeader();
}
function renderDegreesList() {
  document.getElementById('degrees-list').innerHTML=STORE.degrees.map((d,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--gray-100)">
      <span class="pill pill-navy">${d}</span><div class="spacer"></div>
      ${i>=6?`<button class="btn btn-danger btn-xs" onclick="removeDegree(${i})">✕</button>`:''}
    </div>`).join('');
}
window.removeDegree=function(i){STORE.degrees.splice(i,1);save();renderDegreesList();};

// ═══════════════════════════════════
// SETTINGS POPULATION
// ═══════════════════════════════════
function populateSettings() { updateHeader(); }

// ═══════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════
function setupEventHandlers() {

  // Calendar events
  document.getElementById('btn-add-event').addEventListener('click',()=>openModal('modal-event'));
  document.getElementById('btn-save-event').addEventListener('click',async()=>{
    const title=document.getElementById('ev-title').value.trim();
    const date=document.getElementById('ev-date').value;
    if(!title||!date) return showToast('Title and date required.','error');
    const time=document.getElementById('ev-time').value, timeEnd=document.getElementById('ev-time-end').value;
    const cat=document.getElementById('ev-cat').value, notes=document.getElementById('ev-notes').value;
    const gcalId=await calCreateEvent(title,date,time,timeEnd,notes,cat);
    STORE.events.push({id:uid(),title,date,time,timeEnd,cat,notes,gcalId});
    save(); closeModal('modal-event');
    ['ev-title','ev-date','ev-time','ev-time-end','ev-notes'].forEach(f=>document.getElementById(f).value='');
    renderCalendar();
  });
  window.delEvent=async function(id){
    const e=STORE.events.find(e=>e.id===id);
    if(e&&e.gcalId) await calDeleteEvent(e.gcalId);
    STORE.events=STORE.events.filter(e=>e.id!==id);save();renderCalendar();
  };

  // Tasks
  document.getElementById('btn-add-task').addEventListener('click',()=>{
    _editTaskId=null;
    document.getElementById('modal-task-title').textContent='Add Task / Reminder';
    ['task-title','task-due','task-notes'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('task-urg').value='med';
    document.getElementById('task-freq').value='Once';
    openModal('modal-task');
  });
  document.getElementById('btn-save-task').addEventListener('click',async()=>{
    const title=document.getElementById('task-title').value.trim();
    if(!title) return showToast('Title required.','error');
    const due=document.getElementById('task-due').value;
    const urg=document.getElementById('task-urg').value;
    const freq=document.getElementById('task-freq').value;
    const notes=document.getElementById('task-notes').value;
    if(_editTaskId) {
      const t=STORE.tasks.find(t=>t.id===_editTaskId);
      if(t){Object.assign(t,{title,due,urg,freq,notes});}
    } else {
      const gcalId=due?await calCreateReminder(title,due,notes,urg):null;
      STORE.tasks.push({id:uid(),title,due,urg,freq,notes,done:false,gcalId});
    }
    save(); closeModal('modal-task'); _editTaskId=null; renderTasks();
  });
  document.getElementById('tasks-filter').addEventListener('change',renderTasks);
  document.getElementById('btn-reset-tasks').addEventListener('click',()=>{
    if(confirm('Reset all recurring tasks to Pending for a new semester?')){
      STORE.tasks.filter(t=>t.freq!=='Once').forEach(t=>{t.done=false;});save();renderTasks();
    }
  });

  // Meetings
  document.getElementById('btn-add-meeting').addEventListener('click',()=>openModal('modal-meeting'));
  document.getElementById('btn-save-meeting').addEventListener('click',async()=>{
    const date=document.getElementById('mtg-date').value;
    if(!date) return showToast('Date required.','error');
    const time=document.getElementById('mtg-time').value, timeEnd=document.getElementById('mtg-time-end').value;
    const location=document.getElementById('mtg-location').value;
    const remindDays=parseInt(document.getElementById('mtg-remind-days').value)||7;
    const notes=document.getElementById('mtg-notes').value;
    const gcalId=await calCreateEvent('Faculty Meeting',date,time,timeEnd,notes||location,'Meeting');
    STORE.meetings.push({id:uid(),date,time,timeEnd,location,remindDays,notes,gcalId,generated:false,minutes:''});
    const remDate=new Date(date+'T00:00:00'); remDate.setDate(remDate.getDate()-remindDays);
    const remDateStr=remDate.toISOString().slice(0,10);
    const remGcalId=await calCreateReminder('Solicit agenda items for meeting on '+fmtDate(date),remDateStr,'','med');
    STORE.tasks.push({id:uid(),title:'Solicit agenda items for meeting on '+fmtDate(date),due:remDateStr,urg:'med',freq:'Once',notes:'',done:false,gcalId:remGcalId});
    save(); closeModal('modal-meeting');
    ['mtg-date','mtg-time','mtg-time-end','mtg-location','mtg-notes'].forEach(f=>document.getElementById(f).value='');
    renderMeetings(); renderTasks();
  });
  document.getElementById('btn-generate-meetings').addEventListener('click',()=>{
    const yearStr=prompt('Generate meetings for academic year starting in (enter year, e.g. 2026):','2026');
    const year=parseInt(yearStr);
    if(!year||isNaN(year)) return;
    autoGenerateMeetings(year, false);
    save(); renderMeetings();
    showToast('Meetings generated from recurrence rule.','success');
  });

  // Agenda
  document.getElementById('btn-add-agenda-item').addEventListener('click',()=>openModal('modal-agenda'));
  document.getElementById('btn-save-agenda').addEventListener('click',()=>{
    const text=document.getElementById('ai-text').value.trim();
    if(!text) return showToast('Description required.','error');
    STORE.agendaItems.push({id:uid(),text,submitter:document.getElementById('ai-submitter').value,priority:document.getElementById('ai-priority').value,done:false,date:today()});
    save(); closeModal('modal-agenda');
    ['ai-text','ai-submitter'].forEach(f=>document.getElementById(f).value='');
    renderAgendaItems();
  });
  document.getElementById('btn-export-agenda').addEventListener('click',()=>{
    const active=STORE.agendaItems.filter(a=>!a.done);
    const high=active.filter(a=>a.priority==='High'),normal=active.filter(a=>a.priority==='Normal'),info=active.filter(a=>a.priority==='Informational');
    let text='UF COMPOSITION & THEORY AREA — FACULTY MEETING AGENDA\nDate: ___________________\n\n';
    if(high.length){text+='HIGH PRIORITY\n';high.forEach((a,i)=>{text+=`${i+1}. ${a.text}`+(a.submitter?` (${a.submitter})`:'');text+='\n';});text+='\n';}
    if(normal.length){text+='AGENDA ITEMS\n';normal.forEach((a,i)=>{text+=`${i+1}. ${a.text}`+(a.submitter?` (${a.submitter})`:'');text+='\n';});text+='\n';}
    if(info.length){text+='FOR INFORMATION\n';info.forEach((a,i)=>{text+=`${i+1}. ${a.text}`+(a.submitter?` (${a.submitter})`:'');text+='\n';});}
    const blob=new Blob([text],{type:'text/plain'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Agenda_'+today()+'.txt';a.click();
  });

  // Rotations
  document.getElementById('btn-new-scenario').addEventListener('click',()=>openModal('modal-scenario'));
  document.getElementById('btn-save-scenario').addEventListener('click',()=>{
    const name=document.getElementById('sc-name').value.trim();
    if(!name) return showToast('Name required.','error');
    const base=document.getElementById('sc-base').value;
    const courses=(base==='26/27'?ROT_2627:base==='27/28'?ROT_2728:[]).map(r=>({...r}));
    STORE.rotationScenarios.push({id:uid(),name,notes:document.getElementById('sc-notes').value,courses,created:today()});
    save(); closeModal('modal-scenario'); renderScenarios();
  });

  // GTA
  document.getElementById('gta-sem-select').addEventListener('change',renderGTATable);
  document.getElementById('gta-hist-filter').addEventListener('change',renderGTAHistory);
  document.getElementById('btn-add-gta').addEventListener('click',()=>{
    const sel=document.getElementById('gta-name-sel');
    sel.innerHTML=students().filter(s=>s.hours>0).map(s=>`<option>${s.name}</option>`).join('');
    document.getElementById('gta-sem-inp').value=document.getElementById('gta-sem-select').value||STORE.settings.currentSemester;
    openModal('modal-gta');
  });
  document.getElementById('btn-save-gta').addEventListener('click',()=>{
    const course=document.getElementById('gta-course').value.trim();
    if(!course) return showToast('Course required.','error');
    STORE.gtaAssignments.push({id:uid(),gta:document.getElementById('gta-name-sel').value,semester:document.getElementById('gta-sem-inp').value,course,hours:parseInt(document.getElementById('gta-hours').value)||0,supervisor:document.getElementById('gta-super').value,tor:document.getElementById('gta-tor').value==='1'});
    save(); closeModal('modal-gta');
    ['gta-course','gta-super'].forEach(f=>document.getElementById(f).value='');
    renderGTATable();
  });

  // Studio
  document.getElementById('studio-sem-select').addEventListener('change',renderStudioTable);
  document.getElementById('studio-hist-filter').addEventListener('change',renderStudioHistory);
  document.getElementById('btn-add-studio').addEventListener('click',()=>{
    document.getElementById('stu-sel-studio').innerHTML=students().map(s=>`<option>${s.name}</option>`).join('');
    document.getElementById('fac-sel-studio').innerHTML=compFaculty().map(f=>`<option>${f.name}</option>`).join('');
    document.getElementById('studio-sem-inp').value=document.getElementById('studio-sem-select').value||STORE.settings.currentSemester;
    openModal('modal-studio');
  });
  document.getElementById('btn-save-studio').addEventListener('click',()=>{
    const student=document.getElementById('stu-sel-studio').value;
    const faculty=document.getElementById('fac-sel-studio').value;
    const sem=document.getElementById('studio-sem-inp').value;
    const isChair=document.getElementById('studio-chair-sel').value==='1';
    STORE.studioAssignments.push({id:uid(),student,faculty,semester:sem,isChair,notes:document.getElementById('studio-notes').value});
    if(isChair){const stu=STORE.people.find(p=>p.name===student&&p.type==='student');if(stu)stu.chair=faculty;}
    save(); closeModal('modal-studio'); document.getElementById('studio-notes').value=''; renderStudioTable();
  });

  // Students
  document.getElementById('stu-search').addEventListener('input',renderStudents);
  document.getElementById('stu-deg-filter').addEventListener('change',renderStudents);
  document.getElementById('alumni-search').addEventListener('input',renderAlumni);
  document.getElementById('alumni-deg-filter').addEventListener('change',renderAlumni);
  document.getElementById('alumni-exit-filter').addEventListener('change',renderAlumni);
  document.getElementById('btn-add-student').addEventListener('click',()=>openPersonModal('new-student'));

  // Faculty
  document.getElementById('fac-area-filter').addEventListener('change',renderFaculty);
  document.getElementById('btn-add-faculty').addEventListener('click',()=>openPersonModal('new-faculty'));

  // Person modal — graduate/deactivate/reactivate toggle
  document.getElementById('btn-toggle-active').addEventListener('click',()=>{
    const id=document.getElementById('person-id').value;
    if(!id) return;
    const p=STORE.people.find(p=>p.id===id);
    if(!p) return;
    const isActive = p.active !== false;
    if(isActive) {
      // Deactivating — ask for exit info first
      const exitType=document.getElementById('person-exit-type').value||'Graduated';
      const exitYear=document.getElementById('person-exit-year').value||new Date().getFullYear().toString();
      p.active=false;
      p.exitType=exitType;
      p.exitYear=exitYear;
      // Also save any notes they may have edited
      p.notes=document.getElementById('person-notes').value;
      save(); closeModal('modal-person');
      renderStudents();
      showToast(`${p.name} moved to Alumni.`,'success');
    } else {
      // Reactivating
      p.active=true;
      p.exitType='';
      p.exitYear='';
      save(); closeModal('modal-person');
      renderStudents();
      showToast(`${p.name} reactivated as current student.`,'success');
    }
  });

  // Person modal save
  document.getElementById('btn-save-person').addEventListener('click',()=>{
    const id=document.getElementById('person-id').value;
    const type=document.getElementById('person-type').value;
    let p=id?STORE.people.find(p=>p.id===id):null;
    if(!p){p={id:uid(),type,active:true};STORE.people.push(p);}
    if(type==='student'){
      p.name=document.getElementById('person-name').value.trim();
      p.degree=document.getElementById('person-degree').value;
      p.entry=document.getElementById('person-entry').value;
      p.grad=document.getElementById('person-grad').value;
      p.status=document.getElementById('person-status').value;
      p.chair=document.getElementById('person-chair').value;
      p.hours=parseInt(document.getElementById('person-hours').value)||0;
      p.fellow=document.getElementById('person-fellow').value==='1';
      // Preserve exit info if already set
      if(p.active===false){
        p.exitYear=document.getElementById('person-exit-year').value;
        p.exitType=document.getElementById('person-exit-type').value;
      }
    } else {
      p.name=document.getElementById('fac-name-p').value.trim();
      p.title=document.getElementById('fac-title-p').value;
      p.areas=[];
      if(document.getElementById('fac-area-comp').checked) p.areas.push('Composition');
      if(document.getElementById('fac-area-theory').checked) p.areas.push('Theory');
      if(document.getElementById('fac-area-aural').checked) p.areas.push('Aural Skills');
      p.min=parseInt(document.getElementById('fac-min-p').value)||0;
      p.max=parseInt(document.getElementById('fac-max-p').value)||0;
    }
    p.notes=document.getElementById('person-notes').value;
    if(!p.name){showToast('Name required.','error');return;}
    save(); closeModal('modal-person');
    type==='student'?renderStudents():renderFaculty();
  });
  document.getElementById('btn-delete-person').addEventListener('click',()=>{
    const id=document.getElementById('person-id').value;
    if(!id||!confirm('Permanently delete this person? All their data will be lost.\n\nConsider using "Graduate / Deactivate" instead to preserve their history.')) return;
    STORE.people=STORE.people.filter(p=>p.id!==id);
    save(); closeModal('modal-person');
    const type=document.getElementById('person-type').value;
    type==='student'?renderStudents():renderFaculty();
  });

  // Presentations
  document.getElementById('pres-sem-filter').addEventListener('change',renderPresentations);
  document.getElementById('pres-stu-filter').addEventListener('change',renderPresentations);
  document.getElementById('btn-add-pres').addEventListener('click',()=>{
    document.getElementById('pres-student').innerHTML=students().map(s=>`<option>${s.name}</option>`).join('');
    document.getElementById('pres-date').value=today();
    openModal('modal-pres');
  });
  document.getElementById('btn-save-pres').addEventListener('click',()=>{
    const date=document.getElementById('pres-date').value;
    const sem=document.getElementById('pres-sem').value.trim();
    if(!date||!sem) return showToast('Date and semester required.','error');
    STORE.presentations.push({id:uid(),student:document.getElementById('pres-student').value,date,semester:sem,notes:document.getElementById('pres-notes').value});
    save(); closeModal('modal-pres');
    ['pres-sem','pres-notes'].forEach(f=>document.getElementById(f).value='');
    renderPresentations();
  });

  // Admissions
  document.getElementById('adm-cycle-sel').addEventListener('change',function(){STORE.settings.currentAdmCycle=this.value;save();renderAdmissions();});
  document.getElementById('btn-add-adm-cycle').addEventListener('click',()=>{
    const name=prompt('New admissions cycle name (e.g. 2027-28 Admissions):');
    if(!name) return;
    const id=uid(); STORE.admCycles.push({id,name,notes:''});
    STORE.settings.currentAdmCycle=id; save(); renderAdmissions();
  });
  document.getElementById('btn-add-applicant').addEventListener('click',()=>{
    document.getElementById('modal-app-title').textContent='Add Applicant';
    document.getElementById('app-id').value='';
    document.getElementById('app-degree').innerHTML=STORE.degrees.map(d=>`<option>${d}</option>`).join('');
    ['app-name','app-focus','app-notes'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('app-dma').value='';
    updateDMAVisibility();
    openModal('modal-applicant');
  });
  document.getElementById('app-degree').addEventListener('change',updateDMAVisibility);
  document.getElementById('btn-save-applicant').addEventListener('click',()=>{
    const name=document.getElementById('app-name').value.trim();
    if(!name) return showToast('Name required.','error');
    const id=document.getElementById('app-id').value;
    const degree=document.getElementById('app-degree').value;
    const data={name,degree,stage:document.getElementById('app-stage').value,focus:document.getElementById('app-focus').value,dma:degree==='DMA'?document.getElementById('app-dma').value:'',notes:document.getElementById('app-notes').value,cycle:STORE.settings.currentAdmCycle};
    if(id){const a=STORE.applicants.find(a=>a.id===id);if(a)Object.assign(a,data);}
    else STORE.applicants.push({id:uid(),...data});
    save(); closeModal('modal-applicant'); renderAdmissions();
  });

  // Settings
  document.getElementById('btn-save-semester').addEventListener('click',()=>{
    STORE.settings.currentSemester=document.getElementById('setting-current-sem').value;
    save(); updateHeader(); showToast('Current semester updated.','success');
  });
  document.getElementById('btn-save-ay').addEventListener('click',()=>{
    STORE.settings.academicYearStart=parseInt(document.getElementById('setting-ay-start').value);
    STORE.settings.academicYearEnd=parseInt(document.getElementById('setting-ay-end').value);
    save(); showToast('Academic year bounds saved.','success');
  });
  document.getElementById('btn-save-mr').addEventListener('click',()=>{
    const mr=STORE.settings.meetingRecurrence;
    mr.enabled=document.getElementById('setting-mr-enabled').value==='1';
    mr.dayOfWeek=parseInt(document.getElementById('setting-mr-dow').value);
    mr.weekOccurrence=parseInt(document.getElementById('setting-mr-occ').value);
    mr.time=document.getElementById('setting-mr-time').value;
    mr.timeEnd=document.getElementById('setting-mr-timeend').value;
    mr.location=document.getElementById('setting-mr-loc').value;
    mr.agendaReminderDays=parseInt(document.getElementById('setting-mr-remdays').value)||7;
    save(); showToast('Recurrence rule saved. Go to Meetings → Generate from Recurrence Rule to apply.','success');
  });
  document.getElementById('btn-add-degree').addEventListener('click',()=>{
    const val=document.getElementById('new-degree').value.trim();
    if(!val||STORE.degrees.includes(val)) return;
    STORE.degrees.push(val); save(); document.getElementById('new-degree').value=''; renderDegreesList();
  });
}

// ═══════════════════════════════════
// MOBILE NAV
// ═══════════════════════════════════
window.toggleSidebar = function() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const isOpen = sb.classList.contains('open');
  sb.classList.toggle('open', !isOpen);
  ov.classList.toggle('open', !isOpen);
  document.body.style.overflow = !isOpen ? 'hidden' : '';
};
window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  document.body.style.overflow = '';
};

window.bnavTo = function(page) {
  closeSidebar();
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.bnav-item[data-page="${page}"]`);
  if (btn) btn.classList.add('active');
  navTo(page);
};

// Keep bottom nav in sync when sidebar nav is used
const _origNavTo = window.navTo;
window.navTo = function(page) {
  _origNavTo(page);
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.bnav-item[data-page="${page}"]`);
  if (btn) btn.classList.add('active');
  closeSidebar();
};
