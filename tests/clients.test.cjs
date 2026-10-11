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

let fail = false;
let remoteClients = [];
let pendingInsert;
let insertCalls = 0;
const rows = new Map();
const dbService = new Proxy({}, { get: (_, key) => async (...args) => {
  if (key === 'getClients') return remoteClients;
  if (key === 'insertClient') {
    insertCalls++;
    if (pendingInsert) return pendingInsert;
    if (fail) return null;
    const saved = { ...args[0], name: args[0].name.trim() };
    rows.set(saved.id, saved);
    return saved;
  }
  if (key === 'updateClient') {
    if (fail || !rows.has(args[0])) return null;
    const saved = { ...rows.get(args[0]), ...args[1], id: args[0] };
    rows.set(saved.id, saved);
    return saved;
  }
  if (key === 'deleteClient') return !fail && rows.delete(args[0]);
  return null;
} });
const dbPath = require.resolve('../lib/supabase/db-service.ts');
require.cache[dbPath] = { loaded: true, exports: { dbService } };
const { crmService } = require('../lib/services/crm-service.ts');
const draft = company => ({ name: ' Contato ', company_name: company, segment: 'Geral', status: 'ativo',
  total_contracted: 0, total_received: 0, total_pending: 0, lifetime_value: 0, projects_count: 0,
  website_url: 'https://example.test', instagram: '@teste', google_business: 'https://maps.test' });

test('clients only appear after confirmed persistence and retain data on failed edits or deletion', async () => {
  fail = true;
  await assert.rejects(crmService.addClient(draft('Empresa')), /Supabase/);
  assert.deepEqual(crmService.getClients(), []);
  fail = false;
  const saved = await crmService.addClient(draft('Empresa'));
  assert.match(saved.id, /^[0-9a-f-]{36}$/);
  assert.equal(saved.name, 'Contato');
  assert.equal(saved.instagram, '@teste');
  await crmService.addClient(draft('Empresa'), saved.id);
  assert.equal(crmService.getClients().length, 1);
  fail = true;
  await assert.rejects(crmService.updateClient(saved.id, { name: 'Alterado', total_received: 100 }), /Supabase/);
  await assert.rejects(crmService.deleteClient(saved.id), /Supabase/);
  assert.equal(crmService.getClientById(saved.id).name, 'Contato');
  assert.equal(crmService.getClientById(saved.id).total_received, 0);
  fail = false;
  const edited = await crmService.updateClient(saved.id, { website_url: '' });
  assert.equal(edited.website_url, '');
  assert.equal(edited.id, saved.id);
  await crmService.deleteClient(saved.id);
  assert.equal(crmService.getClientById(saved.id), undefined);
});

test('pending creation is invisible and stale refresh cannot erase a confirmed client', async () => {
  let finishLoad, finishInsert;
  remoteClients = new Promise(resolve => { finishLoad = resolve; });
  const loading = crmService.initFromSupabase(true);
  pendingInsert = new Promise(resolve => { finishInsert = resolve; });
  const id = crypto.randomUUID();
  const creating = crmService.addClient(draft('Confirmado durante carga'), id);
  assert.equal(crmService.getClientById(id), undefined);
  const record = { ...draft('Confirmado durante carga'), id };
  rows.set(id, record);
  finishInsert(record);
  await creating;
  pendingInsert = null;
  finishLoad([]);
  await loading;
  assert.ok(crmService.getClientById(id));
  remoteClients = null;
  await crmService.initFromSupabase(true);
  assert.ok(crmService.getClientById(id));
  assert.match(crmService.getClientError(), /carregar/);
  remoteClients = [];
  await crmService.initFromSupabase(true);
  assert.deepEqual(crmService.getClients(), []);
  assert.equal(crmService.getClientError(), '');
});

test('automatic history synchronization queues writes, keeps one client and retries failures', async () => {
  const project = { company_name: 'Empresa automática', client_name: 'Contato automático', segment: 'Saúde',
    services_summary: 'Site', amount_contracted: 100, amount_received: 50, amount_pending: 50,
    project_date: '2026-10-10', status: 'pendente' };
  fail = true;
  crmService.addHistoricalProject(project);
  // Aguarda a tentativa já iniciada sem consumi-la como retry.
  await crmService.clientSyncQueue;
  assert.equal(crmService.getClients().length, 0);
  assert.match(crmService.getClientError(), /automaticamente/);
  const before = insertCalls;
  fail = false;
  crmService.addHistoricalProject({ ...project, amount_contracted: 200, amount_received: 100, amount_pending: 100 });
  await crmService.retryClientSync();
  const clients = crmService.getClients();
  assert.equal(clients.length, 1);
  assert.equal(insertCalls, before + 1);
  assert.equal(clients[0].total_contracted, 300);
  assert.equal(clients[0].total_received, 150);
  assert.equal(clients[0].projects_count, 2);
  assert.equal(crmService.getClientError(), '');
  fail = true;
  crmService.updateHistoricalProject(crmService.getHistoricalProjects()[0].id, { amount_received: 180 });
  await crmService.clientSyncQueue;
  assert.equal(crmService.getClients()[0].total_received, 150);
  fail = false;
  await crmService.retryClientSync();
  assert.equal(crmService.getClients()[0].total_received, 230);
});

test('closing a pipeline opportunity creates one confirmed client and enriches its contacts', async () => {
  const lead = crmService.addLead({ name: 'Contato do pipeline', company_name: 'Empresa do pipeline',
    segment: 'Tecnologia', email: 'contato@example.test', whatsapp: '11999999999', status: 'em_contato' });
  const opportunity = crmService.addOpportunity({ lead_id: lead.id, lead_name: lead.name, company_name: lead.company_name,
    stage_slug: 'primeiro_contato', title: 'Site', estimated_value: 1000, probability: 0,
    score: 80, temperature: 'quente', priority: 'alta', services: [] });
  const before = insertCalls;
  crmService.triggerStageSideEffects(opportunity, 'fechado');
  await crmService.retryClientSync();
  const clients = crmService.getClients().filter(client => client.company_name === lead.company_name);
  assert.equal(clients.length, 1);
  assert.equal(insertCalls, before + 1);
  assert.equal(clients[0].email, lead.email);
  assert.equal(clients[0].whatsapp, lead.whatsapp);
  assert.equal(clients[0].total_contracted, 1000);
});
