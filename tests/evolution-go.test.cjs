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

test('mirrors mobile outgoing LID messages using recipient identity, never own sender identity', () => {
  const event = { event: 'Message', data: { Info: { ID: 'mobile', Chat: '1234567890123@lid', IsFromMe: true, SenderAlt: '5511988887777@s.whatsapp.net', RecipientAlt: '553498327904@s.whatsapp.net', Timestamp: '1791540000' }, Message: { conversation: 'Sent from phone' } } };
  assert.equal(parseGoMessage(event).phone, '553498327904');
  assert.equal(parseGoMessage(event).fromMe, true);
  assert.equal(parseGoMessage(event).timestamp, 1791540000);
  assert.equal(parseGoMessage({ ...event, data: { ...event.data, Info: { ...event.data.Info, RecipientAlt: undefined } } }), null);
});

test('unwraps device sent messages and accepts key-based provider events', () => {
  const mobile = { event: 'message', data: { Info: { ID: 'device', Chat: '1234567890123@lid', Timestamp: 1791540000 }, Message: { deviceSentMessage: { destinationJid: '553498327904@s.whatsapp.net', message: { ephemeralMessage: { message: { conversation: 'Mobile' } } } } } } };
  assert.equal(parseGoMessage(mobile).text, 'Mobile');
  assert.equal(parseGoMessage(mobile).fromMe, true);
  const sent = { event: 'send_message', data: { key: { id: 'sent', remoteJid: '553498327904@s.whatsapp.net' }, messageTimestamp: '1791540000', message: { conversation: 'Reply' } } };
  assert.equal(parseGoMessage(sent).fromMe, true);
  assert.equal(parseGoMessage(sent).text, 'Reply');
});
