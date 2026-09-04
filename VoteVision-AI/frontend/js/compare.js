/* compare.js – VoteVision AI Head-to-Head Candidate Comparison */

let candidatesList = [];

document.addEventListener('DOMContentLoaded', () => {
  createElectionSwitcher('compSwitcher');
  applyMode(ElectionType.get());
  loadCandidateOptions();

  document.addEventListener('electionTypeChanged', (e) => {
    applyMode(e.detail.type);
    loadCandidateOptions();
    const res = document.getElementById('comparisonResults');
    if (res) res.classList.add('hidden');
  });

  const c1Select = document.getElementById('cand1Select');
  const c2Select = document.getElementById('cand2Select');
  const compareBtn = document.getElementById('compareBtn');
  const swapBtn = document.getElementById('swapBtn');

  function checkValidSelection() {
    const valid = c1Select.value && c2Select.value && (c1Select.value !== c2Select.value);
    compareBtn.disabled = !valid;
  }

  c1Select.addEventListener('change', checkValidSelection);
  c2Select.addEventListener('change', checkValidSelection);

  swapBtn.addEventListener('click', () => {
    const temp = c1Select.value;
    c1Select.value = c2Select.value;
    c2Select.value = temp;
    checkValidSelection();
    if (!compareBtn.disabled) compareBtn.click();
  });

  compareBtn.addEventListener('click', async () => {
    const c1Id = parseInt(c1Select.value, 10);
    const c2Id = parseInt(c2Select.value, 10);
    if (!c1Id || !c2Id) return;

    showSpinner();
    try {
      const data = await api.request(`/compare?c1=${c1Id}&c2=${c2Id}&election_type=${ElectionType.get()}`);
      if (data.success && data.comparison) {
        renderComparison(data.comparison);
        const res = document.getElementById('comparisonResults');
        res.classList.remove('hidden');
        res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      console.error('Failed to compare candidates:', err);
      showToast(err.message || 'Comparison failed', 'error');
    } finally {
      hideSpinner();
    }
  });
});

function applyMode(type) {
  const isAssembly = type === 'assembly';
  document.body.classList.toggle('assembly-mode', isAssembly);
  const sub = document.getElementById('compSubtitle');
  if (sub) {
    sub.textContent = isAssembly
      ? 'Select any two 2026 State Assembly candidates to compare declared assets, legal track records, and electoral experience.'
      : 'Select any two 2024 Lok Sabha candidates to compare declared assets, legal track records, and electoral experience.';
  }
}

async function loadCandidateOptions() {
  const c1Select = document.getElementById('cand1Select');
  const c2Select = document.getElementById('cand2Select');
  const compareBtn = document.getElementById('compareBtn');

  c1Select.innerHTML = '<option value="">Select First Candidate</option>';
  c2Select.innerHTML = '<option value="">Select Second Candidate</option>';
  compareBtn.disabled = true;

  try {
    const data = await api.getCandidates();
    candidatesList = data.candidates || [];

    candidatesList.forEach((c) => {
      const opt1 = document.createElement('option');
      opt1.value = c.id;
      opt1.textContent = `${c.name} (${c.party} - ${c.constituency || c.state})`;
      c1Select.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = c.id;
      opt2.textContent = `${c.name} (${c.party} - ${c.constituency || c.state})`;
      c2Select.appendChild(opt2);
    });

    // Default select first two candidates if available
    if (candidatesList.length >= 2) {
      c1Select.value = candidatesList[0].id;
      c2Select.value = candidatesList[1].id;
      compareBtn.disabled = false;
    }
  } catch (err) {
    console.error('Failed to load candidate options:', err);
    showToast('Failed to load candidate directory for comparison', 'error');
  }
}

function renderComparison(comp) {
  const c1 = comp.candidate1;
  const c2 = comp.candidate2;
  const c1Color = getPartyColor(c1.party);
  const c2Color = getPartyColor(c2.party);

  const c1Initials = (c1.name || 'C1').split(' ').map(w => w[0]).join('').slice(0, 2);
  const c2Initials = (c2.name || 'C2').split(' ').map(w => w[0]).join('').slice(0, 2);

  // Render Profiles Container
  const profilesEl = document.getElementById('profilesContainer');
  profilesEl.innerHTML = `
    <!-- Candidate 1 -->
    <div class="candidate-card" style="border-top: 4px solid ${c1Color};">
      <div class="candidate-header">
        <div class="candidate-avatar" style="background: ${c1Color};">
          ${c1Initials}
        </div>
        <div>
          <div class="candidate-name">${c1.name}</div>
          <div class="candidate-party">
            <span class="party-tag" style="background: ${c1Color}22; color: ${c1Color};">
              <span class="party-dot" style="background: ${c1Color};"></span>
              ${c1.party} (${c1.alliance || 'Other'})
            </span>
          </div>
        </div>
      </div>
      <div class="candidate-body">
        <div class="candidate-stat"><span>📍 Constituency</span><strong>${c1.constituency || '—'}</strong></div>
        <div class="candidate-stat"><span>🏛️ State</span><strong>${c1.state || '—'}</strong></div>
        <div class="candidate-stat"><span>🎂 Age & Gender</span><strong>${c1.age || '—'} yrs (${c1.gender || '—'})</strong></div>
        <div class="candidate-stat"><span>🎓 Education</span><strong>${c1.education || '—'}</strong></div>
        <div class="candidate-stat"><span>💰 Declared Assets</span><strong style="color: var(--accent-cyan);">₹${c1.assets_crore || 0} Cr</strong></div>
        <div class="candidate-stat"><span>⚖️ Criminal Cases</span><strong style="color: ${(c1.criminal_cases || 0) > 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">${c1.criminal_cases ?? 0}</strong></div>
        <div class="candidate-stat"><span>🏆 Previous Wins</span><strong>${c1.previous_wins ?? 0} term(s)</strong></div>
      </div>
    </div>

    <!-- Candidate 2 -->
    <div class="candidate-card" style="border-top: 4px solid ${c2Color};">
      <div class="candidate-header">
        <div class="candidate-avatar" style="background: ${c2Color};">
          ${c2Initials}
        </div>
        <div>
          <div class="candidate-name">${c2.name}</div>
          <div class="candidate-party">
            <span class="party-tag" style="background: ${c2Color}22; color: ${c2Color};">
              <span class="party-dot" style="background: ${c2Color};"></span>
              ${c2.party} (${c2.alliance || 'Other'})
            </span>
          </div>
        </div>
      </div>
      <div class="candidate-body">
        <div class="candidate-stat"><span>📍 Constituency</span><strong>${c2.constituency || '—'}</strong></div>
        <div class="candidate-stat"><span>🏛️ State</span><strong>${c2.state || '—'}</strong></div>
        <div class="candidate-stat"><span>🎂 Age & Gender</span><strong>${c2.age || '—'} yrs (${c2.gender || '—'})</strong></div>
        <div class="candidate-stat"><span>🎓 Education</span><strong>${c2.education || '—'}</strong></div>
        <div class="candidate-stat"><span>💰 Declared Assets</span><strong style="color: var(--accent-cyan);">₹${c2.assets_crore || 0} Cr</strong></div>
        <div class="candidate-stat"><span>⚖️ Criminal Cases</span><strong style="color: ${(c2.criminal_cases || 0) > 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">${c2.criminal_cases ?? 0}</strong></div>
        <div class="candidate-stat"><span>🏆 Previous Wins</span><strong>${c2.previous_wins ?? 0} term(s)</strong></div>
      </div>
    </div>
  `;

  // Render Metric Cards
  const gridEl = document.getElementById('metricsComparisonGrid');
  const asset = comp.asset_comparison;
  const exp = comp.experience_comparison;
  const legal = comp.legal_records;

  gridEl.innerHTML = `
    <div class="stat-card" style="flex-direction: column;">
      <span style="color: var(--text-muted); font-size: 0.8rem;">FINANCIAL ASSETS COMPARISON</span>
      <h3 style="font-size: 1.3rem; margin: 0.3rem 0; color: var(--accent-cyan);">₹${asset.delta_crore} Cr Delta</h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary);">
        ${asset.wealthier === 'Equal' ? 'Both candidates declared equal assets.' : `<strong>${asset.wealthier}</strong> declares ₹${asset.delta_crore} Cr higher assets.`}
      </p>
    </div>

    <div class="stat-card" style="flex-direction: column;">
      <span style="color: var(--text-muted); font-size: 0.8rem;">ELECTORAL EXPERIENCE</span>
      <h3 style="font-size: 1.3rem; margin: 0.3rem 0; color: var(--accent-green);">
        ${c1.previous_wins} vs ${c2.previous_wins} Wins
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary);">
        ${exp.more_experienced === 'Equal' ? 'Both candidates hold equal electoral victories.' : `<strong>${exp.more_experienced}</strong> has won more parliamentary/assembly terms.`}
      </p>
    </div>

    <div class="stat-card" style="flex-direction: column;">
      <span style="color: var(--text-muted); font-size: 0.8rem;">JUDICIAL / AFFIDAVIT RECORD</span>
      <h3 style="font-size: 1.3rem; margin: 0.3rem 0; color: ${legal.c1_criminal_cases + legal.c2_criminal_cases > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'};">
        ${c1.criminal_cases} vs ${c2.criminal_cases} Cases
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary);">
        ${legal.cleaner_record === 'Equal' ? 'Both candidates report equal pending case records.' : `<strong>${legal.cleaner_record}</strong> has fewer declared legal cases.`}
      </p>
    </div>
  `;

  // Verdict
  const verdictEl = document.getElementById('comparisonVerdict');
  verdictEl.innerHTML = `
    In a head-to-head comparison between <strong>${c1.name}</strong> (${c1.party}) and <strong>${c2.name}</strong> (${c2.party}),
    ${c1.previous_wins > c2.previous_wins ? `${c1.name} carries incumbent advantage with ${c1.previous_wins} prior victory term(s).` : (c2.previous_wins > c1.previous_wins ? `${c2.name} carries incumbent advantage with ${c2.previous_wins} prior victory term(s).` : 'both candidates enter with equal prior electoral terms.')}
    Financially, ${asset.wealthier === 'Equal' ? 'both report equal net assets' : `<strong>${asset.wealthier}</strong> possesses greater declared net assets (₹${Math.max(c1.assets_crore, c2.assets_crore)} Cr)`}.
    On judicial scrutiny, ${legal.cleaner_record === 'Equal' ? 'both candidates have matching affidavit records.' : `<strong>${legal.cleaner_record}</strong> presents a cleaner affidavit record with fewer pending cases.`}
  `;
}
