const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const id = '11111111-1111-4111-8111-111111111111';
let result, calls, configured = true;
const filename = require.resolve('../lib/supabase/db-service.ts');
const compiled = new Module(filename, module);
compiled.require = name => name === './client' ? {
  isSupabaseConfigured: () => configured,
  getSupabase: () => ({ from: table => {
    assert.equal(table, 'clients');
    const query = {
      upsert: (data, options) => { calls.push({ operation: 'upsert', data, options }); return query; },
      update: data => { calls.push({ operation: 'update', data }); return query; },
      delete: () => { calls.push({ operation: 'delete' }); return query; },
      eq: (column, value) => { assert.equal(column, 'id'); assert.equal(value, id); return query; },
      select: () => query,
      single: async () => result,
      maybeSingle: async () => result,
    };
    return query;
  } }),
} : name.startsWith('@/') ? {} : module.require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { dbService } = compiled.exports;

test('database confirms full client row and never retries by discarding social fields', async () => {
  const row = { id, name: 'Contato', company_name: 'Empresa', website_url: 'https://example.test', instagram: '@teste', google_business: 'maps' };
  calls = []; result = { data: row, error: null };
  assert.deepEqual(await dbService.insertClient(row), row);
  assert.deepEqual(calls[0].options, { onConflict: 'id' });
  assert.equal(calls[0].data.instagram, '@teste');
  result = { data: null, error: { message: 'Denied' } }; calls = [];
  assert.equal(await dbService.insertClient(row), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].data.google_business, 'maps');
  result = { data: null, error: null };
  assert.equal(await dbService.insertClient(row), null);
  result = { data: { ...row, id: 'different' }, error: null };
  assert.equal(await dbService.insertClient(row), null);
});

test('updates and deletes require matching returned IDs and reject legacy IDs without requests', async () => {
  calls = []; result = { data: { id, name: 'Atualizado' }, error: null };
  assert.equal((await dbService.updateClient(id, { id: 'cannot-change', name: 'Atualizado' })).id, id);
  assert.equal(calls[0].data.id, undefined);
  result = { data: null, error: null };
  assert.equal(await dbService.updateClient(id, { name: 'Não salvo' }), null);
  assert.equal(await dbService.deleteClient(id), false);
  result = { data: { id }, error: null };
  assert.equal(await dbService.deleteClient(id), true);
  result = { data: null, error: { message: 'Denied' } };
  assert.equal(await dbService.deleteClient(id), false);
  calls = [];
  assert.equal(await dbService.insertClient({ id: 'cli-old' }), null);
  assert.equal(await dbService.updateClient('cli-old', {}), null);
  assert.equal(await dbService.deleteClient('cli-old'), false);
  assert.equal(calls.length, 0);
  configured = false;
  assert.equal(await dbService.insertClient({ id }), null);
});
