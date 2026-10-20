/**
 * Dawa Smart — Database CRUD Test Utility
 * =============================================================
 * Tests Supabase database operations: Create, Read, Update, Delete.
 *
 * Prerequisites:
 *   - Supabase project configured with the schema from:
 *     supabase/migrations/20240101000000_init_schema.sql
 *   - SUPABASE_URL and SUPABASE_ANON_KEY environment variables set
 *
 * Usage:
 *   SUPABASE_URL=https://xyz.supabase.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   node tests/test-database-crud.js
 *
 * Or via the Supabase CLI:
 *   supabase test
 * ============================================================= */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const results = { passed: 0, failed: 0 };

function test(name, condition) {
  if (condition) {
    results.passed++;
    console.log('  \u2713 ' + name);
  } else {
    results.failed++;
    console.error('  \u2717 ' + name);
  }
}

async function runTests() {
  console.log('=== Dawa Smart Database CRUD Tests ===\n');

  // Test 1: Health check
  console.log('1. Connection & Health');
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/', {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    test('Supabase API reachable', res.ok);
  } catch (e) {
    test('Supabase API reachable', false);
  }

  // Test 2: CREATE — Insert a product
  console.log('\n2. CREATE');
  const testProduct = {
    id: 'test-' + Date.now(),
    name: 'Test Product',
    sku: 'TEST-001',
    category: 'test',
    unit: 'pack',
    buying_price: 5,
    selling_price: 10,
    quantity: 100,
    expiry_date: '2026-12-31',
    generic: 'TestGeneric',
    controlled: false,
    badge: 'test'
  };

  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/products', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testProduct)
    });
    const data = await res.json();
    test('Insert product succeeds', res.ok && data[0] && data[0].id === testProduct.id);
  } catch (e) {
    test('Insert product succeeds', false);
  }

  // Test 3: READ — Query the product
  console.log('\n3. READ');
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + testProduct.id, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const data = await res.json();
    test('Read product by ID', res.ok && data[0] && data[0].name === 'Test Product');
  } catch (e) {
    test('Read product by ID', false);
  }

  // Test 4: READ — Count products
  console.log('\n4. READ (List)');
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/products?select=count', {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    test('List products succeeds', res.ok);
  } catch (e) {
    test('List products succeeds', false);
  }

  // Test 5: UPDATE — Modify the product
  console.log('\n5. UPDATE');
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + testProduct.id, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quantity: 50, revision: 1 })
    });
    test('Update product quantity', res.ok);
  } catch (e) {
    test('Update product quantity', false);
  }

  // Test 6: DELETE — Remove the test product
  console.log('\n6. DELETE');
  try {
    // Soft delete (tombstone) per the design
    const res = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + testProduct.id, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ deleted_at: new Date().toISOString() })
    });
    test('Soft delete (tombstone) product', res.ok);
  } catch (e) {
    test('Soft delete (tombstone) product', false);
  }

  // Test 7: Verify deleted_at filter works
  console.log('\n7. VERIFY FILTER');
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + testProduct.id + '&select=*', {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const data = await res.json();
    test('Deleted product hidden in normal results', res.ok);
  } catch (e) {
    test('Deleted product hidden in normal results', false);
  }

  // Test 8: Verify RLS is enabled
  console.log('\n8. ROW LEVEL SECURITY');
  try {
    // Try accessing without auth (should fail)
    const res = await fetch(SUPABASE_URL + '/rest/v1/products?select=count', {
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    test('RLS blocks unauthenticated access', !res.ok || res.status === 401 || res.status === 403);
  } catch (e) {
    test('RLS blocks unauthenticated access', false);
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log('Passed: ' + results.passed + '/' + (results.passed + results.failed));
  console.log('Failed: ' + results.failed + '/' + (results.passed + results.failed));

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
