import assert from 'node:assert/strict';
import worker from '../worker.js';

const pharmacyId = '11111111-1111-4111-8111-111111111111';
const otherPharmacyId = '22222222-2222-4222-8222-222222222222';
const jwtSecret = 'test-jwt-secret';
const encryptionKey = Buffer.alloc(32, 7).toString('base64');
const originalFetch = globalThis.fetch;
const storedConfig = {
  pharmacy_id: pharmacyId,
  account_type: 'PAYBILL',
  environment: 'SANDBOX',
  business_shortcode: '123456',
  paybill_number: '123456',
  till_number: null,
  consumer_key: 'test-consumer-key',
  consumer_secret: 'test-consumer-secret',
  passkey: 'test-passkey',
  is_enabled: true,
  min_amount: 1,
  max_amount: 70000
};
const transactions = [];
let transactionId = 0;
let stkRequestCount = 0;
let statusResultCode = 0;
let loseNextInsertResponse = false;

async function createToken(pharmacy = pharmacyId) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'test-user',
    role: 'owner',
    pharmacy_id: pharmacy,
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

function matchesFilter(url, key, value) {
  const filter = url.searchParams.get(key);
  return !filter || filter === `eq.${value}`;
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  if (url.origin === 'https://test.supabase.co') {
    const method = init.method || 'GET';
    const path = url.pathname;
    if (path === '/rest/v1/pharmacy_members') return jsonResponse([{ role: 'owner' }]);
    if (path === '/rest/v1/mpesa_configs' && method === 'GET') {
      return jsonResponse(matchesFilter(url, 'pharmacy_id', pharmacyId) ? [storedConfig] : []);
    }
    if (path === '/rest/v1/mpesa_configs' && method === 'PATCH') {
      Object.assign(storedConfig, JSON.parse(init.body));
      return jsonResponse(null, 204);
    }
    if (path === '/rest/v1/mpesa_transactions' && method === 'POST') {
      const row = { id: `tx-${++transactionId}`, ...JSON.parse(init.body) };
      transactions.push(row);
      if (loseNextInsertResponse) {
        loseNextInsertResponse = false;
        throw new Error('Simulated lost insert response');
      }
      return jsonResponse([row], 201);
    }
    if (path === '/rest/v1/mpesa_transactions' && method === 'GET') {
      const rows = transactions.filter(row =>
        matchesFilter(url, 'pharmacy_id', row.pharmacy_id) &&
        matchesFilter(url, 'checkout_request_id', row.checkout_request_id) &&
        matchesFilter(url, 'client_request_id', row.client_request_id) &&
        matchesFilter(url, 'id', row.id) &&
        matchesFilter(url, 'payment_status', row.payment_status)
      );
      return jsonResponse(rows);
    }
    if (path === '/rest/v1/mpesa_transactions' && method === 'PATCH') {
      const updates = JSON.parse(init.body);
      for (const row of transactions) {
        if (matchesFilter(url, 'pharmacy_id', row.pharmacy_id) &&
            matchesFilter(url, 'checkout_request_id', row.checkout_request_id) &&
            matchesFilter(url, 'client_request_id', row.client_request_id) &&
            matchesFilter(url, 'id', row.id) &&
            matchesFilter(url, 'payment_status', row.payment_status)) {
          Object.assign(row, updates);
        }
      }
      return jsonResponse(null, 204);
    }
    throw new Error(`Unexpected Supabase request: ${method} ${url.pathname}${url.search}`);
  }

  if (url.hostname === 'sandbox.safaricom.co.ke' && url.pathname.startsWith('/oauth/')) {
    return jsonResponse({ access_token: 'test-access-token' });
  }
  if (url.hostname === 'sandbox.safaricom.co.ke' && url.pathname.endsWith('/processrequest')) {
    stkRequestCount++;
    return jsonResponse({
      ResponseCode: '0',
      MerchantRequestID: `merchant-${stkRequestCount}`,
      CheckoutRequestID: `checkout-${stkRequestCount}`,
      CustomerMessage: 'Request accepted'
    });
  }
  if (url.hostname === 'sandbox.safaricom.co.ke' && url.pathname.endsWith('/query')) {
    return jsonResponse({
      ResponseCode: '0',
      ResultCode: statusResultCode,
      ResultDesc: 'Test status'
    });
  }
  throw new Error(`Unexpected external request: ${url}`);
};

