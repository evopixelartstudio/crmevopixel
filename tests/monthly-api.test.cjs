const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
let saved, fail = false, calls = 0;
const filename = require.resolve('../app/api/monthly-clients/route.ts'), compiled = new Module(filename, module);
compiled.require = name => name === '@/lib/server/crm-auth' ? { requireCrmApi: async r => r.headers.get('origin') === 'https://crm.test' ? null : { status: 403 } } : name === 'next/server' ? { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } } : name === '@/lib/server/crm-access' ? { cloudDatabase: () => { calls++; return { from: () => {
  const q = { upsert: row => { saved = row; return q; }, update: row => { saved = row; return q; }, delete: () => q, eq: () => q, select: () => q, single: async () => ({ data: fail ? null : { ...saved }, error: fail ? {} : null }) }; return q;
} }; } } : module.require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,filename);
const { POST } = compiled.exports;
const id = '11111111-1111-4111-8111-111111111111';
const request = (body, origin='https://crm.test') => ({ url: 'https://crm.test/api/monthly-clients', headers: new Headers({ origin }), json: async () => body });
test('MRR saves stable UUID and canonical status without deleting linked client identity', async () => {
  const result = await POST(request({ action: 'save', create: true, id, data: { id: 'discard', client_id: id, client_name: 'Cliente', company_name: 'Empresa', plan_name: 'Plano', monthly_value: 450, billing_day: 10, status: 'ativo' } }));
  assert.equal(result.status, 200); assert.equal(saved.id,id); assert.equal(saved.client_id,id);
  assert.equal(saved.subscription_status,'ativo'); assert.equal(saved.status,undefined);
  assert.equal(result.data.status,'ativo');
});
test('MRR rejects invalid values and does not confirm failed or missing writes', async () => {
  assert.equal((await POST(request({ action: 'save', id, data: { monthly_value: -1 } }))).status,400);
  assert.equal((await POST(request({ action: 'save', id, data: { client_id: 'client-local' } }))).status,400);
  fail = true;
  assert.equal((await POST(request({ action: 'save', id, data: { monthly_value: 450 } }))).status,503);
  assert.equal((await POST(request({ action: 'delete', id }))).status,503);
  fail = false; calls=0;
  assert.equal((await POST(request({ action: 'delete', id },'https://foreign.test'))).status,403);
  assert.equal(calls,0);
});
