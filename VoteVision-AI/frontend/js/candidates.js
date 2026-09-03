/* candidates.js – VoteVision AI Candidate Directory */

let allCandidates = [];

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('candSwitcher');
  applyMode(ElectionType.get());
  loadCandidates();

  document.addEventListener('electionTypeChanged', (e) => {
    applyMode(e.detail.type);
    loadCandidates();
  });

  const filterState = document.getElementById('filterState');
  const filterParty = document.getElementById('filterParty');
  const filterAlliance = document.getElementById('filterAlliance');
  const filterSearch = document.getElementById('filterSearch');

  if (filterState) filterState.addEventListener('change', applyFilters);
  if (filterParty) filterParty.addEventListener('change', applyFilters);
  if (filterAlliance) filterAlliance.addEventListener('change', applyFilters);
  if (filterSearch) filterSearch.addEventListener('input', applyFilters);

  // Modal close handlers
  const modal = document.getElementById('candidateModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.classList.add('hidden');
    });
  }
});

function applyMode(type) {
  const isAssembly = type === 'assembly';
  document.body.classList.toggle('assembly-mode', isAssembly);

  const sub = document.getElementById('candSubtitle');
  if (sub) {
    sub.textContent = isAssembly
      ? 'Browse key MLA candidates and party profiles across 2026 State Assembly Elections.'
      : 'Browse key MP candidates, assets, criminal cases, and historical records across the 2024 General Election.';
  }
}

async function loadCandidates() {
  showSpinner();
  const stateSelect = document.getElementById('filterState');
  const partySelect = document.getElementById('filterParty');
  const allianceSelect = document.getElementById('filterAlliance');
  const searchInput = document.getElementById('filterSearch');

  if (stateSelect) stateSelect.innerHTML = '<option value="">All States</option>';
  if (partySelect) partySelect.innerHTML = '<option value="">All Parties</option>';
  if (allianceSelect) allianceSelect.innerHTML = '<option value="">All Alliances</option>';
  if (searchInput) searchInput.value = '';

  try {
    const data = await api.getCandidates();
    allCandidates = data.candidates || [];

    // Populate dynamic filter options
    const states = [...new Set(allCandidates.map(c => c.state).filter(Boolean))].sort();
    states.forEach(s => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      if (stateSelect) stateSelect.appendChild(o);
    });

    const parties = [...new Set(allCandidates.map(c => c.party).filter(Boolean))].sort();
    parties.forEach(p => {
      const o = document.createElement('option');
      o.value = p;
      o.textContent = p;
      if (partySelect) partySelect.appendChild(o);
    });

    const alliances = [...new Set(allCandidates.map(c => c.alliance).filter(Boolean))].sort();
    alliances.forEach(a => {
      const o = document.createElement('option');
      o.value = a;
      o.textContent = a;
      if (allianceSelect) allianceSelect.appendChild(o);
    });

    renderCandidates(allCandidates);
  } catch (err) {
    console.error('Failed to load candidate directory:', err);
    const countEl = document.getElementById('candidateCount');
    if (countEl) countEl.textContent = 'Failed to load candidates from backend server.';
    const grid = document.getElementById('candidateGrid');
    if (grid) grid.innerHTML = '';
  } finally {
    hideSpinner();
  }
}

function applyFilters() {
  const state = document.getElementById('filterState')?.value || '';
  const party = document.getElementById('filterParty')?.value || '';
  const alliance = document.getElementById('filterAlliance')?.value || '';
  const search = (document.getElementById('filterSearch')?.value || '').toLowerCase().trim();

  let filtered = allCandidates;

  if (state) {
    filtered = filtered.filter(c => c.state === state);
  }
  if (party) {
    filtered = filtered.filter(c => c.party === party);
  }
  if (alliance) {
    filtered = filtered.filter(c => c.alliance === alliance);
  }
  if (search) {
    filtered = filtered.filter(c =>
      (c.name || '').toLowerCase().includes(search) ||
      (c.constituency || '').toLowerCase().includes(search) ||
      (c.party || '').toLowerCase().includes(search)
    );
  }

  renderCandidates(filtered);
}

