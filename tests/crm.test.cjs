const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const xlsx = require('xlsx');

const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.resolve(__dirname, '..', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename,
);

const inserted = [];
const updates = [];
let remoteLeads = [];
let failLeadInsert = false;
const dbService = new Proxy({}, {
  get: (_, key) => async (...args) => {
    if (key === 'getLeads') return remoteLeads;
    if (key === 'insertLead') { inserted.push(args[0]); return failLeadInsert ? null : args[0]; }
    if (key === 'updateHistoricalProject') { updates.push(args); return true; }
    return null;
  },
});
const dbPath = require.resolve('../lib/supabase/db-service.ts');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { dbService } };
const { crmService } = require('../lib/services/crm-service.ts');
const { hasEnteredPipeline } = require('../lib/services/pipeline-entry.ts');

test('new leads stay outside first contact until explicitly contacted, including imported leads', () => {
  const lead = { id: 'uncontacted', status: 'novo' };
  const opportunity = { lead_id: lead.id, stage_slug: 'primeiro_contato', leads: lead };
  assert.equal(hasEnteredPipeline(opportunity, [lead]), false);
  assert.equal(hasEnteredPipeline(opportunity, []), false);
  assert.equal(hasEnteredPipeline(opportunity, [{ ...lead, status: 'em_contato' }]), true);
  assert.equal(hasEnteredPipeline({ ...opportunity, stage_slug: 'proposta' }, [lead]), true);
  assert.equal(hasEnteredPipeline({ stage_slug: 'primeiro_contato' }, []), true);
});

test('manual lead creation survives an in-flight refresh and creates no opportunity', async () => {
  let resolveLoad;
  remoteLeads = new Promise(resolve => { resolveLoad = resolve; });
  const loading = crmService.initFromSupabase(true);
  const before = crmService.getOpportunities().length;
  const lead = crmService.addLead({ name: 'Manual contact', company_name: 'Manual company', status: 'novo' });
  resolveLoad([]);
  await loading;
  assert.equal(crmService.getLeadById(lead.id).status, 'novo');
  assert.equal(crmService.getOpportunities().length, before);
  remoteLeads = [];
  await crmService.initFromSupabase(true);
  inserted.length = 0;
});
const { parseSpreadsheetLeads, recoverSpreadsheetBusinessName, recoverSpreadsheetWhatsApp } = require('../lib/services/spreadsheet-leads.ts');
const { cleanPhoneNumber, getWhatsAppUrl } = require('../lib/utils/whatsapp.ts');

test('spreadsheet WhatsApp / telefone header imports wa.me links and recovers existing notes', () => {
  const sheet = xlsx.utils.aoa_to_sheet([
    ['Nome do negócio', 'WhatsApp / telefone'],
    ['#1Lavanderiajipa', 'https://wa.me/5569993547674'],
    ['Alemão Diesel', 'https://wa.me/556933211509'],
  ]);
  const leads = parseSpreadsheetLeads(xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false }));
  assert.equal(getWhatsAppUrl(leads[0].whatsapp), 'https://wa.me/5569993547674');
  assert.equal(getWhatsAppUrl(leads[1].whatsapp), 'https://wa.me/556933211509');
  const recovered = recoverSpreadsheetWhatsApp('Dados originais da planilha:\nWhatsApp / telefone: https://wa.me/5569993547674');
  assert.equal(getWhatsAppUrl(recovered), 'https://wa.me/5569993547674');
  assert.equal(cleanPhoneNumber('https://wa.me/5569993547674?text=Oferta%2050'), '5569993547674');
  assert.equal(cleanPhoneNumber('https://api.whatsapp.com/send?phone=5569993547674&text=123'), '5569993547674');
  assert.equal(getWhatsAppUrl('(69) 99354-7674'), 'https://wa.me/5569993547674');
});
const { getSalesByNiche } = require('../lib/services/sales-by-niche.ts');

test('sales inherit registered niches when historical company names differ from client company names', () => {
  const clients = [
    { id: 'hilton', company_name: 'HB Barros', name: 'Dr Hilton', segment: 'Advocacia' },
    { id: 'israel', company_name: 'Contap', name: 'Israel', segment: 'Contabilidade' },
  ];
  const history = [
    { company_name: 'Hilton Advocacia', client_name: 'Dr. Hilton', status: 'liquidado', amount_contracted: 100, project_date: '2026-10-06' },
    { company_name: 'Israel Contabilidade', client_name: '', status: 'liquidado', amount_contracted: 200, project_date: '2026-10-06' },
  ];
  const groups = getSalesByNiche(history, [], [], [], clients);
  assert.equal(groups.some(group => group.niche === 'Nicho não informado'), false);
  assert.equal(groups.find(group => group.niche === 'Advocacia').customers[0].company, 'HB Barros');
  assert.equal(groups.find(group => group.niche === 'Advocacia').customers[0].clientId, 'hilton');
  assert.equal(groups.find(group => group.niche === 'Contabilidade').customers[0].company, 'Contap');
  assert.equal(groups.find(group => group.niche === 'Contabilidade').customers[0].clientId, 'israel');
  assert.equal(groups.reduce((sum, group) => sum + group.count, 0), 2);
});

