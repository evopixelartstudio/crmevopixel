const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loader(mocks = {}) {
  const cache = new Map();
  function compile(filename) {
    if (!path.extname(filename)) filename += '.ts';
    filename = require.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename, module);
    compiled.filename = filename;
    compiled.paths = module.paths;
    cache.set(filename, compiled);
    compiled.require = name => {
      if (name === 'server-only') return {};
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/')) return compile(path.resolve(__dirname, '..', name.slice(2)));
      if (name.startsWith('.')) {
        let target = path.resolve(path.dirname(filename), name);
        if (!path.extname(target)) target += '.ts';
        target = require.resolve(target);
        if (target.endsWith('.ts')) return compile(target);
      }
      return module.require(name);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
    return compiled.exports;
  }
  return compile;
}

test('server email allowlist requires confirmed identity and never falls back to open RPC permissions', async () => {
  const old = process.env.CRM_ADMIN_EMAILS;
  let calls = 0;
  const { crmPermission } = loader()('../lib/server/crm-permission.ts');
  const db = { rpc: async () => { calls++; return { data: true, error: null }; } };
  try {
    process.env.CRM_ADMIN_EMAILS = 'evopixelart@gmail.com';
    assert.equal(await crmPermission(db, { email: 'evopixelart@gmail.com' }), false);
    assert.equal(await crmPermission(db, { email: 'other@example.com', email_confirmed_at: '2026-10-10' }), false);
    assert.equal(await crmPermission(db, { email: 'EvoPixelArt@gmail.com', email_confirmed_at: '2026-10-10' }, true), true);
    process.env.CRM_ADMIN_EMAILS = '';
    assert.equal(await crmPermission(db, { email: 'evopixelart@gmail.com', email_confirmed_at: '2026-10-10' }), false);
    assert.equal(calls, 0);
    delete process.env.CRM_ADMIN_EMAILS;
    assert.equal(await crmPermission(db, { id: 'verified' }), true);
    assert.equal(calls, 1);
  } finally {
    if (old === undefined) delete process.env.CRM_ADMIN_EMAILS; else process.env.CRM_ADMIN_EMAILS = old;
  }
});

test('server validates identity, CRM membership, admin permission and a configured origin', async () => {
  const old = { ...process.env };
  process.env.CRM_ORIGIN = 'https://crm.test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test';
  let user = null, member = false, admin = false, fail = false;
  const db = {
    auth: { getUser: async () => ({ data: { user }, error: fail ? {} : null }) },
    rpc: async name => ({ data: name === 'crm_is_admin' ? admin : member, error: fail ? {} : null }),
  };
  const compile = loader({
    '@supabase/ssr': { createServerClient: () => db },
    'next/headers': { cookies: async () => ({ getAll: () => [], set: () => {} }) },
  });
  const { requireCrmApi } = compile('../lib/server/crm-auth.ts');
  const request = origin => new Request('https://internal.test/api/contacts', { method: 'POST', headers: { origin, host: 'evil.test', 'x-forwarded-host': 'evil.test' } });
  try {
    assert.equal((await requireCrmApi(request('https://crm.test'))).status, 401);
    user = { id: 'user' };
    assert.equal((await requireCrmApi(request('https://crm.test'))).status, 401);
    member = true;
    assert.equal(await requireCrmApi(request('https://crm.test')), null);
    assert.equal((await requireCrmApi(request('https://evil.test'))).status, 403);
    assert.equal((await requireCrmApi(request('https://crm.test'), true)).status, 403);
    admin = true;
    assert.equal(await requireCrmApi(request('https://crm.test'), true), null);
    fail = true;
    assert.equal((await requireCrmApi(request('https://crm.test'))).status, 401);
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_secret_private';
    assert.equal((await requireCrmApi(request('https://crm.test'))).status, 503);
  } finally { process.env = old; }
});

test('every internal API denies access before reading a body or accessing backend services', async () => {
  const root = path.resolve(__dirname, '../app/api');
  const publicHandlers = ['login', 'github', 'callback'].map(name => path.join('auth', name, 'route.ts'));
  publicHandlers.push(path.join('whatsapp', 'webhook', 'route.ts'));
  const files = fs.readdirSync(root, { recursive: true }).filter(name => name.endsWith('route.ts') && !publicHandlers.includes(name));
  let guards = 0, effects = 0;
  const compile = loader({
    '@/lib/server/crm-auth': { requireCrmApi: async () => { guards++; return new Response(null, { status: 401 }); } },
    '@/lib/server/crm-access': { cloudDatabase: () => { effects++; throw Error('Unauthorized database access'); } },
    '@/lib/supabase/server': { createServerSupabase: () => { effects++; throw Error('Unauthorized database access'); } },
    '@/lib/supabase/client': { isSupabaseConfigured: () => false },
  });
  for (const name of files) {
    const route = compile(path.join(root, name));
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      if (!route[method]) continue;
      const request = new Request('https://crm.test/api/test', { method });
      request.json = async () => { effects++; throw Error('Body read before authorization'); };
      request.text = async () => { effects++; throw Error('Body read before authorization'); };
      const before = guards;
      assert.equal((await route[method](request)).status, 401, `${name} ${method}`);
      assert.equal(guards, before + 1, `${name} ${method} must check authorization`);
    }
  }
  assert.equal(effects, 0);
  assert.ok(guards >= 14);
});

