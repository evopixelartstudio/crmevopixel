const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

let result, ok = true, lastRequest;
global.localStorage = new Proxy({}, { get: () => { throw new Error('Browser persistence forbidden'); } });
global.fetch = async (url, options) => {
  lastRequest = { url, ...options };
  return { ok, json: async () => result };
};
const filename = require.resolve('../lib/services/rabisco-storage.ts');
const storage = new Module(filename, module);
storage.filename = filename;
storage.paths = module.paths;
storage.require = name => name === '@/lib/supabase/client'
  ? { isSupabaseConfigured: () => true, getSupabase: () => ({ from: () => query }) }
  : module.require(name);
storage._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { loadRabiscoBoard, saveRabiscoBoard } = storage.exports;

test('database failure rejects without reading or writing browser storage', async () => {
  ok = false;
  result = { error: 'Execute 20261009_crm_cloud_only.sql' };
  await assert.rejects(loadRabiscoBoard('access-key'), /20261009_crm_cloud_only.sql/);
  await assert.rejects(saveRabiscoBoard({ cards: [], connections: [], strokes: [] }, 'access-key'), /20261009_crm_cloud_only.sql/);
});

test('protected backend requires the supplied access key', async () => {
  ok = true; result = null;
  assert.equal(await loadRabiscoBoard('access-key'), null);
  assert.equal(lastRequest.headers.Authorization, 'Bearer access-key');
  assert.equal(lastRequest.cache, 'no-store');
});

test('save requires a positive cloud confirmation', async () => {
  ok = true; result = {};
  const board = { cards: [], connections: [], strokes: [] };
  await assert.rejects(saveRabiscoBoard(board, 'access-key'), /confirmou/);
  result = { saved: true };
  await saveRabiscoBoard(board, 'access-key');
  assert.equal(lastRequest.method, 'PUT');
  assert.deepEqual(JSON.parse(lastRequest.body), board);
});
