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
const { getPipelineStageMap, isNegotiationStage } = compiled.exports;

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
