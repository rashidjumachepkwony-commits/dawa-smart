import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const start = app.indexOf('// ===== CLEAR BUSINESS DATA =====');
const end = app.indexOf('function clearTransactionsForFreshInstall()', start);
assert.notEqual(start, -1, 'Data clearing functions start marker exists');
assert.notEqual(end, -1, 'Data clearing functions end marker exists');

const source = app.slice(start, end);

function createClearFunctions({ records = {}, allowed = true, selectedSection = 'sales' } = {}) {
  const reads = [];
  const deleted = [];
  const updated = [];
  const confirmations = [];
  const toasts = [];
  const document = { getElementById: () => ({ value: selectedSection }) };
  const db = {
    getAll(store) {
      reads.push(store);
      return Promise.resolve(records[store] || []);
    },
    delete(store, id) {
      deleted.push([store, id]);
      return Promise.resolve();
    },
    update(store, item) {
      updated.push([store, { ...item }]);
      return Promise.resolve(item);
    }
  };
  const noOp = () => {};
  const run = new Function(
    'db', 'window', 'adminGuard', 'confirm', 'showToast', 'document',
    'loadProducts', 'loadPatients', 'loadCustomers', 'loadProductSearch',
    'updateStats', 'updateProductGrid', 'updatePricingDashboard',
    'loadLabTests', 'loadCreditDashboard', 'loadProfessionalAnalysis',
    'generateCustomReport',
    source + '; return { CLEARABLE_DATA_SECTIONS, ALL_CLEARABLE_DATA_STORES, clearAllData, clearSelectedSectionData, startFreshTransactions };'
  );
  const functions = run(
    db,
    { DawaTenant: { getCurrentPharmacyId: () => 'pharmacy-a' } },
    () => allowed,
    message => { confirmations.push(message); return true; },
    (...args) => toasts.push(args),
    document,
    ...Array(11).fill(noOp)
  );
  return { ...functions, reads, deleted, updated, confirmations, toasts };
}

const clearAll = createClearFunctions({
  records: {
    reportArchives: [
      { id: 'archive-a', pharmacy_id: 'pharmacy-a', revision: 1 },
      { id: 'archive-b', pharmacy_id: 'pharmacy-b', revision: 2 }
    ]
  }
});
clearAll.clearAllData();
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(clearAll.reads, clearAll.ALL_CLEARABLE_DATA_STORES);
assert.equal(clearAll.reads.includes('users'), false, 'Clear all must preserve staff accounts');
assert.equal(clearAll.updated.length, 1, 'Only this pharmacy report archives are cleared');
assert.equal(clearAll.updated[0][1].id, 'archive-a');
assert.equal(clearAll.updated[0][1].is_deleted, true, 'Reports use soft deletion');
assert.equal(clearAll.updated[0][1].revision, 2);
assert.equal(clearAll.deleted.length, 0);
assert.equal(clearAll.confirmations.length, 2);

const clearReports = createClearFunctions({ selectedSection: 'reports' });
clearReports.clearSelectedSectionData();
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(clearReports.reads, ['reportArchives'], 'Report clearing must not touch other sections');
assert.equal(clearReports.confirmations.length, 2);

const startFresh = createClearFunctions();
startFresh.startFreshTransactions();
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(startFresh.reads, ['sales', 'saleItems', 'expenses']);

const denied = createClearFunctions({ allowed: false });
denied.clearAllData();
assert.deepEqual(denied.reads, [], 'Non-managers must not clear data');
assert.deepEqual(denied.confirmations, [], 'Non-managers must not see destructive confirmations');

console.log('Data clearing tests passed: all business sections, tenant-scoped report deletion, specific section clearing, Start Fresh, and denied roles.');