function renderCandidates(candidates) {
  const grid = document.getElementById('candidateGrid');
  const countEl = document.getElementById('candidateCount');
  if (!grid) return;

  if (countEl) {
    countEl.textContent = `Showing ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}`;
  }

  if (candidates.length === 0) {
    grid.innerHTML = `
      <div class="card" style="text-align: center; grid-column: 1/-1; padding: 3rem;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
        <p style="color: var(--text-primary); font-weight: 600;">No candidates match your filters</p>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">Try resetting your filters or changing your search terms.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = candidates.map(c => {
    const color = getPartyColor(c.party);
    const initials = (c.name || 'Candidate').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const positionBadge = c.position
      ? `<div class="candidate-stat"><span>🎖️ Role</span><span style="color: var(--accent-cyan);">${c.position}</span></div>`
      : '';

    return `
      <div class="candidate-card" onclick="openCandidateModal(${c.id || 0})" style="cursor: pointer;">
        <div class="candidate-header">
          <div class="candidate-avatar" style="background: ${color};">
            ${initials}
          </div>
          <div>
            <div class="candidate-name">${c.name}</div>
            <div class="candidate-party">
              <span class="party-tag" style="background: ${color}22; color: ${color};">
                <span class="party-dot" style="background: ${color};"></span>
                ${c.party} (${c.alliance || 'Other'})
              </span>
            </div>
          </div>
        </div>
        <div class="candidate-body">
          ${positionBadge}
          <div class="candidate-stat">
            <span>📍 Constituency</span>
            <span>${c.constituency || '—'}</span>
          </div>
          <div class="candidate-stat">
            <span>🏛️ State</span>
            <span>${c.state || '—'}</span>
          </div>
          <div class="candidate-stat">
            <span>🏆 Previous Wins</span>
            <span>${c.previous_wins ?? 0}</span>
          </div>
          <div class="candidate-stat">
            <span>🎓 Education</span>
            <span>${c.education || 'Graduate'}</span>
          </div>
          <div class="candidate-stat">
            <span>💰 Declared Assets</span>
            <span>₹${c.assets_crore || 0} Cr</span>
          </div>
          <div class="candidate-stat">
            <span>⚖️ Criminal Cases</span>
            <span style="color: ${(c.criminal_cases || 0) > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">
              ${c.criminal_cases ?? 0}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openCandidateModal = function(id) {
  const candidate = allCandidates.find(c => c.id === id);
  if (!candidate) return;

  const modal = document.getElementById('candidateModal');
  const body = document.getElementById('modalBody');
  if (!modal || !body) return;

  const color = getPartyColor(candidate.party);
  const initials = (candidate.name || 'Candidate').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  body.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-glass);">
      <div class="candidate-avatar" style="background: ${color}; width: 64px; height: 64px; font-size: 1.5rem;">
        ${initials}
      </div>
      <div>
        <h2 style="font-size: 1.35rem; margin-bottom: 0.25rem;">${candidate.name}</h2>
        <span class="party-tag" style="background: ${color}22; color: ${color};">
          <span class="party-dot" style="background: ${color};"></span>
          ${candidate.party} (${candidate.alliance || 'Other'})
        </span>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div class="stat-card" style="flex-direction: column;">
        <span style="color: var(--text-muted); font-size: 0.8rem;">CONSTITUENCY</span>
        <strong style="font-size: 1.05rem;">${candidate.constituency || '—'}</strong>
      </div>
      <div class="stat-card" style="flex-direction: column;">
        <span style="color: var(--text-muted); font-size: 0.8rem;">STATE</span>
        <strong style="font-size: 1.05rem;">${candidate.state || '—'}</strong>
      </div>
      <div class="stat-card" style="flex-direction: column;">
        <span style="color: var(--text-muted); font-size: 0.8rem;">AGE & GENDER</span>
        <strong style="font-size: 1.05rem;">${candidate.age || '—'} yrs (${candidate.gender || '—'})</strong>
      </div>
      <div class="stat-card" style="flex-direction: column;">
        <span style="color: var(--text-muted); font-size: 0.8rem;">DECLARED ASSETS</span>
        <strong style="font-size: 1.05rem; color: var(--accent-cyan);">₹${candidate.assets_crore || 0} Crore</strong>
      </div>
      <div class="stat-card" style="flex-direction: column;">
        <span style="color: var(--text-muted); font-size: 0.8rem;">QUALIFICATION</span>
        <strong style="font-size: 1.05rem;">${candidate.education || '—'}</strong>
      </div>
      <div class="stat-card" style="flex-direction: column;">
        <span style="color: var(--text-muted); font-size: 0.8rem;">CRIMINAL CASES</span>
        <strong style="font-size: 1.05rem; color: ${(candidate.criminal_cases || 0) > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">
          ${candidate.criminal_cases ?? 0} cases
        </strong>
      </div>
    </div>
    <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
      <a href="constituency.html" class="btn btn-primary btn-sm">🔮 Simulate Constituency</a>
    </div>
  `;

  modal.classList.remove('hidden');
};
