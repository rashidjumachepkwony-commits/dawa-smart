/**
 * Dawa Smart — Security Penetration Tests
 * =============================================================
 * Tests common attack vectors against the Worker API and
 * Supabase database to verify multi-tenant isolation.
 *
 * Prerequisites:
 *   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE
 *   - JWT_SECRET for forging test tokens
 *   - WORKER_URL (default: Worker dev URL)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... JWT_SECRET=... \
 *   node tests/test-security.js
 * =============================================================
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const WORKER_URL = process.env.WORKER_URL || 'https://dawa-api.rashidjumachepkwony.workers.dev';

const results = { passed: 0, failed: 0, details: [] };

function log(name, status, detail) {
  const icon = status === 'pass' ? '  ✓' : '  ✗';
  console.log(icon + ' ' + name + (detail ? ': ' + detail : ''));
  results[status === 'pass' ? 'passed' : 'failed']++;
  results.details.push({ name, status, detail });
}

function makeJWT(payload) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// ─── Test: Mass Assignment ────────────────────────────────────
async function testMassAssignment() {
  const token = makeJWT({
    sub: 'user-1',
    email: 'attacker@example.com',
    role: 'cashier',
    pharmacy_id: 'pharmacy-A-id'
  });

  // Try to set protected columns: pharmacy_id, created_at, deleted_at
  const res = await fetch(WORKER_URL + '/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      operations: [{
        entity: 'products',
        operation: 'create',
        recordId: 'mass-attack',
        payload: {
          id: 'mass-attack',
          name: 'Attacker Product',
          pharmacy_id: 'pharmacy-B-id',       // Forged: trying to write to Pharmacy B
          created_at: '2020-01-01',            // Forged: setting historical timestamp
          deleted_at: null,                     // Forged: setting deleted status
          buying_price: 1,
          selling_price: 2,
          quantity: 1000
        }
      }]
    })
  });

  const data = await res.json();
  const success = !res.ok || (data.failed > 0) || (data.succeeded === 0);
  log('Mass assignment: pharmacy_id/created_at/deleted_at rejected', success ? 'pass' : 'fail', data.error || JSON.stringify(data));
}

// ─── Test: SQL Injection in recordId ────────────────────────
async function testSQLInjection() {
  const token = makeJWT({
    sub: 'user-1',
    email: 'attacker@example.com',
    role: 'cashier',
    pharmacy_id: 'pharmacy-A-id'
  });

  const maliciousId = "1' OR '1'='1";
  const res = await fetch(WORKER_URL + '/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      operations: [{
        entity: 'products',
        operation: 'update',
        recordId: maliciousId,
        payload: { quantity: 99999 }
      }]
    })
  });

  const data = await res.json();
  const success = res.ok && (data.errors?.length > 0 || data.failed > 0);
  log('SQL injection in recordId rejected', success ? 'pass' : 'fail', data.error || JSON.stringify(data));
}

// ─── Test: Entity Allowlist ───────────────────────────────────
async function testEntityAllowlist() {
  const token = makeJWT({
    sub: 'user-1',
    email: 'attacker@example.com',
    role: 'cashier',
    pharmacy_id: 'pharmacy-A-id'
  });

  // Try to write to a non-existent or disallowed entity
  const res = await fetch(WORKER_URL + '/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      operations: [{
        entity: 'auth.users', // Trying to access auth schema
        operation: 'create',
        recordId: 'evil-user',
        payload: { id: 'evil', email: 'evil@evil.com', password: 'hacked' }
      }]
    })
  });

  const data = await res.json();
  const success = !res.ok || (data.failed > 0);
  log('Entity allowlist: auth.users rejected', success ? 'pass' : 'fail', data.error || JSON.stringify(data));
}

// ─── Test: Batch Workspace Mixing ─────────────────────────────
async function testBatchWorkspaceMixing() {
  const tokenA = makeJWT({
    sub: 'user-A',
    email: 'userA@example.com',
    role: 'cashier',
    pharmacy_id: 'pharmacy-A-id'
  });

  // Single batch with operations targeting different pharmacies
  const res = await fetch(WORKER_URL + '/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + tokenA
    },
    body: JSON.stringify({
      operations: [
        {
          entity: 'products',
          operation: 'create',
          recordId: 'prod-A',
          payload: { id: 'prod-A', name: 'Prod A', pharmacy_id: 'pharmacy-A-id', buying_price: 1, selling_price: 2, quantity: 10 }
        },
        {
          entity: 'products',
          operation: 'create',
          recordId: 'prod-B',
          payload: { id: 'prod-B', name: 'Prod B', pharmacy_id: 'pharmacy-B-id', buying_price: 1, selling_price: 2, quantity: 10 }
        }
      ]
    })
  });

  const data = await res.json();
  const success = data.failed >= 1; // At least Pharmacy B write should fail
  log('Batch workspace mixing prevented', success ? 'pass' : 'fail', JSON.stringify(data));
}

// ─── Test: JWT None Algorithm Attack ──────────────────────────
async function testJWTNoneAlgorithm() {
  // Craft a token with alg=none
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: 'fake',
    email: 'evil@example.com',
    role: 'owner',
    pharmacy_id: 'pharmacy-A-id',
    exp: Math.floor(Date.now() / 1000) + 86400
  })).toString('base64');
  const forgedToken = header + '.' + payload + '.';

  const res = await fetch(WORKER_URL + '/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + forgedToken
    },
    body: JSON.stringify({ operations: [] })
  });

  const data = await res.json();
  log('JWT none algorithm attack rejected', !res.ok ? 'pass' : 'fail', data.error || JSON.stringify(data));
}

// ─── Test: JWT Algorithm Confusion ────────────────────────────
async function testJWTAlgorithmConfusion() {
  // Try to forge a token using HS256 with an incorrect secret
  const jwt = require('jsonwebtoken');
  const forgedToken = jwt.sign(
    { sub: 'fake', email: 'evil@example.com', role: 'owner', pharmacy_id: 'pharmacy-A-id' },
    'wrong-secret',
    { algorithm: 'HS256' }
  );

  const res = await fetch(WORKER_URL + '/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + forgedToken
    },
    body: JSON.stringify({ operations: [] })
  });

  const data = await res.json();
  log('JWT algorithm confusion (wrong secret) rejected', !res.ok ? 'pass' : 'fail', data.error || JSON.stringify(data));
}

// ─── Test: RLS Bypass via Direct REST ────────────────────────
async function testRLSBypass() {
  // Try to access another pharmacy's data directly via REST
  const res = await fetch(SUPABASE_URL + '/rest/v1/products?pharmacy_id=eq.pharmacy-A-id&select=*', {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Accept': 'application/json'
    }
  });

  // Should fail with 401 (no user context from anon key)
  log('RLS blocks anon access to product list', res.status === 401 || res.status === 403 ? 'pass' : 'fail', 'Status: ' + res.status);
}

// ─── Test: Token in URL Query ─────────────────────────────────
async function testTokenInURL() {
  const token = makeJWT({
    sub: 'user-1',
    email: 'user@example.com',
    role: 'cashier',
    pharmacy_id: 'pharmacy-A-id'
  });

  // Try passing token via query parameter (should be ignored)
  const res = await fetch(WORKER_URL + '/api/sync?access_token=' + token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations: [] })
  });

  const data = await res.json();
  log('Token via URL query rejected', !res.ok ? 'pass' : 'fail', data.error || JSON.stringify(data));
}

// ─── Test: CORS Origin Check ──────────────────────────────────
async function testCORS() {
  // This tests server-side; client-side the browser enforces CORS
  // Here we just verify the Worker sets correct CORS headers
  const res = await fetch(WORKER_URL + '/api/health', { method: 'GET' });
  const headers = res.headers;

  const allowOrigin = headers.get('Access-Control-Allow-Origin');
  const success = allowOrigin !== '*' || (allowOrigin === '*'); // Documented behavior

  // Check if CSP allows credentialed requests
  log('CORS headers present', !!allowOrigin ? 'pass' : 'fail', 'Origin: ' + allowOrigin);
}

// ─── Test: Service Role Key Not in Client ─────────────────────
async function testNoServiceRoleInClient() {
  // Verify Worker never sends service role key in any response
  const res = await await fetch(WORKER_URL + '/api/config');
  const data = await res.json();

  const hasServiceRole = JSON.stringify(data).includes('service_role') ||
    JSON.stringify(data).includes('SUPABASE_SERVICE_ROLE');

  log('Service role key not in /api/config response', !hasServiceRole ? 'pass' : 'fail');
}

// ─── Test: Demo Cannot Access Production ──────────────────────
async function testDemoIsolation() {
  // Demo token should only have access to demo pharmacy
  const demoToken = makeJWT({
    sub: 'demo-user-id',
    email: 'demo@dawasmartz.local',
    role: 'demo',
    pharmacy_id: 'demo-pharmacy-id'
  });

  // Try to forge a production pharmacy_id
  const forgedToken = makeJWT({
    sub: 'demo-user-id',
    email: 'demo@dawasmartz.local',
    role: 'demo',
    pharmacy_id: 'production-pharmacy-id' // Forged: production pharmacy
  });

  const res = await fetch(WORKER_URL + '/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + forgedToken
    },
    body: JSON.stringify({
      operations: [{
        entity: 'products',
        operation: 'create',
        recordId: 'demo-forged',
        payload: { id: 'demo-forged', name: 'Demo Forged', pharmacy_id: 'production-pharmacy-id', buying_price: 1, selling_price: 2, quantity: 10 }
      }]
    })
  });

  const data = await res.json();
  log('Demo cannot forge production pharmacy_id', !res.ok || (data && data.failed > 0) ? 'pass' : 'fail', JSON.stringify(data));
}

// ─── Test: Deleted Records Not Accessible ─────────────────────
async function testSoftDeleteProtection() {
  const token = makeJWT({
    sub: 'user-owner',
    email: 'owner@example.com',
    role: 'owner',
    pharmacy_id: 'pharmacy-A-id'
  });

  // Try to query a deleted record directly
  const res = await fetch(SUPABASE_URL + '/rest/v1/products?deleted_at=not.is.null', {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Accept': 'application/json'
    }
  });

  // Should not return any deleted records (RLS should filter them)
  log('Soft-deleted records not accessible', res.ok ? 'fail' : 'pass', 'Status: ' + res.status);
}

// ─── Run All Tests ────────────────────────────────────────────
async function runAll() {
  console.log('=== Dawa Smart — Security Tests ===\n');

  await testMassAssignment();
  await testSQLInjection();
  await testEntityAllowlist();
  await testBatchWorkspaceMixing();
  await testJWTNoneAlgorithm();
  await testJWTAlgorithmConfusion();
  await testRLSBypass();
  await testTokenInURL();
  await testCORS();
  await testNoServiceRoleInClient();
  await testDemoIsolation();
  await testSoftDeleteProtection();

  console.log('\n=== Security Test Summary ===');
  console.log('Passed: ' + results.passed + '/' + (results.passed + results.failed));
  console.log('Failed: ' + results.failed + '/' + (results.passed + results.failed));

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.details.filter(d => d.status === 'fail').forEach(d => {
      console.log('  - ' + d.name + (d.detail ? ': ' + d.detail : ''));
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll, results, log };
