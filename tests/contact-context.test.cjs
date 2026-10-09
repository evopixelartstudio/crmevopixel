const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function compile(path, mocks = {}) {
  const filename = require.resolve(path), compiled = new Module(filename, module);
  compiled.require = name => mocks[name] || module.require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return compiled.exports;
}
const context = compile('../lib/services/contact-context.ts');
const { contactChanges } = context;
test('human takeover disables individual automation, AI preparation cannot change global settings or origin', () => {
  assert.deepEqual(contactChanges({ attendance_owner: 'human', automation_enabled: true, enabled: true, phone_key: 'bad' }), { changed_by: 'crm', attendance_owner: 'human', automation_enabled: false });
  assert.deepEqual(contactChanges({ attendance_owner: 'ai' }), { changed_by: 'crm', attendance_owner: 'ai', automation_enabled: true });
  assert.deepEqual(contactChanges({ relationship: 'client' }), { changed_by: 'crm', relationship: 'client', relationship_confirmed: true });
  assert.throws(() => contactChanges({ origin: 'client' }));
  assert.throws(() => contactChanges({ assigned_to: 'x'.repeat(121) }));
});
let writes = [], conflict = false;
const { POST } = compile('../app/api/contacts/route.ts', {
  'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
  '@/lib/services/contact-context': context,
  '@/lib/utils/whatsapp': compile('../lib/utils/whatsapp.ts'),
  '@/lib/server/crm-access': { cloudDatabase: () => ({ from: table => {
    const q = { upsert: (data, options) => { writes.push({ table, data, options }); return Promise.resolve({ error: null }); }, update: data => { writes.push({ table, data }); return q; }, eq: (key, value) => { writes.push({ key, value }); return q; }, select: () => q,
      single: async () => ({ data: table === 'crm_contacts' ? { id: 'id', phone_key: '553498327904', origin: 'outbound', attendance_owner: 'human', revision: 2 } : { enabled: false } }),
      maybeSingle: async () => ({ data: conflict ? null : { id: 'id', revision: 3 }, error: null }) };
    return q;
  } }) },
});
const request = (body, origin = 'https://crm.test') => ({ url: 'https://crm.test/api/contacts', headers: new Headers({ origin }), json: async () => body });
test('contact lookup preserves existing origin and does not activate the global agent', async () => {
  writes = [];
  const result = await POST(request({ action: 'get', phone: '5534998327904' }));
  assert.equal(result.status, 200);
  assert.equal(result.data.contact.origin, 'outbound');
  assert.equal(result.data.agentActive, false);
  assert.deepEqual(writes[0].data, { phone_key: '553498327904' });
  assert.equal(writes[0].options.ignoreDuplicates, true);
  assert.equal(writes.some(w => w.table === 'crm_automation_settings'), false);
});
test('takeover requires current revision and rejects cross-origin changes before database access', async () => {
  writes = []; conflict = true;
  assert.equal((await POST(request({ action: 'update', phone: '553498327904', revision: 1, changes: { attendance_owner: 'human' } }))).status, 409);
  assert.ok(writes.some(w => w.key === 'revision' && w.value === 1));
  writes = [];
  assert.equal((await POST(request({ action: 'get', phone: '553498327904' }, 'https://foreign.test'))).status, 403);
  assert.deepEqual(writes, []); conflict = false;
});
