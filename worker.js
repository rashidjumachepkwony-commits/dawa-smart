/* =============================================================
   Dawa Smart — Cloudflare Worker (API Gateway)
   =============================================================
   Secure multi-tenant architecture.

   Secrets (set via `wrangler secret put`):
   - SUPABASE_URL           — Supabase project URL
   - SUPABASE_ANON_KEY       — Supabase anonymous key (publishable)
   - SUPABASE_SERVICE_ROLE   — Supabase service_role key (NEVER expose to browser)
   - JWT_SECRET              — Secret for signing auth tokens
   - MPESA_CONFIG_ENCRYPTION_KEY — base64-encoded random 32-byte AES-GCM key

   Environment:
   - ENV: 'production' | 'development'
   =========================================================== */

const ALLOWED_ENTITIES = new Set([
  'products', 'batches', 'sales', 'sale_items',
  'patients', 'lab_tests', 'expenses', 'controlled_logs',
]);

const ALLOWED_OPERATIONS = new Set(['create', 'update', 'delete']);

const ENTITY_ALIASES = {
  saleItems: 'sale_items',
  labTests: 'lab_tests',
  controlledLogs: 'controlled_logs'
};

const FIELD_ALIASES = {
  authUserId: 'auth_user_id',
  ownerId: 'owner_id',
  pharmacyId: 'pharmacy_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  saleId: 'sale_id',
  productId: 'product_id',
  patientId: 'patient_id',
  batchId: 'batch_id',
  labTestId: 'lab_test_id',
  userId: 'user_id',
  mpesaTransactionId: 'mpesa_transaction_id'
};

function normalizeEntityName(entity) {
  if (!entity || typeof entity !== 'string') return entity;
  const key = entity.trim();
  return ENTITY_ALIASES[key] || key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase();
}

function normalizePayloadKeys(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const normalized = {};
  Object.keys(payload).forEach((key) => {
    const alias = FIELD_ALIASES[key] || key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase();
    normalized[alias] = payload[key];
  });
  return normalized;
}

// Role-to-permission mapping for operations
const ROLE_PERMISSIONS = {
  products: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: false, demo: true },
  batches: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: false, demo: false },
  sales: { owner: true, admin: true, manager: true, pharmacist: true, cashier: true, lab: false, doctor: false, demo: true },
  sale_items: { owner: true, admin: true, manager: true, pharmacist: true, cashier: true, lab: false, doctor: false, demo: true },
  patients: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: true, demo: true },
  lab_tests: { owner: true, admin: true, manager: true, pharmacist: false, cashier: false, lab: true, doctor: true, demo: true },
  expenses: { owner: true, admin: true, manager: true, pharmacist: false, cashier: false, lab: false, doctor: false, demo: false },
  controlled_logs: { owner: true, admin: true, manager: false, pharmacist: true, cashier: false, lab: false, doctor: false, demo: false },
};

const PROTECTED_COLUMNS = new Set([
  'pharmacy_id', 'created_at', 'updated_at', 'deleted_at',
  'revision', 'user_id', 'auth_user_id', 'id'
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ─── CORS Headers ────────────────────────────────────────
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ─── Health Check (Public) ───
      if (path === '/api/health') {
        return jsonResponse(200, {
          status: 'ok',
          timestamp: new Date().toISOString(),
          env: env.ENV || 'unknown'
        }, corsHeaders);
      }

      // ─── Public Config (returns anon key only) ───
      if (path === '/api/config') {
        return jsonResponse(200, {
          supabaseUrl: env.SUPABASE_URL || null,
           supabaseAnonKey: env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || null,
          environment: env.ENV || 'development',
          features: {
             sync: !!(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY)),
            auth: true,
            multitenant: true
          }
        }, corsHeaders);
      }

      // ─── Authentication Routes ───
      if (path === '/api/auth/register' && method === 'POST') {
        return await handleRegister(request, env, corsHeaders);
      }

      if (path === '/api/auth/local' && method === 'POST') {
        return await handleLocalAuth(request, env, corsHeaders);
      }

      // ─── Protected Routes (require JWT) ───

      // ─── Pharmacy Management ───
      if (path === '/api/pharmacies' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleCreatePharmacy(request, auth, env, corsHeaders);
      }

      if (path === '/api/pharmacy/memberships' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleListMemberships(request, auth, env, corsHeaders);
      }

      if (path === '/api/pharmacy/switch' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleSwitchPharmacy(request, auth, env, corsHeaders);
      }

      if (path === '/api/pharmacy/invite' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleInviteMember(request, auth, env, corsHeaders);
      }

      if (path === '/api/invitations' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleListInvitations(request, auth, env, corsHeaders);
      }

      if (path.startsWith('/api/invitations/') && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleInvitationAction(request, auth, env, corsHeaders);
      }

      // ─── Sync Endpoint (Protected) ───
      if (path === '/api/sync' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleSync(request, auth, env, corsHeaders);
      }

      // ─── Admin Endpoints (Developer role only) ───
      if (path === '/api/admin/pharmacies' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        if (auth.user.role !== 'developer') {
          return jsonErrorResponse('Admin access required', 403, corsHeaders);
        }
        return await handleListAllPharmacies(auth, env, corsHeaders);
      }

      if (path === '/api/admin/members' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        if (auth.user.role !== 'developer') {
          return jsonErrorResponse('Admin access required', 403, corsHeaders);
        }
        return await handleListAllMembers(auth, env, corsHeaders);
      }

      // ─── M-Pesa STK Push Endpoints ───
      if (path === '/api/mpesa/config' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleGetMpesaConfig(request, auth, env, corsHeaders);
      }

      if (path === '/api/mpesa/config' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        if (!['owner', 'admin'].includes(auth.user.role)) {
          return jsonErrorResponse('Only pharmacy owners and admins can change M-Pesa settings', 403, corsHeaders);
        }
        return await handleSaveMpesaConfig(request, auth, env, corsHeaders);
      }

      if (path === '/api/mpesa/config/test' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        if (!['owner', 'admin'].includes(auth.user.role)) {
          return jsonErrorResponse('Only pharmacy owners and admins can test M-Pesa settings', 403, corsHeaders);
        }
        return await handleTestMpesaConfig(request, auth, env, corsHeaders);
      }

      if (path === '/api/mpesa/stk-push' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        if (!['owner', 'admin', 'manager', 'pharmacist', 'cashier'].includes(auth.user.role)) {
          return jsonErrorResponse('Your role cannot initiate M-Pesa payments', 403, corsHeaders);
        }
        return await handleStkPush(request, auth, env, corsHeaders);
      }

      if (path === '/api/mpesa/transaction-status' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        if (!['owner', 'admin', 'manager', 'pharmacist', 'cashier'].includes(auth.user.role)) {
          return jsonErrorResponse('Your role cannot check M-Pesa payment status', 403, corsHeaders);
        }
        return await handleTransactionStatus(request, auth, env, corsHeaders);
      }

      if (path === '/api/mpesa/callback' && method === 'POST') {
        return await handleMpesaCallback(request, env, corsHeaders);
      }

      if (path === '/api/mpesa/transactions' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        if (!['owner', 'admin', 'manager', 'pharmacist', 'cashier'].includes(auth.user.role)) {
          return jsonErrorResponse('Your role cannot view M-Pesa transactions', 403, corsHeaders);
        }
        return await handleListMpesaTransactions(request, auth, env, corsHeaders);
      }

      // ─── Unknown Route ───
      return jsonResponse(404, { error: 'Not found' }, corsHeaders);

    } catch (e) {
      console.error('[Worker] Error:', e);
      return jsonResponse(500, { error: 'Internal server error' }, corsHeaders);
    }
  }
};

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

