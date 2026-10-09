const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/server/crm-access.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
let databaseKey;
compiled.require = name => name === '@supabase/supabase-js' ? { createClient: (url, key) => { databaseKey = key; return {}; } } : module.require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { secretsMatch, cloudDatabase } = compiled.exports;

test('access rejects missing/mismatched tokens including multibyte lengths', () => {
  assert.equal(secretsMatch('token', undefined), false);
  assert.equal(secretsMatch('short', 'longer-secret'), false);
  assert.equal(secretsMatch('å', 'a'), false);
  assert.equal(secretsMatch('secret', 'secret'), true);
});

test('cloud storage never substitutes the public anon key for the server credential', () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-key';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.throws(cloudDatabase, /SUPABASE_SERVICE_ROLE_KEY/);
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-key';
  cloudDatabase();
  assert.equal(databaseKey, 'server-key');
});