test('sales pie counts sold niches only, excludes canceled/open records and deduplicates mirrored sales', () => {
  const historical = [
    { id: 'h1', company_name: 'Alfa', segment: 'Advocacia', amount_contracted: 100, project_date: '2026-10-06', status: 'liquidado', notes: 'Pipeline (o1)' },
    { id: 'h2', company_name: 'Beta', segment: 'advocacia', amount_contracted: 200, project_date: '2026-10-06', status: 'parcial' },
    { id: 'h3', company_name: 'Canceled', segment: 'Cancelado', amount_contracted: 200, project_date: '2026-10-06', status: 'cancelado' },
  ];
  const projects = [
    { id: 'p1', company_name: 'Alfa', segment: 'Advocacia', amount_contracted: 100, deadline: '2026-10-06', status: 'concluido' },
    { id: 'p2', company_name: 'Gamma', segment: 'Odonto', amount_contracted: 100, deadline: '2026-10-06', status: 'concluido' },
    { id: 'p3', company_name: 'Open', segment: 'Aberto', amount_contracted: 100, deadline: '2026-10-06', status: 'briefing' },
  ];
  const opportunities = [
    { id: 'o1', company_name: 'Alfa', stage_slug: 'fechado', estimated_value: 100, updated_at: '2026-10-06' },
    { id: 'o2', company_name: 'Lead only', stage_slug: 'proposta', leads: { segment: 'Prospecção' }, estimated_value: 100 },
  ];
  const result = getSalesByNiche(historical, projects, opportunities, [], []);
  assert.deepEqual(result.map(item => [item.niche, item.count]), [['Advocacia', 2], ['Odonto', 1]]);
  assert.deepEqual(result[0].customers.map(customer => customer.company), ['Alfa', 'Beta']);
  assert.deepEqual(result[1].customers.map(customer => customer.company), ['Gamma']);
  assert.ok(Math.abs(result.reduce((sum, item) => sum + item.percentage, 0) - 100) < 0.001);
  assert.deepEqual(getSalesByNiche(historical, projects, opportunities, [], [], 'hoje', new Date('2026-10-07T12:00:00')), []);
  assert.deepEqual(getSalesByNiche([], [], [], [], []), []);
});

test('proposal uses the supplied payment link and never invents a Mercado Pago link', () => {
  const filename = path.resolve(__dirname, '../app/(dashboard)/pipeline/page.tsx');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'generateWhatsAppProposalMessage');
  assert.ok(fn);
  const code = ts.transpileModule(fn.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const generate = new Function(`${code}; return generateWhatsAppProposalMessage;`)();
  const opportunity = { lead_name: 'Ana', title: 'Site', services: ['Site'], delivery_days: 7 };
  const withoutLink = generate(opportunity);
  assert.doesNotMatch(withoutLink, /Mercado Pago|mpago|https?:/);
  assert.match(withoutLink, /combinar a forma de pagamento/);
  const withLink = generate(opportunity, 'https://payment.example/checkout', 10);
  assert.match(withLink, /https:\/\/payment.example\/checkout/);
  assert.match(withLink, /10 dias/);
});

test('XLSX accepts incomplete leads and unknown columns, preserves data and skips empty rows', () => {
  const sheet = xlsx.utils.aoa_to_sheet([
    [' NOME DA EMPRESA ', 'TELEFONE', 'E-MAIL', 'SITE', 'CIDADE', 'UF'],
    ['Alfa', 11999999999, 'alfa@example.com', 'https://alfa.example', 'Rio Branco', 'AC'],
    ['', '', '', '', '', ''],
  ]);
  const leads = parseSpreadsheetLeads(xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false }));
  assert.equal(leads.length, 1);
  assert.equal(leads[0].name, 'Alfa');
  assert.equal(leads[0].company_name, 'Alfa');
  assert.equal(leads[0].email, 'alfa@example.com');
  assert.equal(leads[0].website, 'https://alfa.example');
  assert.equal(leads[0].state, 'AC');
  assert.equal(leads[0].status, 'novo');
  assert.match(leads[0].whatsapp, /99999/);
  const incomplete = parseSpreadsheetLeads([{ unknown: 'value' }, {}, { Instagram: '@empresa' }, { Observações: 'Ligar depois' }, { Email: 'contato@example.com' }]);
  assert.equal(incomplete.length, 4);
  assert.match(incomplete[0].notes, /unknown: value/);
  assert.equal(incomplete[1].instagram, '@empresa');
  assert.match(incomplete[2].notes, /Ligar depois/);
  assert.equal(incomplete[3].email, 'contato@example.com');
  incomplete.forEach(lead => assert.equal(lead.status, 'novo'));
});