function jsonErrorResponse(error, status = 400, headers = {}) {
  return jsonResponse(status, { error }, headers);
}

// ─── JWT ────────────────────────────────────────────────────

async function createJWT(payload, secret) {
  const encoder = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const data = encoder.encode(header + '.' + body);
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const sigHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return header + '.' + body + '.' + sigHex;
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, sigHex] = parts;
    let payload;
    try {
      payload = JSON.parse(atob(bodyB64));
    } catch (e) {
      return null;
    }

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;

    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(headerB64 + '.' + bodyB64);
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map(h => parseInt(h, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    return isValid ? payload : null;
  } catch (e) {
    return null;
  }
}

// ─── Password Hashing ─────────────────────────────────────────
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(derived)));
}

// ─── Auth Guard ─────────────────────────────────────────────

async function requireAuth(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token || token === 'null' || token === 'undefined') {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  if (!payload.sub || !payload.pharmacy_id) {
    return { error: 'Token missing required claims', status: 401 };
  }

  // Verify membership exists and is active using service_role (RLS would block anon key)
  const memberCheckWithService = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?auth_user_id=eq.${payload.sub}&pharmacy_id=eq.${payload.pharmacy_id}&status=eq.active&select=role`,
    {
      method: 'GET',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
        'Accept': 'application/json'
      }
    }
  ).catch(() => null);

  if (!memberCheckWithService || memberCheckWithService.length === 0) {
    return { error: 'Membership not found or suspended', status: 403 };
  }

  const membership = memberCheckWithService[0];

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      role: membership.role,
      pharmacyId: payload.pharmacy_id,
      username: payload.username
    }
  };
}

// ─── Supabase REST API Helper ───────────────────────────────
// All Worker-side Supabase calls use the service_role key for authorization
// enforcement in Worker code, NOT relying on RLS alone.

function supabaseFetch(env, path, options = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
    return Promise.reject(new Error('Supabase not configured'));
  }

  const headers = {
    'apikey': env.SUPABASE_SERVICE_ROLE,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
    ...options.headers
  };

  return fetch(env.SUPABASE_URL + path, {
    ...options,
    headers
  }).then(async res => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase error ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
  });
}

// ═══════════════════════════════════════════════════════════
// Route Handlers
// ═══════════════════════════════════════════════════════════

// ─── Registration ───────────────────────────────────────────
async function handleRegister(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password || !body.fullName || !body.pharmacyName) {
    return jsonErrorResponse('Missing required fields: email, password, fullName, pharmacyName', 400, corsHeaders);
  }

  if (body.password.length < 8) {
    return jsonErrorResponse('Password must be at least 8 characters', 400, corsHeaders);
  }

  // Use service_role to check if email already exists as a member
  const existing = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?email=eq.${encodeURIComponent(body.email)}&select=*`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  if (existing && existing.length > 0) {
    return jsonErrorResponse('Email already registered', 409, corsHeaders);
  }

  // Check if pharmacy slug is taken
  const slug = body.pharmacyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const slugCheck = await supabaseFetch(env,
    `/rest/v1/pharmacies?slug=eq.${slug}&select=id`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  if (slugCheck && slugCheck.length > 0) {
    return jsonErrorResponse('Pharmacy name already taken', 409, corsHeaders);
  }

  try {
    // 1. Create user in Supabase Auth
    const authRes = await fetch(env.SUPABASE_URL + '/auth/v1/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        data: { full_name: body.fullName }
      })
    });

    if (!authRes.ok) {
      const err = await authRes.json();
      return jsonErrorResponse(err.msg || err.error_description || 'Signup failed', 400, corsHeaders);
    }

    const authData = await authRes.json();
    const userId = authData.user.id;

    // 2. Create pharmacy
    const pharmacyRes = await supabaseFetch(env, '/rest/v1/pharmacies', {
      method: 'POST',
      body: JSON.stringify({
        name: body.pharmacyName,
        slug: slug,
        owner_id: userId,
        status: 'trial',
        phone: body.phone || null,
        address: body.address || null,
        kra_pin: body.kraPin || null
      })
    });

    if (!pharmacyRes || !pharmacyRes.id) {
      return jsonErrorResponse('Failed to create pharmacy', 500, corsHeaders);
    }

    // 3. Create membership (the owner)
    await supabaseFetch(env, '/rest/v1/pharmacy_members', {
      method: 'POST',
      body: JSON.stringify({
        pharmacy_id: pharmacyRes.id,
        auth_user_id: userId,
        email: body.email,
        role: 'owner',
        status: 'active'
      })
    });

    // 4. Return JWT token
    const token = await createJWT({
      sub: userId,
      email: body.email,
      username: body.fullName,
      role: 'owner',
      pharmacy_id: pharmacyRes.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    }, env.JWT_SECRET);

    return jsonResponse(200, {
      token,
      token_type: 'Bearer',
      expires_in: 86400,
      user: { id: userId, email: body.email, fullName: body.fullName, role: 'owner' },
      pharmacy: { id: pharmacyRes.id, name: body.pharmacyName, slug, status: 'trial' }
    }, corsHeaders);

  } catch (e) {
    console.error('[Worker] Registration error:', e);
    return jsonErrorResponse('Registration failed', 500, corsHeaders);
  }
}

