const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
let configured = true;
let failedOffset = -1;
let rows = [];
let ranges = [];
const filename = require.resolve('../lib/supabase/db-service.ts');
const compiled = new Module(filename, module);
compiled.require = name => name === './client' ? {
  isSupabaseConfigured: () => configured,
  getSupabase: () => ({ from: table => {
    assert.equal(table, 'leads');
    const query = {
      select: () => query,
      order: () => query,
      range: async (start, end) => {
        ranges.push([start, end]);
        return start === failedOffset ? { data: null, error: { message: 'Falha na página' } }
          : { data: rows.slice(start, end + 1), error: null };
      },
    };
    return query;
  } }),
} : name.startsWith('@/') ? {
  recoverSpreadsheetBusinessName: () => '', recoverSpreadsheetWhatsApp: () => '',
  cleanPhoneNumber: phone => String(phone || '').replace(/\D/g, ''),
} : module.require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { dbService } = compiled.exports;

test('lead queries page beyond Supabase default 1000 so assistant searches reach every saved lead', async () => {
  rows = Array.from({ length: 1203 }, (_, i) => ({ id: String(i), name: `Lead ${i}`, company_name: 'Empresa', phone: '34998327904' }));
  const leads = await dbService.getLeads();
  assert.equal(leads.length, 1203);
  assert.equal(leads.at(-1).id, '1202');
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
});

test('an incomplete lead query fails clearly and a genuinely empty database returns an empty list', async () => {
  failedOffset = 1000;
  assert.equal(await dbService.getLeads(), null);
  failedOffset = -1; rows = []; ranges = [];
  assert.deepEqual(await dbService.getLeads(), []);
  assert.deepEqual(ranges, [[0, 999]]);
  configured = false;
  assert.equal(await dbService.getLeads(), null);
});
