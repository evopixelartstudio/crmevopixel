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
require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename,
);

const { getLeadRegistrationValues, getLeadRegistrationInput } = require('../lib/services/lead-registration.ts');
const { persistOpportunityLead, restoreOpportunityLeadStatus } = require('../lib/services/opportunity-registration.ts');
const { comparePipelineEntryNewestFirst } = require('../lib/services/pipeline-order.ts');
const { hasEnteredPipeline } = require('../lib/services/pipeline-entry.ts');
const { LeadDuplicateError } = require('../lib/services/lead-deduplication.ts');

const values = getLeadRegistrationValues({
  name: ' Maria ', company_name: ' Empresa ', segment: 'Advocacia', city: 'Rio Branco',
  whatsapp: '(68) 99999-1234', email: 'contato@empresa.com', instagram: '@empresa', google_business: 'https://maps.app.goo.gl/empresa',
});

test('new opportunity awaits its shared lead and uses every New Lead field', async () => {
  let release;
  let inserted;
  let completed = false;
  const saving = persistOpportunityLead(values, undefined, {
    insertLead: async lead => { inserted = lead; await new Promise(resolve => { release = resolve; }); return lead; },
    updateLead: async () => assert.fail('Must create a new lead'),
  }).then(lead => { completed = true; return lead; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false);
  assert.match(inserted.id, /^[0-9a-f-]{36}$/);
  release();
  const lead = await saving;
  assert.equal(lead.name, 'Maria');
  assert.equal(lead.company_name, 'Empresa');
  assert.equal(lead.segment, 'Advocacia / Jurídico');
  assert.equal(lead.city, values.city);
  assert.equal(lead.whatsapp, '68999991234');
  assert.equal(lead.email, values.email);
  assert.equal(lead.instagram, values.instagram);
  assert.equal(lead.google_business, values.google_business);
  assert.equal(lead.status, 'em_contato');
  assert.equal(hasEnteredPipeline({ lead_id: lead.id, stage_slug: 'primeiro_contato', leads: lead }, [lead]), true);
});

test('existing lead keeps its ID and qualification while updating shared contact data', async () => {
  const existing = {
    ...getLeadRegistrationInput(values), id: 'existing-id', state: 'AC', score: 88, temperature: 'quente', status: 'novo',
    notes: 'Histórico importante', services: ['Website'], ai_analysis: { main_hook: 'Mensagem já preparada' },
  };
  let update;
  const lead = await persistOpportunityLead({ ...values, email: '', instagram: '@novo' }, existing, {
    insertLead: async () => assert.fail('Must reuse the shared lead'),
    updateLead: async (id, data) => { update = { id, data }; return true; },
  });
  assert.equal(update.id, existing.id);
  assert.equal(lead.id, existing.id);
  assert.equal(lead.email, '');
  assert.equal(lead.instagram, '@novo');
  assert.equal(lead.notes, existing.notes);
  assert.deepEqual(lead.services, existing.services);
  assert.deepEqual(lead.ai_analysis, existing.ai_analysis);
  assert.equal(lead.score, existing.score);
  assert.equal(lead.status, 'em_contato');
  assert.equal(existing.status, 'novo');
});

test('failed shared lead writes stop creation and converted status is preserved', async () => {
  await assert.rejects(persistOpportunityLead(values, undefined, {
    insertLead: async () => null, updateLead: async () => true,
  }), /cadastrar o lead/);
  const existing = { id: 'existing', status: 'convertido' };
  await assert.rejects(persistOpportunityLead(values, existing, {
    insertLead: async () => assert.fail(), updateLead: async () => false,
  }), /salvar os dados do lead/);
  const saved = await persistOpportunityLead(values, existing, {
    insertLead: async () => assert.fail(), updateLead: async () => true,
  });
  assert.equal(saved.status, 'convertido');
});

test('duplicate phone blocks a new opportunity lead and preserves the existing registration details', async () => {
  const duplicate = { phone_key: '5568999991234', entity_type: 'client', entity_id: 'existing-client',
    name: 'Cliente existente', company_name: 'Empresa existente', deleted_at: null, location: 'clients' };
  const conflict = new LeadDuplicateError([duplicate]);
  let writes = 0;
  await assert.rejects(persistOpportunityLead(values, undefined, {
    insertLead: async () => { throw conflict; },
    updateLead: async () => { writes++; return true; },
  }), error => error === conflict && error.duplicates[0].entity_id === 'existing-client');
  assert.equal(writes, 0);
});

test('failed opportunity restores only the original lead status and retry reuses the saved lead', async () => {
  let inserts = 0;
  const writes = [];
  const persistence = {
    insertLead: async lead => { inserts++; return lead; },
    updateLead: async (id, data) => { writes.push({ id, data }); return true; },
  };
  const saved = await persistOpportunityLead(values, undefined, persistence);
  assert.equal(await restoreOpportunityLeadStatus(saved, 'novo', persistence), true);
  assert.deepEqual(writes, [{ id: saved.id, data: { status: 'novo' } }]);
  const retried = await persistOpportunityLead(values, { ...saved, status: 'novo' }, persistence);
  assert.equal(inserts, 1);
  assert.equal(retried.id, saved.id);
  assert.equal(retried.instagram, values.instagram);
  assert.equal(retried.status, 'em_contato');
});

test('rollback failure is reported and unchanged status does not issue a write', async () => {
  let writes = 0;
  const persistence = { updateLead: async () => { writes++; return false; } };
  assert.equal(await restoreOpportunityLeadStatus({ id: 'saved', status: 'em_contato' }, 'novo', persistence), false);
  assert.equal(writes, 1);
  assert.equal(await restoreOpportunityLeadStatus({ id: 'saved', status: 'convertido' }, 'convertido', persistence), true);
  assert.equal(writes, 1);
});

test('stage entry puts moved cards first and ignores unrelated contact or value edits', () => {
  const cards = [
    { id: 'edited', stage_entered_at: '2026-10-01T12:00:00Z', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-10-16T20:00:00Z' },
    { id: 'new', stage_entered_at: '2026-10-15T12:00:00Z', created_at: '2026-10-15T12:00:00Z' },
    { id: 'moved', stage_entered_at: '2026-10-16T12:00:00Z', created_at: '2026-08-01T12:00:00Z' },
  ];
  assert.deepEqual([...cards].sort(comparePipelineEntryNewestFirst).map(card => card.id), ['moved', 'new', 'edited']);
  assert.equal(cards[0].id, 'edited');
  const refreshed = JSON.parse(JSON.stringify(cards)).reverse();
  assert.deepEqual(refreshed.sort(comparePipelineEntryNewestFirst).map(card => card.id), ['moved', 'new', 'edited']);
});

test('legacy dates fall back to creation and tied migration timestamps have stable order', () => {
  const cards = [
    { id: 'unknown', stage_entered_at: 'invalid', created_at: 'invalid' },
    { id: 'legacy', created_at: '2026-10-16T12:00:00Z' },
    { id: 'older', stage_entered_at: '2026-10-15T12:00:00Z', created_at: '2026-09-01T12:00:00Z' },
    { id: 'newer', stage_entered_at: '2026-10-15T12:00:00Z', created_at: '2026-10-01T12:00:00Z' },
  ];
  assert.deepEqual(cards.sort(comparePipelineEntryNewestFirst).map(card => card.id), ['legacy', 'newer', 'older', 'unknown']);
  assert.equal(comparePipelineEntryNewestFirst({ id: 'a' }, { id: 'b' }), -1);
});
