const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../app/api/agenda/callback/route.ts');
class CalendarError extends Error { constructor(message, code) { super(message); this.code = code; } }
let cookieValid = false, mode = 'success', saved = false;
const scopes = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const compiled = new Module(filename, module);
compiled.require = name => ({
  'next/server': { NextResponse: { redirect: url => ({ location: String(url), cookies: { set: () => {} }, headers: new Headers() }) } },
  '@/lib/server/crm-access': { secretsMatch: (a, b) => a === b, cloudDatabase: () => ({ from: () => ({ insert: async () => { saved = true; return { error: mode === 'database' ? {} : null }; } }) }) },
  '@/lib/server/google-calendar': {
    CalendarError, AGENDA_COOKIE: 'session', OAUTH_COOKIE: 'oauth', agendaOrigin: () => 'https://crmevopixel.cloud',
    calendarConfig: () => ({ origin: 'https://crmevopixel.cloud', redirectUri: 'https://crmevopixel.cloud/api/agenda/callback' }), cookieOptions: () => ({}), seal: () => 'encrypted',
    unseal: () => { if (!cookieValid) throw new Error('Invalid cookie'); return { state: 'expected', verifier: 'private', expires: Date.now() + 60000 }; },
    googleToken: async () => { if (mode === 'client') throw new CalendarError('Credentials failed', 'OAUTH_CLIENT'); return { access_token: 'private', refresh_token: 'private', expires_in: 3600, scope: mode === 'permissions' ? '' : scopes }; },
  },
})[name] || module.require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
global.fetch = async () => ({ ok: true, json: async () => ({ sub: 'google-user', email: 'user@example.test', email_verified: true }) });
const request = () => ({ url: 'https://0.0.0.0:3000/api/agenda/callback', nextUrl: new URL('https://0.0.0.0:3000/api/agenda/callback?state=expected&code=private'), cookies: { get: () => ({ value: 'cookie' }) } });

test('failed OAuth session behind Docker returns to public CRM, never the internal request host', async () => {
  cookieValid = false; saved = false;
  const result = await compiled.exports.GET(request());
  assert.equal(result.location, 'https://crmevopixel.cloud/agenda?google=session');
  assert.equal(saved, false);
});

test('permission, credential and database failures are differentiated without exposing tokens or codes', async () => {
  cookieValid = true;
  for (const failure of ['permissions', 'client', 'database']) {
    mode = failure;
    const result = await compiled.exports.GET(request());
    assert.equal(result.location, `https://crmevopixel.cloud/agenda?google=${failure}`);
    assert.equal(result.location.includes('private'), false);
  }
});

test('successful OAuth callback saves connection before confirming and returns to configured public domain', async () => {
  mode = 'success'; cookieValid = true; saved = false;
  const result = await compiled.exports.GET(request());
  assert.equal(saved, true);
  assert.equal(result.location, 'https://crmevopixel.cloud/agenda?google=connected');
});
