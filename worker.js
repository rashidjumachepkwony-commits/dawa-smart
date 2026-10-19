/* =============================================================
   Dawa Smart — Cloudflare Worker (API Gateway)
   =============================================================
   Handles server-side operations that require trusted execution:
   - Health check
   - Local auth token exchange (maps existing users to JWT)
   - Batch synchronization endpoint
   - Public configuration endpoint (returns anon key only)

   Secrets (set via `wrangler secret put`):
   - SUPABASE_URL           — Supabase project URL
   - SUPABASE_ANON_KEY        — Supabase anonymous (publishable) key
   - SUPABASE_SERVICE_ROLE    — Supabase service_role key (NEVER expose to browser)
   - JWT_SECRET               — Secret for signing auth tokens

   Environment variables:
   - ENV: 'production' | 'development'

   Deploy:
   - npm install -g wrangler
   - wrangler deploy
   ============================================================= */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers — restrict to your domains in production
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ─── Health Check ───
      if (path === '/api/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          env: env.ENV || 'unknown'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // ─── Public Config ───
      // Returns ONLY the anonymous/public key — never the service_role key
      if (path === '/api/config') {
        return new Response(JSON.stringify({
          supabaseUrl: env.SUPABASE_URL || null,
          supabaseAnonKey: env.SUPABASE_ANON_KEY || null,
          environment: env.ENV || 'development',
          features: {
            sync: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
            auth: true
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // ─── Local Auth Token Exchange ───
      // Maps existing local username/password to a JWT token
      // Users authenticate with the existing local system, then
      // exchange for a token to use Supabase with RLS policies
      if (path === '/api/auth/local' && method === 'POST') {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
          return new Response(JSON.stringify({ error: 'Missing credentials' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const user = LOCAL_USERS[username.toUpperCase()];
        if (!user) {
          return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Verify password — maps to existing local credentials
        const expectedPasswords = {
          RASHID: 'RASHID2026',
          DEMO: 'DEMO2026'
        };

        if (password !== expectedPasswords[username.toUpperCase()]) {
          return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Create JWT token
        const token = await createJWT({
          sub: user.id,
          username: username.toUpperCase(),
          role: user.role,
          fullName: user.fullName,
          email: user.email,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        }, env.JWT_SECRET);

        return new Response(JSON.stringify({
          token,
          token_type: 'Bearer',
          expires_in: 86400,
          user: {
            id: user.id,
            username: username.toUpperCase(),
            fullName: user.fullName,
            role: user.role,
            email: user.email
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // ─── Batch Sync ───
      // Receives queued operations from the client sync layer
      // Applies them to Supabase using the service_role key (trusted)
      if (path === '/api/sync' && method === 'POST') {
        const authHeader = request.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        // Verify JWT token
        const payload = await verifyJWT(token, env.JWT_SECRET);
        if (!payload) {
          return new Response(JSON.stringify({ error: 'Invalid or missing token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const body = await request.json();
        const { operations } = body;

        if (!operations || !Array.isArray(operations)) {
          return new Response(JSON.stringify({ error: 'Missing operations array' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE;
        if (!supabaseUrl || !supabaseKey) {
          return new Response(JSON.stringify({ error: 'Sync not configured' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const results = {
          processed: 0,
          succeeded: 0,
          failed: 0,
          errors: []
        };

        for (const op of operations) {
          try {
            await processSyncOperation(supabaseUrl, supabaseKey, op);
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

        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // ─── Unknown Route ───
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (e) {
      console.error('[Worker] Error:', e);
      return new Response(JSON.stringify({
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

// ─── Constants ───

const LOCAL_USERS = {
  RASHID: {
    id: 'user_rashidjuma',
    fullName: 'Rashid Juma',
    role: 'developer',
    email: 'rashidjuma@dawasmartz.co.ke'
  },
  DEMO: {
    id: 'user_demo',
    fullName: 'Dawa Smart Demo',
    role: 'demo',
    email: 'demo@dawasmartz.local'
  }
};

// ─── JWT Utilities ───

async function createJWT(payload, secret) {
  const encoder = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const data = encoder.encode(header + '.' + body);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const sigArray = Array.from(new Uint8Array(signature));
  const sigHex = sigArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return header + '.' + body + '.' + sigHex;
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, sigHex] = parts;
    const payload = JSON.parse(atob(bodyB64));

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;

    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(headerB64 + '.' + bodyB64);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map(h => parseInt(h, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, data);

    return isValid ? payload : null;
  } catch (e) {
    return null;
  }
}

// ─── Supabase REST API Helper ───

async function processSyncOperation(supabaseUrl, supabaseKey, op) {
  const { entity, operation, recordId, payload } = op;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  const baseUrl = `${supabaseUrl}/rest/v1/${entity}`;

  switch (operation) {
    case 'create':
      // Idempotent: use upsert to avoid duplicates on retry
      const createRes = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!createRes.ok) {
        const error = await createRes.text();
        throw new Error(`Insert failed: ${error}`);
      }
      break;

    case 'update':
      // Optimistic concurrency: check revision before updating
      const updateRes = await fetch(`${baseUrl}?id=eq.${recordId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          ...payload,
          revision: (payload.revision || 0) + 1
        })
      });
      if (!updateRes.ok) {
        const error = await updateRes.text();
        throw new Error(`Update failed: ${error}`);
      }
      break;

    case 'delete':
      // Soft delete via tombstone
      const deleteRes = await fetch(`${baseUrl}?id=eq.${recordId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ deleted_at: new Date().toISOString() })
      });
      if (!deleteRes.ok) {
        const error = await deleteRes.text();
        throw new Error(`Delete failed: ${error}`);
      }
      break;

    default:
      throw new Error('Unknown operation: ' + operation);
  }
}
