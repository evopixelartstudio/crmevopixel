const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/services/pipeline-stages.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { getPipelineStageMap, getVisiblePipelineStages, resolvePipelineStageEdit, isNegotiationStage } = compiled.exports;

test('negotiation is removed from choices while existing cards resolve to proposal', () => {
  const stages = [
    { id: 'contact', slug: 'primeiro_contato', name: 'Primeiro Contato' },
    { id: 'proposal', slug: 'proposta', name: 'Proposta' },
    { id: 'legacy', slug: 'negociacao', name: 'Negociação' },
    { id: 'follow', slug: 'follow_up', name: 'Follow-up 1' },
  ];
  const map = getPipelineStageMap(stages);
  assert.deepEqual(stages.filter(stage => !isNegotiationStage(stage)).map(stage => stage.id), ['contact', 'proposal', 'follow']);
  assert.equal(map.get('legacy'), stages[1]);
  assert.equal(map.get('follow'), stages[3]);
  assert.equal(stages[2].id, 'legacy');
});

test('recognizes accented names and refuses to hide cards without a proposal stage', () => {
  const stage = { id: 'legacy', slug: 'custom', name: ' Negociação ' };
  assert.equal(isNegotiationStage(stage), true);
  assert.throws(() => getPipelineStageMap([stage]), /Proposta precisa existir/);
});

test('orders commercial stages and groups retired stages without changing stored IDs', () => {
  const stages = [
    { id: 'closed', slug: 'fechado', name: 'Fechado', display_order: 1 },
    { id: 'no-response', slug: 'sem_resposta', name: 'Sem resposta', display_order: 2 },
    { id: 'follow-two', slug: 'follow_up_2', name: 'Follow-up 2', display_order: 3 },
    { id: 'proposal', slug: 'proposta', name: 'Proposta', display_order: 4 },
    { id: 'qualified', slug: 'qualificado', name: 'Qualificado', display_order: 5 },
    { id: 'contact', slug: 'primeiro_contato', name: 'Primeiro Contato', display_order: 6 },
    { id: 'follow-one', slug: 'follow_up_1', name: 'Follow-up 1', display_order: 7 },
    { id: 'budget', slug: 'orcamento', name: 'Orçamento', display_order: 8 },
    { id: 'project', slug: 'projeto_em_andamento', name: 'Projeto em andamento', display_order: 9 },
    { id: 'legacy', slug: 'negociacao', name: 'Negociação', display_order: 10 },
  ];
  const original = structuredClone(stages);
  assert.deepEqual(getVisiblePipelineStages(stages).map(stage => stage.slug), [
    'primeiro_contato', 'sem_resposta', 'qualificado', 'proposta', 'follow_up_1', 'follow_up_2', 'fechado',
  ]);
  const map = getPipelineStageMap(stages);
  assert.equal(map.get('budget').id, 'proposal');
  assert.equal(map.get('legacy').id, 'proposal');
  assert.equal(map.get('project').id, 'closed');
  assert.equal(resolvePipelineStageEdit('project', 'closed', map), 'project');
  assert.equal(resolvePipelineStageEdit('budget', 'proposal', map), 'budget');
  assert.equal(resolvePipelineStageEdit('project', 'proposal', map), 'proposal');
  assert.deepEqual(stages, original);
});

test('recognizes retired names with accents and keeps custom stages', () => {
  const stages = [
    { id: 'budget', slug: 'custom-budget', name: ' Orçamento ', display_order: 1 },
    { id: 'project', slug: 'custom-project', name: ' Projeto em andamento ', display_order: 2 },
    { id: 'proposal', slug: 'proposta', name: 'Proposta', display_order: 3 },
    { id: 'closed', slug: 'fechado', name: 'Fechado', display_order: 4 },
    { id: 'diagnosis', slug: 'diagnostico', name: 'Diagnóstico', display_order: 5 },
  ];
  assert.deepEqual(getVisiblePipelineStages(stages).map(stage => stage.id), ['diagnosis', 'proposal', 'closed']);
  assert.equal(getPipelineStageMap(stages).get('budget').id, 'proposal');
  assert.equal(getPipelineStageMap(stages).get('project').id, 'closed');
  assert.throws(() => getPipelineStageMap([stages[1]]), /Fechado precisa existir/);
  assert.throws(() => getPipelineStageMap([stages[0]]), /Proposta precisa existir/);
});