test('public Supabase configuration rejects secret/service_role credentials', () => {
  const { publicSupabaseKey, safeReturnPath } = loader()('../lib/auth/config.ts');
  const jwt = role => `e30.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.equal(publicSupabaseKey(jwt('anon')), true);
  assert.equal(publicSupabaseKey(jwt('service_role')), false);
  assert.equal(publicSupabaseKey('sb_secret_private'), false);
  assert.equal(publicSupabaseKey('sb_publishable_public'), true);
  for (const target of ['//evil.test', '/\\evil.test', 'https://evil.test', '/api/contacts']) assert.equal(safeReturnPath(target), '/');
});

test('middleware protects private bundles and permits only login dependencies without a session', async () => {
  const old = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.CRM_ORIGIN = 'https://crm.test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test';
  let user = null, member = false;
  const compile = loader({
    'node:fs/promises': { readFile: async filename => JSON.stringify(filename.includes('app-build')
      ? { pages: { '/layout': ['static/chunks/shared.js'], '/login/page': ['static/chunks/login.js'], '/(dashboard)/page': ['static/chunks/private.js'] } }
      : { polyfillFiles: ['static/chunks/polyfill.js'] }) },
    '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, rpc: async () => ({ data: member, error: null }) }) },
  });
  const { middleware } = compile('../middleware.ts');
  const { NextRequest } = require('next/server');
  const request = pathname => new NextRequest(`https://crm.test${pathname}`);
  try {
    for (const pathname of ['/_next/static/chunks/login.js', '/_next/static/chunks/shared.js', '/_next/static/chunks/polyfill.js', '/_next/static/media/font.woff2']) {
      assert.equal((await middleware(request(pathname))).headers.get('x-middleware-next'), '1');
    }
    assert.equal((await middleware(request('/_next/static/chunks/private.js'))).status, 401);
    assert.equal((await middleware(request('/_next/static/chunks/private.js.map'))).status, 401);
    const page = await middleware(request('/financeiro'));
    assert.equal(page.status, 307);
    assert.equal(page.headers.get('location'), 'https://crm.test/login');
    assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow');
    user = { id: 'verified-user' }; member = true;
    assert.equal((await middleware(request('/financeiro'))).headers.get('x-middleware-next'), '1');
    assert.equal((await middleware(request('/_next/static/chunks/private.js'))).headers.get('x-middleware-next'), '1');
    member = false;
    assert.equal((await middleware(request('/_next/static/chunks/private.js'))).status, 401);
  } finally { process.env = old; }
});

test('webhook validates integration credentials before persisting and accepts legitimate messages without a human session', async () => {
  const old = process.env.EVOLUTION_API_KEY;
  process.env.EVOLUTION_API_KEY = 'test-integration-token';
  let writes = 0, stored;
  const compile = loader({
    '@/lib/server/crm-access': {
      secretsMatch: (actual, expected) => !!expected && actual === expected,
      cloudDatabase: () => ({ from: () => ({ upsert: async row => { writes++; stored = row; return { error: null }; } }) }),
    },
    '@/lib/services/evolution-go': { parseGoMessage: () => ({ id: 'message-1', phone: '551199999999', fromMe: false, text: 'integration-test', timestamp: 1700000000 }) },
  });
  const { POST } = compile('../app/api/whatsapp/webhook/route.ts');
  const request = token => new Request('https://crm.test/api/whatsapp/webhook', { method: 'POST', body: JSON.stringify({ instanceToken: token }) });
  try {
    assert.equal((await POST(request('invalid'))).status, 401);
    assert.equal(writes, 0);
    assert.equal((await POST(request('test-integration-token'))).status, 200);
    assert.equal(writes, 1);
    assert.equal(stored.message_id, 'message-1');
    delete process.env.EVOLUTION_API_KEY;
    assert.equal((await POST(request(''))).status, 401);
    assert.equal(writes, 1);
  } finally { if (old === undefined) delete process.env.EVOLUTION_API_KEY; else process.env.EVOLUTION_API_KEY = old; }
});
