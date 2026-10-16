const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

const id = '11111111-1111-4111-8111-111111111111';
let row;
let payload;
const filename = require.resolve('../lib/supabase/db-service.ts');
const compiled = new Module(filename, module);
compiled.require = name => name === './client' ? {
  isSupabaseConfigured: () => true,
  getSupabase: () => ({ from: table => {
    assert.equal(table, 'leads');
    return {
      update: data => {
        payload = data;
        return { eq: async (column, value) => {
          assert.equal(column, 'id');
          assert.equal(value, id);
          row = { ...row, ...data };
          return { error: null };
        } };
      },
    };
  } }),
} : name.startsWith('@/') ? {
  recoverSpreadsheetBusinessName: () => '', recoverSpreadsheetWhatsApp: () => '',
  cleanPhoneNumber: phone => String(phone || '').replace(/\D/g, ''),
} : module.require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { dbService, parseLeadFromSupabase } = compiled.exports;

test('status changes and rollback preserve the lead history and embedded qualification metadata', async () => {
  const metadata = { google_business: 'https://maps.app.goo.gl/empresa', services: ['Website'], ai_analysis: { main_hook: 'Mensagem preparada' } };
  const notes = `Conversa com o cliente\n<!--METADATA:${JSON.stringify(metadata)}-->`;
  row = { id, status: 'novo', notes };
  assert.equal(await dbService.updateLead(id, { status: 'em_contato' }), true);
  assert.equal(Object.hasOwn(payload, 'notes'), false);
  assert.equal(row.notes, notes);
  assert.equal(await dbService.updateLead(id, { status: 'novo' }), true);
  assert.equal(row.notes, notes);
  const lead = parseLeadFromSupabase(row);
  assert.equal(lead.status, 'novo');
  assert.equal(lead.notes, 'Conversa com o cliente');
  assert.equal(lead.google_business, metadata.google_business);
  assert.deepEqual(lead.services, metadata.services);
  assert.deepEqual(lead.ai_analysis, metadata.ai_analysis);
});

test('explicit note and metadata changes still persist when supplied', async () => {
  row = { id, notes: 'Observação antiga' };
  const data = { notes: 'Observação atualizada', google_business: 'maps', services: ['Automação'] };
  assert.equal(await dbService.updateLead(id, data), true);
  assert.equal(Object.hasOwn(payload, 'notes'), true);
  const lead = parseLeadFromSupabase(row);
  assert.equal(lead.notes, data.notes);
  assert.equal(lead.google_business, data.google_business);
  assert.deepEqual(lead.services, data.services);
});