// ─── Local Auth (legacy bridge) ─────────────────────────────
async function handleLocalAuth(request, env, corsHeaders) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return jsonErrorResponse('Missing credentials', 400, corsHeaders);
  }

  // Legacy user password hash verification (PBKDF2)
  // Passwords are NOT stored in source — only their base64-encoded hash
  // To update: base64(PBKDF2(password, salt, 100000, 'SHA-256'))
  const LEGACY_USER_CREDENTIALS = {
    'RASHID': {
      id: 'user_rashidjuma',
      email: 'rashidjuma@dawasmartz.co.ke',
      role: 'developer',
      pharmacySlug: 'dawa-smart',
      passwordHash: 'gut2nL0dXhDeRx6yzozOciYUat7DkKfbhND7966bwpY=',
      passwordSalt: 'static_salt_dawa_smart'
    },
    'DEMO': {
      id: 'user_demo',
      email: 'demo@dawasmartz.local',
      role: 'demo',
      pharmacySlug: 'dawa-smart-demo',
      passwordHash: 'ebIFiQeI2QZOCTt9a1DWWe2QjJ6DlK+hjvemeH4Lj4Y=',
      passwordSalt: 'static_salt_demo'
    }
  };

  const user = LEGACY_USER_CREDENTIALS[username.toUpperCase()];
  if (!user) {
    return jsonErrorResponse('Invalid credentials', 401, corsHeaders);
  }

  // Verify password using PBKDF2
  const providedHash = await hashPassword(password, user.passwordSalt);
  if (providedHash !== user.passwordHash) {
    return jsonErrorResponse('Invalid credentials', 401, corsHeaders);
  }

  // Look up or create pharmacy for this user
  let pharmacy = await supabaseFetch(env,
    `/rest/v1/pharmacies?slug=eq.${user.pharmacySlug}&select=*`,
    { headers: { 'Accept': 'application/json', 'Prefer': 'return=representation' } }
  ).catch(() => []);

  if (!pharmacy || pharmacy.length === 0) {
    // Create the pharmacy (for legacy users)
    const pharmacyName = username === 'RASHID' ? 'Dawa Smart' :
                         username === 'DEMO' ? 'Dawa Smart Demo' : 'Unknown';

    pharmacy = await supabaseFetch(env, '/rest/v1/pharmacies', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        name: pharmacyName,
        slug: user.pharmacySlug,
        owner_id: null, // Legacy users don't have Supabase Auth user IDs
        status: username === 'DEMO' ? 'trial' : 'active'
      })
    }).catch(() => null);
  }

  if (!pharmacy || (Array.isArray(pharmacy) && pharmacy.length === 0)) {
    return jsonErrorResponse('Failed to create or find pharmacy', 500, corsHeaders);
  }

  // Handle case where pharmacy is an array (from SELECT) or object (from POST with return=representation)
  if (Array.isArray(pharmacy)) {
    pharmacy = pharmacy[0];
  }

  // Check membership by auth_user_id OR email (within this pharmacy)
  let membership = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?pharmacy_id=eq.${pharmacy.id}&select=role,status,id,auth_user_id&or=(auth_user_id.eq.${user.id},email.eq.${encodeURIComponent(user.email)})`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  if (!membership || membership.length === 0) {
    // Create membership (with .catch() for safety)
    await supabaseFetch(env, '/rest/v1/pharmacy_members', {
      method: 'POST',
      body: JSON.stringify({
        pharmacy_id: pharmacy.id,
        auth_user_id: user.id,
        email: user.email,
        role: user.role,
        status: 'active'
      })
    }).catch(() => null);
    membership = [{ role: user.role, status: 'active' }];
  } else if (membership[0].auth_user_id !== user.id) {
    // Link existing membership to this legacy user
    await supabaseFetch(env,
      `/rest/v1/pharmacy_members?id=eq.${membership[0].id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          auth_user_id: user.id,
          status: 'active'
        })
      }
    ).catch(() => null);
  }

  const token = await createJWT({
    sub: user.id,
    email: user.email,
    username: username,
    role: membership[0].role,
    pharmacy_id: pharmacy.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  }, env.JWT_SECRET);

  return jsonResponse(200, {
    token,
    token_type: 'Bearer',
    expires_in: 86400,
    user: {
      id: user.id,
      email: user.email,
      fullName: username === 'RASHID' ? 'Rashid Juma' : 'Dawa Smart Demo',
      role: membership[0].role,
      username: username,
      verified: true,
      status: 'active'
    },
    pharmacy: {
      id: pharmacy.id,
      name: pharmacy.name,
      slug: pharmacy.slug,
      status: pharmacy.status
    }
  }, corsHeaders);
}

// ─── List Memberships ───────────────────────────────────────
async function handleListMemberships(request, auth, env, corsHeaders) {
  const memberships = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?auth_user_id=eq.${auth.user.id}&select=pharmacy:pharmacies(id,name,slug,status),role,status,id`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  return jsonResponse(200, { memberships: memberships || [] }, corsHeaders);
}

// ─── Switch Pharmacy ──────────────────────────────────────────
async function handleSwitchPharmacy(request, auth, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  const targetPharmacyId = body?.pharmacy_id;

  if (!targetPharmacyId) {
    return jsonErrorResponse('Missing pharmacy_id', 400, corsHeaders);
  }

  // Verify user has active membership in target pharmacy
  const membership = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?auth_user_id=eq.${auth.user.id}&pharmacy_id=eq.${targetPharmacyId}&status=eq.active&select=role,pharmacy:pharmacies(id,name,slug,status)`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  if (!membership || membership.length === 0) {
    return jsonErrorResponse('No active membership in this pharmacy', 403, corsHeaders);
  }

  // Issue a new JWT token for this pharmacy
  const token = await createJWT({
    sub: auth.user.id,
    email: auth.user.email,
    username: auth.user.username,
    role: membership[0].role,
    pharmacy_id: targetPharmacyId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  }, env.JWT_SECRET);

  return jsonResponse(200, {
    token,
    token_type: 'Bearer',
    expires_in: 86400,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      fullName: auth.user.username,
      role: membership[0].role,
      username: auth.user.username
    },
    pharmacy: membership[0].pharmacy
  }, corsHeaders);
}

// ─── Invite Member ────────────────────────────────────────────
async function handleInviteMember(request, auth, env, corsHeaders) {
  if (!['owner', 'admin'].includes(auth.user.role)) {
    return jsonErrorResponse('Only owners and admins can invite members', 403, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.role) {
    return jsonErrorResponse('Missing email or role', 400, corsHeaders);
  }

  const allowedRoles = ['admin', 'manager', 'pharmacist', 'cashier', 'lab', 'doctor'];
  if (!allowedRoles.includes(body.role)) {
    return jsonErrorResponse('Invalid role', 400, corsHeaders);
  }

  // Check if email already a member
  const existing = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?pharmacy_id=eq.${auth.user.pharmacyId}&email=eq.${encodeURIComponent(body.email)}&select=id,role,status`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  if (existing && existing.length > 0) {
    if (existing[0].status === 'active') {
      return jsonErrorResponse('User already a member', 409, corsHeaders);
    }
    // Update existing invitation
    await supabaseFetch(env,
      `/rest/v1/pharmacy_members?id=eq.${existing[0].id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: body.role, status: 'active', invited_by: auth.user.id })
      }
    );
  } else {
    // Create invitation
    await supabaseFetch(env, '/rest/v1/pharmacy_members', {
      method: 'POST',
      body: JSON.stringify({
        pharmacy_id: auth.user.pharmacyId,
        auth_user_id: null,
        email: body.email,
        role: body.role,
        status: 'pending',
        invited_by: auth.user.id
      })
    });
  }

  return jsonResponse(200, { message: 'Invitation sent' }, corsHeaders);
}

// ─── List Invitations ─────────────────────────────────────────
async function handleListInvitations(request, auth, env, corsHeaders) {
  const invitations = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?email=eq.${encodeURIComponent(auth.user.email)}&status=eq.pending&select=*,pharmacy:pharmacies(id,name,slug)`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  return jsonResponse(200, { invitations: invitations || [] }, corsHeaders);
}

// ─── Accept/Reject Invitation ────────────────────────────────
async function handleInvitationAction(request, auth, env, corsHeaders) {
  const url = new URL(request.url);
  const invitationId = url.pathname.split('/').pop();

  const body = await request.json().catch(() => null);
  const action = body?.action || 'accept';

  // Verify invitation belongs to this user's email
  const invitation = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?id=eq.${invitationId}&email=eq.${encodeURIComponent(auth.user.email)}&select=*`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  if (!invitation || invitation.length === 0) {
    return jsonErrorResponse('Invitation not found', 404, corsHeaders);
  }

  if (action === 'accept') {
    if (invitation[0].auth_user_id) {
      return jsonErrorResponse('Invitation already accepted', 400, corsHeaders);
    }

    await supabaseFetch(env,
      `/rest/v1/pharmacy_members?id=eq.${invitationId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          auth_user_id: auth.user.id,
          status: 'active'
        })
      }
    );

    return jsonResponse(200, { message: 'Membership accepted', pharmacy: { id: invitation[0].pharmacy_id } }, corsHeaders);
  } else if (action === 'reject') {
    await supabaseFetch(env,
      `/rest/v1/pharmacy_members?id=eq.${invitationId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' })
      }
    );
    return jsonResponse(200, { message: 'Invitation rejected' }, corsHeaders);
  }

  return jsonErrorResponse('Invalid action', 400, corsHeaders);
}

