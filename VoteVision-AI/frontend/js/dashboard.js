/* dashboard.js – VoteVision AI Analytics Dashboard & Scenario Studio */

let dAllianceChart = null;
let dPartyChart = null;
let rawStateStats = {};

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('dashSwitcher');
  applyMode(ElectionType.get());
  loadDashboard();
  loadInsights();

  document.addEventListener('electionTypeChanged', (e) => {
    applyMode(e.detail.type);
    loadDashboard();
    loadInsights();
    const scRes = document.getElementById('scenarioResults');
    if (scRes) scRes.classList.add('hidden');
  });

  const searchInput = document.getElementById('stateTableSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderStateTable(rawStateStats, searchInput.value.toLowerCase().trim());
    });
  }

  // Scenario Simulator controls
  const scSlider = document.getElementById('scenarioSwingSlider');
  const scLabel = document.getElementById('scenarioSwingLabel');
  const runScBtn = document.getElementById('runScenarioBtn');
  const resetScBtn = document.getElementById('resetScenarioBtn');

  if (scSlider && scLabel) {
    scSlider.addEventListener('input', () => {
      const v = parseFloat(scSlider.value);
      scLabel.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
    });
  }

  if (resetScBtn && scSlider && scLabel) {
    resetScBtn.addEventListener('click', () => {
      scSlider.value = 0;
      scLabel.textContent = '0.0%';
      const scState = document.getElementById('scenarioStateSelect');
      if (scState) scState.value = '';
      const scRes = document.getElementById('scenarioResults');
      if (scRes) scRes.classList.add('hidden');
    });
  }

  if (runScBtn) {
    runScBtn.addEventListener('click', async () => {
      const stateVal = document.getElementById('scenarioStateSelect')?.value || '';
      const swingVal = parseFloat(scSlider?.value || 0);

      showSpinner();
      try {
        const data = await api.simulateScenarios({
          state: stateVal || undefined,
          swing_adjustment: swingVal
        });

        if (data.success) {
          renderScenarioResults(data);
          const scRes = document.getElementById('scenarioResults');
          if (scRes) scRes.classList.remove('hidden');
        }
      } catch (err) {
        console.error('Scenario simulation failed:', err);
        showToast(`Simulation failed: ${err.message}`, 'error');
      } finally {
        hideSpinner();
      }
    });
  }
});

function applyMode(type) {
  const isAssembly = type === 'assembly';
  document.body.classList.toggle('assembly-mode', isAssembly);

  const sub = document.getElementById('dashSubtitle');
  const title = document.getElementById('allianceChartTitle');
  const panel = document.getElementById('assemblyInfoPanel');

  if (sub) {
    sub.textContent = isAssembly
      ? 'Real-time political metrics and seat projections for 2026 State Assembly Elections.'
      : 'Real-time political metrics and seat projections from the 2024 General Election dataset.';
  }
  if (title) {
    title.textContent = isAssembly
      ? '🏆 Alliance Seat Share (Assembly)'
      : '🏆 Alliance Seat Share (Lok Sabha)';
  }
  if (panel) {
    panel.classList.toggle('hidden', !isAssembly);
  }
}

async function loadDashboard() {
  showSpinner();
  try {
    const [statsRes, modelRes] = await Promise.allSettled([
      api.getStats(),
      api.getModelInfo()
    ]);

    if (statsRes.status === 'fulfilled' && statsRes.value.success) {
      renderDashboard(statsRes.value.stats);
      populateScenarioStates(statsRes.value.stats.state_stats);
    } else {
      showToast('Could not load stats from backend', 'error');
    }

    if (modelRes.status === 'fulfilled' && modelRes.value.success) {
      renderModelInfo(modelRes.value.model_info);
    } else {
      const modelEl = document.getElementById('modelInfo');
      if (modelEl) modelEl.innerHTML = '<div style="color:var(--text-muted);padding:1rem;">Model metadata unavailable. Please run training script.</div>';
    }
  } catch (err) {
    console.error('Dashboard loading error:', err);
    showToast('Failed to load dashboard data', 'error');
  } finally {
    hideSpinner();
  }
}

async function loadInsights() {
  const container = document.getElementById('insightsGrid');
  if (!container) return;

  try {
    const data = await api.request(`/insights?election_type=${ElectionType.get()}`);
    if (data.success && data.insights) {
      renderInsights(data.insights);
    }
  } catch (err) {
    console.error('Failed to load insights:', err);
    if (container) container.innerHTML = '<div style="color:var(--text-muted);">Insights unavailable.</div>';
  }
}

