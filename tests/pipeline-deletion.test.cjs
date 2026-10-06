const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.resolve(__dirname, '..', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, filename);
let result;
const calls = [];
const clientPath = require.resolve('../lib/supabase/client.ts');
require.cache[clientPath] = { loaded: true, exports: { getSupabase: () => ({
  from(table) {
    calls.push(table);
    return { delete: () => ({ in(column, ids) {
      calls.push({ column, ids });
      return { select: async () => result };
    } }) };
  },
}) } };
const { deletePipelineOpportunities } = require('../lib/services/pipeline-deletion.ts');
test('empty selection does not call Supabase', async () => {
  assert.deepEqual(await deletePipelineOpportunities([]), []);
  assert.equal(calls.length, 0);
});
test('bulk deletion targets opportunities only, deduplicates IDs and returns confirmed deletions', async () => {
  result = { data: [{ id: 'one' }], error: null };
  assert.deepEqual(await deletePipelineOpportunities(['one', 'two', 'one']), ['one']);
  assert.equal(calls[0], 'opportunities');
  assert.deepEqual(calls[1], { column: 'id', ids: ['one', 'two'] });
});
test('Supabase failure rejects instead of reporting successful deletion', async () => {
  result = { data: null, error: { message: 'Permission denied' } };
  await assert.rejects(deletePipelineOpportunities(['one']), /Permission denied/);
});