// ─── Create Pharmacy ──────────────────────────────────────────
async function handleCreatePharmacy(request, auth, env, corsHeaders) {
  if (auth.user.role !== 'owner' && auth.user.role !== 'admin' && auth.user.role !== 'developer') {
    return jsonErrorResponse('Only owners can create pharmacies', 403, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.name) {
    return jsonErrorResponse('Pharmacy name required', 400, corsHeaders);
  }

  const slug = (body.slug || body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const pharmacy = await supabaseFetch(env, '/rest/v1/pharmacies', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      slug,
      owner_id: auth.user.id,
      status: 'trial',
      address: body.address || null,
      phone: body.phone || null,
      kra_pin: body.kraPin || null
    })
  });

  return jsonResponse(200, { pharmacy }, corsHeaders);
}

// ═══════════════════════════════════════════════════════════
// Sync Handler (Replaces original with workspace isolation)
// ═══════════════════════════════════════════════════════════

async function handleSync(request, auth, env, corsHeaders) {
  const body = await request.json();
  const { operations } = body;

  if (!operations || !Array.isArray(operations)) {
    return jsonErrorResponse('Missing operations array', 400, corsHeaders);
  }

  const normalizedOperations = operations.map((op) => ({
    ...op,
    entity: normalizeEntityName(op && op.entity),
    payload: normalizePayloadKeys(op && op.payload)
  }));

  const targetPharmacyId = auth.user.pharmacyId;

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  // Detect workspace mixing in batch
  const workspaceMixing = normalizedOperations.some(op => {
    if (op.payload && op.payload.pharmacy_id && op.payload.pharmacy_id !== targetPharmacyId) {
      return true;
    }
    if (op.pharmacyId && op.pharmacyId !== targetPharmacyId) {
      return true;
    }
    return false;
  });

  if (workspaceMixing) {
    return jsonErrorResponse('Cannot mix workspaces in a single sync batch', 403, corsHeaders);
  }

  for (const op of normalizedOperations) {
    try {
      await processSyncOperationSecure(env, auth.user, targetPharmacyId, op);
      results.succeeded++;
    } catch (e) {
      results.failed++;
      results.errors.push({
        id: op.id,
        entity: op.entity,
        error: e.message
      });
    }
    results.processed++;
  }

  return jsonResponse(200, results, corsHeaders);
}

