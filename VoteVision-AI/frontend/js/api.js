/**
 * VoteVision AI - API Client & State Management Layer
 * Handles asynchronous communication with the Flask REST backend.
 * Supports dual-election modes: 'general' (2024 Lok Sabha) & 'assembly' (2026 Vidhan Sabha).
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? `${window.location.origin}/api`
  : `${window.location.origin}/api`;

/* ── Election-type state management ── */
const ElectionType = {
  _key: 'vv_election_type',
  get() {
    return sessionStorage.getItem(this._key) || 'general';
  },
  set(type) {
    sessionStorage.setItem(this._key, type);
    document.dispatchEvent(new CustomEvent('electionTypeChanged', { detail: { type } }));
  },
  isAssembly() {
    return this.get() === 'assembly';
  },
  label() {
    return this.isAssembly() ? 'Assembly 2026' : 'General 2024';
  }
};

const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...options
    };

    try {
      const res = await fetch(url, config);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        let msg = 'An unexpected server error occurred';
        if (data.error) {
          if (typeof data.error === 'string') msg = data.error;
          else if (data.error.message) msg = data.error.message;
        } else if (res.statusText) {
          msg = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  getConstituencies(state) {
    const et = ElectionType.get();
    const query = state
      ? `?state=${encodeURIComponent(state)}&election_type=${et}`
      : `?election_type=${et}`;
    return this.request(`/constituencies${query}`);
  },

  getConstituencyDetails(name) {
    const et = ElectionType.get();
    return this.request(`/constituency/${encodeURIComponent(name)}?election_type=${et}`);
  },

  getCandidates(filters = {}) {
    filters.election_type = ElectionType.get();
    const params = new URLSearchParams(filters).toString();
    return this.request(`/candidates?${params}`);
  },

  getCandidateById(id) {
    const et = ElectionType.get();
    return this.request(`/candidates/${id}?election_type=${et}`);
  },

  getParties() {
    const et = ElectionType.get();
    return this.request(`/parties?election_type=${et}`);
  },

  getStats() {
    const et = ElectionType.get();
    return this.request(`/stats?election_type=${et}`);
  },

  getModelInfo() {
    return this.request('/model-info');
  },

  predict(constituency, state, swingAdj = 0) {
    return this.request('/predict', {
      method: 'POST',
      body: JSON.stringify({
        constituency,
        state,
        swing_adjustment: parseFloat(swingAdj),
        election_type: ElectionType.get()
      })
    });
  },

  simulateScenarios(params = {}) {
    params.election_type = ElectionType.get();
    return this.request('/scenarios', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  healthCheck() {
    return fetch(`${API_BASE}/health`).then(r => r.json());
  }
};

/* ── Reusable Election Switcher ── */
function createElectionSwitcher(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const current = ElectionType.get();
  container.innerHTML = `
    <div class="election-switcher" id="electionSwitcher" role="group" aria-label="Election Mode Switcher">
      <span class="switcher-label">Mode:</span>
      <button type="button" class="switcher-btn ${current === 'general' ? 'active' : ''}"
              id="btnGeneral" data-type="general" aria-pressed="${current === 'general'}">
        🇮🇳 General 2024
      </button>
      <button type="button" class="switcher-btn ${current === 'assembly' ? 'active' : ''}"
              id="btnAssembly" data-type="assembly" aria-pressed="${current === 'assembly'}">
        🏛️ Assembly 2026
      </button>
    </div>`;

  container.querySelectorAll('.switcher-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      if (ElectionType.get() === type) return;
      ElectionType.set(type);
      container.querySelectorAll('.switcher-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    });
  });
}

/* ── UI Helpers: Spinner & Toast ── */
function showSpinner() {
  const spinner = document.getElementById('spinner');
  if (spinner) spinner.classList.add('active');
}

function hideSpinner() {
  const spinner = document.getElementById('spinner');
  if (spinner) spinner.classList.remove('active');
}

function showToast(msg, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  const bg = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#3b82f6');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 14px 22px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    z-index: 10000;
    color: #ffffff;
    background: ${bg};
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    animation: fadeInUp 0.3s ease;
    max-width: 90vw;
  `;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
  }, 3500);
}

/* ── Party Color Palette ── */
const PARTY_COLORS = {
  BJP: '#FF6B00',
  INC: '#19AAED',
  AAP: '#0066CC',
  TMC: '#20C646',
  DMK: '#E91E63',
  AIADMK: '#FFC107',
  SP: '#FF0000',
  BSP: '#22409A',
  SHS: '#FF5722',
  'SHS-ST': '#FF9800',
  AIMIM: '#006400',
  LDF: '#CC0000',
  UDF: '#19AAED',
  RJD: '#4CAF50',
  'CPI(M)': '#8B0000',
  'CPI(ML)': '#8B0000',
  JDU: '#2196F3',
  JDS: '#009688',
  BJD: '#0A7029',
  YSRCP: '#1565C0',
  TDP: '#FFEB3B',
  IND: '#64748b',
  Other: '#64748b'
};

function getPartyColor(party) {
  return PARTY_COLORS[party] || '#64748b';
}

/* ── Navbar & Global Initialization ── */
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.navbar');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
});