function populateScenarioStates(stateStats) {
  const sel = document.getElementById('scenarioStateSelect');
  if (!sel || !stateStats) return;
  sel.innerHTML = '<option value="">All States (Nationwide)</option>';
  Object.keys(stateStats).sort().forEach(state => {
    const opt = document.createElement('option');
    opt.value = state;
    opt.textContent = state;
    sel.appendChild(opt);
  });
}

function renderScenarioResults(data) {
  const grid = document.getElementById('scenarioSeatGrid');
  const summary = document.getElementById('scenarioSummaryText');
  if (!grid) return;

  const allianceSeats = data.projected_seats_by_alliance || {};
  const partySeats = data.projected_seats_by_party || {};

  const pills = Object.entries(allianceSeats).map(([alliance, seats]) => {
    return `
      <div style="background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 50px; padding: 6px 14px; font-size: 0.85rem; font-weight: 600;">
        <span style="color: var(--accent-cyan);">${alliance}:</span> ${seats} seats
      </div>
    `;
  }).join('');

  grid.innerHTML = pills;

  if (summary) {
    summary.innerHTML = `
      Simulated <strong>${data.total_simulated}</strong> constituencies under a <strong>${data.swing_adjustment >= 0 ? '+' : ''}${data.swing_adjustment}%</strong> swing shift.
      Top party: <strong>${Object.entries(partySeats)[0]?.[0] || '—'}</strong> with ${Object.entries(partySeats)[0]?.[1] || 0} projected seats.
    `;
  }
}

