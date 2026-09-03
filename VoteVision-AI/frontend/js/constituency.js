/* constituency.js – VoteVision AI Prediction & Explainable AI */

let stateConstituencies = {};
let predChart = null;

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('constSwitcher');
  applyMode(ElectionType.get());
  loadConstituencies();

  document.addEventListener('electionTypeChanged', (e) => {
    applyMode(e.detail.type);
    loadConstituencies();
    const resSec = document.getElementById('resultsSection');
    const cInfo = document.getElementById('constituencyInfo');
    if (resSec) resSec.classList.add('hidden');
    if (cInfo) cInfo.classList.add('hidden');
  });

  const stateSelect = document.getElementById('stateSelect');
  const constSelect = document.getElementById('constituencySelect');
  const swingSlider = document.getElementById('swingSlider');
  const swingLabel = document.getElementById('swingLabel');
  const predictBtn = document.getElementById('predictBtn');
  const resetSwingBtn = document.getElementById('resetSwingBtn');

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

    document.getElementById('constituencyInfo').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
  });

  constSelect.addEventListener('change', async () => {
    const name = constSelect.value;
    predictBtn.disabled = !name;
    document.getElementById('resultsSection').classList.add('hidden');

    if (!name) {
      document.getElementById('constituencyInfo').classList.add('hidden');
      return;
    }

    try {
      showSpinner();
      const data = await api.getConstituencyDetails(name);
      const c = data.constituency;
      document.getElementById('infoTitle').textContent = `Constituency Profile: ${c.name}, ${c.state}`;
      document.getElementById('infoStats').innerHTML = `
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
      document.getElementById('constituencyInfo').classList.remove('hidden');
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
      renderPrediction(data);
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

function renderPrediction(data) {
  const preds = data.predictions || [];
  if (preds.length === 0) return;

  const winner = preds[0];
  const color = getPartyColor(winner.party);
  const resultEl = document.getElementById('predictionResult');
  const elLabel = data.election_type === 'assembly' ? 'Projected MLA' : 'Projected MP';

  resultEl.innerHTML = `
    <div class="prediction-winner">
      <div class="candidate-avatar" style="background: ${color}; width: 56px; height: 56px; font-size: 1.4rem;">
        ${winner.candidate_name.charAt(0)}
      </div>
      <div>
        <h3 style="margin-bottom: 0.25rem; font-size: 1.25rem;">${winner.candidate_name}</h3>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <span class="party-tag" style="background: ${color}22; color: ${color};">
            <span class="party-dot" style="background: ${color};"></span>
            ${winner.party} (${winner.alliance})
          </span>
          <span class="winner-badge win">${elLabel}</span>
        </div>
      </div>
    </div>
    <div style="margin-bottom: 0.75rem;">
      <span style="color: var(--text-secondary);">Constituency:</span>
      <strong>${data.constituency}</strong>, ${data.state}
    </div>
    <div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
      <span style="color: var(--text-secondary);">Model Win Probability:</span>
      <strong style="color: var(--accent-green); font-size: 1.1rem;">${winner.win_probability}%</strong>
    </div>
    <div class="confidence-bar" style="height: 10px;">
      <div class="confidence-fill" style="width: ${winner.win_probability}%; background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan));"></div>
    </div>
    <div style="margin-top: 0.75rem; display: flex; justify-content: space-between;">
      <span style="color: var(--text-secondary);">Prediction Confidence:</span>
      <strong>${winner.confidence}%</strong>
    </div>
    ${winner.predicted_margin !== undefined ? `
      <div style="margin-top: 0.4rem; display: flex; justify-content: space-between;">
        <span style="color: var(--text-secondary);">Estimated Lead Margin:</span>
        <strong style="color: var(--accent-cyan);">+${winner.predicted_margin}%</strong>
      </div>
    ` : ''}
    ${data.swing_adjustment !== 0 ? `
      <div style="margin-top: 0.75rem; padding: 6px 12px; border-radius: 8px; background: rgba(6,182,212,0.1); color: var(--accent-cyan); font-size: 0.85rem;">
        📐 Simulation Applied: ${data.swing_adjustment > 0 ? '+' : ''}${data.swing_adjustment}% sentiment shift
      </div>
    ` : ''}
  `;

  // Win Probability Comparison Chart
  if (predChart) {
    predChart.destroy();
    predChart = null;
  }
  const chartCanvas = document.getElementById('predictionChart');
  if (chartCanvas) {
    predChart = new Chart(chartCanvas, {
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
            ticks: { color: '#f1f5f9', font: { size: 11, weight: 600 } }
          }
        },
        plugins: { legend: { display: false } },
        animation: { duration: 1000 }
      }
    });
  }

  // Explainable AI (XAI) Attribution Breakdown
  const xai = winner.explanation || {};
  const summaryEl = document.getElementById('explainabilitySummary');
  const ratingBadge = document.getElementById('confidenceRatingBadge');
  const factorsGrid = document.getElementById('explainabilityFactorsGrid');

  if (summaryEl) {
    summaryEl.textContent = xai.summary_assessment || 'Statistical model prediction computed from feature interactions.';
  }
  if (ratingBadge) {
    ratingBadge.textContent = `Confidence: ${xai.confidence_rating || 'High'}`;
  }

  if (factorsGrid && xai.factors) {
    factorsGrid.innerHTML = xai.factors.map(f => {
      const isPositive = f.impact_score >= 0;
      const scoreColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';
      const sign = isPositive ? '+' : '';
      return `
        <div class="stat-card" style="padding: 1.2rem; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <strong style="font-size: 0.9rem; color: var(--text-primary);">${f.factor}</strong>
            <span style="font-weight: 700; color: ${scoreColor}; font-size: 0.95rem;">${sign}${f.impact_score}%</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">${f.description}</p>
        </div>
      `;
    }).join('');
  }

  // Candidate Breakdown Table
  const tbody = document.querySelector('#candidateBreakdown tbody');
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
        <td><strong style="color: var(--accent-green);">${p.win_probability}%</strong></td>
        <td>${p.confidence}%</td>
        <td>
          ${p.predicted_winner ? '<span class="winner-badge win">Projected Winner</span>' : '<span style="color:var(--text-muted)">Runner-up</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}
