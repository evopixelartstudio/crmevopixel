const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

let result;
const query = {
  select: () => query,
  eq: () => query,
  upsert: () => query,
  maybeSingle: async () => result,
  single: async () => result,
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

test('missing table gives migration instructions on load and save', async () => {
  for (const code of ['PGRST205', '42P01']) {
    result = { data: null, error: { code, message: 'Missing table' } };
    await assert.rejects(loadRabiscoBoard(), /20261006_create_rabisco_boards.sql/);
    await assert.rejects(saveRabiscoBoard({ cards: [], connections: [], strokes: [] }), /SQL Editor/);
  }
});

test('permission failures retain their cause instead of suggesting migration', async () => {
  result = { data: null, error: { code: '42501', message: 'Permission denied' } };
  await assert.rejects(loadRabiscoBoard(), /Erro ao carregar Rabisco: Permission denied/);
});

test('an empty board is distinct from an unavailable table', async () => {
  result = { data: null, error: null };
  assert.equal(await loadRabiscoBoard(), null);
});
