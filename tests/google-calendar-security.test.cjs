const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/server/google-calendar.ts');
const compiled = new Module(filename, module);
compiled.require = name => name === './crm-access' ? { cloudDatabase: () => { throw new Error('Unexpected database call'); } } : module.require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { seal, unseal, sessionId, calendarConfig, pkceChallenge, agendaOrigin } = compiled.exports;
process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

test('failure redirect uses public configured origin even with missing credentials', () => {
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://crmevopixel.cloud/api/agenda/callback';
  assert.equal(agendaOrigin(), 'https://crmevopixel.cloud');
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://0.0.0.0:3000/api/agenda/callback';
  assert.equal(agendaOrigin(), 'https://crmevopixel.cloud');
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'invalid';
  assert.equal(agendaOrigin(), 'https://crmevopixel.cloud');
});

test('credentials are authenticated, encrypted and bound to their purpose', () => {
  const token = seal({ refreshToken: 'private-google-token' }, 'credentials');
  assert.equal(token.includes('private-google-token'), false);
  assert.deepEqual(unseal(token, 'credentials'), { refreshToken: 'private-google-token' });
  assert.throws(() => unseal(token, 'session'));
  const bytes = Buffer.from(token, 'base64url'); bytes[30] ^= 1;
  assert.throws(() => unseal(bytes.toString('base64url'), 'credentials'));
});

test('expired or forged browser sessions never authorize agenda access', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const request = value => ({ cookies: { get: () => ({ value }) } });
  assert.equal(sessionId(request(seal({ id, expires: Date.now() + 10000 }, 'session'))), id);
  assert.equal(sessionId(request(seal({ id, expires: Date.now() - 10000 }, 'session'))), null);
  assert.equal(sessionId(request('forged')), null);
  assert.equal(sessionId(request(seal({ id, expires: Date.now() + 10000 }, 'oauth'))), null);
});

test('missing encryption key prevents integration setup and PKCE uses SHA256', () => {
  process.env.GOOGLE_CALENDAR_CLIENT_ID = 'client';
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'secret';
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://crm.test/api/agenda/callback';
  assert.equal(calendarConfig().origin, 'https://crm.test');
  assert.equal(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  delete process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY;
  assert.throws(calendarConfig, /criptografia/);
});
