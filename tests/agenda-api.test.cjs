const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function compile(path, mocks = {}) {
  const filename = require.resolve(path);
  const compiled = new Module(filename, module);
  compiled.require = name => mocks[name] || module.require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return compiled.exports;
}
class CalendarError extends Error { constructor(message, status = 503, code = 'CALENDAR_ERROR') { super(message); this.status = status; this.code = code; } }
let calls = [], role = 'owner', conflict = false, page = 0;
const existing = { id: 'event1', etag: '"etag1"', summary: 'Original', description: '', location: '', start: { dateTime: '2026-10-09T14:00:00Z' }, end: { dateTime: '2026-10-09T15:00:00Z' }, attendees: [{ email: 'guest@example.test' }], recurringEventId: 'series' };
const { POST } = compile('../app/api/agenda/route.ts', {
  '@/lib/server/crm-auth': { requireCrmApi: async () => null },
  'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
  '@/lib/services/calendar-events': compile('../lib/services/calendar-events.ts'),
  '@/lib/server/google-calendar': {
    CalendarError, calendarConfig: () => ({ origin: 'https://crm.test' }),
    googleCalendar: async () => async (path, init = {}) => {
      calls.push({ path, ...init });
      if (path.startsWith('users/me/calendarList/')) return { accessRole: role, conferenceProperties: { allowedConferenceSolutionTypes: ['hangoutsMeet'] } };
      if (init.method === 'PATCH' && conflict) throw new CalendarError('Changed elsewhere', 409, 'CONFLICT');
      if (init.method) return { id: 'saved' };
      if (path.includes('/events?')) { page++; return { items: [{ ...existing, id: `event${page}` }], ...(page === 1 ? { nextPageToken: 'page2' } : {}) }; }
      return existing;
    },
  },
});
const draft = { title: 'Meeting', description: 'Notes', location: 'Office', start: '2026-10-09T14:00:00Z', end: '2026-10-09T15:00:00Z', allDay: false, timeZone: 'America/Rio_Branco' };
const request = (body, origin = 'https://crm.test') => ({ headers: new Headers({ origin }), json: async () => body });

test('rejects cross-origin writes before accessing Google', async () => {
  calls = [];
  assert.equal((await POST(request({ action: 'create' }, 'https://other.test'))).status, 403);
  assert.equal(calls.length, 0);
});

test('creates events with a stable id and unique optional Meet request', async () => {
  calls = []; role = 'owner';
  const result = await POST(request({ action: 'create', calendarId: 'primary', draft, createMeet: true, requestId: 'a'.repeat(32) }));
  assert.equal(result.status, 200);
  const insert = calls.find(c => c.method === 'POST');
  const payload = JSON.parse(insert.body);
  assert.equal(payload.id, 'a'.repeat(32));
  assert.equal(payload.conferenceData.createRequest.requestId, payload.id);
  assert.match(insert.path, /conferenceDataVersion=1/);
});

test('read-only agendas reject edits; conditional patch preserves guests and recurring series', async () => {
  calls = []; role = 'reader'; conflict = false;
  const body = { action: 'update', calendarId: 'primary', draft, eventId: 'event1', etag: '"etag1"' };
  assert.equal((await POST(request(body))).status, 403);
  assert.equal(calls.some(c => c.method === 'PATCH'), false);
  calls = []; role = 'owner';
  assert.equal((await POST(request(body))).status, 200);
  const patch = calls.find(c => c.method === 'PATCH');
  assert.equal(patch.headers['If-Match'], '"etag1"');
  assert.equal(JSON.parse(patch.body).attendees, undefined);
  assert.equal(JSON.parse(patch.body).recurrence, undefined);
  assert.equal(JSON.parse(patch.body).start.date, null);
  conflict = true;
  const result = await POST(request(body));
  assert.equal(result.status, 409);
  assert.equal(result.data.code, 'CONFLICT');
});

test('loads every events page and refuses unbounded date ranges', async () => {
  calls = []; role = 'owner'; page = 0;
  const body = { action: 'events', calendarId: 'primary', start: '2026-10-05T05:00:00Z', end: '2026-10-12T05:00:00Z' };
  const result = await POST(request(body));
  assert.equal(result.status, 200);
  assert.equal(result.data.length, 2);
  assert.match(calls.at(-1).path, /pageToken=page2/);
  assert.equal((await POST(request({ ...body, end: '2027-01-01T05:00:00Z' }))).status, 400);
});
