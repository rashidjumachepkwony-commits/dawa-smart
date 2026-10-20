/* =============================================================
   Dawa Smart — Supabase Client Integration
   =============================================================
   Provides a bridge between the local IndexedDB data and Supabase.
   
   This module is OPTIONAL and ADDITIVE. If no Supabase URL/key is
   configured, the app continues in local-only mode.
   
   Usage:
   1. Configure SUPABASE_URL and SUPABASE_ANON_KEY in the app config
   2. This script loads the Supabase JS SDK dynamically
   3. Sets window.supabaseClient for the sync layer
   4. Authentication is preserved via the existing local auth system
   ============================================================= */

;(function () {
  'use strict';

  const CONFIG_KEY = 'dawa_supabase_config';

  // ==========================================================================
  // Configuration
  // ==========================================================================
  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  // ==========================================================================
  // Initialize Supabase Client
  // ==========================================================================
  async function initSupabase(url, anonKey) {
    if (!url || !anonKey) {
      console.log('[Dawa Smart Supabase] No credentials configured — local-only mode');
      window.supabaseClient = null;
      return null;
    }

    // Dynamically load Supabase client library
    if (typeof window.supabase === 'undefined') {
      try {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase-min.js';
        script.onload = function () {
          console.log('[Dawa Smart Supabase] SDK loaded');
          createClient(url, anonKey);
        };
        script.onerror = function () {
          console.error('[Dawa Smart Supabase] Failed to load SDK');
          window.supabaseClient = null;
        };
        document.head.appendChild(script);
      } catch (e) {
        console.error('[Dawa Smart Supabase] Load error:', e);
        window.supabaseClient = null;
      }
      return null;
    }

    return createClient(url, anonKey);
  }

   function createClient(url, anonKey) {
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.error('[Dawa Smart Supabase] SDK not loaded');
      return null;
    }

    try {
      // Use a custom fetch that injects the Worker JWT token
      const client = window.supabase.createClient(url, anonKey, {
        realtime: {
          params: {
            events: ['INSERT', 'UPDATE', 'DELETE'],
            schema: 'public'
          }
        },
        fetch: (resource, options) => {
          // Inject authorization token from tenant manager if available
          if (window.DawaTenant) {
            const token = window.DawaTenant.getToken();
            if (token && options.headers) {
              options.headers['Authorization'] = 'Bearer ' + token;
            }
          }
          return fetch(resource, {
            ...options,
            signal: AbortSignal.timeout(30000)
          });
        }
      });

      window.supabaseClient = client;
      console.log('[Dawa Smart Supabase] Client initialized');

      // If sync layer exists, re-initialize it
      if (window.DawaSync && typeof window.DawaSync.init === 'function') {
        window.DawaSync.init();
      }

      return client;
    } catch (e) {
      console.error('[Dawa Smart Supabase] Client creation failed:', e);
      window.supabaseClient = null;
      return null;
    }
  }

  // ==========================================================================
  // Authentication Bridge
  // ==========================================================================
  // The existing app uses client-side auth (username/password in localStorage).
  // This bridge allows optional Supabase Auth integration without
  // disrupting the existing login system.
  //
  // When Supabase is configured:
  //   - User signs in with existing credentials
  //   - App then creates a Supabase session token
  //   - Token is cached in localStorage and refreshed automatically
  //
  // When Supabase is NOT configured:
  //   - App uses existing local auth only (no changes)

  async function supabaseSignIn(username, password) {
    if (!window.supabaseClient) {
      return { localOnly: true };
    }

    try {
      // Map existing users to Supabase Auth
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: username + '@dawasmartz.local',
        password: password
      });

      if (error) {
        // Fallback: create a signed JWT via the Cloudflare Worker
        // This allows using the existing user system without migrating
        const workerResponse = await fetch('/api/auth/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!workerResponse.ok) {
          throw new Error('Authentication failed');
        }

        const result = await workerResponse.json();
        if (result.token) {
          localStorage.setItem('dawa_supabase_token', result.token);
          localStorage.setItem('dawa_supabase_token_expiry',
            new Date(Date.now() + result.expires_in * 1000).toISOString());
        }

        return result;
      }

      return { data, error: null };
    } catch (e) {
      console.error('[Dawa Smart Supabase] Sign-in error:', e);
      return { error: e.message };
    }
  }

  async function getCurrentUser() {
    if (!window.supabaseClient) {
      return null;
    }

    try {
      const { data: { user }, error } = await window.supabaseClient.auth.getUser();
      return { user, error };
    } catch (e) {
      return { error: e.message };
    }
  }

  async function supabaseSignOut() {
    if (!window.supabaseClient) {
      return { success: true };
    }

    try {
      const { error } = await window.supabaseClient.auth.signOut();
      localStorage.removeItem('dawa_supabase_token');
      localStorage.removeItem('dawa_supabase_token_expiry');
      return { error };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ==========================================================================
  // Data Sync Helpers
  // ==========================================================================
  // These functions are called by the IndexedDB wrapper to persist writes
  // to Supabase when online. They use idempotent operations to safely retry.

  async function upsertRecord(entity, record) {
    if (!window.supabaseClient) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await window.supabaseClient
      .from(entity)
      .upsert(record, { onConflict: 'id' })
      .select();

    if (error) throw error;
    return data;
  }

  async function deleteRecord(entity, recordId) {
    if (!window.supabaseClient) {
      throw new Error('Supabase not configured');
    }

    // Use soft delete (tombstone pattern)
    const { error } = await window.supabaseClient
      .from(entity)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recordId);

    if (error) throw error;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================
  window.DawaSupabase = {
    init: initSupabase,
    getConfig: getConfig,
    saveConfig: saveConfig,
    signIn: supabaseSignIn,
    signOut: supabaseSignOut,
    getCurrentUser: getCurrentUser,
    upsertRecord: upsertRecord,
    deleteRecord: deleteRecord,
    isConfigured: function () {
      const config = getConfig();
      return !!(config.url && config.anonKey);
    }
  };

  // Auto-detect config: check localStorage first, then fetch from Worker
  const localConfig = getConfig();
  if (localConfig.url && localConfig.anonKey) {
    initSupabase(localConfig.url, localConfig.anonKey);
  } else if (window.location.hostname.includes('startechafrica.co.ke') || window.location.hostname.includes('workers.dev') || (!window.location.hostname || window.location.protocol === 'file:')) {
    // On a production domain, Worker.dev preview, or local file — try fetching config from the Worker
    // The Worker at dawa-api.startechafrica.co.ke/api/config (or workers.dev) returns public config only
    var workerApiUrl = 'https://dawa-smart-api.rashidjumachepkwony.workers.dev/api/config'; // staging/development Worker URL
    if (window.location.hostname.includes('startechafrica.co.ke')) {
      workerApiUrl = 'https://dawa-api.startechafrica.co.ke/api/config'; // production Worker URL
    }
    fetch(workerApiUrl)
      .then((res) => res.ok ? res.json() : null)
      .then((config) => {
        if (config && config.supabaseUrl && config.supabaseAnonKey) {
          saveConfig({ url: config.supabaseUrl, anonKey: config.supabaseAnonKey });
          initSupabase(config.supabaseUrl, config.supabaseAnonKey);
        }
      })
      .catch((err) => {
        console.log('[Dawa Smart] Config fetch skipped (offline or Worker not configured):', err.message);
      });
  }

})();
