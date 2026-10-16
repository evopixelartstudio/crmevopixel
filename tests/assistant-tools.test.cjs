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

const lead = (id, overrides = {}) => ({ id, name: `Contato ${id}`, company_name: 'Empresa', phone: '', whatsapp: '',
  segment: 'Saúde', city: 'Rio Branco', state: 'AC', score: 0, temperature: 'frio', status: 'novo', services: [], ...overrides });
let remoteLeads = [];
let savedTask = null;
let saveTask = true;
let aiFailure = false;
let providerContext = null;
const commands = [];
const crmService = {
  initFromSupabase: async () => {},
  addAiCommand: command => { const record = { ...command }; commands.push(record); return record; },
  // A mocked local lead must never be reported as a database result.
  getLeads: () => [lead('fake', { name: 'Mock Fictício', phone: '11999999999' })],
};
const dbService = {
  getLeads: async () => remoteLeads,
  getClients: async () => [], getOpportunities: async () => [],
  getTasks: async () => [], getTransactions: async () => null,
  insertTask: async task => { if (saveTask) savedTask = task; return saveTask; },
};
function stub(relativePath, value) {
  const filename = require.resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports: value };
}
stub('../lib/services/crm-service.ts', { crmService });
stub('../lib/services/metrics-service.ts', { metricsService: {} });
stub('../lib/supabase/db-service.ts', { dbService });
stub('../lib/ai/ai-provider.ts', { aiProvider: { generateCompletion: async (_query, context) => {
  if (aiFailure) throw new Error('Chave de API inválida');
  providerContext = context;
  return { text: 'Resposta do provedor', provider: 'Google Gemini', model: 'gemini-test' };
} } });

const { assistantTools } = require('../lib/services/assistant-tools.ts');
const { searchCrmLeads, parseLeadSearch, getLeadContext } = require('../lib/services/assistant-lead-search.ts');

test('finds complete phones across punctuation, country code and WhatsApp mobile ninth digit variants', () => {
  const leads = [lead('mobile', { phone: '+55 (34) 99832-7904' }), lead('whatsapp', { whatsapp: 'https://wa.me/553498327904' }),
    lead('other-area', { phone: '(35) 99832-7904' }), lead('landline', { phone: '1132345678' })];
  assert.deepEqual(searchCrmLeads(leads, { query: '(34) 9832-7904', field: 'phone' }).map(l => l.id), ['mobile', 'whatsapp']);
  assert.deepEqual(searchCrmLeads(leads, { query: '5534998327904' }).map(l => l.id), ['mobile', 'whatsapp']);
  assert.deepEqual(searchCrmLeads(leads, { query: '98327904', field: 'phone' }), []);
  assert.deepEqual(searchCrmLeads(leads, { query: '11932345678', field: 'phone' }), []);
  assert.deepEqual(searchCrmLeads(leads, { query: '551132345678' }).map(l => l.id), ['landline']);
});

test('searches names, businesses and emails without accents and returns every matching record', () => {
  const leads = [lead('one', { name: 'João Ávila', company_name: 'Clínica São José', email: 'joao@clinica.com' }),
    lead('two', { name: 'João da Silva', company_name: 'Outra empresa' })];
  assert.equal(searchCrmLeads(leads, { query: 'joao' }).length, 2);
  assert.equal(searchCrmLeads(leads, { query: 'sao jose', field: 'company' })[0].id, 'one');
  assert.equal(searchCrmLeads(leads, { query: 'JOAO@CLINICA.COM', field: 'email' })[0].id, 'one');
  assert.deepEqual(searchCrmLeads(leads, { query: 'sao jose', field: 'name' }), []);
  assert.deepEqual(searchCrmLeads(leads, { query: '' }), []);
});

test('routes natural Portuguese CRM lookup requests without requiring an AI provider', () => {
  const inputs = [
    ['quero que ache um lead pelo número (34) 99832-7904', 'phone', '(34) 99832-7904'],
    ['encontre o lead com e-mail joao@clinica.com', 'email', 'joao@clinica.com'],
    ['ache o lead pelo nome de João Silva', 'name', 'João Silva'],
    ['busque a empresa Clínica São José', 'company', 'Clínica São José'],
    ['procure o lead Ana no CRM', 'any', 'Ana'],
    ['Quem é o lead chamado Pedro?', 'name', 'Pedro'],
  ];
  for (const [input, field, query] of inputs) {
    assert.deepEqual(parseLeadSearch(input), { field, query }, input);
    assert.equal(assistantTools.parseIntent(input).toolName, 'search_leads', input);
  }
  assert.equal(assistantTools.parseIntent('Mostre os leads quentes').toolName, 'get_leads_attention');
  assert.equal(assistantTools.parseIntent('Qual a taxa de conversão?').toolName, 'get_conversion_rate');
  assert.equal(assistantTools.parseIntent('Como melhorar as propostas?').toolName, 'ai_query');
  assert.equal(assistantTools.parseIntent('Como funciona uma tarefa?').toolName, 'ai_query');
  assert.equal(assistantTools.parseIntent('Como criar uma tarefa?').toolName, 'ai_query');
  assert.equal(assistantTools.parseIntent('Quero que você crie uma tarefa para ligar para João').toolName, 'create_task');
  assert.equal(assistantTools.parseIntent('adicione uma tarefa para ligar para 34998327904').toolName, 'create_task');
  assert.equal(parseLeadSearch('crie uma tarefa para ligar para 34998327904'), null);
});

