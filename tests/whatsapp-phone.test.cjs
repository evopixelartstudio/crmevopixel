const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/utils/whatsapp.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { whatsAppPhoneKey, whatsAppPhoneAliases } = compiled.exports;

test('matches Brazilian mobile ninth digit aliases without changing landlines or foreign numbers', () => {
  assert.equal(whatsAppPhoneKey('5534998327904'), whatsAppPhoneKey('553498327904'));
  assert.deepEqual(whatsAppPhoneAliases('5534998327904'), ['553498327904', '5534998327904']);
  assert.deepEqual(whatsAppPhoneAliases('553498327904'), ['553498327904', '5534998327904']);
  assert.deepEqual(whatsAppPhoneAliases('551132345678'), ['551132345678']);
  assert.deepEqual(whatsAppPhoneAliases('447911123456'), ['447911123456']);
});
