const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require.resolve('../lib/services/calendar-events.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { eventPayload, normalizeEvent, eventsForDay, zonedDateTime, localDateTime, addDays } = compiled.exports;

test('converts agenda timezone without depending on the server or browser timezone', () => {
  assert.equal(zonedDateTime('2026-10-09T09:00', 'America/Rio_Branco'), '2026-10-09T14:00:00.000Z');
  assert.equal(localDateTime('2026-10-09T14:00:00Z', 'America/Rio_Branco'), '2026-10-09T09:00');
  assert.equal(zonedDateTime('2026-06-09T09:00', 'America/New_York'), '2026-06-09T13:00:00.000Z');
  assert.throws(() => zonedDateTime('2026-03-08T02:30', 'America/New_York'), /hor/);
});

test('all-day end date is exclusive and timed events crossing midnight appear on both days', () => {
  const events = [
    { id: 'all', allDay: true, start: '2026-10-09', end: '2026-10-11' },
    { id: 'night', allDay: false, start: '2026-10-10T04:00:00Z', end: '2026-10-10T06:00:00Z' },
  ];
  assert.deepEqual(eventsForDay(events, '2026-10-09', 'America/Rio_Branco').map(e => e.id), ['all', 'night']);
  assert.deepEqual(eventsForDay(events, '2026-10-10', 'America/Rio_Branco').map(e => e.id), ['all', 'night']);
  assert.deepEqual(eventsForDay(events, '2026-10-11', 'America/Rio_Branco'), []);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('validates dates and only returns editable fields so participants and recurrence are preserved', () => {
  const draft = { title: ' Meeting ', description: '', location: '', allDay: false, timeZone: 'America/Rio_Branco', start: '2026-10-09T14:00:00Z', end: '2026-10-09T15:00:00Z', attendees: ['ignored'], recurrence: ['ignored'] };
  const payload = eventPayload(draft);
  assert.equal(payload.summary, 'Meeting');
  assert.equal(payload.attendees, undefined);
  assert.equal(payload.recurrence, undefined);
  assert.throws(() => eventPayload({ ...draft, end: draft.start }));
  assert.throws(() => eventPayload({ ...draft, allDay: true, start: '2026-02-30', end: '2026-03-01' }));
  assert.throws(() => eventPayload({ ...draft, start: '2026-10-09T09:00' }));
});

test('cancelled and special events cannot be edited; external URLs are restricted to Google', () => {
  const raw = { id: 'one', start: { date: '2026-10-09' }, end: { date: '2026-10-10' }, hangoutLink: 'javascript:alert(1)', htmlLink: 'https://attacker.test', eventType: 'outOfOffice' };
  assert.equal(normalizeEvent({ ...raw, status: 'cancelled' }, true), null);
  assert.equal(normalizeEvent(raw, true).editable, false);
  assert.equal(normalizeEvent(raw, true).meet, '');
  assert.equal(normalizeEvent(raw, true).url, '');
  assert.equal(normalizeEvent({ ...raw, eventType: 'default' }, false).editable, false);
});
