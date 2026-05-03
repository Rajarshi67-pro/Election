/* constituency.js */
let stateConstituencies = {};
let predChart = null;

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('constSwitcher');
  applyMode(ElectionType.get());
  loadConstituencies();

  document.addEventListener('electionTypeChanged', (e) => {
    applyMode(e.detail.type);
    loadConstituencies();
    // Reset dependent UI
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('constituencyInfo').classList.add('hidden');
  });

  const stateSelect = document.getElementById('stateSelect');
  const constSelect = document.getElementById('constituencySelect');
  const swingSlider = document.getElementById('swingSlider');
  const predictBtn = document.getElementById('predictBtn');

  stateSelect.addEventListener('change', () => {
    const state = stateSelect.value;
    constSelect.innerHTML = '<option value="">Select Constituency</option>';
    constSelect.disabled = !state;
    predictBtn.disabled = true;
    if (state && stateConstituencies[state]) {
      stateConstituencies[state].forEach(c => {
        const o = document.createElement('option'); o.value = c; o.textContent = c;
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
    if (!name) { document.getElementById('constituencyInfo').classList.add('hidden'); return; }
    try {
      const data = await api.getConstituencyDetails(name);
      const c = data.constituency;
      document.getElementById('infoTitle').textContent = `${c.name}, ${c.state}`;
      document.getElementById('infoStats').innerHTML = `
        <div class="stat-card"><div class="stat-icon blue">📈</div><div class="stat-info"><h3>${c.turnout}%</h3><p>Turnout</p></div></div>
        <div class="stat-card"><div class="stat-icon green">👥</div><div class="stat-info"><h3>${c.total_candidates}</h3><p>Candidates</p></div></div>
        <div class="stat-card"><div class="stat-icon purple">🏙️</div><div class="stat-info"><h3>${(c.urban_rural_ratio * 100).toFixed(0)}%</h3><p>Urban Ratio</p></div></div>
        <div class="stat-card"><div class="stat-icon orange">📚</div><div class="stat-info"><h3>${c.literacy_rate}%</h3><p>Literacy</p></div></div>`;
      document.getElementById('constituencyInfo').classList.remove('hidden');
    } catch { showToast('Failed to load constituency info', 'error'); }
  });

  swingSlider.addEventListener('input', () => {
    const v = parseFloat(swingSlider.value);
    document.getElementById('swingLabel').textContent = (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
  });

  predictBtn.addEventListener('click', async () => {
    const state = stateSelect.value, constituency = constSelect.value;
    const swing = parseFloat(swingSlider.value);
    if (!state || !constituency) { showToast('Select state & constituency', 'error'); return; }
    showSpinner();
    predictBtn.disabled = true;
    try {
      const data = await api.predict(constituency, state, swing);
      renderPrediction(data);
      document.getElementById('resultsSection').classList.remove('hidden');
      document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { showToast('Prediction failed: ' + e.message, 'error'); }
    predictBtn.disabled = false;
    hideSpinner();
  });
});

function applyMode(type) {
  const isAssembly = type === 'assembly';
  document.body.classList.toggle('assembly-mode', isAssembly);
  document.getElementById('constSubtitle').textContent = isAssembly
    ? 'Select a 2026 Assembly constituency and simulate swing to predict the MLA winner.'
    : 'Select a 2024 Lok Sabha constituency and simulate swing to predict outcomes.';
}

async function loadConstituencies() {
  const stateSelect = document.getElementById('stateSelect');
  const constSelect = document.getElementById('constituencySelect');
  const predictBtn = document.getElementById('predictBtn');

  stateSelect.innerHTML = '<option value="">Select State</option>';
  constSelect.innerHTML = '<option value="">Select Constituency</option>';
  constSelect.disabled = true;
  predictBtn.disabled = true;

  try {
    const data = await api.getConstituencies();
    stateConstituencies = data.state_constituencies;
    data.states.forEach(s => {
      const o = document.createElement('option'); o.value = s; o.textContent = s;
      stateSelect.appendChild(o);
    });
  } catch { showToast('Failed to load constituencies', 'error'); }
}

function renderPrediction(data) {
  const preds = data.predictions;
  const winner = preds[0];
  const resultEl = document.getElementById('predictionResult');
  const elLabel = data.election_type === 'assembly' ? 'Predicted MLA' : 'Predicted MP';

  resultEl.innerHTML = `
    <div class="prediction-winner">
      <div style="width:52px;height:52px;border-radius:50%;background:${getPartyColor(winner.party)};display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;color:#fff;flex-shrink:0">${winner.candidate_name.charAt(0)}</div>
      <div>
        <h3 style="margin-bottom:.25rem">${winner.candidate_name}</h3>
        <span class="party-tag" style="background:${getPartyColor(winner.party)}22;color:${getPartyColor(winner.party)}"><span class="party-dot" style="background:${getPartyColor(winner.party)}"></span>${winner.party}</span>
        <span class="winner-badge win" style="margin-left:.5rem">${elLabel}</span>
      </div>
    </div>
    <div style="margin-bottom:.75rem"><span style="color:var(--text-secondary)">Constituency:</span> <strong>${data.constituency}</strong>, ${data.state}</div>
    <div style="margin-bottom:.5rem"><span style="color:var(--text-secondary)">Win Probability:</span> <strong style="color:var(--accent-green)">${winner.win_probability}%</strong></div>
    <div class="confidence-bar"><div class="confidence-fill" style="width:${winner.win_probability}%;background:linear-gradient(90deg,var(--accent-green),var(--accent-cyan))"></div></div>
    <div style="margin-top:.5rem"><span style="color:var(--text-secondary)">Confidence:</span> <strong>${winner.confidence}%</strong></div>
    ${data.swing_adjustment !== 0 ? `<div style="margin-top:.5rem;color:var(--accent-cyan)">📐 Swing applied: ${data.swing_adjustment > 0 ? '+' : ''}${data.swing_adjustment}%</div>` : ''}`;

  if (predChart) predChart.destroy();
  predChart = new Chart(document.getElementById('predictionChart'), {
    type: 'bar',
    data: {
      labels: preds.map(p => p.candidate_name.split(' ').slice(0, 2).join(' ')),
      datasets: [{ label: 'Win Probability %', data: preds.map(p => p.win_probability), backgroundColor: preds.map(p => getPartyColor(p.party) + 'cc'), borderColor: preds.map(p => getPartyColor(p.party)), borderWidth: 1, borderRadius: 6 }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#94a3b8', callback: v => v + '%' } }, x: { grid: { display: false }, ticks: { color: '#f1f5f9', font: { size: 11 } } } }, plugins: { legend: { display: false } }, animation: { duration: 1000 } }
  });

  const tbody = document.querySelector('#candidateBreakdown tbody');
  tbody.innerHTML = '';
  preds.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${p.candidate_name}</strong></td>
      <td><span class="party-tag" style="background:${getPartyColor(p.party)}22;color:${getPartyColor(p.party)}"><span class="party-dot" style="background:${getPartyColor(p.party)}"></span>${p.party}</span></td>
      <td><strong>${p.win_probability}%</strong></td><td>${p.confidence}%</td>
      <td>${p.predicted_winner ? '<span class="winner-badge win">Winner</span>' : '<span style="color:var(--text-muted)">—</span>'}</td>`;
    tbody.appendChild(tr);
  });
}
