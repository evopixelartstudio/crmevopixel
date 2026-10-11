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
    return { data: failure ? null : { ...value, id: `new-${value.slug}` }, error: failure ? { message: 'Denied' } : null };
  } }) }),
}) }) } };
const { ensurePipelineStages } = require('../lib/services/pipeline-required-stages.ts');
test('adds sales stages after contact, preserves follow-up IDs and avoids duplicates on reload', async () => {
  const stages = [
    { id: 'contact', slug: 'primeiro_contato', name: 'Contato', display_order: 1 },
    { id: 'proposal', slug: 'proposta', name: 'Proposta', display_order: 2 },
    { id: 'existing-follow-up', slug: 'follow_up', name: 'Follow-up', display_order: 3 },
    { id: 'closed', slug: 'fechado', name: 'Fechado', display_order: 4 },
  ];
  const result = await ensurePipelineStages(stages);
  assert.deepEqual(result.map(stage => stage.slug), ['primeiro_contato', 'sem_resposta', 'qualificado', 'proposta', 'follow_up', 'follow_up_2', 'fechado']);
  assert.equal(result[2].name, 'Qualificado');
  assert.equal(result[4].id, 'existing-follow-up');
  assert.equal(result[4].name, 'Follow-up 1');
  assert.equal(result[5].name, 'Follow-up 2');
  await ensurePipelineStages(result);
  assert.equal(result[1].name, 'Sem resposta');
  assert.equal(result.some(stage => stage.slug === 'orcamento'), false);
  assert.equal(inserts, 3);
  assert.equal(updates, 1);
});
test('reuses existing sales and no-response stages without changing linked IDs', async () => {
  const stages = [
    { id: 'closed', slug: 'fechado', name: 'Fechado', display_order: 4 },
    { id: 'qualified', slug: 'qualificado', name: 'Qualificado', display_order: 9 },
    { id: 'contact', slug: 'primeiro_contato', name: 'Contato', display_order: 1 },
    { id: 'proposal', slug: 'proposta', name: 'Proposta', display_order: 2 },
    { id: 'follow-one', slug: 'follow_up_1', name: 'Follow-up 1', display_order: 5 },
    { id: 'follow-two', slug: 'follow_up_2', name: 'Follow-up 2', display_order: 6 },
    { id: 'no-response', slug: 'sem_resposta', name: 'Sem resposta', display_order: 7 },
  ];
  const previousInserts = inserts;
  const result = await ensurePipelineStages(stages);
  assert.deepEqual(result.map(stage => stage.id), ['contact', 'no-response', 'qualified', 'proposal', 'follow-one', 'follow-two', 'closed']);
  assert.equal(inserts, previousInserts);
  assert.equal(stages[0].id, 'closed');
});

test('reports denied writes instead of showing stages that were not saved', async () => {
  failure = true;
  await assert.rejects(ensurePipelineStages([]), /Denied/);
});
