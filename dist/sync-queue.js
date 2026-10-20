/* =============================================================
   Dawa Smart — Offline-First Synchronization Layer
   =============================================================
   Wraps IndexedDB operations with a durable local operation queue.
   
   Design:
   - Every write operation (add/update/delete) creates a queue entry
   - Queue entries persist in localStorage until the server acknowledges
   - When online, the queue is drained to Supabase
   - Conflict handling: server-authoritative timestamps + revision
   - Background sync via service worker 'sync' event when available
   
   Queue entry structure:
   {
     id: 'op_<uuid>',
     entity: 'products' | 'sales' | 'saleItems' | 'patients' | 'batches' | 'controlledLogs' | 'labTests' | 'expenses' | 'users',
     operation: 'create' | 'update' | 'delete',
     recordId: <the record's id>,
     payload: <the full record object>,
     createdAt: <ISO timestamp>,
     attempt: 0,
     status: 'pending' | 'syncing' | 'completed' | 'failed',
     error: null | <error message>
   }
   ============================================================= */

;(function () {
  'use strict';

  const QUEUE_KEY = 'dawa_sync_queue';
  const SYNC_STATUS_KEY = 'dawa_sync_status';
  const MAX_RETRIES = 3;
  const BACKOFF_BASE = 2000; // 2s initial backoff

  // ==========================================================================
  // Queue Management
  // ==========================================================================
  function getQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[Dawa Smart Sync] Failed to read queue:', e);
    }
    return [];
  }

  function saveQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('[Dawa Smart Sync] Failed to save queue:', e);
    }
  }

  function enqueueOperation(entity, operation, recordId, payload) {
    const queue = getQueue();
    const entry = {
      id: generateSyncId(),
      entity: entity,
      operation: operation,
      recordId: recordId,
      payload: payload,
      createdAt: new Date().toISOString(),
      attempt: 0,
      status: 'pending',
      error: null
    };
    queue.push(entry);
    saveQueue(queue);
    updateSyncStatus('pending', queue.length);
    console.log('[Dawa Smart Sync] Queued:', entry.entity, entry.operation, entry.recordId);
    return entry;
  }

  function generateSyncId() {
    // Use same pattern as app's generateId for consistency
    return 'op_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function updateSyncStatus(status, pendingCount) {
    const syncStatus = {
      status: status,
      pending: pendingCount,
      lastSync: localStorage.getItem(SYNC_STATUS_KEY) ?
        JSON.parse(localStorage.getItem(SYNC_STATUS_KEY)).lastSync : null,
      lastError: localStorage.getItem(SYNC_STATUS_KEY) ?
        JSON.parse(localStorage.getItem(SYNC_STATUS_KEY)).lastError : null
    };
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(syncStatus));
    // Dispatch event for UI to update
    window.dispatchEvent(new CustomEvent('dawaSyncStatus', { detail: syncStatus }));
  }

  function markOperationComplete(opId) {
    const queue = getQueue();
    const index = queue.findIndex((op) => op.id === opId);
    if (index >= 0) {
      queue.splice(index, 1);
      saveQueue(queue);
      updateSyncStatus(queue.length > 0 ? 'pending' : 'synced', queue.length);
    }
  }

  function markOperationFailed(opId, error) {
    const queue = getQueue();
    const index = queue.findIndex((op) => op.id === opId);
    if (index >= 0) {
      queue[index].attempt += 1;
      queue[index].error = error;
      queue[index].status = 'failed';
      saveQueue(queue);
    }
    updateSyncStatus('failed', queue.filter((op) => op.status === 'pending').length);
  }

  // ==========================================================================
  // Connection Detection
  // ==========================================================================
  function isOnline() {
    return navigator.onLine;
  }

  function setupConnectionListeners() {
    window.addEventListener('online', () => {
      console.log('[Dawa Smart Sync] Connection restored');
      updateSyncStatus('connecting', getQueue().filter((op) => op.status === 'pending').length);
      drainQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[Dawa Smart Sync] Connection lost');
      const pending = getQueue().filter((op) => op.status === 'pending').length;
      updateSyncStatus('offline', pending);
    });
  }

  // ==========================================================================
  // Sync Execution
  // ==========================================================================
  async function drainQueue() {
    if (!isOnline()) {
      updateSyncStatus('offline', getQueue().length);
      return;
    }

    // Check if Supabase client is available
    if (typeof window.supabaseClient === 'undefined') {
      console.warn('[Dawa Smart Sync] Supabase client not initialized — staying local-only');
      return;
    }

    const queue = getQueue();
    if (queue.length === 0) {
      updateSyncStatus('synced', 0);
      return;
    }

    updateSyncStatus('syncing', queue.length);

    let synced = 0;
    let failed = 0;

    for (const op of queue) {
      if (op.status === 'completed' || op.status === 'syncing') {
        continue;
      }

      // Calculate backoff delay
      const backoffDelay = op.attempt > 0 ? BACKOFF_BASE * Math.pow(2, op.attempt - 1) : 0;

      if (backoffDelay > 0 && Date.now() - new Date(op.createdAt).getTime() < backoffDelay) {
        continue; // Skip this op, still in backoff
      }

      op.status = 'syncing';
      saveQueue(queue);

      try {
        await syncOperation(op);
        markOperationComplete(op.id);
        synced++;
      } catch (error) {
        console.error('[Dawa Smart Sync] Failed to sync operation:', op, error);
        op.error = error.message || String(error);
        op.attempt++;
        if (op.attempt >= MAX_RETRIES) {
          op.status = 'failed';
          saveQueue(queue);
          failed++;
        } else {
          op.status = 'pending';
          saveQueue(queue);
        }
      }

      // Small delay between operations to avoid rate limiting
      if (synced + failed < queue.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const remaining = getQueue().length;
    if (remaining > 0) {
      updateSyncStatus('failed', remaining);
    } else {
      updateSyncStatus('synced', 0);
    }

    console.log('[Dawa Smart Sync] Drained queue: synced=' + synced + ', failed=' + failed);
  }

  // ==========================================================================
  // Individual Operation Sync
  // ==========================================================================
  async function syncOperation(op) {
    const { entity, operation, recordId, payload } = op;
    const client = window.supabaseClient;

    switch (operation) {
      case 'create': {
        const { data, error } = await client
          .from(entity)
          .insert(payload)
          .select();

        if (error) throw error;

        // If server generated a different ID, update locally
        if (data && data[0] && data[0].id !== payload.id) {
          await db.update(entity, { ...payload, id: data[0].id });
        }
        break;
      }

      case 'update': {
        // Use server-side revision for optimistic concurrency
        const { data: existing, error: fetchError } = await client
          .from(entity)
          .select('revision')
          .eq('id', recordId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = row not found, which is fine for update (may be deleted)
          throw fetchError;
        }

        // If record exists on server with newer revision, we have a conflict
        if (existing && existing.revision && payload.revision !== existing.revision) {
          // Conflict: merge strategy — prefer server version for unchanged fields
          throw new Error('CONFLICT: revision mismatch for ' + entity + '/' + recordId);
        }

        const { error } = await client
          .from(entity)
          .update({ ...payload, revision: (existing?.revision || 0) + 1 })
          .eq('id', recordId);

        if (error) throw error;
        break;
      }

      case 'delete': {
        // Use tombstone pattern: mark as deleted on server rather than hard delete
        const { error } = await client
          .from(entity)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', recordId);

        if (error) throw error;

        // Also remove from local IndexedDB
        if (typeof db !== 'undefined') {
          await db.delete(entity, recordId);
        }
        break;
      }

      default:
        throw new Error('Unknown operation: ' + operation);
    }
  }

  // ==========================================================================
  // Pull Changes from Server
  // ==========================================================================
  async function pullChanges(since) {
    if (!isOnline() || typeof window.supabaseClient === 'undefined') {
      return { error: 'Offline or no client' };
    }

    const client = window.supabaseClient;
    const sinceStr = since ? new Date(since).toISOString() : new Date(0).toISOString();
    const entities = ['products', 'sales', 'saleItems', 'patients', 'batches',
                      'controlledLogs', 'labTests', 'expenses', 'users'];
    let pulled = {};

    try {
      for (const entity of entities) {
        const { data, error } = await client
          .from(entity)
          .select('*')
          .gte('updated_at', sinceStr)
          .is('deleted_at', null);

        if (error) {
          console.error('[Dawa Smart Sync] Pull failed for', entity, error);
          pulled[entity] = { error: error.message };
        } else {
          pulled[entity] = data || [];
        }
      }

      // Merge pulled records into local IndexedDB
      for (const entity of entities) {
        if (Array.isArray(pulled[entity])) {
          for (const record of pulled[entity]) {
            const existing = await db.getById(entity, record.id);
            if (existing) {
              // Check for conflict: local has changes not yet synced
              const unsyncedOps = getQueue().filter(
                (op) => op.entity === entity &&
                op.recordId === record.id &&
                op.status === 'pending'
              );

              if (unsyncedOps.length > 0) {
                // Local changes pending — skip to avoid overwriting
                console.log('[Dawa Smart Sync] Skipping pull for', entity, record.id,
                            '- local changes pending');
              } else {
                await db.update(entity, record);
              }
            } else {
              await db.add(entity, record);
            }
          }
        }
      }

      // Fetch tombstones (deleted records)
      for (const entity of entities) {
        const { data: tombstones, error } = await client
          .from(entity)
          .select('id')
          .not('deleted_at', 'is', null)
          .gte('deleted_at', sinceStr);

        if (!error && tombstones) {
          for (const tomb of tombstones) {
            if (typeof db !== 'undefined') {
              await db.delete(entity, tomb.id);
            }
          }
        }
      }

      return { success: true, pulled: pulled };

    } catch (error) {
      console.error('[Dawa Smart Sync] Pull error:', error);
      return { error: error.message || 'Pull failed' };
    }
  }

  // ==========================================================================
  // Initialize Sync Layer
  // ==========================================================================
  function initSync() {
    // Only initialize sync if Supabase client is present
    if (typeof window.supabaseClient === 'undefined') {
      console.log('[Dawa Smart Sync] Supabase client not found — operating local-only mode');

      // Initialize sync status for local-only mode
      const existing = localStorage.getItem(SYNC_STATUS_KEY);
      if (!existing) {
        updateSyncStatus('local-only', 0);
      }
      return;
    }

    console.log('[Dawa Smart Sync] Initialized with online synchronization');

    setupConnectionListeners();

    // Initial sync on load
    if (isOnline()) {
      drainQueue();
    }

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('dawa-smart-sync');
      }).catch((err) => {
        console.log('[Dawa Smart Sync] Background sync not supported:', err);
      });
    }

    // Try to pull changes periodically (every 5 minutes when online)
    setInterval(() => {
      if (isOnline() && typeof window.supabaseClient !== 'undefined') {
        pullChanges(localStorage.getItem('dawa_last_pull') || new Date(0).toISOString());
        localStorage.setItem('dawa_last_pull', new Date().toISOString());
      }
    }, 300000); // 5 minutes
  }

  // ==========================================================================
  // Public API
  // ==========================================================================
  window.DawaSync = {
    enqueueOperation: enqueueOperation,
    getQueue: getQueue,
    drainQueue: drainQueue,
    pullChanges: pullChanges,
    isOnline: isOnline,
    init: initSync,
    getStatus: function () {
      try {
        return JSON.parse(localStorage.getItem(SYNC_STATUS_KEY) || '{}');
      } catch (e) {
        return {};
      }
    },
    syncNow: function () {
      drainQueue();
    }
  };

  // Auto-initialize
  if (typeof window.generateId === 'function') {
    initSync();
  }

})();
