import assert from 'node:assert/strict';
import worker from '../worker.js';

const pharmacyId = '11111111-1111-4111-8111-111111111111';
const otherPharmacyId = '22222222-2222-4222-8222-222222222222';
const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const demoId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const jwtSecret = 'staff-access-test-secret';
const pharmacy = {
  id: pharmacyId,
  name: 'Test Pharmacy',
  slug: 'test-pharmacy',
  status: 'active',
  address: 'Test Street',
  phone: null,
  kra_pin: null,
  branding: {}
};
const pharmacies = [pharmacy];
const users = [];
const memberships = [
  { id: 'member-admin', auth_user_id: adminId, pharmacy_id: pharmacyId, role: 'developer', status: 'active' },
  { id: 'member-demo', auth_user_id: demoId, pharmacy_id: pharmacyId, role: 'demo', status: 'active' }
];
const tables = Object.fromEntries([
  'products', 'batches', 'sales', 'sale_items', 'patients',
  'lab_tests', 'expenses', 'controlled_logs'
].map(name => [name, []]));
let nextUserId = 0;
const originalFetch = globalThis.fetch;

async function createToken(sub, pharmacy_id = pharmacyId) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub,
    role: 'untrusted-client-role',
    pharmacy_id,
    exp: Math.floor(Date.now() / 1000) + 3600
  }));
  const data = new TextEncoder().encode(header + '.' + payload);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
  const signatureHex = Array.from(signature, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${header}.${payload}.${signatureHex}`;
}

function jsonResponse(data, status = 200) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function matches(row, params) {
  return ['id', 'username', 'pharmacy_id', 'auth_user_id', 'status'].every(key => {
    const filter = params.get(key);
    return !filter || row[key] === filter.slice(3);
  });
}

function requestedRepresentation(init) {
  const headers = init.headers || {};
  const prefer = headers.Prefer || headers.prefer || '';
  return prefer.includes('return=representation');
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  if (url.origin !== 'https://test.supabase.co') {
    throw new Error(`Unexpected external request: ${url}`);
  }

  const method = init.method || 'GET';
  const tableName = url.pathname.split('/').pop();
  const params = url.searchParams;
  const body = init.body ? JSON.parse(init.body) : {};
  const collection = tableName === 'users' ? users
    : tableName === 'pharmacy_members' ? memberships
      : tableName === 'pharmacies' ? pharmacies
      : tables[tableName];
  if (!collection) throw new Error(`Unexpected table: ${tableName}`);

  if (method === 'GET') {
    const rows = collection.filter(row => matches(row, params)).map(row => {
      if (tableName === 'pharmacy_members' && (params.get('select') || '').includes('pharmacy:pharmacies')) {
        return { ...row, pharmacy: pharmacy.id === row.pharmacy_id ? pharmacy : null };
      }
      return { ...row };
    });
    return jsonResponse(rows);
  }

  if (method === 'POST') {
    const row = { ...body };
    if (tableName === 'users') {
      row.id = `00000000-0000-4000-8000-${String(++nextUserId).padStart(12, '0')}`;
    } else if (tableName === 'pharmacy_members') {
      row.id = `member-${memberships.length + 1}`;
    }
    collection.push(row);
    return requestedRepresentation(init) ? jsonResponse([row], 201) : jsonResponse([], 201);
  }

  const matchedRows = collection.filter(row => matches(row, params));
  if (method === 'PATCH') {
    matchedRows.forEach(row => Object.assign(row, body));
    return requestedRepresentation(init) ? jsonResponse(matchedRows, 200) : jsonResponse(null, 204);
  }
  if (method === 'DELETE') {
    for (const row of matchedRows) collection.splice(collection.indexOf(row), 1);
    return jsonResponse(null, 204);
  }
  throw new Error(`Unexpected method: ${method}`);
};

async function invoke(path, { method = 'GET', token, body } = {}) {
  return worker.fetch(new Request(`https://worker.test${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  }), {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE: 'service-role-test',
    JWT_SECRET: jwtSecret
  }, {});
}