// ─── Secure Sync Operation Processor ──────────────────────────
async function processSyncOperationSecure(env, user, pharmacyId, op) {
  const entity = normalizeEntityName(op && op.entity);
  const operation = op && op.operation;
  const recordId = op && op.recordId;
  const payload = normalizePayloadKeys(op && op.payload);

  // 1. Validate entity allowlist
  if (!ALLOWED_ENTITIES.has(entity)) {
    throw new Error('Entity not allowed: ' + entity);
  }

  // 2. Validate operation
  if (!ALLOWED_OPERATIONS.has(operation)) {
    throw new Error('Operation not allowed: ' + operation);
  }

  // 3. Check role permission for this entity
  const rolePerms = ROLE_PERMISSIONS[entity];
  if (!rolePerms) {
    throw new Error('No permissions defined for entity: ' + entity);
  }

  const hasPermission = rolePerms[user.role];
  if (!hasPermission) {
    throw new Error('Role ' + user.role + ' cannot ' + operation + ' on ' + entity);
  }

  // 4. Strip protected columns from client payload
  const cleanPayload = { ...payload };
  Object.keys(cleanPayload).forEach(col => {
    if (PROTECTED_COLUMNS.has(col)) {
      delete cleanPayload[col];
    }
  });

  // 5. Force-set pharmacy_id (ignore client value)
  cleanPayload.pharmacy_id = pharmacyId;

  // 6. Validate child record parent belongs to same workspace
  if (entity === 'sale_items' && cleanPayload.sale_id) {
    const sale = await supabaseFetch(env,
      `/rest/v1/sales?id=eq.${cleanPayload.sale_id}&select=pharmacy_id`,
      { headers: { 'Accept': 'application/json' } }
    ).catch(() => []);

    if (!sale || sale.length === 0) {
      throw new Error('Parent sale not found or not in your workspace');
    }

    if (sale[0].pharmacy_id !== pharmacyId) {
      throw new Error('Parent sale belongs to a different workspace');
    }
  }

  if (entity === 'batches' && cleanPayload.product_id) {
    const product = await supabaseFetch(env,
      `/rest/v1/products?id=eq.${cleanPayload.product_id}&select=pharmacy_id`,
      { headers: { 'Accept': 'application/json' } }
    ).catch(() => []);

    if (!product || product.length === 0) {
      throw new Error('Parent product not found or not in your workspace');
    }

    if (product[0].pharmacy_id !== pharmacyId) {
      throw new Error('Parent product belongs to a different workspace');
    }

    cleanPayload.pharmacy_id = product[0].pharmacy_id;
  }

  // 7. Process operation
  const baseUrl = `${env.SUPABASE_URL}/rest/v1/${entity}`;

  switch (operation) {
    case 'create':
      // Use idempotent insert; check if record already exists
      const existing = await supabaseFetch(env,
        `${baseUrl}?id=eq.${recordId}&select=id`,
        { headers: { 'Accept': 'application/json' } }
      ).catch(() => []);

      if (existing && existing.length > 0) {
        // Update instead
        await supabaseFetch(env,
          `${baseUrl}?id=eq.${recordId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              ...cleanPayload,
              revision: (cleanPayload.revision || 0) + 1
            })
          }
        );
      } else {
        await supabaseFetch(env, baseUrl, {
          method: 'POST',
          body: JSON.stringify(cleanPayload)
        });
      }
      break;

    case 'update':
      // Verify ownership before updating
      const record = await supabaseFetch(env,
        `${baseUrl}?id=eq.${recordId}&select=pharmacy_id`,
        { headers: { 'Accept': 'application/json' } }
      ).catch(() => []);

      if (!record || record.length === 0 || record[0].pharmacy_id !== pharmacyId) {
        throw new Error('Record not found or not in your workspace');
      }

      await supabaseFetch(env,
        `${baseUrl}?id=eq.${recordId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...cleanPayload,
            revision: (cleanPayload.revision || record[0].revision || 0) + 1,
            pharmacy_id: pharmacyId
          })
        }
      );
      break;

    case 'delete':
      // Verify ownership before deleting
      const verify = await supabaseFetch(env,
        `${baseUrl}?id=eq.${recordId}&select=pharmacy_id`,
        { headers: { 'Accept': 'application/json' } }
      ).catch(() => []);

      if (!verify || verify.length === 0 || verify[0].pharmacy_id !== pharmacyId) {
        throw new Error('Record not found or not in your workspace');
      }

      await supabaseFetch(env,
        `${baseUrl}?id=eq.${recordId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ deleted_at: new Date().toISOString() })
        }
      );
      break;

    default:
      throw new Error('Unknown operation: ' + operation);
  }
}

// ─── Admin: List All Pharmacies ─────────────────────────────────
async function handleListAllPharmacies(auth, env, corsHeaders) {
  const pharmacies = await supabaseFetch(env,
    `/rest/v1/pharmacies?select=id,name,slug,status,owner_id,created_at`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  return jsonResponse(200, {
    pharmacies: pharmacies || [],
    count: Array.isArray(pharmacies) ? pharmacies.length : 0
  }, corsHeaders);
}

// ─── Admin: List All Members ──────────────────────────────────────
async function handleListAllMembers(auth, env, corsHeaders) {
  const members = await supabaseFetch(env,
    `/rest/v1/pharmacy_members?select=id,pharmacy_id,auth_user_id,email,role,status,created_at,pharmacy:pharmacies(id,name,slug)&order=created_at.desc`,
    { headers: { 'Accept': 'application/json' } }
  ).catch(() => []);

  return jsonResponse(200, {
    members: members || [],
    count: Array.isArray(members) ? members.length : 0
  }, corsHeaders);
}

// ═══════════════════════════════════════════════════════════
// M-Pesa STK Push Handlers
// ═══════════════════════════════════════════════════════════

const MPESA_CREDENTIAL_PREFIX = 'enc:v1:';
const MPESA_CREDENTIAL_FIELDS = ['consumer_key', 'consumer_secret', 'passkey'];

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function getMpesaEncryptionKey(env) {
  if (!env.MPESA_CONFIG_ENCRYPTION_KEY) {
    throw new Error('MPESA_CONFIG_ENCRYPTION_KEY is required for M-Pesa credential encryption');
  }
  const encodedKey = env.MPESA_CONFIG_ENCRYPTION_KEY;
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encodedKey)) {
    throw new Error('MPESA_CONFIG_ENCRYPTION_KEY must be a valid base64-encoded 32-byte key');
  }
  const rawKey = base64ToBytes(encodedKey);
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptMpesaCredential(value, env) {
  const key = await getMpesaEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value)
  );
  return MPESA_CREDENTIAL_PREFIX + bytesToBase64(iv) + ':' + bytesToBase64(new Uint8Array(ciphertext));
}

async function decryptMpesaCredential(value, env) {
  if (!value || !value.startsWith(MPESA_CREDENTIAL_PREFIX)) return value;
  const [encodedIv, encodedCiphertext] = value.slice(MPESA_CREDENTIAL_PREFIX.length).split(':');
  if (!encodedIv || !encodedCiphertext) throw new Error('Stored M-Pesa credential has an invalid encrypted format');

  const key = await getMpesaEncryptionKey(env);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(encodedIv) },
    key,
    base64ToBytes(encodedCiphertext)
  );
  return new TextDecoder().decode(plaintext);
}

// ─── Helper: Get M-Pesa Config ──────────────────────────────────
async function getMpesaConfig(env, pharmacyId) {
  const configs = await supabaseFetch(env,
    `/rest/v1/mpesa_configs?pharmacy_id=eq.${pharmacyId}&select=*`,
    { headers: { 'Accept': 'application/json' } }
  );
  if (!configs || configs.length === 0) return null;

  const storedConfig = configs[0];
  const legacyCredentials = MPESA_CREDENTIAL_FIELDS.filter((field) =>
    storedConfig[field] && !storedConfig[field].startsWith(MPESA_CREDENTIAL_PREFIX)
  );

  if (legacyCredentials.length > 0 && !env.MPESA_CONFIG_ENCRYPTION_KEY) {
    throw new Error('MPESA_CONFIG_ENCRYPTION_KEY is required to secure existing pharmacy credentials');
  }
  if (legacyCredentials.length > 0) {
    const encryptedCredentials = {};
    for (const field of legacyCredentials) {
      encryptedCredentials[field] = await encryptMpesaCredential(storedConfig[field], env);
    }
    await supabaseFetch(env,
      `/rest/v1/mpesa_configs?pharmacy_id=eq.${encodeURIComponent(pharmacyId)}`,
      { method: 'PATCH', body: JSON.stringify(encryptedCredentials) }
    );
    Object.assign(storedConfig, encryptedCredentials);
  }

  const config = { ...storedConfig };
  for (const field of MPESA_CREDENTIAL_FIELDS) {
    config[field] = await decryptMpesaCredential(config[field], env);
  }
  return config;
}

// ─── Helper: Generate OAuth Token ───────────────────────────────
async function generateMpesaOAuthToken(config) {
  const baseUrl = config.environment === 'PRODUCTION' 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke';
  
  const auth = btoa(`${config.consumer_key}:${config.consumer_secret}`);
  
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token generation failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  if (!data.access_token) {
    throw new Error('OAuth response did not include an access token');
  }
  return data.access_token;
}

// ─── Helper: Generate STK Password & Timestamp ──────────────────
function generateStkPassword(shortcode, passkey) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  const timestamp = parts.year + parts.month + parts.day + parts.hour + parts.minute + parts.second;
  const password = btoa(`${shortcode}${passkey}${timestamp}`);
  return { password, timestamp };
}

function getMpesaPaymentStatus(resultCode) {
  if (resultCode === undefined || resultCode === null || resultCode === '') return 'PENDING';
  const code = String(resultCode);
  if (code === '0') return 'SUCCESS';
  if (code === '1032') return 'CANCELLED';
  if (code === '1037') return 'TIMEOUT';
  if (code.startsWith('500.')) return 'PENDING';
  return 'FAILED';
}

function safeMpesaError(error, fallback) {
  const message = error && error.message ? error.message : '';
  return message.includes('MPESA_CONFIG_ENCRYPTION_KEY') ? message : fallback;
}

async function queryMpesaStatus(config, checkoutRequestId) {
  const shortcode = config.account_type === 'PAYBILL'
    ? (config.paybill_number || config.business_shortcode)
    : (config.till_number || config.business_shortcode);
  const { password, timestamp } = generateStkPassword(shortcode, config.passkey);
  const baseUrl = config.environment === 'PRODUCTION'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  const token = await generateMpesaOAuthToken(config);
  const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.errorMessage || 'Safaricom status query failed');
  }
  if ((result.ResultCode === undefined || result.ResultCode === null || result.ResultCode === '') &&
      String(result.ResponseCode) !== '0') {
    throw new Error(result.errorMessage || result.ResponseDescription || 'Safaricom status query was not accepted');
  }
  return result;
}

// ─── Helper: Format Phone Number ────────────────────────────────
function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  } else if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

// ─── Get M-Pesa Config ──────────────────────────────────────────
async function handleGetMpesaConfig(request, auth, env, corsHeaders) {
  try {
    const config = await getMpesaConfig(env, auth.user.pharmacyId);
    
    if (!config) {
      return jsonResponse(200, { config: null, configured: false }, corsHeaders);
    }
    
    const safeConfig = {
      account_type: config.account_type,
      environment: config.environment,
      paybill_number: config.paybill_number,
      till_number: config.till_number,
      business_shortcode: config.business_shortcode,
      is_enabled: config.is_enabled,
      min_amount: config.min_amount,
      max_amount: config.max_amount,
      credentials_configured: MPESA_CREDENTIAL_FIELDS.every((field) => Boolean(config[field])),
      configured: true
    };
    
    return jsonResponse(200, { config: safeConfig, configured: true }, corsHeaders);
  } catch (e) {
    console.error('[Worker] Get M-Pesa config error:', e.message);
    return jsonErrorResponse(safeMpesaError(e, 'Failed to get M-Pesa config'),
      String(e.message || '').includes('MPESA_CONFIG_ENCRYPTION_KEY') ? 503 : 500,
      corsHeaders);
  }
}

// ─── Save M-Pesa Config ─────────────────────────────────────────
async function handleSaveMpesaConfig(request, auth, env, corsHeaders) {
  try {
    const body = await request.json();

    if (!['PAYBILL', 'BUY_GOODS'].includes(body.account_type)) {
      return jsonErrorResponse('Invalid account type', 400, corsHeaders);
    }
    
    if (!['SANDBOX', 'PRODUCTION'].includes(body.environment)) {
      return jsonErrorResponse('Invalid environment', 400, corsHeaders);
    }
    
    if (body.paybill_number && !/^[0-9]{5,10}$/.test(body.paybill_number)) {
      return jsonErrorResponse('Invalid paybill number', 400, corsHeaders);
    }
    if (body.till_number && !/^[0-9]{5,10}$/.test(body.till_number)) {
      return jsonErrorResponse('Invalid till number', 400, corsHeaders);
    }

    if (!body.business_shortcode || !/^[0-9]{5,10}$/.test(body.business_shortcode)) {
      return jsonErrorResponse('A valid M-Pesa business shortcode is required', 400, corsHeaders);
    }

    const minAmount = Number(body.min_amount ?? 1);
    const maxAmount = Number(body.max_amount ?? 70000);
    if (!Number.isFinite(minAmount) || !Number.isFinite(maxAmount) ||
        minAmount < 1 || maxAmount < minAmount || maxAmount > 70000) {
      return jsonErrorResponse('Invalid minimum or maximum payment amount', 400, corsHeaders);
    }

    const existing = await getMpesaConfig(env, auth.user.pharmacyId);
    const credentials = {};
    for (const field of MPESA_CREDENTIAL_FIELDS) {
      const submittedValue = typeof body[field] === 'string' ? body[field].trim() : '';
      credentials[field] = submittedValue || (existing && existing[field]) || '';
      if (!credentials[field]) {
        return jsonErrorResponse('Enter all M-Pesa credentials before saving this pharmacy configuration', 400, corsHeaders);
      }
    }

    if (!env.MPESA_CONFIG_ENCRYPTION_KEY) {
      return jsonErrorResponse('Worker is missing MPESA_CONFIG_ENCRYPTION_KEY; credentials were not saved', 503, corsHeaders);
    }

    const encryptedCredentials = {};
    for (const field of MPESA_CREDENTIAL_FIELDS) {
      encryptedCredentials[field] = await encryptMpesaCredential(credentials[field], env);
    }
    
    const configData = {
      pharmacy_id: auth.user.pharmacyId,
      paybill_number: body.paybill_number || null,
      till_number: body.till_number || null,
      account_type: body.account_type,
      business_shortcode: body.business_shortcode,
      environment: body.environment || 'SANDBOX',
      ...encryptedCredentials,
      result_url: body.result_url || null,
      timeout_url: body.timeout_url || null,
      is_enabled: body.is_enabled !== undefined ? body.is_enabled : false,
      min_amount: minAmount,
      max_amount: maxAmount,
      updated_at: new Date().toISOString()
    };
    
    if (existing) {
      await supabaseFetch(env,
        `/rest/v1/mpesa_configs?pharmacy_id=eq.${encodeURIComponent(auth.user.pharmacyId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(configData)
        }
      );
      return jsonResponse(200, { message: 'M-Pesa configuration updated', configured: true }, corsHeaders);
    } else {
      await supabaseFetch(env, '/rest/v1/mpesa_configs', {
        method: 'POST',
        body: JSON.stringify(configData)
      });
      return jsonResponse(200, { message: 'M-Pesa configuration saved', configured: true }, corsHeaders);
    }
  } catch (e) {
    console.error('[Worker] Save M-Pesa config error:', e.message);
    return jsonErrorResponse(safeMpesaError(e, 'Failed to save M-Pesa config. Check the Worker encryption secret and database configuration.'),
      String(e.message || '').includes('MPESA_CONFIG_ENCRYPTION_KEY') ? 503 : 500,
      corsHeaders);
  }
}

