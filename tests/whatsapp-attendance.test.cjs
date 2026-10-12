const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
function compile(path, mocks = {}) {
  const filename = require.resolve(path), compiled = new Module(filename, module);
  compiled.require = name => mocks[name] || module.require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return compiled.exports;
}
const phoneUtils = compile('../lib/utils/whatsapp.ts');
const service = compile('../lib/server/whatsapp-attendance.ts', { '@/lib/utils/whatsapp': phoneUtils });
const { getWhatsAppAttendance, changeWhatsAppAttendance, AttendanceConflict } = service;
const phone = '5511999999999';
const aliases = phoneUtils.whatsAppPhoneAliases(phone);

function database(initial = []) {
  const rows = new Map(initial.map(row => [row.phone, row]));
  let fail = false, intervene = false;
  const writes = [];
  const db = { from: table => {
    assert.equal(table, 'bot_pausa');
    let operation = 'get', payload, filters = [];
    const query = {
      select: () => query,
      in: (key, values) => { filters.push([key, values]); return query; },
      upsert: (data, options) => { operation = 'upsert'; payload = data; assert.equal(options.onConflict, 'phone'); return query; },
      delete: () => { operation = 'delete'; return query; },
      then: (resolve, reject) => Promise.resolve().then(() => {
        if (fail) return { data: null, error: { message: 'Denied' } };
        if (operation === 'upsert') {
          writes.push({ operation, payload });
          payload.forEach(row => rows.set(row.phone, { ...row }));
          return { data: payload, error: null };
        }
        if (operation === 'delete' && intervene) {
          rows.set(aliases[0], { phone: aliases[0], pausado_ate: new Date(Date.now() + 24 * 3600000).toISOString() });
          intervene = false;
        }
        const selected = [...rows.values()].filter(row => filters.every(([key, values]) => values.includes(row[key])));
        if (operation === 'delete') {
          writes.push({ operation });
          selected.forEach(row => rows.delete(row.phone));
        }
        return { data: selected, error: null };
      }).then(resolve, reject),
    };
    return query;
  } };
  return { db, rows, writes, fail: value => { fail = value; }, intervene: () => { intervene = true; } };
}

test('takeover persists an eight-hour pause for both mobile variants and return removes only that conversation', async () => {
  const other = { phone: '552133333333', pausado_ate: new Date(Date.now() + 3600000).toISOString() };
  const fixture = database([other]);
  const original = await getWhatsAppAttendance(fixture.db, phone);
  assert.equal(original.owner, 'ai');
  const human = await changeWhatsAppAttendance(fixture.db, phone, 'human', original.version);
  assert.equal(human.owner, 'human');
  assert.ok(Date.parse(human.pausedUntil) - Date.now() > 7.99 * 3600000);
  assert.deepEqual(fixture.writes[0].payload.map(row => row.phone), aliases);
  assert.equal(fixture.writes[0].payload[0].motivo, 'humano_assumiu_conversa');
  assert.equal((await getWhatsAppAttendance(fixture.db, aliases[0])).owner, 'human');
  const ai = await changeWhatsAppAttendance(fixture.db, phone, 'ai', human.version);
  assert.equal(ai.owner, 'ai');
  assert.equal(ai.pausedUntil, null);
  assert.equal(fixture.rows.size, 1);
  assert.deepEqual(fixture.rows.get(other.phone), other);
});

test('expired pauses release the contact and stale concurrent actions cannot override takeover', async () => {
  const fixture = database([{ phone: aliases[0], pausado_ate: new Date(Date.now() - 1000).toISOString() }]);
  const initial = await getWhatsAppAttendance(fixture.db, phone);
  assert.equal(initial.owner, 'ai');
  const results = await Promise.allSettled([
    changeWhatsAppAttendance(fixture.db, phone, 'human', initial.version),
    changeWhatsAppAttendance(fixture.db, aliases[0], 'ai', initial.version),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.ok(results[1].reason instanceof AttendanceConflict);
  assert.equal((await getWhatsAppAttendance(fixture.db, phone)).owner, 'human');
});

test('a new intervention from n8n is preserved during release and database failures never confirm ownership', async () => {
  const fixture = database();
  const original = await getWhatsAppAttendance(fixture.db, phone);
  fixture.fail(true);
  await assert.rejects(changeWhatsAppAttendance(fixture.db, phone, 'human', original.version));
  assert.equal(fixture.rows.size, 0);
  fixture.fail(false);
  const human = await changeWhatsAppAttendance(fixture.db, phone, 'human', original.version);
  fixture.intervene();
  await assert.rejects(changeWhatsAppAttendance(fixture.db, phone, 'ai', human.version), AttendanceConflict);
  assert.equal((await getWhatsAppAttendance(fixture.db, phone)).owner, 'human');
});

let effects = 0;
const { POST } = compile('../app/api/whatsapp/attendance/route.ts', {
  '@/lib/server/crm-auth': { requireCrmApi: async request => request.headers.get('origin') === 'https://crm.test' ? null : { status: 403 } },
  '@/lib/server/crm-access': { cloudDatabase: () => { effects++; return database().db; } },
  '@/lib/server/whatsapp-attendance': service,
  'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
});
const request = (body, origin = 'https://crm.test') => ({ headers: new Headers({ origin }), json: async () => body });

test('attendance API authorizes before reading data and validates ownership revisions before database access', async () => {
  effects = 0;
  assert.equal((await POST({ headers: new Headers(), json: () => { throw Error('Unauthorized body read'); } })).status, 403);
  assert.equal((await POST(request({ action: 'get', phone }, 'https://foreign.test'))).status, 403);
  assert.equal((await POST(request({ action: 'get', phone: phone + '@g.us' }))).status, 400);
  assert.equal((await POST(request({ action: 'update', phone, owner: 'ai', version: 'invalid' }))).status, 400);
  assert.equal(effects, 0);
  const result = await POST(request({ action: 'get', phone }));
  assert.equal(result.status, 200);
  assert.equal(result.data.state.owner, 'ai');
});
