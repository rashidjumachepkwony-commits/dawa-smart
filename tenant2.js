// UNIQUE-TENANT-V2
/* =============================================================
   Dawa Smart â€” Multi-Tenant Workspace Manager
   =============================================================
   Manages the active pharmacy workspace context for the user.
   Integrates with the existing auth and database systems.

   This module is ADDITIVE â€” if no Supabase config exists, it
   operates in local-only mode with a single default workspace.
   ============================================================= */

;(function () {
  'use strict';

  var WORKER_API_URL = 'https://dawa-smart-api.rashidjumachepkwony.workers.dev';
  var PRODUCTION_API_URL = 'https://dawa-api.startechafrica.co.ke';
  // Use production Worker URL only if the production Worker exists.
  // Currently the Worker is on Workers.dev staging URL. Production Worker
  // at dawa-api.startechafrica.co.ke needs to be configured separately.
  var apiBase = window.location && window.location.hostname === 'dawa.startechafrica.co.ke'
    ? WORKER_API_URL
    : (window.location && window.location.hostname.includes('startechafrica.co.ke')
      ? PRODUCTION_API_URL
      : WORKER_API_URL);

  function api(path) {
    return apiBase + path;
  }

  const STORAGE_KEY = 'dawa_current_pharmacy';
  const MEMBERSHIPS_KEY = 'dawa_user_memberships';
  const TOKEN_KEY = 'dawa_supabase_token';
  const TOKEN_EXPIRY_KEY = 'dawa_supabase_token_expiry';

  let currentPharmacy = null;
  let memberships = [];
  let token = null;

  // â”€â”€â”€ Initialize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function init() {
    loadToken();
    loadMemberships();
    loadCurrentPharmacy();
    return Promise.resolve();
  }

  // â”€â”€â”€ Token Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function loadToken() {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      if (stored && expiry) {
        const exp = new Date(expiry);
        if (exp > new Date()) {
          token = stored;
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_EXPIRY_KEY);
        }
      }
    } catch (e) {
      console.error('[DawaSmart Tenant] Token load error:', e);
    }
  }

  function saveToken(tokenValue, expiresIn) {
    token = tokenValue;
    localStorage.setItem(TOKEN_KEY, tokenValue);
    localStorage.setItem(TOKEN_EXPIRY_KEY,
      new Date(Date.now() + expiresIn * 1000).toISOString());
  }

  function clearToken() {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }

  function getToken() {
    return token;
  }

  function getAuthHeaders() {
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  // â”€â”€â”€ Memberships â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function loadMemberships() {
    try {
      const stored = localStorage.getItem(MEMBERSHIPS_KEY);
      if (stored) {
        memberships = JSON.parse(stored);
      }
    } catch (e) {
      memberships = [];
    }
  }

  function saveMemberships() {
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships));
  }

  async function fetchMemberships() {
    if (!token) return [];

    try {
      const res = await fetch(api('/api/pharmacy/memberships'), {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch memberships');
      }

      const data = await res.json();
      memberships = data.memberships || [];
      saveMemberships();
      return memberships;
    } catch (e) {
      console.error('[DawaSmart Tenant] Membership fetch error:', e);
      // Return cached memberships if available
      return memberships;
    }
  }

  function getMemberships() {
    return memberships;
  }

  // â”€â”€â”€ Current Pharmacy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function loadCurrentPharmacy() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        currentPharmacy = JSON.parse(stored);
      }
    } catch (e) {
      currentPharmacy = null;
    }
  }

  function saveCurrentPharmacy(pharmacy) {
    currentPharmacy = pharmacy;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pharmacy));
  }

  function getCurrentPharmacy() {
    return currentPharmacy;
  }

  function getCurrentPharmacyId() {
    return currentPharmacy ? currentPharmacy.id : null;
  }

  // â”€â”€â”€ Pharmacy Switching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function switchPharmacy(pharmacyId) {
    const membership = memberships.find(m => m.pharmacy?.id === pharmacyId);
    if (!membership) {
      throw new Error('No membership found for this pharmacy');
    }

    // If switching to a different pharmacy, we need a new token
    if (currentPharmacy && currentPharmacy.id === pharmacyId) {
      return currentPharmacy;
    }

    // Request a new token for this pharmacy
    try {
      const res = await fetch(api('/api/pharmacy/switch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ pharmacy_id: pharmacyId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to switch pharmacy');
      }

      const data = await res.json();
      saveToken(data.token, data.expires_in);
      saveCurrentPharmacy(data.pharmacy);

      // Clear IndexedDB data for old workspace (will reload for new workspace)
      if (window.db && typeof window.db.clearAll === 'function') {
        await window.db.clearAll();
      }

      // Trigger UI refresh
      window.dispatchEvent(new CustomEvent('pharmacyChanged', {
        detail: { pharmacy: data.pharmacy }
      }));

      return data.pharmacy;
    } catch (e) {
      console.error('[DawaSmart Tenant] Switch error:', e);
      throw e;
    }
  }

  // â”€â”€â”€ Auth Bridge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function authenticate(username, password) {
    try {
      const res = await fetch(api('/api/auth/local'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Authentication failed');
      }

      const data = await res.json();
      saveToken(data.token, data.expires_in);

      // Store memberships
      memberships = [{
        pharmacy: data.pharmacy,
        role: data.user.role,
        status: 'active',
        id: data.user.id + ':' + data.pharmacy.id
      }];
      saveMemberships();

      saveCurrentPharmacy(data.pharmacy);

      return {
        success: true,
        user: data.user,
        pharmacy: data.pharmacy
      };
    } catch (e) {
      console.error('[DawaSmart Tenant] Auth error:', e);
      return { success: false, error: e.message };
    }
  }

  async function register(email, password, fullName, pharmacyName) {
    try {
      const res = await fetch(api('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, pharmacyName })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await res.json();
      saveToken(data.token, data.expires_in);
      saveMemberships([data]);
      saveCurrentPharmacy(data.pharmacy);

      return { success: true, user: data.user, pharmacy: data.pharmacy };
    } catch (e) {
      console.error('[DawaSmart Tenant] Registration error:', e);
      return { success: false, error: e.message };
    }
  }

  async function fetchFreshMemberships() {
    const m = await fetchMemberships();

    // Set default pharmacy if none selected
    if (!currentPharmacy && m.length > 0) {
      // Prefer active memberships
      const active = m.find(mem => mem.status === 'active' && mem.pharmacy?.status === 'active');
      if (active) {
        // Request a new token for this pharmacy
        await switchPharmacy(active.pharmacy.id);
      }
    }

    return m;
  }

  function logout() {
    clearToken();
    currentPharmacy = null;
    memberships = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MEMBERSHIPS_KEY);
  }

  // â”€â”€â”€ Utility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function isDemoMode() {
    return currentPharmacy ?
      (currentPharmacy.slug === 'dawa-smart-demo' || currentPharmacy.name === 'Dawa Smart Demo') :
      false;
  }

  function isInPharmacy(pharmacyId) {
    return currentPharmacy && currentPharmacy.id === pharmacyId;
  }

  // â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  window.DawaTenant = {
    init,
    authenticate,
    register,
    logout,
    getCurrentPharmacy,
    getCurrentPharmacyId,
    getMemberships,
    fetchMemberships,
    switchPharmacy,
    getToken,
    getAuthHeaders,
    isDemoMode,
    isInPharmacy,
    apiBase: apiBase
  };

  // Auto-initialize
  if (document && document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