test('spreadsheet business-name header maps to company and contact, including accents and whitespace', () => {
  const names = ['#1Lavanderiajipa', '24 Horas Lavanderia Self-Service Express - FEB Várzea Grande', 'Alemão Diesel', 'Aline Macedo Beauty'];
  const sheet = xlsx.utils.aoa_to_sheet([['Nome do negócio'], ...names.map(name => [name])]);
  const leads = parseSpreadsheetLeads(xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false }));
  assert.deepEqual(leads.map(lead => lead.company_name), names);
  assert.deepEqual(leads.map(lead => lead.name), names);
  assert.equal(parseSpreadsheetLeads([{ ' NOME DO NEGOCIO ': 'Baiano Auto Center' }])[0].company_name, 'Baiano Auto Center');
  assert.equal(recoverSpreadsheetBusinessName('Dados originais da planilha:\nNome do negócio: Alemão Diesel'), 'Alemão Diesel');
  assert.equal(recoverSpreadsheetBusinessName('Anotação comum: manter empresa atual'), undefined);
});

test('batch inserts leads without creating opportunities; remote empty list clears local state', async () => {
  await crmService.initFromSupabase(true);
  const opportunitiesBefore = crmService.getOpportunities().length;
  const leads = parseSpreadsheetLeads([{ Empresa: 'Alfa' }, { Empresa: 'Beta' }]);
  await crmService.addLeads(leads);
  assert.equal(inserted.length, 2);
  assert.equal(crmService.getLeads()[0].company_name, 'Alfa');
  assert.notEqual(inserted[0].id, inserted[1].id);
  assert.equal(crmService.getOpportunities().length, opportunitiesBefore);
  remoteLeads = null;
  await crmService.initFromSupabase(true);
  assert.equal(crmService.getLeads().length, 2);
  remoteLeads = [];
  await crmService.initFromSupabase(true);
  assert.equal(crmService.getLeads().length, 0);
});

test('historical settlement persists gateway metadata in notes and creates the fee expense', () => {
  const project = crmService.addHistoricalProject({
    company_name: 'Settlement test', client_name: 'Contact', services_summary: 'Site',
    amount_contracted: 100, amount_received: 0, amount_pending: 100,
    project_date: '2026-10-06', status: 'pendente', notes: 'Original notes',
  });
  const result = crmService.settleHistoricalProject(project.id, {
    payment_method: 'pix', gross_amount: 100, fee_amount: 5, net_amount: 95,
    payment_date: '2026-10-06', auto_create_expense: true,
  });
  assert.equal(result.amount_pending, 0);
  assert.match(result.notes, /Original notes/);
  assert.match(result.notes, /\[GATEWAY:pix\|GROSS:100\|FEE:5\|NET:95\|DATE:2026-10-06\]/);
  assert.equal(updates.at(-1)[0], project.id);
  assert.equal(crmService.getMonthlyExpenses()[0].amount, 5);
});

test('failed Supabase import rejects and does not publish unpersisted leads', async () => {
  const before = [...crmService.getLeads()];
  failLeadInsert = true;
  try {
    await assert.rejects(crmService.addLeads(parseSpreadsheetLeads([{ Empresa: 'Failed import' }])), /0 de 1 leads salvos/);
    assert.deepEqual(crmService.getLeads(), before);
  } finally {
    failLeadInsert = false;
  }
});

test('a stale Supabase load cannot erase an import confirmed after the load started', async () => {
  let resolveLoad;
  remoteLeads = new Promise(resolve => { resolveLoad = resolve; });
  const loading = crmService.initFromSupabase(true);
  await crmService.addLeads(parseSpreadsheetLeads([{ Empresa: 'Confirmed during loading' }]));
  resolveLoad([]);
  await loading;
  assert.ok(crmService.getLeads().some(lead => lead.company_name === 'Confirmed during loading'));
  remoteLeads = [...crmService.getLeads()];
  await crmService.initFromSupabase(true);
  assert.ok(crmService.getLeads().some(lead => lead.company_name === 'Confirmed during loading'));
});
