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
const dbService = new Proxy({}, {
  get: (_, key) => async (...args) => {
    if (key === 'getLeads') return remoteLeads;
    if (key === 'insertLead') { inserted.push(args[0]); return args[0]; }
    if (key === 'updateHistoricalProject') { updates.push(args); return true; }
    return null;
  },
});
const dbPath = require.resolve('../lib/supabase/db-service.ts');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { dbService } };
const { crmService } = require('../lib/services/crm-service.ts');
const { parseSpreadsheetLeads } = require('../lib/services/spreadsheet-leads.ts');

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

test('XLSX recognizes headers, numeric phones and contact fields; skips unknown rows', () => {
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
  assert.equal(parseSpreadsheetLeads([{ unknown: 'value' }, {}]).length, 0);
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
