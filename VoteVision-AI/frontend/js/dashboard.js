/* dashboard.js */
let dAllianceChart = null, dPartyChart = null;

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('dashSwitcher');
  applyMode(ElectionType.get());
  loadDashboard();

  document.addEventListener('electionTypeChanged', (e) => {
    applyMode(e.detail.type);
    loadDashboard();
  });
});

function applyMode(type) {
  const isAssembly = type === 'assembly';
  document.body.classList.toggle('assembly-mode', isAssembly);
  document.getElementById('dashSubtitle').textContent = isAssembly
    ? 'Real-time analytics from the 2026 State Assembly Election dataset.'
    : 'Real-time analytics from the 2024 General Election dataset.';
  document.getElementById('allianceChartTitle').textContent = isAssembly
    ? '🏆 Alliance Seat Share (Assembly)' : '🏆 Alliance Seat Share (Lok Sabha)';
  document.getElementById('assemblyInfoPanel').classList.toggle('hidden', !isAssembly);
}

async function loadDashboard() {
  showSpinner();
  try {
    const [statsRes, modelRes] = await Promise.allSettled([api.getStats(), api.getModelInfo()]);
    if (statsRes.status === 'fulfilled') renderDashboard(statsRes.value.stats);
    else fallbackStats();
    if (modelRes.status === 'fulfilled') renderModelInfo(modelRes.value.model_info);
    else document.getElementById('modelInfo').textContent = 'Model info unavailable – train the model first.';
  } catch { fallbackStats(); }
  hideSpinner();
}

function fallbackStats() {
  const isAssembly = ElectionType.isAssembly();
  document.getElementById('dConstituencies').textContent = isAssembly ? '35' : '38';
  document.getElementById('dStates').textContent = isAssembly ? '6' : '17';
  document.getElementById('dCandidates').textContent = isAssembly ? '68' : '75';
  document.getElementById('dTurnout').textContent = isAssembly ? '63.5%' : '55.8%';
}

function renderDashboard(s) {
  document.getElementById('dConstituencies').textContent = s.total_constituencies;
  document.getElementById('dStates').textContent = s.total_states;
  document.getElementById('dCandidates').textContent = s.total_candidates;
  document.getElementById('dTurnout').textContent = s.avg_turnout + '%';

  /* Destroy old charts before redraw */
  if (dAllianceChart) { dAllianceChart.destroy(); dAllianceChart = null; }
  if (dPartyChart) { dPartyChart.destroy(); dPartyChart = null; }

  /* Alliance doughnut */
  const aLabels = Object.keys(s.alliance_seats), aValues = Object.values(s.alliance_seats);
  const aC = {
    NDA: '#FF6B00', INDIA: '#19AAED', 'TMC-Alliance': '#20C646',
    'INDIA-TN': '#E91E63', LDF: '#CC0000', UDF: '#19AAED',
    'AIADMK-NDA': '#FFC107', 'INC-JDS': '#19AAED', Other: '#8b5cf6'
  };
  dAllianceChart = new Chart(document.getElementById('dashAlliance'), {
    type: 'doughnut',
    data: { labels: aLabels, datasets: [{ data: aValues, backgroundColor: aLabels.map(l => aC[l] || '#6b7280'), borderWidth: 0, hoverOffset: 10 }] },
    options: { responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 14, font: { family: 'Inter' } } } }, animation: { duration: 1200 } }
  });

  /* Party bar */
  const pLabels = Object.keys(s.party_seats), pValues = Object.values(s.party_seats);
  dPartyChart = new Chart(document.getElementById('dashParty'), {
    type: 'bar',
    data: { labels: pLabels, datasets: [{ label: 'Seats', data: pValues, backgroundColor: pLabels.map(l => getPartyColor(l) + 'cc'), borderColor: pLabels.map(l => getPartyColor(l)), borderWidth: 1, borderRadius: 6 }] },
    options: { responsive: true, scales: { x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#94a3b8' } }, y: { grid: { display: false }, ticks: { color: '#f1f5f9', font: { weight: 600 } } } }, plugins: { legend: { display: false } }, indexAxis: 'y', animation: { duration: 1000 } }
  });

  /* State table */
  const tbody = document.getElementById('stateTableBody');
  tbody.innerHTML = '';
  Object.entries(s.state_stats).sort((a, b) => b[1].constituencies - a[1].constituencies).forEach(([state, info]) => {
    const leading = Object.entries(info.party_wins || {}).sort((a, b) => b[1] - a[1])[0];
    const leadParty = leading ? leading[0] : '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${state}</td><td>${info.constituencies}</td><td>${info.avg_turnout}%</td><td><span class="party-tag" style="background:${getPartyColor(leadParty)}22;color:${getPartyColor(leadParty)}"><span class="party-dot" style="background:${getPartyColor(leadParty)}"></span>${leadParty}</span></td>`;
    tbody.appendChild(tr);
  });

  /* Assembly schedule cards */
  if (ElectionType.isAssembly() && s.election_info) {
    renderAssemblyPanel(s.election_info);
  }
}

function renderAssemblyPanel(electionInfo) {
  const grid = document.getElementById('assemblyInfoGrid');
  if (!grid) return;
  const govtColors = { TMC: '#20C646', BJP: '#FF6B00', DMK: '#E91E63', LDF: '#CC0000', INC: '#19AAED', NDA: '#FF6B00' };
  grid.innerHTML = Object.entries(electionInfo).map(([state, info]) => {
    const c = govtColors[info.current_govt] || '#6b7280';
    return `<div class="election-info-card">
      <div class="state-name" style="color:${c}">${state}</div>
      <div class="state-meta">📅 ${info.election_due} &nbsp;|&nbsp; 🪑 ${info.total_seats} seats<br>🏛️ Ruling: <strong>${info.current_govt}</strong></div>
      <div class="state-cm">👤 CM: ${info.cm}</div>
    </div>`;
  }).join('');
}

function renderModelInfo(info) {
  const el = document.getElementById('modelInfo');
  if (!info) { el.textContent = 'Model not loaded.'; return; }
  const acc = info.cv_accuracy ? (info.cv_accuracy * 100).toFixed(1) : 'N/A';
  const f1 = info.cv_f1 ? (info.cv_f1 * 100).toFixed(1) : 'N/A';
  el.innerHTML = `
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1rem">
      <div class="stat-card"><div class="stat-icon green">✓</div><div class="stat-info"><h3>${acc}%</h3><p>CV Accuracy</p></div></div>
      <div class="stat-card"><div class="stat-icon blue">📐</div><div class="stat-info"><h3>${f1}%</h3><p>F1 Score</p></div></div>
      <div class="stat-card"><div class="stat-icon purple">🧠</div><div class="stat-info"><h3>${info.model_type || 'RF'}</h3><p>Model Type</p></div></div>
    </div>`;
}
