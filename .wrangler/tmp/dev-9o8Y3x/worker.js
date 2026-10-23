var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-3bJ2Tg/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker.js
var ALLOWED_ENTITIES = /* @__PURE__ */ new Set([
  "products",
  "batches",
  "sales",
  "sale_items",
  "patients",
  "lab_tests",
  "expenses",
  "controlled_logs"
]);
var ALLOWED_OPERATIONS = /* @__PURE__ */ new Set(["create", "update", "delete"]);
var ROLE_PERMISSIONS = {
  products: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: false, demo: true },
  batches: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: false, demo: false },
  sales: { owner: true, admin: true, manager: true, pharmacist: true, cashier: true, lab: false, doctor: false, demo: true },
  sale_items: { owner: true, admin: true, manager: true, pharmacist: true, cashier: true, lab: false, doctor: false, demo: true },
  patients: { owner: true, admin: true, manager: true, pharmacist: true, cashier: false, lab: false, doctor: true, demo: true },
  lab_tests: { owner: true, admin: true, manager: true, pharmacist: false, cashier: false, lab: true, doctor: true, demo: true },
  expenses: { owner: true, admin: true, manager: true, pharmacist: false, cashier: false, lab: false, doctor: false, demo: false },
  controlled_logs: { owner: true, admin: true, manager: false, pharmacist: true, cashier: false, lab: false, doctor: false, demo: false }
};
var PROTECTED_COLUMNS = /* @__PURE__ */ new Set([
  "pharmacy_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "revision",
  "user_id",
  "auth_user_id",
  "id"
]);
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      if (path === "/api/health") {
        return jsonResponse(200, {
          status: "ok",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          env: env.ENV || "unknown"
        }, corsHeaders);
      }
      if (path === "/api/config") {
        return jsonResponse(200, {
          supabaseUrl: env.SUPABASE_URL || null,
          supabaseAnonKey: env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || null,
          environment: env.ENV || "development",
          features: {
            sync: !!(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY)),
            auth: true,
            multitenant: true
          }
        }, corsHeaders);
      }
      if (path === "/api/auth/register" && method === "POST") {
        return await handleRegister(request, env, corsHeaders);
      }
      if (path === "/api/auth/local" && method === "POST") {
        return await handleLocalAuth(request, env, corsHeaders);
      }
      if (path === "/api/pharmacies" && method === "POST") {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleCreatePharmacy(request, auth, env, corsHeaders);
      }
      if (path === "/api/pharmacy/memberships" && method === "GET") {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleListMemberships(request, auth, env, corsHeaders);
      }
      if (path === "/api/pharmacy/switch" && method === "POST") {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleSwitchPharmacy(request, auth, env, corsHeaders);
      }
      if (path === "/api/pharmacy/invite" && method === "POST") {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleInviteMember(request, auth, env, corsHeaders);
      }
      if (path === "/api/invitations" && method === "GET") {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleListInvitations(request, auth, env, corsHeaders);
      }
      if (path.startsWith("/api/invitations/") && method === "POST") {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleInvitationAction(request, auth, env, corsHeaders);
      }
      if (path === "/api/sync" && method === "POST") {
        const auth = await requireAuth(request, env);
        if (auth.error) return jsonErrorResponse(auth.error, auth.status, corsHeaders);
        return await handleSync(request, auth, env, corsHeaders);
      }
      return jsonResponse(404, { error: "Not found" }, corsHeaders);
    } catch (e) {
      console.error("[Worker] Error:", e);
      return jsonResponse(500, { error: "Internal server error" }, corsHeaders);
    }
  }
};
function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
__name(jsonResponse, "jsonResponse");
function jsonErrorResponse(error, status = 400, headers = {}) {
  return jsonResponse(status, { error }, headers);
}
__name(jsonErrorResponse, "jsonErrorResponse");
async function createJWT(payload, secret) {
  const encoder = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = encoder.encode(header + "." + body);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const sigHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return header + "." + body + "." + sigHex;
}
__name(createJWT, "createJWT");
async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigHex] = parts;
    let payload;
    try {
      payload = JSON.parse(atob(bodyB64));
    } catch (e) {
      return null;
    }
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && now > payload.exp) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(headerB64 + "." + bodyB64);
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    return isValid ? payload : null;
  } catch (e) {
    return null;
  }
}
__name(verifyJWT, "verifyJWT");
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 1e5, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(derived)));
}
__name(hashPassword, "hashPassword");
async function requireAuth(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token || token === "null" || token === "undefined") {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) {
    return { error: "Invalid or expired token", status: 401 };
  }
  if (!payload.sub || !payload.pharmacy_id) {
    return { error: "Token missing required claims", status: 401 };
  }
  const memberCheck = await supabaseFetch(env, "/rest/v1/pharmacy_members", {
    method: "GET",
    headers: {
      "apikey": env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY}`,
      "Accept": "application/json"
    }
  });
  const memberCheckWithService = await supabaseFetch(
    env,
    `/rest/v1/pharmacy_members?auth_user_id=eq.${payload.sub}&pharmacy_id=eq.${payload.pharmacy_id}&status=eq.active&select=role`,
    {
      method: "GET",
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
        "Accept": "application/json"
      }
    }
  ).catch(() => null);
  if (!memberCheckWithService || memberCheckWithService.length === 0) {
    return { error: "Membership not found or suspended", status: 403 };
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
__name(requireAuth, "requireAuth");
function supabaseFetch(env, path, options = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
    return Promise.reject(new Error("Supabase not configured"));
  }
  const headers = {
    "apikey": env.SUPABASE_SERVICE_ROLE,
    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
    ...options.headers
  };
  return fetch(env.SUPABASE_URL + path, {
    ...options,
    headers
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase error ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
  });
}
__name(supabaseFetch, "supabaseFetch");
async function handleRegister(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password || !body.fullName || !body.pharmacyName) {
    return jsonErrorResponse("Missing required fields: email, password, fullName, pharmacyName", 400, corsHeaders);
  }
  if (body.password.length < 8) {
    return jsonErrorResponse("Password must be at least 8 characters", 400, corsHeaders);
  }
  const existing = await supabaseFetch(
    env,
    `/rest/v1/pharmacy_members?email=eq.${encodeURIComponent(body.email)}&select=*`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => []);
  if (existing && existing.length > 0) {
    return jsonErrorResponse("Email already registered", 409, corsHeaders);
  }
  const slug = body.pharmacyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const slugCheck = await supabaseFetch(
    env,
    `/rest/v1/pharmacies?slug=eq.${slug}&select=id`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => []);
  if (slugCheck && slugCheck.length > 0) {
    return jsonErrorResponse("Pharmacy name already taken", 409, corsHeaders);
  }
  try {
    const authRes = await fetch(env.SUPABASE_URL + "/auth/v1/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        data: { full_name: body.fullName }
      })
    });
    if (!authRes.ok) {
      const err = await authRes.json();
      return jsonErrorResponse(err.msg || err.error_description || "Signup failed", 400, corsHeaders);
    }
    const authData = await authRes.json();
    const userId = authData.user.id;
    const pharmacyRes = await supabaseFetch(env, "/rest/v1/pharmacies", {
      method: "POST",
      body: JSON.stringify({
        name: body.pharmacyName,
        slug,
        owner_id: userId,
        status: "trial",
        phone: body.phone || null,
        address: body.address || null,
        kra_pin: body.kraPin || null
      })
    });
    if (!pharmacyRes || !pharmacyRes.id) {
      return jsonErrorResponse("Failed to create pharmacy", 500, corsHeaders);
    }
    await supabaseFetch(env, "/rest/v1/pharmacy_members", {
      method: "POST",
      body: JSON.stringify({
        pharmacy_id: pharmacyRes.id,
        auth_user_id: userId,
        email: body.email,
        role: "owner",
        status: "active"
      })
    });
    const token = await createJWT({
      sub: userId,
      email: body.email,
      username: body.fullName,
      role: "owner",
      pharmacy_id: pharmacyRes.id,
      iat: Math.floor(Date.now() / 1e3),
      exp: Math.floor(Date.now() / 1e3) + 24 * 60 * 60
    }, env.JWT_SECRET);
    return jsonResponse(200, {
      token,
      token_type: "Bearer",
      expires_in: 86400,
      user: { id: userId, email: body.email, fullName: body.fullName, role: "owner" },
      pharmacy: { id: pharmacyRes.id, name: body.pharmacyName, slug, status: "trial" }
    }, corsHeaders);
  } catch (e) {
    console.error("[Worker] Registration error:", e);
    return jsonErrorResponse("Registration failed", 500, corsHeaders);
  }
}
__name(handleRegister, "handleRegister");
async function handleLocalAuth(request, env, corsHeaders) {
  const body = await request.json();
  const { username, password } = body;
  if (!username || !password) {
    return jsonErrorResponse("Missing credentials", 400, corsHeaders);
  }
  const LEGACY_USER_CREDENTIALS = {
    "RASHID": {
      id: "user_rashidjuma",
      email: "rashidjuma@dawasmartz.co.ke",
      role: "developer",
      pharmacySlug: "dawa-smart",
      passwordHash: "gut2nL0dXhDeRx6yzozOciYUat7DkKfbhND7966bwpY=",
      passwordSalt: "static_salt_dawa_smart"
    },
    "DEMO": {
      id: "user_demo",
      email: "demo@dawasmartz.local",
      role: "demo",
      pharmacySlug: "dawa-smart-demo",
      passwordHash: "ebIFiQeI2QZOCTt9a1DWWe2QjJ6DlK+hjvemeH4Lj4Y=",
      passwordSalt: "static_salt_demo"
    }
  };
  const user = LEGACY_USER_CREDENTIALS[username.toUpperCase()];
  if (!user) {
    return jsonErrorResponse("Invalid credentials", 401, corsHeaders);
  }
  const providedHash = await hashPassword(password, user.passwordSalt);
  if (providedHash !== user.passwordHash) {
    return jsonErrorResponse("Invalid credentials", 401, corsHeaders);
  }
  let pharmacy = await supabaseFetch(
    env,
    `/rest/v1/pharmacies?slug=eq.${user.pharmacySlug}&select=*`,
    { headers: { "Accept": "application/json", "Prefer": "return=representation" } }
  ).catch(() => []);
  if (!pharmacy || pharmacy.length === 0) {
    const pharmacyName = username === "RASHID" ? "Dawa Smart" : username === "DEMO" ? "Dawa Smart Demo" : "Unknown";
    pharmacy = await supabaseFetch(env, "/rest/v1/pharmacies", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: JSON.stringify({
        name: pharmacyName,
        slug: user.pharmacySlug,
        owner_id: null,
        // Legacy users don't have Supabase Auth user IDs
        status: username === "DEMO" ? "trial" : "active"
      })
    }).catch(() => null);
  }
  if (!pharmacy || Array.isArray(pharmacy) && pharmacy.length === 0) {
    return jsonErrorResponse("Failed to create or find pharmacy", 500, corsHeaders);
  }
  if (Array.isArray(pharmacy)) {
    pharmacy = pharmacy[0];
  }
  let membership = await supabaseFetch(
    env,
    `/rest/v1/pharmacy_members?pharmacy_id=eq.${pharmacy.id}&select=role,status,id,auth_user_id&or=(auth_user_id.eq.${user.id},email.eq.${encodeURIComponent(user.email)})`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => []);
  if (!membership || membership.length === 0) {
    await supabaseFetch(env, "/rest/v1/pharmacy_members", {
      method: "POST",
      body: JSON.stringify({
        pharmacy_id: pharmacy.id,
        auth_user_id: user.id,
        email: user.email,
        role: user.role,
        status: "active"
      })
    }).catch(() => null);
    membership = [{ role: user.role, status: "active" }];
  } else if (membership[0].auth_user_id !== user.id) {
    await supabaseFetch(
      env,
      `/rest/v1/pharmacy_members?id=eq.${membership[0].id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          auth_user_id: user.id,
          status: "active"
        })
      }
    ).catch(() => null);
  }
  const token = await createJWT({
    sub: user.id,
    email: user.email,
    username,
    role: membership[0].role,
    pharmacy_id: pharmacy.id,
    iat: Math.floor(Date.now() / 1e3),
    exp: Math.floor(Date.now() / 1e3) + 24 * 60 * 60
  }, env.JWT_SECRET);
  return jsonResponse(200, {
    token,
    token_type: "Bearer",
    expires_in: 86400,
    user: {
      id: user.id,
      email: user.email,
      fullName: username === "RASHID" ? "Rashid Juma" : "Dawa Smart Demo",
      role: membership[0].role,
      username
    },
    pharmacy: {
      id: pharmacy.id,
      name: pharmacy.name,
      slug: pharmacy.slug,
      status: pharmacy.status
    }
  }, corsHeaders);
}
__name(handleLocalAuth, "handleLocalAuth");
async function handleListMemberships(request, auth, env, corsHeaders) {
  const memberships = await supabaseFetch(
    env,
    `/rest/v1/pharmacy_members?auth_user_id=eq.${auth.user.id}&select=pharmacy:pharmacies(id,name,slug,status),role,status,id`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => []);
  return jsonResponse(200, { memberships: memberships || [] }, corsHeaders);
}
__name(handleListMemberships, "handleListMemberships");
async function handleSwitchPharmacy(request, auth, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  const targetPharmacyId = body?.pharmacy_id;
  if (!targetPharmacyId) {
    return jsonErrorResponse("Missing pharmacy_id", 400, corsHeaders);
  }
  const membership = await supabaseFetch(
    env,
    `/rest/v1/pharmacy_members?auth_user_id=eq.${auth.user.id}&pharmacy_id=eq.${targetPharmacyId}&status=eq.active&select=role,pharmacy:pharmacies(id,name,slug,status)`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => []);
  if (!membership || membership.length === 0) {
    return jsonErrorResponse("No active membership in this pharmacy", 403, corsHeaders);
  }
  const token = await createJWT({
    sub: auth.user.id,
    email: auth.user.email,
    username: auth.user.username,
    role: membership[0].role,
    pharmacy_id: targetPharmacyId,
    iat: Math.floor(Date.now() / 1e3),
    exp: Math.floor(Date.now() / 1e3) + 24 * 60 * 60
  }, env.JWT_SECRET);
  return jsonResponse(200, {
    token,
    token_type: "Bearer",
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
__name(handleSwitchPharmacy, "handleSwitchPharmacy");
async function handleInviteMember(request, auth, env, corsHeaders) {
  if (!["owner", "admin"].includes(auth.user.role)) {
    return jsonErrorResponse("Only owners and admins can invite members", 403, corsHeaders);
  }
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.role) {
    return jsonErrorResponse("Missing email or role", 400, corsHeaders);
  }
  const allowedRoles = ["admin", "manager", "pharmacist", "cashier", "lab", "doctor"];
  if (!allowedRoles.includes(body.role)) {
    return jsonErrorResponse("Invalid role", 400, corsHeaders);
  }
  const existing = await supabaseFetch(
    env,
    `/rest/v1/pharmacy_members?pharmacy_id=eq.${auth.user.pharmacyId}&email=eq.${encodeURIComponent(body.email)}&select=id,role,status`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => []);
  if (existing && existing.length > 0) {
    if (existing[0].status === "active") {
      return jsonErrorResponse("User already a member", 409, corsHeaders);
    }
    await supabaseFetch(
      env,
      `/rest/v1/pharmacy_members?id=eq.${existing[0].id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role: body.role, status: "active", invited_by: auth.user.id })
      }
    );
  } else {
    await supabaseFetch(env, "/rest/v1/pharmacy_members", {
      method: "POST",
      body: JSON.stringify({
        pharmacy_id: auth.user.pharmacyId,
        auth_user_id: null,
        email: body.email,
        role: body.role,
        status: "pending",
        invited_by: auth.user.id
      })
    });
  }
  return jsonResponse(200, { message: "Invitation sent" }, corsHeaders);
}
__name(handleInviteMember, "handleInviteMember");
async function handleListInvitations(request, auth, env, corsHeaders) {
  const invitations = await supabaseFetch(
    env,
    `/rest/v1/pharmacy_members?email=eq.${encodeURIComponent(auth.user.email)}&status=eq.pending&select=*,pharmacy:pharmacies(id,name,slug)`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => []);
  return jsonResponse(200, { invitations: invitations || [] }, corsHeaders);
}
__name(handleListInvitations, "handleListInvitations");
async function handleInvitationAction(request, auth, env, corsHeaders) {
  const url = new URL(request.url);
  const invitationId = url.pathname.split("/").pop();
  const body = await request.json().catch(() => null);
  const action = body?.action || "accept";
  const invitation = await supabaseFetch(
    env,
    `/rest/v1/pharmacy_members?id=eq.${invitationId}&email=eq.${encodeURIComponent(auth.user.email)}&select=*`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => []);
  if (!invitation || invitation.length === 0) {
    return jsonErrorResponse("Invitation not found", 404, corsHeaders);
  }
  if (action === "accept") {
    if (invitation[0].auth_user_id) {
      return jsonErrorResponse("Invitation already accepted", 400, corsHeaders);
    }
    await supabaseFetch(
      env,
      `/rest/v1/pharmacy_members?id=eq.${invitationId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          auth_user_id: auth.user.id,
          status: "active"
        })
      }
    );
    return jsonResponse(200, { message: "Membership accepted", pharmacy: { id: invitation[0].pharmacy_id } }, corsHeaders);
  } else if (action === "reject") {
    await supabaseFetch(
      env,
      `/rest/v1/pharmacy_members?id=eq.${invitationId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "suspended" })
      }
    );
    return jsonResponse(200, { message: "Invitation rejected" }, corsHeaders);
  }
  return jsonErrorResponse("Invalid action", 400, corsHeaders);
}
__name(handleInvitationAction, "handleInvitationAction");
async function handleCreatePharmacy(request, auth, env, corsHeaders) {
  if (auth.user.role !== "owner" && auth.user.role !== "admin" && auth.user.role !== "developer") {
    return jsonErrorResponse("Only owners can create pharmacies", 403, corsHeaders);
  }
  const body = await request.json().catch(() => null);
  if (!body || !body.name) {
    return jsonErrorResponse("Pharmacy name required", 400, corsHeaders);
  }
  const slug = (body.slug || body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const pharmacy = await supabaseFetch(env, "/rest/v1/pharmacies", {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      slug,
      owner_id: auth.user.id,
      status: "trial",
      address: body.address || null,
      phone: body.phone || null,
      kra_pin: body.kraPin || null
    })
  });
  return jsonResponse(200, { pharmacy }, corsHeaders);
}
__name(handleCreatePharmacy, "handleCreatePharmacy");
async function handleSync(request, auth, env, corsHeaders) {
  const body = await request.json();
  const { operations } = body;
  if (!operations || !Array.isArray(operations)) {
    return jsonErrorResponse("Missing operations array", 400, corsHeaders);
  }
  const targetPharmacyId = auth.user.pharmacyId;
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: []
  };
  const workspaceMixing = operations.some((op) => {
    if (op.payload && op.payload.pharmacy_id && op.payload.pharmacy_id !== targetPharmacyId) {
      return true;
    }
    if (op.pharmacyId && op.pharmacyId !== targetPharmacyId) {
      return true;
    }
    return false;
  });
  if (workspaceMixing) {
    return jsonErrorResponse("Cannot mix workspaces in a single sync batch", 403, corsHeaders);
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
__name(handleSync, "handleSync");
async function processSyncOperationSecure(env, user, pharmacyId, op) {
  const { entity, operation, recordId, payload } = op;
  if (!ALLOWED_ENTITIES.has(entity)) {
    throw new Error("Entity not allowed: " + entity);
  }
  if (!ALLOWED_OPERATIONS.has(operation)) {
    throw new Error("Operation not allowed: " + operation);
  }
  const rolePerms = ROLE_PERMISSIONS[entity];
  if (!rolePerms) {
    throw new Error("No permissions defined for entity: " + entity);
  }
  const hasPermission = rolePerms[user.role];
  if (!hasPermission) {
    throw new Error("Role " + user.role + " cannot " + operation + " on " + entity);
  }
  const cleanPayload = { ...payload };
  Object.keys(cleanPayload).forEach((col) => {
    if (PROTECTED_COLUMNS.has(col)) {
      delete cleanPayload[col];
    }
  });
  cleanPayload.pharmacy_id = pharmacyId;
  if (entity === "sale_items" && cleanPayload.sale_id) {
    const sale = await supabaseFetch(
      env,
      `/rest/v1/sales?id=eq.${cleanPayload.sale_id}&select=pharmacy_id`,
      { headers: { "Accept": "application/json" } }
    ).catch(() => []);
    if (!sale || sale.length === 0) {
      throw new Error("Parent sale not found or not in your workspace");
    }
    if (sale[0].pharmacy_id !== pharmacyId) {
      throw new Error("Parent sale belongs to a different workspace");
    }
  }
  if (entity === "batches" && cleanPayload.product_id) {
    const product = await supabaseFetch(
      env,
      `/rest/v1/products?id=eq.${cleanPayload.product_id}&select=pharmacy_id`,
      { headers: { "Accept": "application/json" } }
    ).catch(() => []);
    if (!product || product.length === 0) {
      throw new Error("Parent product not found or not in your workspace");
    }
    if (product[0].pharmacy_id !== pharmacyId) {
      throw new Error("Parent product belongs to a different workspace");
    }
    cleanPayload.pharmacy_id = product[0].pharmacy_id;
  }
  const baseUrl = `${env.SUPABASE_URL}/rest/v1/${entity}`;
  switch (operation) {
    case "create":
      const existing = await supabaseFetch(
        env,
        `${baseUrl}?id=eq.${recordId}&select=id`,
        { headers: { "Accept": "application/json" } }
      ).catch(() => []);
      if (existing && existing.length > 0) {
        await supabaseFetch(
          env,
          `${baseUrl}?id=eq.${recordId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              ...cleanPayload,
              revision: (cleanPayload.revision || 0) + 1
            })
          }
        );
      } else {
        await supabaseFetch(env, baseUrl, {
          method: "POST",
          body: JSON.stringify(cleanPayload)
        });
      }
      break;
    case "update":
      const record = await supabaseFetch(
        env,
        `${baseUrl}?id=eq.${recordId}&select=pharmacy_id`,
        { headers: { "Accept": "application/json" } }
      ).catch(() => []);
      if (!record || record.length === 0 || record[0].pharmacy_id !== pharmacyId) {
        throw new Error("Record not found or not in your workspace");
      }
      await supabaseFetch(
        env,
        `${baseUrl}?id=eq.${recordId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...cleanPayload,
            revision: (cleanPayload.revision || record[0].revision || 0) + 1,
            pharmacy_id: pharmacyId
          })
        }
      );
      break;
    case "delete":
      const verify = await supabaseFetch(
        env,
        `${baseUrl}?id=eq.${recordId}&select=pharmacy_id`,
        { headers: { "Accept": "application/json" } }
      ).catch(() => []);
      if (!verify || verify.length === 0 || verify[0].pharmacy_id !== pharmacyId) {
        throw new Error("Record not found or not in your workspace");
      }
      await supabaseFetch(
        env,
        `${baseUrl}?id=eq.${recordId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ deleted_at: (/* @__PURE__ */ new Date()).toISOString() })
        }
      );
      break;
    default:
      throw new Error("Unknown operation: " + operation);
  }
}
__name(processSyncOperationSecure, "processSyncOperationSecure");

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-3bJ2Tg/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-3bJ2Tg/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
