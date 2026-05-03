/* candidates.js */
let allCandidates = [];

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('candSwitcher');
  applyMode(ElectionType.get());
  loadCandidates();

  document.addEventListener('electionTypeChanged', (e) => {
    applyMode(e.detail.type);
    loadCandidates();
  });

  document.getElementById('filterState').addEventListener('change', applyFilters);
  document.getElementById('filterParty').addEventListener('change', applyFilters);
  document.getElementById('filterSearch').addEventListener('input', applyFilters);
});

function applyMode(type) {
  document.body.classList.toggle('assembly-mode', type === 'assembly');
  document.getElementById('candSubtitle').textContent = type === 'assembly'
    ? 'Browse key MLA candidates across 2026 State Assembly Elections.'
    : 'Browse key MP candidates across the 2024 General Election.';
}

async function loadCandidates() {
  showSpinner();
  // Reset filters
  document.getElementById('filterState').innerHTML = '<option value="">All States</option>';
  document.getElementById('filterParty').innerHTML = '<option value="">All Parties</option>';
  document.getElementById('filterSearch').value = '';

  try {
    const data = await api.getCandidates();
    allCandidates = data.candidates;

    const states = [...new Set(allCandidates.map(c => c.state))].sort();
    const stateSelect = document.getElementById('filterState');
    states.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; stateSelect.appendChild(o); });

    const parties = [...new Set(allCandidates.map(c => c.party))].sort();
    const partySelect = document.getElementById('filterParty');
    parties.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; partySelect.appendChild(o); });

    renderCandidates(allCandidates);
  } catch {
    document.getElementById('candidateCount').textContent = 'Failed to load candidates. Start the backend server.';
    document.getElementById('candidateGrid').innerHTML = '';
  }
  hideSpinner();
}

function applyFilters() {
  const state = document.getElementById('filterState').value;
  const party = document.getElementById('filterParty').value;
  const search = document.getElementById('filterSearch').value.toLowerCase();
  let filtered = allCandidates;
  if (state) filtered = filtered.filter(c => c.state === state);
  if (party) filtered = filtered.filter(c => c.party === party);
  if (search) filtered = filtered.filter(c =>
    c.name.toLowerCase().includes(search) || (c.constituency || '').toLowerCase().includes(search)
  );
  renderCandidates(filtered);
}

function renderCandidates(candidates) {
  const grid = document.getElementById('candidateGrid');
  const isAssembly = ElectionType.isAssembly();
  document.getElementById('candidateCount').textContent = `Showing ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}`;

  if (candidates.length === 0) {
    grid.innerHTML = '<div class="card" style="text-align:center;grid-column:1/-1;padding:3rem"><p style="color:var(--text-secondary)">No candidates match your filters.</p></div>';
    return;
  }

  grid.innerHTML = candidates.map(c => {
    const color = getPartyColor(c.party);
    const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2);
    const positionRow = c.position ? `<div class="candidate-stat"><span>🎖️ Role</span><span style="color:var(--accent-cyan)">${c.position}</span></div>` : '';
    return `
    <div class="candidate-card">
      <div class="candidate-header">
        <div class="candidate-avatar" style="background:${color}">${initials}</div>
        <div>
          <div class="candidate-name">${c.name}</div>
          <div class="candidate-party"><span class="party-tag" style="background:${color}22;color:${color}"><span class="party-dot" style="background:${color}"></span>${c.party} (${c.alliance})</span></div>
        </div>
      </div>
      <div class="candidate-body">
        ${positionRow}
        <div class="candidate-stat"><span>📍 Constituency</span><span>${c.constituency || '—'}</span></div>
        <div class="candidate-stat"><span>🏛️ State</span><span>${c.state}</span></div>
        <div class="candidate-stat"><span>🏆 Previous Wins</span><span>${c.previous_wins}</span></div>
        <div class="candidate-stat"><span>🎓 Education</span><span>${c.education}</span></div>
        <div class="candidate-stat"><span>💰 Assets</span><span>₹${c.assets_crore} Cr</span></div>
        <div class="candidate-stat"><span>⚖️ Criminal Cases</span><span>${c.criminal_cases}</span></div>
      </div>
    </div>`;
  }).join('');
}