// ─── Test M-Pesa Config ─────────────────────────────────────────
async function handleTestMpesaConfig(request, auth, env, corsHeaders) {
  try {
    const config = await getMpesaConfig(env, auth.user.pharmacyId);
    
    if (!config) {
      return jsonErrorResponse('No M-Pesa configuration found', 404, corsHeaders);
    }
    
    if (!config.is_enabled) {
      return jsonErrorResponse('M-Pesa is not enabled', 400, corsHeaders);
    }
    
    try {
      await generateMpesaOAuthToken(config);
      return jsonResponse(200, { 
        success: true, 
        message: 'M-Pesa configuration test successful'
      }, corsHeaders);
    } catch (e) {
      return jsonErrorResponse('M-Pesa test failed: ' + e.message, 400, corsHeaders);
    }
  } catch (e) {
    console.error('[Worker] Test M-Pesa config error:', e.message);
    return jsonErrorResponse(safeMpesaError(e, 'Failed to test M-Pesa config'),
      String(e.message || '').includes('MPESA_CONFIG_ENCRYPTION_KEY') ? 503 : 500,
      corsHeaders);
  }
}

// ─── Initiate STK Push ──────────────────────────────────────────
async function handleStkPush(request, auth, env, corsHeaders) {
  let requestId = null;
  let transactionInsertAttempted = false;
  let transactionRecorded = false;
  let stkSubmitted = false;
  try {
    const body = await request.json();

    requestId = typeof body.request_id === 'string' ? body.request_id.trim() : '';
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) {
      return jsonErrorResponse('A valid request_id is required', 400, corsHeaders);
    }
    if (typeof body.phone_number !== 'string' || !body.phone_number.trim() ||
        body.amount === undefined || body.amount === null || body.amount === '') {
      return jsonErrorResponse('Phone number and amount are required', 400, corsHeaders);
    }
    
    const requestedAmount = Number(body.amount);
    if (!Number.isFinite(requestedAmount)) {
      return jsonErrorResponse('Amount must be a valid number', 400, corsHeaders);
    }
    const amount = Math.ceil(requestedAmount);
    if (amount < 1 || amount > 70000) {
      return jsonErrorResponse('Amount must be between 1 and 70,000', 400, corsHeaders);
    }
    
    const phoneNumber = formatPhoneNumber(body.phone_number);
    if (!/^254[17]\d{8}$/.test(phoneNumber)) {
      return jsonErrorResponse('Invalid Kenyan phone number format', 400, corsHeaders);
    }
    
    const config = await getMpesaConfig(env, auth.user.pharmacyId);
    
    if (!config || !config.is_enabled) {
      return jsonErrorResponse('M-Pesa is not configured or enabled for this pharmacy', 400, corsHeaders);
    }
    
    if (amount < config.min_amount || amount > config.max_amount) {
      return jsonErrorResponse(`Amount must be between ${config.min_amount} and ${config.max_amount}`, 400, corsHeaders);
    }

    const encodedPharmacyId = encodeURIComponent(auth.user.pharmacyId);
    const encodedRequestId = encodeURIComponent(requestId);
    const previous = await supabaseFetch(env,
      `/rest/v1/mpesa_transactions?pharmacy_id=eq.${encodedPharmacyId}&client_request_id=eq.${encodedRequestId}&select=id,checkout_request_id,merchant_request_id,payment_status&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (previous && previous.length > 0) {
      const previousTransaction = previous[0];
      if (previousTransaction.checkout_request_id) {
        return jsonResponse(200, {
          success: true,
          reused: true,
          message: 'Existing M-Pesa request found',
          checkout_request_id: previousTransaction.checkout_request_id,
          merchant_request_id: previousTransaction.merchant_request_id
        }, corsHeaders);
      }
      if (previousTransaction.payment_status === 'FAILED') {
        return jsonResponse(409, {
          success: false,
          request_pending: false,
          message: 'The previous request failed before a tracking ID was created. Start a new payment request.'
        }, corsHeaders);
      }
      return jsonResponse(409, {
        success: false,
        request_pending: true,
        message: 'This request may already have reached Safaricom. Check its status before starting another payment.'
      }, corsHeaders);
    }

    transactionInsertAttempted = true;
    const transactionRows = await supabaseFetch(env, '/rest/v1/mpesa_transactions', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        pharmacy_id: auth.user.pharmacyId,
        client_request_id: requestId,
        phone_number: phoneNumber,
        amount,
        payment_status: 'PENDING'
      })
    });
    const transaction = Array.isArray(transactionRows) ? transactionRows[0] : null;
    if (!transaction || !transaction.id) {
      return jsonErrorResponse('Could not create a safe payment record; no STK request was sent', 503, corsHeaders);
    }
    transactionRecorded = true;
    
    const token = await generateMpesaOAuthToken(config);
    const shortcode = config.account_type === 'PAYBILL'
      ? (config.paybill_number || config.business_shortcode)
      : (config.till_number || config.business_shortcode);
    const { password, timestamp } = generateStkPassword(shortcode, config.passkey);
    
    const baseUrl = config.environment === 'PRODUCTION' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
    
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: config.account_type === 'PAYBILL' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: `${new URL(request.url).origin}/api/mpesa/callback`,
      AccountReference: `DAWA${requestId.slice(-8)}`,
      TransactionDesc: 'Pharmacy Sale'
    };
    
    stkSubmitted = true;
    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPayload)
    });
    
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok || String(responseData.ResponseCode) !== '0') {
      await supabaseFetch(env,
        `/rest/v1/mpesa_transactions?id=eq.${encodeURIComponent(transaction.id)}&pharmacy_id=eq.${encodedPharmacyId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            payment_status: 'FAILED',
            result_description: responseData.errorMessage || responseData.ResponseDescription || 'Safaricom rejected the STK request',
            transaction_metadata: { response: responseData }
          })
        }
      );
      return jsonErrorResponse(responseData.errorMessage || responseData.ResponseDescription || 'Safaricom rejected the STK request', 502, corsHeaders);
    }

    if (!responseData.CheckoutRequestID || !responseData.MerchantRequestID) {
      return jsonResponse(503, {
        success: false,
        request_pending: true,
        message: 'Safaricom accepted the request without tracking IDs. Do not retry; contact support.'
      }, corsHeaders);
    }

    try {
      await supabaseFetch(env,
        `/rest/v1/mpesa_transactions?id=eq.${encodeURIComponent(transaction.id)}&pharmacy_id=eq.${encodedPharmacyId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            merchant_request_id: responseData.MerchantRequestID,
            checkout_request_id: responseData.CheckoutRequestID,
            transaction_metadata: { response: responseData }
          })
        }
      );
    } catch (error) {
      console.error('[Worker] Accepted STK request could not be linked to its transaction:', error.message);
      return jsonResponse(503, {
        success: false,
        request_pending: true,
        message: 'Safaricom may have sent the payment prompt, but the transaction record could not be updated. Do not retry this request; contact support.'
      }, corsHeaders);
    }
    
    return jsonResponse(200, {
      success: true,
      message: 'STK Push sent successfully',
      checkout_request_id: responseData.CheckoutRequestID,
      merchant_request_id: responseData.MerchantRequestID,
      response_code: responseData.ResponseCode,
      response_description: responseData.ResponseDescription,
      customer_message: responseData.CustomerMessage
    }, corsHeaders);
    
  } catch (e) {
    console.error('[Worker] STK Push error:', e.message);
    if (transactionRecorded) {
      if (!stkSubmitted) {
        try {
          await supabaseFetch(env,
            `/rest/v1/mpesa_transactions?pharmacy_id=eq.${encodeURIComponent(auth.user.pharmacyId)}&client_request_id=eq.${encodeURIComponent(requestId)}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                payment_status: 'FAILED',
                result_description: 'Could not authenticate with Safaricom'
              })
            }
          );
        } catch (updateError) {
          console.error('[Worker] Could not mark unauthenticated STK request as failed:', updateError.message);
        }
        return jsonErrorResponse('Could not authenticate with Safaricom. Check the Daraja credentials and try again.', 502, corsHeaders);
      }
      return jsonResponse(503, {
        success: false,
        request_pending: true,
        request_id: requestId,
        message: 'The payment request may be processing. Do not start another request until its status is checked.'
      }, corsHeaders);
    }
    if (transactionInsertAttempted) {
      return jsonResponse(503, {
        success: false,
        request_pending: true,
        request_id: requestId,
        message: 'The payment record could not be confirmed. Retry only with this same request; do not start a new payment.'
      }, corsHeaders);
    }
    return jsonErrorResponse(safeMpesaError(e, 'STK Push could not be completed. Check the M-Pesa configuration and try again.'),
      String(e.message || '').includes('MPESA_CONFIG_ENCRYPTION_KEY') ? 503 : 500,
      corsHeaders);
  }
}

