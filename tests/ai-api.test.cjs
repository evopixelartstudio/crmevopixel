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
      return module.require(name);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return compile;
}

const privateKey = 'test-only-provider-key-123456789';
const body = extra => ({ action: 'configure', provider: 'gemini', model: 'gemini-2.5-flash', apiKey: privateKey, ...extra });
const request = value => new Request('https://crm.test/api/ai', { method: 'POST', body: JSON.stringify(value) });
function fixture() {
  const values = new Map();
  let userId = 'user-a';
  let denied = false;
  const compile = loader({
    '@/lib/server/crm-auth': {
      requireCrmApi: async () => denied ? new Response(null, { status: 401 }) : null,
      crmIdentity: async () => ({ user: { id: userId } }),
      sessionDatabase: async () => ({ auth: { signOut: async () => ({ error: null }) } }),
    },
    '@/lib/auth/config': { crmOrigin: () => 'https://crm.test' },
    'next/headers': { cookies: async () => ({ get: name => values.has(name) ? { value: values.get(name) } : undefined }) },
  });
  return { ...compile('../app/api/ai/route.ts'), compile, values, deny: () => { denied = true; }, user: id => { userId = id; } };
}

test('AI configuration validates upstream before saving an encrypted cookie and reuses it for completion', async () => {
  const old = { ...process.env }, fetch = global.fetch;
  process.env.AI_SESSION_ENCRYPTION_KEY = 'test-only-encryption-secret-123456789';
  process.env.NODE_ENV = 'production';
  delete process.env.GEMINI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.ok(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/'));
    assert.equal(options.headers['x-goog-api-key'], privateKey);
    assert.equal(url.includes(privateKey), false);
    return Response.json({ candidates: [{ content: { parts: [{ text: 'OK' }, { text: 'Segundo trecho' }] } }] });
  };
  try {
    const api = fixture();
    const saved = await api.POST(request(body()));
    assert.equal(saved.status, 200);
    assert.equal(saved.headers.get('cache-control'), 'no-store');
    const cookie = saved.cookies.get('crm_ai_gemini');
    assert.ok(cookie.value);
    assert.equal(cookie.value.includes(privateKey), false);
    assert.match(saved.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(saved.headers.get('set-cookie'), /Secure/i);
    assert.equal(JSON.stringify(await saved.json()).includes(privateKey), false);
    api.values.set(cookie.name, cookie.value);
    assert.deepEqual(await (await api.GET(new Request('https://crm.test/api/ai'))).json(), { gemini: true, claude: false });
    const completion = await api.POST(request(body({ action: 'completion', apiKey: undefined, userPrompt: 'Olá', systemPrompt: 'CRM', contextData: {} })));
    assert.equal(completion.status, 200);
    assert.equal((await completion.json()).text, 'OK\nSegundo trecho');
    assert.equal(calls, 2);
    api.user('user-b');
    assert.deepEqual(await (await api.GET(new Request('https://crm.test/api/ai'))).json(), { gemini: false, claude: false });
  } finally { process.env = old; global.fetch = fetch; }
});

test('test never saves keys; failed configuration preserves previous credentials and reports safe quota errors', async () => {
  const old = { ...process.env }, fetch = global.fetch;
  process.env.AI_SESSION_ENCRYPTION_KEY = 'test-only-encryption-secret-123456789';
  global.fetch = async () => Response.json({ content: [{ type: 'text', text: 'OK' }] });
  try {
    const api = fixture();
    const tested = await api.POST(request(body({ action: 'test', provider: 'claude', model: 'claude-sonnet-4-6' })));
    assert.equal(tested.status, 200);
    assert.equal(tested.headers.get('set-cookie'), null);
    global.fetch = async () => Response.json({ error: privateKey }, { status: 429 });
    const failed = await api.POST(request(body()));
    assert.equal(failed.status, 502);
    assert.equal(failed.headers.get('set-cookie'), null);
    const result = await failed.json();
    assert.match(result.error, /cota/);
    assert.equal(result.error.includes(privateKey), false);
  } finally { process.env = old; global.fetch = fetch; }
});

test('AI rejects malformed input and unauthenticated requests before effects', async () => {
  const fetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw Error('Unexpected request'); };
  try {
    const api = fixture();
    for (const value of [null, {}, body({ model: '../../secret' }), body({ apiKey: 'bad\nheader' }), body({ action: 'completion', userPrompt: '', systemPrompt: '' })]) {
      assert.equal((await api.POST(request(value))).status, 400);
    }
    assert.equal((await api.POST(new Request('https://crm.test/api/ai', { method: 'POST', body: '{' }))).status, 400);
    api.deny();
    const unauthenticated = request(body());
    unauthenticated.text = () => { throw Error('Body read without authorization'); };
    assert.equal((await api.POST(unauthenticated)).status, 401);
    assert.equal((await api.GET(new Request('https://crm.test/api/ai'))).status, 401);
    assert.equal(calls, 0);
  } finally { global.fetch = fetch; }
});

