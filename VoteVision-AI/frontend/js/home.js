/* home.js – VoteVision AI Home Page */

let allianceChart = null;
let partyChart = null;

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('heroSwitcher');
  applyElectionMode(ElectionType.get());
  loadData();

  document.addEventListener('electionTypeChanged', (e) => {
    applyElectionMode(e.detail.type);
    loadData();
  });
});

function applyElectionMode(type) {
  const isAssembly = type === 'assembly';
  document.body.classList.toggle('assembly-mode', isAssembly);

  const heroLiveLabel = document.getElementById('heroLiveLabel');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const heroDesc = document.getElementById('heroDesc');
  const chartSubtitle = document.getElementById('chartSubtitle');
  const assemblySection = document.getElementById('assemblyInfoSection');

  if (heroLiveLabel) {
    heroLiveLabel.textContent = isAssembly
      ? '2026 Vidhan Sabha Assembly Tracker'
      : 'Explainable Election Intelligence & Forecasting';
  }
  if (heroSubtitle) {
    heroSubtitle.textContent = isAssembly
      ? 'Vidhan Sabha 2026'
      : 'Indian Democracy';
  }
  if (heroDesc) {
    heroDesc.textContent = isAssembly
      ? 'Machine learning election forecasting for upcoming state assembly elections across West Bengal, Tamil Nadu, Kerala, Assam, Karnataka & Bihar.'
      : 'Harness the power of machine learning and political analytics to forecast 2024 Lok Sabha outcomes with real-time swing analysis and demographic modeling.';
  }
  if (chartSubtitle) {
    chartSubtitle.textContent = isAssembly
      ? '2026 State Assembly seat projections and alliance distributions.'
      : '2024 Lok Sabha seat distribution across parliamentary alliances.';
  }
  if (assemblySection) {
    assemblySection.classList.toggle('hidden', !isAssembly);
  }
}

async function loadData() {
  showSpinner();
  try {
    const data = await api.getStats();
    const s = data.stats;

    animateCounter('totalConstituencies', s.total_constituencies || 0);
    animateCounter('totalStates', s.total_states || 0);
    animateCounter('totalCandidates', s.total_candidates || 0);
    const turnoutEl = document.getElementById('avgTurnout');
    if (turnoutEl) turnoutEl.textContent = `${s.avg_turnout || 0}%`;

    renderCharts(s.alliance_seats || {}, s.party_seats || {});
    renderBattlegrounds(s.battlegrounds || []);

    if (ElectionType.isAssembly() && s.election_info) {
      renderAssemblyInfo(s.election_info);
    }
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    showToast('Failed to load election data. Please check backend server.', 'error');
  } finally {
    hideSpinner();
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 25);
}

function renderCharts(allianceSeats, partySeats) {
  if (allianceChart) {
    allianceChart.destroy();
    allianceChart = null;
  }
  if (partyChart) {
    partyChart.destroy();
    partyChart = null;
  }

  const aCtx = document.getElementById('allianceChart');
  if (aCtx) {
    const aLabels = Object.keys(allianceSeats);
    const aValues = Object.values(allianceSeats);
    const allianceColorMap = {
      NDA: '#FF6B00',
      INDIA: '#19AAED',
      'TMC-Alliance': '#20C646',
      'INDIA-TN': '#E91E63',
      LDF: '#CC0000',
      UDF: '#19AAED',
      'AIADMK-NDA': '#FFC107',
      'INC-JDS': '#19AAED',
      Other: '#8b5cf6'
    };

    allianceChart = new Chart(aCtx, {
      type: 'doughnut',
      data: {
        labels: aLabels,
        datasets: [{
          data: aValues,
          backgroundColor: aLabels.map(l => allianceColorMap[l] || '#64748b'),
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', padding: 14, font: { family: 'Inter', size: 12 } }
          }
        },
        animation: { duration: 1000 }
      }
    });
  }

  const pCtx = document.getElementById('partyChart');
  if (pCtx) {
    const pLabels = Object.keys(partySeats);
    const pValues = Object.values(partySeats);

    partyChart = new Chart(pCtx, {
      type: 'bar',
      data: {
        labels: pLabels,
        datasets: [{
          label: 'Seats',
          data: pValues,
          backgroundColor: pLabels.map(l => getPartyColor(l) + 'cc'),
          borderColor: pLabels.map(l => getPartyColor(l)),
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', stepSize: 2 }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#f1f5f9', font: { weight: 600 } }
          }
        },
        plugins: { legend: { display: false } },
        animation: { duration: 1000 }
      }
    });
  }
}

function renderBattlegrounds(battlegrounds) {
  const grid = document.getElementById('battlegroundGrid');
  if (!grid) return;

  if (!battlegrounds || battlegrounds.length === 0) {
    grid.innerHTML = '<div class="card" style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No battleground seats recorded.</div>';
    return;
  }

  grid.innerHTML = battlegrounds.slice(0, 3).map(b => {
    const color = getPartyColor(b.party);
    return `
      <div class="card animate-in">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <div>
            <h3 style="font-size: 1.15rem; margin-bottom: 0.2rem;">${b.constituency}</h3>
            <span style="font-size: 0.85rem; color: var(--text-secondary);">${b.state}</span>
          </div>
          <span class="battleground-badge">Margin: ${b.margin_previous.toFixed(1)}%</span>
        </div>
        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Leading Winner:</span>
          <span class="party-tag" style="background: ${color}22; color: ${color};">
            <span class="party-dot" style="background: ${color};"></span>
            ${b.winner} (${b.party})
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function renderAssemblyInfo(electionInfo) {
  const grid = document.getElementById('assemblyInfoGrid');
  if (!grid) return;
  const govtColors = { TMC: '#20C646', BJP: '#FF6B00', DMK: '#E91E63', LDF: '#CC0000', INC: '#19AAED', NDA: '#FF6B00' };

  grid.innerHTML = Object.entries(electionInfo).map(([state, info]) => {
    const c = govtColors[info.current_govt] || '#64748b';
    return `
      <div class="election-info-card">
        <div class="state-name" style="color: ${c};">${state}</div>
        <div class="state-meta">
          📅 ${info.election_due}<br>
          🪑 ${info.total_seats} Assembly Seats<br>
          🏛️ Current: <strong>${info.current_govt}</strong>
        </div>
        <div class="state-cm">👤 CM: ${info.cm}</div>
      </div>
    `;
  }).join('');
}
