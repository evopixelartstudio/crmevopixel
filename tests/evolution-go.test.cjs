const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/services/evolution-go.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { normalizeGoStatus, normalizeGoQr, parseGoMessage } = compiled.exports;

test('Go status requires both a network connection and a logged in session', () => {
  assert.equal(normalizeGoStatus({ data: { Connected: true, LoggedIn: false } }).instance.state, 'close');
  assert.equal(normalizeGoStatus({ data: { connected: true, loggedIn: true } }).instance.state, 'open');
  assert.equal(normalizeGoQr({ data: { code: 'data:image/png;base64,abc' } }).base64, 'data:image/png;base64,abc');
});

test('normalizes Go message, direction, timestamp and media indication', () => {
  const event = { event: 'Message', data: { Info: { ID: 'id', Chat: '5569999999999@s.whatsapp.net', IsFromMe: false, Timestamp: '2026-10-09T12:00:00Z' }, Message: { conversation: 'Olá' } } };
  assert.deepEqual(parseGoMessage(event), { id: 'id', phone: '5569999999999', fromMe: false, text: 'Olá', timestamp: Date.parse('2026-10-09T12:00:00Z') / 1000, status: 'received' });
  assert.equal(parseGoMessage({ ...event, data: { ...event.data, Message: { audioMessage: {} } } }).text, '[Áudio]');
  assert.equal(parseGoMessage({ ...event, data: { ...event.data, Info: { ...event.data.Info, IsFromMe: true } } }).fromMe, true);
});

test('never associates groups, broadcasts or unresolved LIDs with CRM customers', () => {
  for (const chat of ['1234567890123@g.us', 'status@broadcast', '1234567890123@lid']) {
    assert.equal(parseGoMessage({ event: 'Message', data: { Info: { ID: 'id', Chat: chat, Timestamp: '2026-10-09T12:00:00Z' }, Message: { conversation: 'Olá' } } }), null);
  }
  assert.equal(parseGoMessage({ event: 'Connected' }), null);
});
