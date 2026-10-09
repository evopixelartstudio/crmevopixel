const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/services/whatsapp-inbox.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { summarizeInbox } = compiled.exports;

test('includes unknown numbers, orders latest conversation first and preserves unread messages after a reply', () => {
  const row = (phone, seconds, from_me, status, body) => ({ phone, from_me, status, body, sent_at: new Date(seconds * 1000).toISOString() });
  const result = summarizeInbox([
    row('5511999999999', 10, false, 'received', 'First'),
    row('5511888888888', 30, false, 'received', 'New contact'),
    row('5511999999999', 40, true, 'sent', 'Reply'),
    row('5511999999999', 20, false, 'read', 'Read message'),
    row('invalid', 50, false, 'received', 'Ignored'),
  ]);
  assert.deepEqual(result.map(c => [c.phone, c.preview, c.unread, c.fromMe]), [
    ['5511999999999', 'Reply', 1, true],
    ['5511888888888', 'New contact', 1, false],
  ]);
});

test('read messages and pending outgoing messages never increment unread count', () => {
  assert.equal(summarizeInbox([
    { phone: '5511999999999', body: 'Read', from_me: false, status: 'read', sent_at: '2026-10-09T12:00:00Z' },
    { phone: '5511999999999', body: 'Pending', from_me: true, status: 'pending', sent_at: '2026-10-09T12:01:00Z' },
  ])[0].unread, 0);
  assert.deepEqual(summarizeInbox([]), []);
});
