/**
 * VoteVision AI - API Client
 * Handles all communication with the Flask backend.
 * Supports election_type: 'general' (2024 Lok Sabha) | 'assembly' (2026 Vidhan Sabha)
 */
const API_BASE = window.location.origin + '/api';

/* ── Election-type state (persisted in sessionStorage) ── */
const ElectionType = {
  _key: 'vv_election_type',
  get() { return sessionStorage.getItem(this._key) || 'general'; },
  set(type) {
    sessionStorage.setItem(this._key, type);
    document.dispatchEvent(new CustomEvent('electionTypeChanged', { detail: { type } }));
  },
  isAssembly() { return this.get() === 'assembly'; },
  label() { return this.isAssembly() ? 'Assembly 2026' : 'General 2024'; }
};

const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = { headers: { 'Content-Type': 'application/json' }, ...options };
    try {
      const res = await fetch(url, config);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },
  /* Append election_type to GET query strings */
  _et(extra = '') {
    const sep = extra.includes('?') ? '&' : '?';
    return extra + `${sep}election_type=${ElectionType.get()}`;
  },
  getConstituencies(state) {
    const q = state ? `?state=${encodeURIComponent(state)}&election_type=${ElectionType.get()}` : `?election_type=${ElectionType.get()}`;
    return this.request(`/constituencies${q}`);
  },
  getConstituencyDetails(name) {
    return this.request(`/constituency/${encodeURIComponent(name)}?election_type=${ElectionType.get()}`);
  },
  getCandidates(filters = {}) {
    filters.election_type = ElectionType.get();
    const params = new URLSearchParams(filters).toString();
    return this.request(`/candidates?${params}`);
  },
  getStats() { return this.request(`/stats?election_type=${ElectionType.get()}`); },
  getModelInfo() { return this.request('/model-info'); },
  predict(constituency, state, swingAdj = 0) {
    return this.request('/predict', {
      method: 'POST',
      body: JSON.stringify({
        constituency, state,
        swing_adjustment: swingAdj,
        election_type: ElectionType.get()
      })
    });
  },
  healthCheck() { return fetch(`${API_BASE}/health`).then(r => r.json()); }
};

/* ── Election Switcher Component ── */
function createElectionSwitcher(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const current = ElectionType.get();
  container.innerHTML = `
    <div class="election-switcher" id="electionSwitcher">
      <span class="switcher-label">Election:</span>
      <button class="switcher-btn ${current === 'general' ? 'active' : ''}"
              id="btnGeneral" data-type="general">
        🇮🇳 General 2024
      </button>
      <button class="switcher-btn ${current === 'assembly' ? 'active' : ''}"
              id="btnAssembly" data-type="assembly">
        🏛️ Assembly 2026
      </button>
    </div>`;

  container.querySelectorAll('.switcher-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ElectionType.set(btn.dataset.type);
      container.querySelectorAll('.switcher-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/* ── Shared UI helpers ── */
function showSpinner() { document.getElementById('spinner')?.classList.add('active'); }
function hideSpinner() { document.getElementById('spinner')?.classList.remove('active'); }

function showToast(msg, type = 'info') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;padding:14px 24px;border-radius:12px;font-size:.9rem;font-weight:500;z-index:10000;animation:fadeInUp .4s ease;color:#fff;background:${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};box-shadow:0 8px 30px rgba(0,0,0,.3)`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

const PARTY_COLORS = {
  BJP: '#FF6B00', INC: '#19AAED', AAP: '#0066CC', TMC: '#20C646',
  DMK: '#E91E63', AIADMK: '#FFC107', SP: '#FF0000', BSP: '#22409A',
  SHS: '#FF5722', 'SHS-ST': '#FF9800', AIMIM: '#006400',
  LDF: '#CC0000', UDF: '#19AAED', RJD: '#4CAF50',
  'CPI(M)': '#8B0000', 'CPI(ML)': '#8B0000', JDU: '#2196F3',
  JDS: '#009688', IND: '#888', Other: '#888'
};
function getPartyColor(party) { return PARTY_COLORS[party] || '#6b7280'; }

/* ── Navbar + shared DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.navbar');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20));
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));

  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
  });

  const obs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.style.animationPlayState = 'running'; obs.unobserve(e.target); }
  }), { threshold: 0.1 });
  document.querySelectorAll('.animate-in').forEach(el => { el.style.animationPlayState = 'paused'; obs.observe(el); });
});
