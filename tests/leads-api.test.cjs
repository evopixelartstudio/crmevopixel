const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loader(mocks) {
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

const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const lead = (number, extra = {}) => ({ id: id(number), name: `Contato ${number}`, company_name: `Empresa ${number}`, phone: '68991234567', status: 'novo', ...extra });
const request = value => new Request('https://crm.test/api/leads', { method: 'POST', body: JSON.stringify(value) });

function fixture() {
  const registry = [], stored = new Map(), opportunities = [];
  let ready = true, denied = false, effects = 0;
  let helpers;
  const db = { from: table => {
    effects++;
    let values, filters = [];
    const run = async () => {
      if (table === 'crm_phone_registry') return ready ? { data: registry.filter(row => filters.every(([field, allowed]) => allowed.includes(row[field]))), error: null } : { data: null, error: { code: '42P01' } };
      if (table === 'opportunities') return { data: opportunities.filter(row => filters.every(([field, allowed]) => allowed.includes(row[field]))), error: null };
      if (table === 'leads' && values) {
        // Simulate the atomic database trigger after concurrent preflight requests.
        const matches = registry.filter(row => helpers.getLeadPhoneKeys(values).includes(row.phone_key));
        if (matches.length) return { data: null, error: { code: '23505', message: 'LEAD_PHONE_DUPLICATE', details: JSON.stringify({ matches }) } };
        if (stored.has(values.id) || values.name === 'Falha simulada') return { data: null, error: { code: '23505', message: 'private-db-error' } };
        stored.set(values.id, values);
        for (const phone_key of helpers.getLeadPhoneKeys(values)) registry.push({ phone_key, entity_type: 'lead', entity_id: values.id, name: values.name, company_name: values.company_name, deleted_at: null });
        return { data: values, error: null };
      }
      throw Error(`Unexpected database call: ${table}`);
    };
    const query = {
      select: () => query, limit: () => query,
      in: (field, allowed) => { filters.push([field, allowed]); return query; },
      insert: data => { values = data; return query; },
      upsert: () => assert.fail('Creation must never upsert existing records'),
      single: run,
      then: (yes, no) => run().then(yes, no),
    };
    return query;
  } };
  const compile = loader({
    '@/lib/server/crm-auth': { requireCrmApi: async () => denied ? new Response(null, { status: 401 }) : null },
    '@/lib/server/crm-access': { cloudDatabase: () => db },
  });
  helpers = compile('../lib/services/lead-deduplication.ts');
  return { ...compile('../app/api/leads/route.ts'), ...helpers, registry, stored, opportunities,
    deny: () => { denied = true; }, unavailable: () => { ready = false; }, effects: () => effects };
}

test('lead API denies access before reading input or looking up any contacts', async () => {
  const api = fixture(); api.deny();
  const input = request({ action: 'create', lead: lead(1) });
  input.text = () => assert.fail('Unauthorized input read');
  assert.equal((await api.POST(input)).status, 401);
  assert.equal(api.effects(), 0);
});

test('manual registration identifies clients, pipeline, lost opportunities and deleted contacts by phone', async () => {
  for (const location of ['clients', 'pipeline', 'trash', 'leads', 'deleted']) {
    const api = fixture();
    api.registry.push({ phone_key: api.getLeadPhoneKeys(lead(1))[0], entity_type: location === 'clients' ? 'client' : 'lead', entity_id: id(1), name: 'Contato existente', company_name: 'Empresa existente', deleted_at: location === 'deleted' ? '2026-10-16T12:00:00Z' : null });
    if (['pipeline', 'trash'].includes(location)) api.opportunities.push({ id: id(9), lead_id: id(1), status: location === 'trash' ? 'perdido' : 'aberto', loss_reason: location === 'trash' ? 'Sem interesse' : null });
    const response = await api.POST(request({ action: 'create', lead: lead(2, { phone: '+55 (68) 9123-4567' }) }));
    assert.equal(response.status, 409, location);
    const data = await response.json();
    assert.equal(data.duplicates[0].location, location === 'deleted' ? 'trash' : location);
    assert.equal(data.duplicates[0].company_name, 'Empresa existente');
    if (location === 'deleted') assert.equal(data.duplicates[0].url, undefined);
    assert.equal(api.stored.size, 0);
  }
});

test('imports skip repeats within the same batch and report only confirmed writes, duplicates and failures', async () => {
  const api = fixture();
  const response = await api.POST(request({ action: 'import', leads: [
    lead(1), lead(2, { whatsapp: '+55 (68) 9123-4567', phone: '' }),
    lead(3, { phone: '', whatsapp: '' }), lead(4, { name: 'Falha simulada', phone: '11988881234' }),
  ] }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.total, 4);
  assert.equal(result.created.length, 2);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.failed.length, 1);
  assert.equal(result.withoutPhone, 1);
  assert.equal(result.created.length + result.duplicates.length + result.failed.length, result.total);
  assert.equal(result.duplicates[0].inputIndex, 1);
  assert.equal(result.failed[0].index, 3);
  assert.equal(api.stored.size, 2);
  assert.equal(JSON.stringify(result.failed).includes('private-db-error'), false);
});

test('missing registry fails closed before creation and malformed batches make no writes', async () => {
  const api = fixture(); api.unavailable();
  const response = await api.POST(request({ action: 'create', lead: lead(1) }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /20261016_lead_phone_deduplication.sql/);
  assert.equal(api.stored.size, 0);
  for (const value of [null, {}, { action: 'import', leads: [] }, { action: 'create', lead: lead(1, { score: 200 }) }, { action: 'import', leads: [lead(1), lead(2, { id: 'invalid' })] }]) {
    const fresh = fixture();
    assert.equal((await fresh.POST(request(value))).status, 400);
    assert.equal(fresh.effects(), 0);
  }
});

test('create never overwrites an existing ID and strips untrusted fields before saving', async () => {
  const api = fixture();
  api.stored.set(id(1), lead(1, { name: 'Original', phone: '' }));
  const conflict = await api.POST(request({ action: 'create', lead: lead(1, { name: 'Attempted replacement', phone: '11977771234' }) }));
  assert.equal(conflict.status, 503);
  assert.equal(api.stored.get(id(1)).name, 'Original');
  const created = await api.POST(request({ action: 'create', lead: lead(2, { phone: '11966661234', deleted_at: '2026-10-16', admin: true }) }));
  assert.equal(created.status, 201);
  assert.equal(api.stored.get(id(2)).deleted_at, undefined);
  assert.equal(api.stored.get(id(2)).admin, undefined);
});

test('both contact numbers are checked; blank and incomplete numbers never collide', async () => {
  const api = fixture();
  assert.deepEqual(api.getLeadPhoneKeys({ phone: '', whatsapp: '1234' }), []);
  assert.deepEqual(api.getLeadPhoneKeys({ phone: '+55 (68) 99123-4567', whatsapp: 'https://wa.me/556891234567?text=Oferta%2050' }), ['556891234567']);
  api.registry.push({ phone_key: '551188881234', entity_type: 'client', entity_id: id(4), name: 'Cliente', company_name: 'Empresa', deleted_at: null });
  const result = await api.POST(request({ action: 'check', lead: { phone: '68991234567', whatsapp: '(11) 98888-1234' } }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).duplicates[0].entity_type, 'client');
  assert.equal((await api.POST(request({ action: 'check', phone: '1234' }))).status, 400);
});

test('legacy spreadsheet numbers use the same recovered contact identity as the CRM', () => {
  const api = fixture();
  const number = '5569993547674';
  const record = { phone: number.slice(0, 11), whatsapp: number.slice(0, 11), notes: `Dados originais da planilha:\nWhatsApp / telefone: https://wa.me/${number}?text=Oferta%2050` };
  assert.deepEqual(api.getLeadPhoneKeys(record), ['556993547674']);
  assert.deepEqual(api.getLeadPhoneKeys({ notes: record.notes }), ['556993547674']);
  assert.deepEqual(api.getLeadPhoneKeys({ notes: `<!--METADATA:${JSON.stringify({ internal: record.notes })}-->` }), []);
  assert.deepEqual(api.getLeadPhoneKeys({ notes: `Texto livre: ${number}` }), []);
});
