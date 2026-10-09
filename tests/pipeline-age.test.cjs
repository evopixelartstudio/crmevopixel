const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/services/pipeline-age.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { isStageOverdue } = compiled.exports;
test('48 hour warning handles boundary, invalid dates and closed work', () => {
  const now = Date.parse('2026-10-09T12:00:00Z');
  const opp = { stage_slug: 'proposta', status: 'aberto', stage_entered_at: new Date(now - 48 * 3600000).toISOString() };
  assert.equal(isStageOverdue(opp, now), false);
  assert.equal(isStageOverdue(opp, now + 1), true);
  assert.equal(isStageOverdue({ ...opp, stage_entered_at: 'invalid' }, now), false);
  assert.equal(isStageOverdue({ ...opp, status: 'perdido' }, now + 1), false);
  assert.equal(isStageOverdue({ ...opp, stage_slug: 'fechado' }, now + 1), false);
});