// ─── Check Transaction Status ───────────────────────────────────
async function handleTransactionStatus(request, auth, env, corsHeaders) {
  try {
    const body = await request.json();
    
    if (typeof body.checkout_request_id !== 'string' || !body.checkout_request_id.trim()) {
      return jsonErrorResponse('CheckoutRequestID is required', 400, corsHeaders);
    }

    const checkoutRequestId = body.checkout_request_id.trim();
    const encodedCheckoutId = encodeURIComponent(checkoutRequestId);
    const encodedPharmacyId = encodeURIComponent(auth.user.pharmacyId);
    const transactions = await supabaseFetch(env,
      `/rest/v1/mpesa_transactions?checkout_request_id=eq.${encodedCheckoutId}&pharmacy_id=eq.${encodedPharmacyId}&select=id,merchant_request_id,amount,mpesa_receipt_number,payment_status&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!transactions || transactions.length === 0) {
      return jsonErrorResponse('M-Pesa transaction was not found for this pharmacy', 404, corsHeaders);
    }
    const transaction = transactions[0];

    if (transaction.payment_status && transaction.payment_status !== 'PENDING') {
      return jsonResponse(200, {
        payment_status: transaction.payment_status,
        mpesa_receipt_number: transaction.mpesa_receipt_number,
        amount: transaction.amount
      }, corsHeaders);
    }

    const config = await getMpesaConfig(env, auth.user.pharmacyId);
    
    if (!config) {
      return jsonErrorResponse('M-Pesa not configured', 400, corsHeaders);
    }
    const responseData = await queryMpesaStatus(config, checkoutRequestId);
    const resultCode = responseData.ResultCode;
    const paymentStatus = getMpesaPaymentStatus(resultCode);
    const receiptNumber = responseData.MpesaReceiptNumber || transaction.mpesa_receipt_number || null;
    if (paymentStatus !== 'PENDING') {
      await supabaseFetch(env,
        `/rest/v1/mpesa_transactions?id=eq.${encodeURIComponent(transaction.id)}&pharmacy_id=eq.${encodedPharmacyId}&payment_status=eq.PENDING`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            result_code: String(resultCode),
            result_description: responseData.ResultDesc || null,
            payment_status: paymentStatus,
            mpesa_receipt_number: receiptNumber,
            transaction_date: paymentStatus === 'SUCCESS' ? new Date().toISOString() : null,
            transaction_metadata: { status_query: responseData }
          })
        }
      );
    }

    const refreshedTransactions = await supabaseFetch(env,
      `/rest/v1/mpesa_transactions?id=eq.${encodeURIComponent(transaction.id)}&pharmacy_id=eq.${encodedPharmacyId}&select=payment_status,mpesa_receipt_number,amount&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    const refreshed = refreshedTransactions && refreshedTransactions[0] ? refreshedTransactions[0] : transaction;
    
    return jsonResponse(200, {
      result_code: responseData.ResultCode,
      result_description: responseData.ResultDesc,
      payment_status: refreshed.payment_status || paymentStatus,
      mpesa_receipt_number: refreshed.mpesa_receipt_number || receiptNumber,
      amount: refreshed.amount
    }, corsHeaders);
    
  } catch (e) {
    console.error('[Worker] Transaction status error:', e.message);
    return jsonErrorResponse(safeMpesaError(e, 'Failed to check M-Pesa transaction status'),
      String(e.message || '').includes('MPESA_CONFIG_ENCRYPTION_KEY') ? 503 : 500,
      corsHeaders);
  }
}

// ─── M-Pesa Callback Handler ────────────────────────────────────
async function handleMpesaCallback(request, env, corsHeaders) {
  try {
    const callbackData = await request.json();
    console.log('[Worker] M-Pesa callback received');
    
    const stkCallback = callbackData.Body?.stkCallback;
    if (!stkCallback) {
      return jsonResponse(200, { ResultCode: 0, ResultDesc: 'Accepted' }, corsHeaders);
    }
    
    const checkoutRequestId = typeof stkCallback.CheckoutRequestID === 'string'
      ? stkCallback.CheckoutRequestID
      : '';
    const merchantRequestId = typeof stkCallback.MerchantRequestID === 'string'
      ? stkCallback.MerchantRequestID
      : '';
    if (!checkoutRequestId) {
      return jsonErrorResponse('Missing CheckoutRequestID', 400, corsHeaders);
    }
    const transactions = await supabaseFetch(env,
      `/rest/v1/mpesa_transactions?checkout_request_id=eq.${encodeURIComponent(checkoutRequestId)}&select=id,pharmacy_id,merchant_request_id,payment_status`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!transactions || transactions.length === 0) {
      console.error('[Worker] Callback: Transaction not found for', checkoutRequestId);
      return jsonResponse(200, { ResultCode: 0, ResultDesc: 'Accepted' }, corsHeaders);
    }
    
    const transaction = transactions[0];
    if (transaction.merchant_request_id && merchantRequestId &&
        transaction.merchant_request_id !== merchantRequestId) {
      console.error('[Worker] Callback merchant request ID did not match');
      return jsonResponse(200, { ResultCode: 0, ResultDesc: 'Accepted' }, corsHeaders);
    }

    const config = await getMpesaConfig(env, transaction.pharmacy_id);
    if (!config) {
      return jsonErrorResponse('M-Pesa configuration was not found for callback transaction', 503, corsHeaders);
    }
    const verifiedResult = await queryMpesaStatus(config, checkoutRequestId);
    const verifiedCode = verifiedResult.ResultCode;
    const paymentStatus = getMpesaPaymentStatus(verifiedCode);
    let mpesaReceiptNumber = null;
    if (stkCallback.CallbackMetadata?.Item) {
      const receiptItem = stkCallback.CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
      if (receiptItem) mpesaReceiptNumber = receiptItem.Value;
    }
    
    if (paymentStatus !== 'PENDING' && transaction.payment_status === 'PENDING') {
      await supabaseFetch(env,
        `/rest/v1/mpesa_transactions?id=eq.${encodeURIComponent(transaction.id)}&pharmacy_id=eq.${encodeURIComponent(transaction.pharmacy_id)}&payment_status=eq.PENDING`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            result_code: String(verifiedCode),
            result_description: verifiedResult.ResultDesc || stkCallback.ResultDesc || null,
            payment_status: paymentStatus,
            mpesa_receipt_number: verifiedResult.MpesaReceiptNumber || mpesaReceiptNumber,
            transaction_date: paymentStatus === 'SUCCESS' ? new Date().toISOString() : null,
            transaction_metadata: { callback: stkCallback, status_query: verifiedResult }
          })
        }
      );
    }
    
    return jsonResponse(200, { ResultCode: 0, ResultDesc: 'Accepted' }, corsHeaders);
    
  } catch (e) {
    console.error('[Worker] M-Pesa callback error:', e.message);
    return jsonErrorResponse('Could not process M-Pesa callback', 500, corsHeaders);
  }
}

