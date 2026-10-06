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
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
let inserts = 0;
let updates = 0;
let failure = false;
const clientPath = require.resolve('../lib/supabase/client.ts');
require.cache[clientPath] = { loaded: true, exports: { getSupabase: () => ({ from: () => ({
  update: () => ({ eq: async () => { updates++; return { error: failure ? { message: 'Denied' } : null }; } }),
  insert: value => ({ select: () => ({ single: async () => {
    inserts++;
    return { data: failure ? null : { ...value, id: 'new-follow-up' }, error: failure ? { message: 'Denied' } : null };
  } }) }),
}) }) } };
const { ensureFollowUpStages } = require('../lib/services/pipeline-follow-up-stages.ts');
test('preserves existing follow-up ID, creates second stage, orders them after proposal and avoids duplicates', async () => {
  const stages = [
    { id: 'contact', slug: 'primeiro_contato', name: 'Contato', display_order: 1 },
    { id: 'proposal', slug: 'proposta', name: 'Proposta', display_order: 2 },
    { id: 'existing-follow-up', slug: 'follow_up', name: 'Follow-up', display_order: 3 },
    { id: 'closed', slug: 'fechado', name: 'Fechado', display_order: 4 },
  ];
  const result = await ensureFollowUpStages(stages);
  assert.deepEqual(result.map(stage => stage.slug), ['primeiro_contato', 'proposta', 'follow_up', 'follow_up_2', 'fechado']);
  assert.equal(result[2].id, 'existing-follow-up');
  assert.equal(result[2].name, 'Follow-up 1');
  assert.equal(result[3].name, 'Follow-up 2');
  await ensureFollowUpStages(result);
  assert.equal(inserts, 1);
  assert.equal(updates, 1);
});
test('reports denied writes instead of showing stages that were not saved', async () => {
  failure = true;
  await assert.rejects(ensureFollowUpStages([]), /Denied/);
});