try {
  const adminToken = await createToken(adminId);
  const provisionResponse = await invoke('/api/pharmacy/staff-users', {
    method: 'POST',
    token: adminToken,
    body: {
      users: [{
        username: 'TEST STAFF',
        fullName: 'Test Staff',
        password: 'staff-secret-123',
        role: 'cashier',
        status: 'active',
        pharmacy: pharmacy.name
      }]
    }
  });
  assert.equal(provisionResponse.status, 200);
  const provisioned = (await provisionResponse.json()).users[0];
  const storedUser = users.find(user => user.id === provisioned.id);
  assert.ok(storedUser.password_hash.startsWith('pbkdf2-sha256$100000$'));
  assert.equal(storedUser.password_hash.includes('staff-secret-123'), false);
  assert.equal(memberships.some(member =>
    member.auth_user_id === provisioned.id && member.role === 'cashier' &&
    member.status === 'active' && member.pharmacy_id === pharmacyId), true);

  const loginResponse = await invoke('/api/auth/local', {
    method: 'POST',
    body: { username: 'test staff', password: 'staff-secret-123' }
  });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  assert.equal(login.user.username, 'TEST STAFF');
  assert.equal(login.user.role, 'cashier');
  assert.equal(login.pharmacy.id, pharmacyId);

  const savedBranding = {
    name: 'Elvis Community Pharmacy',
    address: '18 Main Street, Nairobi',
    phone: '+254700123456',
    kraPin: 'P123456789X',
    branding: {
      footer: 'Thank you for supporting local healthcare.',
      vatRate: 16,
      logo: 'data:image/png;base64,aGVsbG8='
    }
  };
  const brandingUpdate = await invoke('/api/pharmacy/settings', {
    method: 'PATCH',
    token: login.token,
    body: savedBranding
  });
  assert.equal(brandingUpdate.status, 200);
  assert.deepEqual((await brandingUpdate.json()).settings, {
    id: pharmacyId,
    name: savedBranding.name,
    address: savedBranding.address,
    phone: savedBranding.phone,
    kraPin: savedBranding.kraPin,
    branding: savedBranding.branding
  });
  const brandingRead = await invoke('/api/pharmacy/settings', { token: login.token });
  assert.deepEqual((await brandingRead.json()).settings.branding, savedBranding.branding);

  const invalidLogo = await invoke('/api/pharmacy/settings', {
    method: 'PATCH',
    token: login.token,
    body: { ...savedBranding, branding: { ...savedBranding.branding, logo: 'javascript:alert(1)' } }
  });
  assert.equal(invalidLogo.status, 400);

  const demoBrandingUpdate = await invoke('/api/pharmacy/settings', {
    method: 'PATCH',
    token: await createToken(demoId),
    body: savedBranding
  });
  assert.equal(demoBrandingUpdate.status, 403);

  const staffListResponse = await invoke('/api/pharmacy/staff-users', {
    token: login.token
  });
  assert.equal(staffListResponse.status, 403);

  const allStaffRoles = ['admin', 'manager', 'pharmacist', 'cashier', 'lab', 'doctor'];
  const entities = Object.keys(tables);
  for (const role of allStaffRoles) {
    const subject = `test-${role}`;
    memberships.push({
      id: `member-${role}`,
      auth_user_id: subject,
      pharmacy_id: pharmacyId,
      role,
      status: 'active'
    });
    const token = await createToken(subject);
    for (const entity of entities) {
      const recordId = `record-${role}-${entity}`;
      const operation = async (action, payload = {}) => {
        const response = await invoke('/api/sync', {
          method: 'POST',
          token,
          body: {
            operations: [{
              entity,
              operation: action,
              recordId,
              payload: { id: recordId, pharmacy_id: pharmacyId, name: 'Access test', ...payload }
            }]
          }
        });
        const result = await response.json();
        assert.equal(response.status, 200);
        assert.equal(result.succeeded, 1, `${role} could not ${action} ${entity}: ${JSON.stringify(result.errors)}`);
      };
      await operation('create');
      await operation('update');
      await operation('delete');
    }
  }

  assert.equal(tables.products.some(product => product.id === 'record-cashier-products'), true);

  memberships.push({
    id: 'member-other-pharmacy',
    auth_user_id: 'other-pharmacy-admin',
    pharmacy_id: otherPharmacyId,
    role: 'admin',
    status: 'active'
  });
  const otherPharmacyToken = await createToken('other-pharmacy-admin', otherPharmacyId);
  const crossTenantUpdate = await invoke('/api/sync', {
    method: 'POST',
    token: otherPharmacyToken,
    body: {
      operations: [{
        entity: 'products',
        operation: 'update',
        recordId: 'record-cashier-products',
        payload: { name: 'Must not update another pharmacy' }
      }]
    }
  });
  assert.equal((await crossTenantUpdate.json()).failed, 1);

  const demoToken = await createToken(demoId);
  const demoBatchResponse = await invoke('/api/sync', {
    method: 'POST',
    token: demoToken,
    body: {
      operations: [{
        entity: 'batches',
        operation: 'create',
        recordId: 'demo-batch',
        payload: { name: 'Demo batch' }
      }]
    }
  });
  assert.equal((await demoBatchResponse.json()).failed, 1);

  const unsafeIdResponse = await invoke('/api/sync', {
    method: 'POST',
    token: login.token,
    body: {
      operations: [{
        entity: 'products',
        operation: 'delete',
        recordId: "x' OR '1'='1",
        payload: {}
      }]
    }
  });
  assert.equal((await unsafeIdResponse.json()).failed, 1);

  const renameResponse = await invoke('/api/pharmacy/staff-users', {
    method: 'POST',
    token: adminToken,
    body: {
      users: [{
        id: provisioned.id,
        username: 'RENAMED STAFF',
        fullName: 'Renamed Staff',
        password: 'staff-secret-456',
        role: 'manager',
        status: 'active',
        pharmacy: pharmacy.name
      }]
    }
  });
  assert.equal(renameResponse.status, 200);
  assert.equal(users.find(user => user.id === provisioned.id).username, 'RENAMED STAFF');
  assert.equal(memberships.find(member => member.auth_user_id === provisioned.id).role, 'manager');
  const renamedLogin = await invoke('/api/auth/local', {
    method: 'POST',
    body: { username: 'renamed staff', password: 'staff-secret-456' }
  });
  assert.equal(renamedLogin.status, 200);
  assert.equal((await renamedLogin.json()).user.role, 'manager');

  const deleteResponse = await invoke('/api/pharmacy/staff-users', {
    method: 'DELETE',
    token: adminToken,
    body: { id: provisioned.id }
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(users.some(user => user.id === provisioned.id), false);
  assert.equal(memberships.some(member => member.auth_user_id === provisioned.id), false);

  console.log('Staff Worker tests passed: account provisioning, hashed login, staff CRUD permissions, demo restrictions, and tenant-scoped accounts.');
} finally {
  globalThis.fetch = originalFetch;
}