// ─── List M-Pesa Transactions ───────────────────────────────────
async function handleListMpesaTransactions(request, auth, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    
    let query = `/rest/v1/mpesa_transactions?pharmacy_id=eq.${auth.user.pharmacyId}&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    if (status) {
      query += `&payment_status=eq.${status}`;
    }
    if (startDate) {
      query += `&created_at=gte.${startDate}`;
    }
    if (endDate) {
      query += `&created_at=lte.${endDate}`;
    }
    
    const transactions = await supabaseFetch(env,
      query,
      { headers: { 'Accept': 'application/json' } }
    ).catch(() => []);
    
    let countQuery = `/rest/v1/mpesa_transactions?pharmacy_id=eq.${auth.user.pharmacyId}&select=id`;
    if (status) countQuery += `&payment_status=eq.${status}`;
    if (startDate) countQuery += `&created_at=gte.${startDate}`;
    if (endDate) countQuery += `&created_at=lte.${endDate}`;
    
    const countResult = await supabaseFetch(env,
      countQuery,
      { headers: { 'Accept': 'application/json', 'Prefer': 'count=exact' } }
    ).catch(() => []);
    
    const totalCount = countResult ? countResult.length : 0;
    
    return jsonResponse(200, {
      transactions: transactions || [],
      total: totalCount,
      limit,
      offset
    }, corsHeaders);
    
  } catch (e) {
    console.error('[Worker] List M-Pesa transactions error:', e);
    return jsonErrorResponse('Failed to list M-Pesa transactions', 500, corsHeaders);
  }
}
