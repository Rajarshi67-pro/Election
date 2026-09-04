/* constituency.js – VoteVision AI Prediction, Explainable AI & Report Export */

let stateConstituencies = {};
let probChart = null;
let lastPredictionData = null;

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('constSwitcher');
  applyMode(ElectionType.get());
  loadConstituencies();

  document.addEventListener('electionTypeChanged', (e) => {
    applyMode(e.detail.type);
    loadConstituencies();
    const resSec = document.getElementById('resultsSection');
    const demoCard = document.getElementById('demographicsCard');
    if (resSec) resSec.classList.add('hidden');
    if (demoCard) demoCard.classList.add('hidden');
  });

  const stateSelect = document.getElementById('stateSelect');
  const constSelect = document.getElementById('constituencySelect');
  const swingSlider = document.getElementById('swingSlider');
  const swingLabel = document.getElementById('swingLabel');
  const predictBtn = document.getElementById('predictBtn');
  const resetSwingBtn = document.getElementById('resetSwingBtn');
  const exportBtn = document.getElementById('exportReportBtn');

  stateSelect.addEventListener('change', () => {
    const state = stateSelect.value;
    constSelect.innerHTML = '<option value="">Choose Constituency</option>';
    constSelect.disabled = !state;
    predictBtn.disabled = true;

    if (state && stateConstituencies[state]) {
      stateConstituencies[state].forEach(c => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        constSelect.appendChild(o);
      });
    }

    document.getElementById('demographicsCard')?.classList.add('hidden');
    document.getElementById('resultsSection')?.classList.add('hidden');
  });

  constSelect.addEventListener('change', async () => {
    const name = constSelect.value;
    predictBtn.disabled = !name;
    document.getElementById('resultsSection')?.classList.add('hidden');

    if (!name) {
      document.getElementById('demographicsCard')?.classList.add('hidden');
      return;
    }

    try {
      showSpinner();
      const data = await api.getConstituencyDetails(name);
      renderDemographics(data.constituency);
    } catch (err) {
      console.error('Failed to load constituency details:', err);
      showToast('Failed to load constituency details', 'error');
    } finally {
      hideSpinner();
    }
  });

  swingSlider.addEventListener('input', () => {
    const v = parseFloat(swingSlider.value);
    swingLabel.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  });

  if (resetSwingBtn) {
    resetSwingBtn.addEventListener('click', () => {
      swingSlider.value = 0;
      swingLabel.textContent = '0.0%';
      if (!predictBtn.disabled) {
        predictBtn.click();
      }
    });
  }

  predictBtn.addEventListener('click', async () => {
    const state = stateSelect.value;
    const constituency = constSelect.value;
    const swing = parseFloat(swingSlider.value);

    if (!state || !constituency) {
      showToast('Please select both state and constituency', 'error');
      return;
    }

    showSpinner();
    predictBtn.disabled = true;

    try {
      const data = await api.predict(constituency, state, swing);
      lastPredictionData = data;
      renderPredictionResults(data);
      const resSection = document.getElementById('resultsSection');
      resSection.classList.remove('hidden');
      resSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Prediction failed:', err);
      showToast(`Prediction failed: ${err.message}`, 'error');
    } finally {
      predictBtn.disabled = false;
      hideSpinner();
    }
  });

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!lastPredictionData) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastPredictionData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `votevision_forecast_${lastPredictionData.constituency.toLowerCase().replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Forecast report exported successfully', 'success');
    });
  }
});

function applyMode(type) {
  const isAssembly = type === 'assembly';
  document.body.classList.toggle('assembly-mode', isAssembly);

  const sub = document.getElementById('constSubtitle');
  if (sub) {
    sub.textContent = isAssembly
      ? 'Select a 2026 Assembly constituency and simulate swing to forecast MLA outcomes with Explainable AI.'
      : 'Select a 2024 Lok Sabha constituency and simulate swing to forecast MP outcomes with Explainable AI.';
  }
}

async function loadConstituencies() {
  const stateSelect = document.getElementById('stateSelect');
  const constSelect = document.getElementById('constituencySelect');
  const predictBtn = document.getElementById('predictBtn');

  stateSelect.innerHTML = '<option value="">Choose State</option>';
  constSelect.innerHTML = '<option value="">Choose Constituency</option>';
  constSelect.disabled = true;
  predictBtn.disabled = true;

  try {
    const data = await api.getConstituencies();
    stateConstituencies = data.state_constituencies || {};

    (data.states || []).forEach(s => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      stateSelect.appendChild(o);
    });
  } catch (err) {
    console.error('Failed to load constituencies list:', err);
    showToast('Failed to load constituencies from backend', 'error');
  }
}

function renderDemographics(c) {
  const card = document.getElementById('demographicsCard');
  const grid = document.getElementById('demoGrid');
  if (!card || !grid || !c) return;

  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue">📈</div>
      <div class="stat-info">
        <h3>${c.turnout}%</h3>
        <p>Voter Turnout</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">👥</div>
      <div class="stat-info">
        <h3>${c.total_candidates}</h3>
        <p>Total Candidates</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon purple">🏙️</div>
      <div class="stat-info">
        <h3>${(c.urban_rural_ratio * 100).toFixed(0)}%</h3>
        <p>Urban Population</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange">📚</div>
      <div class="stat-info">
        <h3>${c.literacy_rate}%</h3>
        <p>Literacy Rate</p>
      </div>
    </div>
  `;
  card.classList.remove('hidden');
}