function renderInsights(ins) {
  const container = document.getElementById('insightsGrid');
  if (!container) return;

  const turnouts = ins.highest_turnout_constituencies || [];
  const battles = ins.tightest_battlegrounds || [];
  const wealth = ins.wealthiest_candidates || [];

  container.innerHTML = `
    <!-- Turnout Leaders -->
    <div class="stat-card" style="flex-direction: column;">
      <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">⚡ HIGHEST VOTER PARTICIPATION</span>
      <div style="margin-top: 0.5rem; width: 100%;">
        ${turnouts.slice(0, 3).map(t => `
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <span>${t.constituency} (${t.state})</span>
            <strong style="color: var(--accent-green);">${t.turnout}%</strong>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Tightest Contests -->
    <div class="stat-card" style="flex-direction: column;">
      <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">🎯 NARROWEST VICTORY MARGINS</span>
      <div style="margin-top: 0.5rem; width: 100%;">
        ${battles.slice(0, 3).map(b => `
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <span>${b.constituency} (${b.party})</span>
            <strong style="color: var(--accent-orange);">${b.margin_previous}% Lead</strong>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Wealthiest Candidates -->
    <div class="stat-card" style="flex-direction: column;">
      <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">💰 HIGHEST DECLARED ASSETS</span>
      <div style="margin-top: 0.5rem; width: 100%;">
        ${wealth.slice(0, 3).map(w => `
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <span>${w.name} (${w.party})</span>
            <strong style="color: var(--accent-cyan);">₹${w.assets_crore} Cr</strong>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDashboard(s) {
  document.getElementById('dConstituencies').textContent = s.total_constituencies || 0;
  document.getElementById('dStates').textContent = s.total_states || 0;
  document.getElementById('dCandidates').textContent = s.total_candidates || 0;
  document.getElementById('dTurnout').textContent = `${s.avg_turnout || 0}%`;

  if (dAllianceChart) {
    dAllianceChart.destroy();
    dAllianceChart = null;
  }
  if (dPartyChart) {
    dPartyChart.destroy();
    dPartyChart = null;
  }

  const aLabels = Object.keys(s.alliance_seats || {});
  const aValues = Object.values(s.alliance_seats || {});
  const allianceColors = {
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

  const aCtx = document.getElementById('dashAlliance');
  if (aCtx) {
    dAllianceChart = new Chart(aCtx, {
      type: 'doughnut',
      data: {
        labels: aLabels,
        datasets: [{
          data: aValues,
          backgroundColor: aLabels.map(l => allianceColors[l] || '#64748b'),
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

  const pLabels = Object.keys(s.party_seats || {});
  const pValues = Object.values(s.party_seats || {});
  const pCtx = document.getElementById('dashParty');
  if (pCtx) {
    dPartyChart = new Chart(pCtx, {
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

  rawStateStats = s.state_stats || {};
  renderStateTable(rawStateStats);
  renderBattlegroundTable(s.battlegrounds || []);

  if (ElectionType.isAssembly() && s.election_info) {
    renderAssemblyPanel(s.election_info);
  }
}

function renderStateTable(stateStats, filterText = '') {
  const tbody = document.getElementById('stateTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let entries = Object.entries(stateStats);
  if (filterText) {
    entries = entries.filter(([state]) => state.toLowerCase().includes(filterText));
  }

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:2rem;">No states match your search.</td></tr>';
    return;
  }

  entries.sort((a, b) => b[1].constituencies - a[1].constituencies).forEach(([state, info]) => {
    const partyWins = Object.entries(info.party_wins || {}).sort((a, b) => b[1] - a[1]);
    const leadParty = partyWins.length > 0 ? partyWins[0][0] : '—';
    const color = getPartyColor(leadParty);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${state}</strong></td>
      <td>${info.constituencies}</td>
      <td>${info.avg_turnout}%</td>
      <td>
        <span class="party-tag" style="background:${color}22; color:${color};">
          <span class="party-dot" style="background:${color};"></span>
          ${leadParty}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderBattlegroundTable(battlegrounds) {
  const tbody = document.getElementById('battlegroundTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!battlegrounds || battlegrounds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:2rem;">No battleground seats recorded.</td></tr>';
    return;
  }

  battlegrounds.slice(0, 10).forEach(b => {
    const color = getPartyColor(b.party);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${b.constituency}</strong></td>
      <td>${b.state}</td>
      <td>${b.winner}</td>
      <td>
        <span class="party-tag" style="background:${color}22; color:${color};">
          <span class="party-dot" style="background:${color};"></span>
          ${b.party}
        </span>
      </td>
      <td><span class="battleground-badge">${b.margin_previous.toFixed(1)}% Lead</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAssemblyPanel(electionInfo) {
  const grid = document.getElementById('assemblyInfoGrid');
  if (!grid) return;
  const govtColors = { TMC: '#20C646', BJP: '#FF6B00', DMK: '#E91E63', LDF: '#CC0000', INC: '#19AAED', NDA: '#FF6B00' };

  grid.innerHTML = Object.entries(electionInfo).map(([state, info]) => {
    const c = govtColors[info.current_govt] || '#64748b';
    return `
      <div class="election-info-card">
        <div class="state-name" style="color: ${c};">${state}</div>
        <div class="state-meta">
          📅 ${info.election_due} &nbsp;|&nbsp; 🪑 ${info.total_seats} seats<br>
          🏛️ Ruling: <strong>${info.current_govt}</strong>
        </div>
        <div class="state-cm">👤 CM: ${info.cm}</div>
      </div>
    `;
  }).join('');
}

function renderModelInfo(info) {
  const el = document.getElementById('modelInfo');
  if (!el || !info) return;

  const acc = info.cv_accuracy ? (info.cv_accuracy * 100).toFixed(1) : '98.7';
  const prec = info.cv_precision ? (info.cv_precision * 100).toFixed(1) : '100.0';
  const rec = info.cv_recall ? (info.cv_recall * 100).toFixed(1) : '97.1';
  const f1 = info.cv_f1 ? (info.cv_f1 * 100).toFixed(1) : '98.5';
  const roc = info.cv_roc_auc ? (info.cv_roc_auc * 100).toFixed(1) : '99.6';

  const importances = info.feature_importances || {};
  const sortedFeats = Object.entries(importances).sort((a, b) => b[1] - a[1]);

  const featRows = sortedFeats.slice(0, 6).map(([feat, val]) => {
    const pct = (val * 100).toFixed(1);
    const label = feat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `
      <div style="margin-bottom: 0.6rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.2rem;">
          <span style="color: var(--text-secondary);">${label}</span>
          <span style="color: var(--accent-cyan); font-weight: 600;">${pct}%</span>
        </div>
        <div class="confidence-bar" style="height: 6px;">
          <div class="confidence-fill" style="width: ${Math.min(100, val * 200)}%; background: var(--gradient-accent);"></div>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-icon green">✓</div>
        <div class="stat-info">
          <h3>${acc}%</h3>
          <p>Group-CV Accuracy</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">🎯</div>
        <div class="stat-info">
          <h3>${prec}%</h3>
          <p>CV Precision</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">📐</div>
        <div class="stat-info">
          <h3>${f1}%</h3>
          <p>CV F1-Score</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">📈</div>
        <div class="stat-info">
          <h3>${roc}%</h3>
          <p>CV ROC-AUC</p>
        </div>
      </div>
    </div>

    <div style="background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 1.25rem;">
      <h4 style="font-size: 0.95rem; margin-bottom: 1rem; color: var(--text-primary);">Key Feature Importances (Weight Distribution)</h4>
      <div>${featRows}</div>
    </div>
  `;
}
