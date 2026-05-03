/* home.js – VoteVision AI Home Page */

let allianceChart = null, partyChart = null;

document.addEventListener('DOMContentLoaded', () => {
  // Render switcher
  createElectionSwitcher('heroSwitcher');

  // Apply initial mode
  applyElectionMode(ElectionType.get());
  loadData();

  // React to switcher changes
  document.addEventListener('electionTypeChanged', (e) => {
    applyElectionMode(e.detail.type);
    loadData();
  });
});

function applyElectionMode(type) {
  const isAssembly = type === 'assembly';
  document.body.classList.toggle('assembly-mode', isAssembly);

  document.getElementById('heroLiveLabel').textContent = isAssembly
    ? '2026 Assembly Election Tracker' : 'AI-Powered Prediction Engine';
  document.getElementById('heroSubtitle').textContent = isAssembly
    ? 'Vidhan Sabha 2026' : 'Indian Democracy';
  document.getElementById('heroDesc').textContent = isAssembly
    ? 'AI-driven predictions for 6 major state assembly elections — West Bengal, Tamil Nadu, Kerala, Assam, Karnataka & Bihar.'
    : 'Harness the power of machine learning to forecast Lok Sabha 2024 outcomes with real-time swing analysis.';
  document.getElementById('chartSubtitle').textContent = isAssembly
    ? '2026 Assembly election seat projections.' : '2024 Lok Sabha seat distribution.';

  document.getElementById('assemblyInfoSection').classList.toggle('hidden', !isAssembly);
}

async function loadData() {
  showSpinner();
  try {
    const data = await api.getStats();
    const s = data.stats;
    animateCounter('totalConstituencies', s.total_constituencies);
    animateCounter('totalStates', s.total_states);
    animateCounter('totalCandidates', s.total_candidates);
    document.getElementById('avgTurnout').textContent = s.avg_turnout + '%';

    renderCharts(s.alliance_seats, s.party_seats);

    if (ElectionType.isAssembly() && s.election_info) {
      renderAssemblyInfo(s.election_info);
    }
  } catch {
    // Fallback
    const isAssembly = ElectionType.isAssembly();
    animateCounter('totalConstituencies', isAssembly ? 35 : 38);
    animateCounter('totalStates', isAssembly ? 6 : 17);
    animateCounter('totalCandidates', isAssembly ? 68 : 75);
    document.getElementById('avgTurnout').textContent = isAssembly ? '63.5%' : '55.8%';
    if (isAssembly) {
      renderCharts({ 'TMC-Alliance': 12, NDA: 8, 'INDIA-TN': 8, LDF: 5, UDF: 4, INDIA: 3 },
                   { TMC: 12, BJP: 8, DMK: 7, LDF: 5, INC: 5, RJD: 3 });
    } else {
      renderCharts({ NDA: 22, INDIA: 14, Other: 2 }, { BJP: 18, INC: 4, DMK: 2, TMC: 3, AIMIM: 1 });
    }
  }
  hideSpinner();
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

function renderCharts(allianceSeats, partySeats) {
  if (allianceChart) allianceChart.destroy();
  if (partyChart) partyChart.destroy();

  const aCtx = document.getElementById('allianceChart');
  const aLabels = Object.keys(allianceSeats), aValues = Object.values(allianceSeats);
  const aC = {
    NDA: '#FF6B00', INDIA: '#19AAED', 'TMC-Alliance': '#20C646',
    'INDIA-TN': '#E91E63', LDF: '#CC0000', UDF: '#19AAED',
    'AIADMK-NDA': '#FFC107', 'INC-JDS': '#19AAED', Other: '#8b5cf6'
  };
  allianceChart = new Chart(aCtx, {
    type: 'doughnut',
    data: { labels: aLabels, datasets: [{ data: aValues, backgroundColor: aLabels.map(l => aC[l] || '#6b7280'), borderWidth: 0, hoverOffset: 12 }] },
    options: { responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { family: 'Inter' } } } }, animation: { duration: 1200 } }
  });

  const pCtx = document.getElementById('partyChart');
  const pLabels = Object.keys(partySeats), pValues = Object.values(partySeats);
  partyChart = new Chart(pCtx, {
    type: 'bar',
    data: { labels: pLabels, datasets: [{ label: 'Seats', data: pValues, backgroundColor: pLabels.map(l => getPartyColor(l) + 'cc'), borderColor: pLabels.map(l => getPartyColor(l)), borderWidth: 1, borderRadius: 6 }] },
    options: { responsive: true, indexAxis: 'y', scales: { x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#94a3b8' } }, y: { grid: { display: false }, ticks: { color: '#f1f5f9', font: { weight: 600 } } } }, plugins: { legend: { display: false } }, animation: { duration: 1000 } }
  });
}

function renderAssemblyInfo(electionInfo) {
  const grid = document.getElementById('assemblyInfoGrid');
  if (!grid) return;
  const govtColors = { TMC: '#20C646', BJP: '#FF6B00', DMK: '#E91E63', LDF: '#CC0000', INC: '#19AAED', NDA: '#FF6B00' };
  grid.innerHTML = Object.entries(electionInfo).map(([state, info]) => {
    const c = govtColors[info.current_govt] || '#6b7280';
    return `<div class="election-info-card">
      <div class="state-name" style="color:${c}">${state}</div>
      <div class="state-meta">
        📅 ${info.election_due}<br>
        🪑 ${info.total_seats} Assembly Seats<br>
        🏛️ Current: <strong>${info.current_govt}</strong>
      </div>
      <div class="state-cm">👤 CM: ${info.cm}</div>
    </div>`;
  }).join('');
}