async function invoke(path, { method = 'GET', token, body } = {}, env = {}) {
  const request = new Request(`https://worker.test${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return worker.fetch(request, {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE: 'service-role-test',
    JWT_SECRET: jwtSecret,
    MPESA_CONFIG_ENCRYPTION_KEY: encryptionKey,
    ...env
  }, {});
}

try {
  const token = await createToken();
  const otherToken = await createToken(otherPharmacyId);

  const configResponse = await invoke('/api/mpesa/config', { token });
  const configBody = await configResponse.json();
  assert.equal(configResponse.status, 200);
  assert.equal(configBody.config.credentials_configured, true);
  assert.equal('consumer_key' in configBody.config, false);
  assert.equal(JSON.stringify(configBody).includes('test-consumer-secret'), false);
  assert.match(storedConfig.consumer_key, /^enc:v1:/);

  const stkBody = {
    request_id: 'request-0001',
    phone_number: '0712345678',
    amount: 125
  };
  const stkResponse = await invoke('/api/mpesa/stk-push', {
    method: 'POST',
    token,
    body: stkBody
  });
  const stkData = await stkResponse.json();
  assert.equal(stkResponse.status, 200);
  assert.equal(stkData.checkout_request_id, 'checkout-1');
  assert.equal(stkRequestCount, 1);

  const duplicateResponse = await invoke('/api/mpesa/stk-push', {
    method: 'POST',
    token,
    body: stkBody
  });
  const duplicateData = await duplicateResponse.json();
  assert.equal(duplicateResponse.status, 200);
  assert.equal(duplicateData.reused, true);
  assert.equal(stkRequestCount, 1);

  const foreignStatus = await invoke('/api/mpesa/transaction-status', {
    method: 'POST',
    token: otherToken,
    body: { checkout_request_id: 'checkout-1' }
  });
  assert.equal(foreignStatus.status, 404);

  statusResultCode = 0;
  const statusResponse = await invoke('/api/mpesa/transaction-status', {
    method: 'POST',
    token,
    body: { checkout_request_id: 'checkout-1' }
  });
  const statusData = await statusResponse.json();
  assert.equal(statusResponse.status, 200);
  assert.equal(statusData.payment_status, 'SUCCESS');
  assert.equal(typeof statusData.amount, 'number');

  const secondRequest = await invoke('/api/mpesa/stk-push', {
    method: 'POST',
    token,
    body: { ...stkBody, request_id: 'request-0002' }
  });
  assert.equal(secondRequest.status, 200);

  statusResultCode = '500.001.1001';
  const pendingResponse = await invoke('/api/mpesa/transaction-status', {
    method: 'POST',
    token,
    body: { checkout_request_id: 'checkout-2' }
  });
  assert.equal((await pendingResponse.json()).payment_status, 'PENDING');

  const stkCountBeforeAmbiguousInsert = stkRequestCount;
  loseNextInsertResponse = true;
  const ambiguousInsertResponse = await invoke('/api/mpesa/stk-push', {
    method: 'POST',
    token,
    body: { ...stkBody, request_id: 'request-0003' }
  });
  assert.equal(ambiguousInsertResponse.status, 503);
  assert.equal((await ambiguousInsertResponse.json()).request_pending, true);
  const ambiguousRetryResponse = await invoke('/api/mpesa/stk-push', {
    method: 'POST',
    token,
    body: { ...stkBody, request_id: 'request-0003' }
  });
  assert.equal(ambiguousRetryResponse.status, 409);
  assert.equal(stkRequestCount, stkCountBeforeAmbiguousInsert);

  statusResultCode = 1032;
  const callbackResponse = await invoke('/api/mpesa/callback', {
    method: 'POST',
    body: {
      Body: {
        stkCallback: {
          MerchantRequestID: 'merchant-2',
          CheckoutRequestID: 'checkout-2',
          ResultCode: 0,
          ResultDesc: 'Client claimed success'
        }
      }
    }
  });
  assert.equal(callbackResponse.status, 200);
  assert.equal(transactions.find(row => row.checkout_request_id === 'checkout-2').payment_status, 'CANCELLED');

  const missingKeyResponse = await invoke('/api/mpesa/config', {
    token
  }, { MPESA_CONFIG_ENCRYPTION_KEY: undefined });
  assert.equal(missingKeyResponse.status, 503);
  const missingKeyBody = await missingKeyResponse.json();
  assert.match(missingKeyBody.error, /MPESA_CONFIG_ENCRYPTION_KEY/);

  console.log('M-Pesa Worker tests passed: credentials, tenant isolation, idempotency, status, callback verification, and missing-key behavior.');
} finally {
  globalThis.fetch = originalFetch;
}