test('configuration never calls the provider or saves credentials when session protection is unavailable', async () => {
  const old = { ...process.env }, fetch = global.fetch;
  delete process.env.AI_SESSION_ENCRYPTION_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  let calls = 0;
  global.fetch = async () => { calls++; throw Error('Unexpected provider call'); };
  try {
    const response = await fixture().POST(request(body()));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /proteção das chaves/);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(calls, 0);
  } finally { process.env = old; global.fetch = fetch; }
});

test('AI session credentials reject tampering, provider/user changes and expiry', () => {
  const old = process.env.AI_SESSION_ENCRYPTION_KEY, now = Date.now;
  process.env.AI_SESSION_ENCRYPTION_KEY = 'test-only-encryption-secret-123456789';
  try {
    const { sealAIKey, readAIKey } = loader()('../lib/server/ai-session.ts');
    const token = sealAIKey('gemini', privateKey, 'user-a');
    assert.equal(readAIKey('gemini', token, 'user-a'), privateKey);
    assert.equal(readAIKey('claude', token, 'user-a'), null);
    assert.equal(readAIKey('gemini', token, 'user-b'), null);
    const bytes = Buffer.from(token, 'base64url'); bytes[30] ^= 1;
    assert.equal(readAIKey('gemini', bytes.toString('base64url'), 'user-a'), null);
    const current = now(); Date.now = () => current + 13 * 60 * 60 * 1000;
    assert.equal(readAIKey('gemini', token, 'user-a'), null);
  } finally {
    Date.now = now;
    if (old === undefined) delete process.env.AI_SESSION_ENCRYPTION_KEY; else process.env.AI_SESSION_ENCRYPTION_KEY = old;
  }
});

test('logout clears AI credentials together with the authenticated session', async () => {
  const api = fixture();
  const { POST } = api.compile('../app/api/auth/logout/route.ts');
  const response = await POST(new Request('https://crm.test/api/auth/logout', { method: 'POST', headers: { origin: 'https://crm.test' } }));
  assert.equal(response.status, 200);
  for (const name of ['crm_ai_gemini', 'crm_ai_claude']) {
    assert.equal(response.cookies.get(name).value, '');
    assert.equal(response.cookies.get(name).maxAge, 0);
  }
});

test('provider restores preferences without persisting keys and surfaces upstream failure without simulated success', async () => {
  const fetch = global.fetch, oldWindow = global.window;
  const values = new Map();
  global.window = { localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } };
  try {
    const { aiProvider } = loader()('../lib/ai/ai-provider.ts');
    aiProvider.saveConfig({ activeProvider: 'claude', claude: { model: 'claude-sonnet-4-6', temperature: 0.6, enabled: true, configured: true, apiKey: privateKey } });
    const stored = [...values.values()][0];
    assert.equal(stored.includes(privateKey), false);
    assert.equal(stored.includes('configured'), false);
    const restored = loader()('../lib/ai/ai-provider.ts').aiProvider;
    assert.equal(restored.getConfig().activeProvider, 'claude');
    assert.equal(restored.getConfig().claude.temperature, 0.6);
    assert.equal(restored.getConfig().claude.configured, false);
    global.fetch = async () => Response.json({ error: 'Cota esgotada.' }, { status: 502 });
    await assert.rejects(restored.generateCompletion('Olá', {}), /Cota esgotada/);
    const result = await restored.configureProvider('claude', privateKey);
    assert.equal(result.success, false);
    restored.saveConfig({ activeProvider: 'simulation' });
    assert.match((await restored.generateCompletion('Olá', {})).text, /Simulação local selecionada/);
  } finally { global.fetch = fetch; if (oldWindow === undefined) delete global.window; else global.window = oldWindow; }
});
