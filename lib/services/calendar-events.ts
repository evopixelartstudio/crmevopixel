export interface CalendarChoice { id: string; name: string; timeZone: string; writable: boolean; primary: boolean; canMeet: boolean }
export interface AgendaEvent {
  id: string; etag: string; title: string; description: string; location: string;
  start: string; end: string; allDay: boolean; meet: string; url: string; recurring: boolean; editable: boolean;
}
export interface EventDraft {
  title: string; description: string; location: string; start: string; end: string; allDay: boolean; timeZone: string;
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function localDateTime(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

export function zonedDateTime(local: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error('Informe uma data e horário válidos.');
  const target = Date.parse(`${local}:00Z`);
  let timestamp = target;
  for (let step = 0; step < 4; step++) {
    const displayed = Date.parse(`${localDateTime(new Date(timestamp).toISOString(), timeZone)}:00Z`);
    timestamp += target - displayed;
  }
  const result = new Date(timestamp).toISOString();
  if (localDateTime(result, timeZone) !== local) throw new Error('Esse horário não existe no fuso selecionado. Escolha outro horário.');
  return result;
}

function validDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function eventPayload(draft: EventDraft) {
  if (!draft || typeof draft.title !== 'string' || !draft.title.trim() || draft.title.length > 200) throw new Error('Informe um título de até 200 caracteres.');
  if (typeof draft.description !== 'string' || draft.description.length > 8000 || typeof draft.location !== 'string' || draft.location.length > 1000 || typeof draft.allDay !== 'boolean') throw new Error('Revise os dados da reunião.');
  if (typeof draft.timeZone !== 'string') throw new Error('Informe o fuso da agenda.');
  new Intl.DateTimeFormat('pt-BR', { timeZone: draft.timeZone });
  if (draft.allDay) {
    if (!validDay(draft.start) || !validDay(draft.end) || draft.end <= draft.start) throw new Error('A data final deve ser posterior à inicial.');
  } else {
    if (!Number.isFinite(Date.parse(draft.start)) || !Number.isFinite(Date.parse(draft.end)) || !/(Z|[+-]\d{2}:\d{2})$/.test(draft.start) || !/(Z|[+-]\d{2}:\d{2})$/.test(draft.end) || Date.parse(draft.end) <= Date.parse(draft.start)) throw new Error('O término deve ser posterior ao início, com fuso horário.');
  }
  return {
    summary: draft.title.trim(), description: draft.description, location: draft.location,
    start: draft.allDay ? { date: draft.start } : { dateTime: draft.start, timeZone: draft.timeZone },
    end: draft.allDay ? { date: draft.end } : { dateTime: draft.end, timeZone: draft.timeZone },
  };
}

function safeGoogleUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'meet.google.com' || url.hostname === 'calendar.google.com' || url.hostname === 'www.google.com') ? value : ''; } catch { return ''; }
}

export function normalizeEvent(raw: any, writable: boolean): AgendaEvent | null {
  const start = raw.start?.date ?? raw.start?.dateTime;
  const end = raw.end?.date ?? raw.end?.dateTime;
  if (raw.status === 'cancelled' || !raw.id || !start || !end) return null;
  return {
    id: raw.id, etag: raw.etag || '', title: raw.summary || 'Sem título', description: raw.description || '', location: raw.location || '',
    start, end, allDay: !!raw.start?.date, meet: safeGoogleUrl(raw.hangoutLink), url: safeGoogleUrl(raw.htmlLink), recurring: !!raw.recurringEventId,
    editable: writable && (raw.eventType || 'default') === 'default' && !raw.locked,
  };
}

export function eventsForDay(events: AgendaEvent[], day: string, timeZone: string): AgendaEvent[] {
  const start = Date.parse(zonedDateTime(`${day}T00:00`, timeZone));
  const end = Date.parse(zonedDateTime(`${addDays(day, 1)}T00:00`, timeZone));
  return events.filter(event => event.allDay ? event.start <= day && event.end > day : Date.parse(event.start) < end && Date.parse(event.end) > start)
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
}