test('search reads real database records beyond the old five-lead context and reports every match', async () => {
  remoteLeads = Array.from({ length: 12 }, (_, i) => lead(String(i), { phone: '(34) 99832-7904' }));
  const result = await assistantTools.executeTool('search_leads', { query: '3498327904', field: 'phone' });
  assert.equal(result.success, true);
  assert.equal(result.data.total, 12);
  assert.equal(result.data.leads.length, 12);
  assert.ok(result.data.leads.every(l => l.id !== 'fake'));
  assert.match(result.message, /12 leads/);
  assert.equal(commands.at(-1).status, 'success');
});

test('distinguishes an empty CRM search from an unavailable database and invalid phone', async () => {
  remoteLeads = [];
  const empty = await assistantTools.executeTool('search_leads', { query: '11999999999', field: 'phone' });
  assert.equal(empty.success, true);
  assert.equal(empty.data.total, 0);
  assert.match(empty.message, /Nenhum lead encontrado/);
  remoteLeads = null;
  const failure = await assistantTools.executeTool('search_leads', { query: '11999999999', field: 'phone' });
  assert.equal(failure.success, false);
  assert.match(failure.message, /Não foi possível consultar/);
  assert.equal(commands.at(-1).status, 'error');
  const incomplete = await assistantTools.executeTool('search_leads', { query: '99999999', field: 'phone' });
  assert.equal(incomplete.success, false);
  assert.match(incomplete.message, /DDD/);
});

test('AI context states its size limit, ranks relevant real leads and passes recent conversation history', async () => {
  remoteLeads = Array.from({ length: 120 }, (_, i) => lead(String(i), { name: i === 119 ? 'João Avila' : `Pessoa ${i}` }));
  const context = getLeadContext(remoteLeads, 'analise João Avila');
  assert.equal(context.totalLeads, 120);
  assert.equal(context.leads.length, 100);
  assert.equal(context.contextoParcial, true);
  assert.equal(context.leads[0].id, '119');
  const history = Array.from({ length: 10 }, (_, i) => ({ role: 'user', content: `Pergunta ${i}` }));
  const result = await assistantTools.executeTool('ai_query', { query: 'analise João Avila', history });
  assert.equal(result.success, true);
  assert.equal(providerContext.cadastrosLeads.leads[0].id, '119');
  assert.deepEqual(providerContext.financeiro, { disponivel: false });
  assert.equal(providerContext.historicoConversa.length, 8);
  aiFailure = true;
  const failure = await assistantTools.executeTool('ai_query', { query: 'analise João Avila' });
  assert.equal(failure.success, false);
  assert.match(failure.message, /Chave de API inválida/);
  aiFailure = false;
});

test('task creation waits for a confirmed database write and unsupported actions never claim success', async () => {
  saveTask = false;
  const invalidDate = await assistantTools.executeTool('create_task', { title: 'Ligar', dueDate: '2026-02-30' });
  assert.equal(invalidDate.success, false);
  const failed = await assistantTools.executeTool('create_task', { title: 'Ligar para João', dueDate: '2026-10-20' });
  assert.equal(failed.success, false);
  assert.equal(savedTask, null);
  saveTask = true;
  const saved = await assistantTools.executeTool('create_task', { title: 'Ligar para João', dueDate: '2026-10-20' });
  assert.equal(saved.success, true);
  assert.equal(savedTask.title, 'Ligar para João');
  assert.match(savedTask.id, /^[0-9a-f-]{36}$/);
  assert.notEqual(saved.actionLogged, true);
  for (const tool of ['register_payment', 'delete_client', 'cancel_contract']) {
    const result = await assistantTools.executeTool(tool, { confirmed: true });
    assert.equal(result.success, false, tool);
    assert.notEqual(result.actionLogged, true, tool);
  }
});
