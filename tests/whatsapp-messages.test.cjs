const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/services/whatsapp-messages.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { normalizeWhatsAppMessages } = compiled.exports;

test('normalizes pagination, incoming/outgoing, order and duplicates', () => {
  const records = [
    { key: { id: 'out', fromMe: true }, message: { extendedTextMessage: { text: 'Resposta' } }, messageTimestamp: 200 },
    { key: { id: 'in', fromMe: false }, message: { conversation: 'Olá' }, messageTimestamp: 100 },
    { key: { id: 'out', fromMe: true }, message: { conversation: 'Resposta' }, messageTimestamp: 200 },
  ];
  const result = normalizeWhatsAppMessages({ messages: { records } });
  assert.deepEqual(result.map(m => [m.id, m.fromMe, m.text]), [['in', false, 'Olá'], ['out', true, 'Resposta']]);
});

test('handles ephemeral messages and media without inventing content', () => {
  const result = normalizeWhatsAppMessages([
    { key: { id: '1' }, message: { ephemeralMessage: { message: { conversation: 'Temporária' } } } },
    { key: { id: '2' }, message: { audioMessage: {} } },
    { key: { id: '3' }, message: { imageMessage: { caption: 'Legenda' } } },
    { message: { conversation: 'Sem identificador' } },
  ]);
  assert.deepEqual(result.map(m => m.text), ['Temporária', '[Áudio]', 'Legenda']);
  assert.deepEqual(normalizeWhatsAppMessages({ messages: {} }), []);
});
