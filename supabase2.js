// UNIQUE-BUSTER-V2
/* =============================================================
   Dawa Smart â€” Supabase Client Integration
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
      console.log('[Dawa Smart Supabase] No credentials configured â€” local-only mode');
      window.supabaseClient = null;
      return null;
    }

    // If already initialized, return existing client
    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    // If SDK is already loaded, create client immediately
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      return createClient(url, anonKey);
    }

    // Dynamically load Supabase client library — prevent duplicate loading
    if (!window.__dawaSupabaseScriptLoading) {
      window.__dawaSupabaseScriptLoading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase-min.js';
        script.onload = function () {
          console.log('[Dawa Smart Supabase] SDK loaded');
          resolve();
        };
        script.onerror = function () {
          reject(new Error('Failed to load Supabase SDK'));
        };
        document.head.appendChild(script);
      });
    }

    try {
      await window.__dawaSupabaseScriptLoading;
      return createClient(url, anonKey);
    } catch (e) {
      console.error('[Dawa Smart Supabase] SDK load failed:', e);
      window.supabaseClient = null;
      return null;
    }
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
        fetch: (resource, options = {}) => {
          // Inject authorization token from tenant manager if available
          if (window.DawaTenant) {
            const token = window.DawaTenant.getToken();
            if (token) {
              // Handle both Headers objects and plain objects safely
              if (options.headers instanceof Headers) {
                options.headers.set('Authorization', 'Bearer ' + token);
              } else if (options.headers) {
                options.headers = { ...options.headers, Authorization: 'Bearer ' + token };
              } else {
                options.headers = { Authorization: 'Bearer ' + token };
              }
            }
          }

          // Preserve existing abort signal; only add timeout if none provided
          if (!options.signal) {
            try {
              options.signal = AbortSignal.timeout(30000);
            } catch (e) {
              // AbortSignal.timeout may not be available in all environments
            }
          }

          // Use globalThis.fetch for compatibility across browser and edge runtimes
          const fetchImpl = (typeof globalThis !== 'undefined' && globalThis.fetch)
            ? globalThis.fetch
            : (typeof fetch !== 'undefined' ? fetch : window.fetch);
          return fetchImpl.call(globalThis, resource, options);
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
     var workerAuthUrl = 'https://dawa-smart-api.rashidjumachepkwony.workers.dev/api/auth/local';
     if (window.location && window.location.hostname.includes('startechafrica.co.ke') && window.location.hostname !== 'dawa.startechafrica.co.ke') {
       workerAuthUrl = 'https://dawa-api.startechafrica.co.ke/api/auth/local';
     }

     // Try Supabase Auth first (if SDK loaded)
     // Note: Worker JWT tokens are NOT Supabase Auth sessions â€” they are separate
     if (window.supabaseClient) {
       try {
         const { data, error } = await window.supabaseClient.auth.signInWithPassword({
           email: username + '@dawasmartz.local',
           password: password
         });
         if (!error) {
           return { data, error: null, source: 'supabase' };
         }
         // Supabase auth failed â€” fall through to Worker auth
       } catch (e) {
         // Supabase auth threw â€” fall through to Worker auth
       }
     }

     // Fallback: create a signed JWT via the Cloudflare Worker
     // Worker JWT tokens are stored separately and are NOT Supabase Auth sessions
     try {
       const workerResponse = await fetch(workerAuthUrl, {
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

       return { data: result, error: null, source: 'worker' };
     } catch (e) {
       console.error('[Dawa Smart Supabase] Sign-in error:', e);
       return { data: null, error: e.message, source: 'worker' };
     }
   }

  async function getCurrentUser() {
    // Check for Worker JWT token first â€” it is NOT a Supabase Auth session
    var workerToken = localStorage.getItem('dawa_supabase_token');
    var workerExpiry = localStorage.getItem('dawa_supabase_token_expiry');

    if (workerToken && workerExpiry) {
      var expired = new Date(workerExpiry) <= Date.now();
      if (!expired) {
        try {
          var parts = workerToken.split('.');
          if (parts.length >= 2) {
            var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            return {
              user: { id: payload.sub, username: payload.username, role: payload.role },
              error: null,
              source: 'worker'
            };
          }
        } catch (e) {
          // Malformed token â€” fall through to Supabase auth check
        }
      } else {
        // Token expired â€” clean up
        localStorage.removeItem('dawa_supabase_token');
        localStorage.removeItem('dawa_supabase_token_expiry');
      }
    }

    // Fall back to Supabase Auth session (if SDK loaded)
    if (window.supabaseClient) {
      try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        if (user) {
          return { user, error: null, source: 'supabase' };
        }
      } catch (e) {
        return { user: null, error: e.message, source: 'supabase' };
      }
    }

    return null;
  }

  async function supabaseSignOut() {
    // Always clean up Worker JWT tokens (separate from Supabase Auth session)
    localStorage.removeItem('dawa_supabase_token');
    localStorage.removeItem('dawa_supabase_token_expiry');

    // Best-effort Supabase Auth signout if client is available
    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient.auth.signOut();
        return { error, workerSignedOut: true };
      } catch (e) {
        return { error: e.message, workerSignedOut: true };
      }
    }

    return { error: null, workerSignedOut: true };
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

    // Attempt soft delete using deleted_at column (tombstone pattern)
    const { data, error } = await window.supabaseClient
      .from(entity)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recordId)
      .select();

    if (error) {
      // If deleted_at column doesn't exist in the table schema, fall back to hard delete
      var msg = (error.message || '').toLowerCase();
      if (msg.includes('deleted_at') || msg.includes('column') || msg.includes('not found')) {
        var delResult = await window.supabaseClient
          .from(entity)
          .delete()
          .eq('id', recordId);
        if (delResult.error) throw delResult.error;
        return { method: 'hard-delete', success: true };
      }
      throw error;
    }

    // Handle zero-row update (already soft-deleted or not found) â€” idempotent
    var updatedRows = Array.isArray(data) ? data.length : 0;
    return { method: 'soft-delete', success: true, updatedRows: updatedRows };
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
  (async function autoInit() {
    var localConfig = getConfig();
    if (localConfig.url && localConfig.anonKey) {
      try {
        await initSupabase(localConfig.url, localConfig.anonKey);
      } catch (e) {
        console.error('[Dawa Smart Supabase] Auto-init failed:', e);
      }
      return;
    }

    // Determine if we should try fetching config from the Worker
    var hostname = (window.location && window.location.hostname) ? window.location.hostname : '';
    var shouldFetch = hostname.includes('startechafrica.co.ke') ||
                      hostname.includes('workers.dev') ||
                      hostname.includes('pages.dev') ||
                      (!hostname || (window.location && window.location.protocol === 'file:'));
    if (!shouldFetch) return;

    // Determine Worker API URL based on hostname
    // On a production domain, Worker.dev preview, or local file â€” try fetching config from the Worker
    var workerApiUrl = 'https://dawa-smart-api.rashidjumachepkwony.workers.dev/api/config'; // staging/development Worker URL
    // Use production URL only for non-Pages startechafrica.co.ke domains
    // (dawa.startechafrica.co.ke is the Pages domain, which should use staging Worker)
    if (hostname.includes('startechafrica.co.ke') && hostname !== 'dawa.startechafrica.co.ke') {
      workerApiUrl = 'https://dawa-api.startechafrica.co.ke/api/config'; // production Worker URL
    }

    try {
      var res = await fetch(workerApiUrl);
      if (!res.ok) {
        console.log('[Dawa Smart] Config fetch skipped (Worker not configured)');
        return;
      }
      var config = await res.json();
      if (config && config.supabaseUrl && config.supabaseAnonKey) {
        saveConfig({ url: config.supabaseUrl, anonKey: config.supabaseAnonKey });
        await initSupabase(config.supabaseUrl, config.supabaseAnonKey);
      }
    } catch (err) {
      console.log('[Dawa Smart] Config fetch skipped (offline or Worker not configured):', err.message);
    }
  })();

})();
