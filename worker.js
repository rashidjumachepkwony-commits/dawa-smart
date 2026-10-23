/* =============================================================
   Dawa Smart — Cloudflare Worker (API Gateway)
   =============================================================
   Secure multi-tenant architecture.

   Secrets (set via `wrangler secret put`):
   - SUPABASE_URL           — Supabase project URL
   - SUPABASE_ANON_KEY       — Supabase anonymous key (publishable)
   - SUPABASE_SERVICE_ROLE   — Supabase service_role key (NEVER expose to browser)
   - JWT_SECRET              — Secret for signing auth tokens

   Environment:
   - ENV: 'production' | 'development'
   =========================================================== */

const ALLOWED_ENTITIES = new Set([
  'products', 'batches', 'sales', 'sale_items',
  'patients', 'lab_tests', 'expenses', 'controlled_logs'
]);

const ALLOWED_OPERATIONS = new Set(['create', 'update', 'delete']);

// Role-to-permission mapping for operations
const ROLE_PERMISSIONS = {
  products: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: false, demo: true },
  batches: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: false, demo: false },
  sales: { owner: true, admin: true, manager: true, pharmacist: true, cashier: true, lab: false, doctor: false, demo: true },
  sale_items: { owner: true, admin: true, manager: true, pharmacist: true, cashier: true, lab: false, doctor: false, demo: true },
  patients: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: true, demo: true },
  lab_tests: { owner: true, admin: true, manager: true, pharmacist: false, cashier: false, lab: true, doctor: true, demo: true },
  expenses: { owner: true, admin: true, manager: true, pharmacist: false, cashier: false, lab: false, doctor: false, demo: false },
  controlled_logs: { owner: true, admin: true, manager: false, pharmacist: true, cashier: false, lab: false, doctor: false, demo: false }
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

  const targetPharmacyId = auth.user.pharmacyId;

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  // Detect workspace mixing in batch
  const workspaceMixing = operations.some(op => {
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

  for (const op of operations) {
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
  const { entity, operation, recordId, payload } = op;

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