function renderPredictionResults(data) {
  const preds = data.predictions || [];
  if (preds.length === 0) return;

  const winner = preds[0];
  const color = getPartyColor(winner.party);
  const initials = (winner.candidate_name || 'W').split(' ').map(w => w[0]).join('').slice(0, 2);

  // Winner card
  const avatarEl = document.getElementById('winnerAvatar');
  if (avatarEl) {
    avatarEl.style.background = color;
    avatarEl.textContent = initials;
  }
  document.getElementById('winnerName').textContent = winner.candidate_name;
  document.getElementById('winnerParty').innerHTML = `
    <span class="party-tag" style="background: ${color}22; color: ${color}; margin-top: 0.2rem;">
      <span class="party-dot" style="background: ${color};"></span>
      ${winner.party} (${winner.alliance || 'Other'})
    </span>
  `;
  document.getElementById('winnerProb').textContent = `${winner.win_probability}%`;
  document.getElementById('winnerProbBar').style.width = `${winner.win_probability}%`;

  const confBadge = document.getElementById('winnerConfidenceBadge');
  if (confBadge) {
    confBadge.textContent = `${winner.explanation?.confidence_rating || 'High'} Confidence (${winner.confidence}%)`;
  }

  const marginLeadEl = document.getElementById('winnerMarginLead');
  if (marginLeadEl) {
    const runnerUp = preds[1];
    marginLeadEl.innerHTML = runnerUp
      ? `Lead margin over runner-up <strong>${runnerUp.candidate_name}</strong> (${runnerUp.party}): <strong style="color: var(--accent-cyan);">+${winner.predicted_margin ?? (winner.win_probability - runnerUp.win_probability).toFixed(1)}%</strong>`
      : `Decisive lead across ${preds.length} candidates.`;
  }

  // Comparison Bar Chart
  if (probChart) {
    probChart.destroy();
    probChart = null;
  }
  const chartCanvas = document.getElementById('probChart');
  if (chartCanvas) {
    probChart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: preds.map(p => p.candidate_name.split(' ').slice(0, 2).join(' ')),
        datasets: [{
          label: 'Win Probability %',
          data: preds.map(p => p.win_probability),
          backgroundColor: preds.map(p => getPartyColor(p.party) + 'cc'),
          borderColor: preds.map(p => getPartyColor(p.party)),
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', callback: v => v + '%' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#f1f5f9', font: { size: 12, weight: 600 } }
          }
        },
        plugins: { legend: { display: false } },
        animation: { duration: 1000 }
      }
    });
  }

  // Explainable AI (XAI) feature attribution
  const xai = winner.explanation || {};
  const narrativeEl = document.getElementById('xaiSummaryNarrative');
  const factorsGrid = document.getElementById('xaiFactorsGrid');

  if (narrativeEl) {
    narrativeEl.innerHTML = `<strong>Model Assessment:</strong> ${xai.summary_assessment || 'Multivariate decision trees evaluating historical baseline and demographics.'}`;
  }

  if (factorsGrid && xai.factors) {
    factorsGrid.innerHTML = xai.factors.map(f => {
      const isPos = f.impact_score >= 0;
      const sign = isPos ? '+' : '';
      const scColor = isPos ? 'var(--accent-green)' : 'var(--accent-red)';
      return `
        <div class="stat-card" style="padding: 1rem; flex-direction: column; gap: 0.35rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <strong style="font-size: 0.88rem; color: var(--text-primary);">${f.factor}</strong>
            <span style="font-weight: 700; color: ${scColor}; font-size: 0.9rem;">${sign}${f.impact_score}%</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">${f.description}</p>
        </div>
      `;
    }).join('');
  }

  // Table
  const tbody = document.getElementById('candidatesTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    preds.forEach(p => {
      const pColor = getPartyColor(p.party);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.candidate_name}</strong></td>
        <td>
          <span class="party-tag" style="background:${pColor}22; color:${pColor};">
            <span class="party-dot" style="background:${pColor};"></span>
            ${p.party}
          </span>
        </td>
        <td><span style="color: var(--text-secondary);">${p.alliance || 'Other'}</span></td>
        <td>${p.previous_vote_share ? p.previous_vote_share.toFixed(1) + '%' : '—'}</td>
        <td>${p.incumbency ? '✓ Sitting MP/MLA' : 'Challenger'}</td>
        <td><strong style="color: var(--accent-green);">${p.win_probability}%</strong></td>
        <td>
          ${p.predicted_winner ? '<span class="winner-badge win">Projected Winner</span>' : '<span style="color:var(--text-muted)">Runner-up</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}
