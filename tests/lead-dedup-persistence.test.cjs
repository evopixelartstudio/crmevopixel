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

let updateError = null;
const filename = require.resolve('../lib/supabase/db-service.ts');
const compiled = new Module(filename, module);
compiled.require = name => name === './client' ? {
  isSupabaseConfigured: () => true,
  getSupabase: () => ({ from: () => ({
    update: () => ({ eq: async () => ({ error: updateError }) }),
  }) }),
} : module.require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { dbService } = compiled.exports;
const { LeadDuplicateError } = require('../lib/services/lead-deduplication.ts');

const id = '11111111-1111-4111-8111-111111111111';
const duplicate = { phone_key: '5568999991234', entity_type: 'lead', entity_id: id,
  name: 'Cadastro existente', company_name: 'Empresa existente', deleted_at: null, location: 'pipeline' };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('lead creation uses the checked endpoint, parses confirmed metadata and preserves duplicate errors', async () => {
  const originalFetch = global.fetch;
  const draft = { id, name: 'Contato', company_name: 'Empresa', phone: '(68) 99999-1234', status: 'novo', notes: 'Histórico', google_business: 'https://maps.example', services: ['Site'] };
  try {
    global.fetch = async (url, options) => {
      assert.equal(url, '/api/leads');
      assert.equal(options.method, 'POST');
      const body = JSON.parse(options.body);
      assert.equal(body.action, 'create');
      assert.equal(body.lead.id, id);
      assert.equal(body.lead.phone, draft.phone);
      assert.equal(Object.hasOwn(body.lead, 'google_business'), false);
      return response({ lead: body.lead }, 201);
    };
    const created = await dbService.insertLead(draft);
    assert.equal(created.id, id);
    assert.equal(created.notes, draft.notes);
    assert.equal(created.google_business, draft.google_business);
    assert.deepEqual(created.services, draft.services);
    global.fetch = async () => response({ error: 'Telefone já cadastrado no pipeline.', duplicates: [duplicate] }, 409);
    await assert.rejects(dbService.insertLead(draft), error => error instanceof LeadDuplicateError && error.duplicates[0].entity_id === id);
    global.fetch = async () => { throw new Error('Sem conexão'); };
    await assert.rejects(dbService.insertLead(draft), /Sem conexão/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('large imports preserve confirmed chunks, adjust duplicate row indices and report remaining connection failures', async () => {
  const originalFetch = global.fetch;
  const drafts = Array.from({ length: 450 }, (_, index) => ({ id: crypto.randomUUID(), name: `Lead ${index}`, company_name: `Empresa ${index}`, status: 'novo' }));
  let calls = 0;
  try {
    global.fetch = async (_, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.action, 'import');
      assert.ok(body.leads.length <= 200);
      calls++;
      if (calls === 1) return response({ created: body.leads.slice(0, 199), duplicates: [{ ...duplicate, inputIndex: 199 }], failed: [], total: 200 });
      if (calls === 2) return response({ created: body.leads.slice(0, 1), duplicates: [{ ...duplicate, inputIndex: 1 }], failed: body.leads.slice(2).map((_, index) => ({ index: index + 2, message: 'Falha nesta linha' })), total: 200 });
      throw new Error('Conexão interrompida');
    };
    const result = await dbService.importLeads(drafts);
    assert.equal(calls, 3);
    assert.equal(result.total, 450);
    assert.equal(result.created.length, 200);
    assert.equal(result.duplicates.length, 2);
    assert.deepEqual(result.duplicates.map(item => item.inputIndex), [199, 201]);
    assert.equal(result.failed.length, 248);
    assert.equal(result.failed[0].index, 202);
    assert.equal(result.failed.at(-1).index, 449);
    assert.match(result.failed.at(-1).message, /Conexão interrompida/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('imports split long UTF-8 spreadsheet notes by request bytes and preserve row indices and totals', async () => {
  const originalFetch = global.fetch;
  const notes = 'Á'.repeat(60_000);
  const drafts = Array.from({ length: 40 }, (_, index) => ({
    id: crypto.randomUUID(), name: `Lead ${index}`, company_name: `Empresa ${index}`, status: 'novo', notes,
    phone: index % 2 === 0 ? `119${String(index).padStart(8, '0')}` : '',
  }));
  const chunks = [];
  try {
    global.fetch = async (_, options) => {
      assert.ok(new TextEncoder().encode(options.body).byteLength <= 1_900_000);
      const body = JSON.parse(options.body);
      assert.ok(body.leads.length <= 200);
      chunks.push(body.leads);
      const secondChunk = chunks.length === 2;
      return response({
        created: body.leads.filter((_, index) => !secondChunk || ![1, 2].includes(index)),
        duplicates: secondChunk ? [{ ...duplicate, inputIndex: 1 }] : [],
        failed: secondChunk ? [{ index: 2, message: 'Falha nesta linha' }] : [],
        total: body.leads.length,
        withoutPhone: body.leads.filter(lead => !lead.phone).length,
      });
    };
    const result = await dbService.importLeads(drafts);
    assert.ok(chunks.length >= 2);
    assert.equal(chunks.flat().length, 40);
    assert.equal(result.total, 40);
    assert.equal(result.created.length, 38);
    assert.equal(result.duplicates.length, 1);
    assert.equal(result.failed.length, 1);
    assert.equal(result.duplicates[0].inputIndex, chunks[0].length + 1);
    assert.equal(result.failed[0].index, chunks[0].length + 2);
    assert.equal(result.withoutPhone, 20);
    assert.ok(result.created.every(lead => lead.notes === notes));
  } finally {
    global.fetch = originalFetch;
  }
});

test('an unconfirmed import result cannot claim records were saved', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => response({ error: 'Migração necessária' }, 503);
    const failed = await dbService.importLeads([{ id, name: 'Contato', company_name: 'Empresa' }]);
    assert.deepEqual(failed.created, []);
    assert.deepEqual(failed.duplicates, []);
    assert.deepEqual(failed.failed, [{ index: 0, message: 'Migração necessária' }]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('phone edits preserve SQL duplicate details as an actionable typed error', async () => {
  const { location, ...match } = duplicate;
  updateError = { code: '23505', message: 'LEAD_PHONE_DUPLICATE', details: JSON.stringify({ matches: [{ ...match, deleted_at: '2026-10-16T12:00:00Z' }] }) };
  try {
    await assert.rejects(dbService.updateLead(id, { phone: '(68) 99999-1234' }), error =>
      error instanceof LeadDuplicateError && error.duplicates[0].location === 'trash' && error.duplicates[0].entity_id === id);
  } finally {
    updateError = null;
  }
});
