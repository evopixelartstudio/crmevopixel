import { requireCrmApi } from '@/lib/server/crm-auth';
import { NextRequest, NextResponse } from 'next/server';
import { AGENDA_COOKIE, CalendarError, calendarConfig, connection, googleCalendar, sessionId } from '@/lib/server/google-calendar';
import { eventPayload, normalizeEvent } from '@/lib/services/calendar-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  try {
    const config = calendarConfig();
    if (request.headers.get('origin') !== config.origin) return NextResponse.json({ error: 'Abra a agenda pelo endereço do CRM.' }, { status: 403 });
    const body = await request.json();
    if (body.action === 'status') {
      if (!sessionId(request)) return NextResponse.json({ configured: true, connected: false });
      const { data } = await connection(request);
      return NextResponse.json({ configured: true, connected: true, email: data.email }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.action === 'disconnect') {
      const { db, data } = await connection(request);
      const { error } = await db.from('google_calendar_connections').delete().eq('id', data.id);
      if (error) throw new CalendarError('Não foi possível desconectar. Tente novamente.');
      const response = NextResponse.json({ disconnected: true });
      response.cookies.set(AGENDA_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
      return response;
    }
    const google = await googleCalendar(request);
    let result: unknown;
    if (body.action === 'calendars') {
      const calendars: unknown[] = [];
      let pageToken = '';
      do {
        const query = new URLSearchParams({ maxResults: '250', ...(pageToken ? { pageToken } : {}) });
        const data = await google(`users/me/calendarList?${query}`);
        calendars.push(...(data.items || []).filter((item: any) => item.accessRole !== 'freeBusyReader').map((item: any) => ({ id: item.id, name: item.summaryOverride || item.summary, timeZone: item.timeZone || 'America/Rio_Branco', primary: !!item.primary, writable: ['writer', 'owner'].includes(item.accessRole), canMeet: !!item.conferenceProperties?.allowedConferenceSolutionTypes?.includes('hangoutsMeet') })));
        pageToken = data.nextPageToken || '';
      } while (pageToken);
      result = calendars;
    } else {
      if (typeof body.calendarId !== 'string' || !body.calendarId || body.calendarId.length > 1024) return NextResponse.json({ error: 'Selecione uma agenda.' }, { status: 400 });
      const calendarId = encodeURIComponent(body.calendarId);
      const calendar = await google(`users/me/calendarList/${calendarId}`);
      const writable = ['owner', 'writer'].includes(calendar.accessRole);
      if (body.action === 'events') {
        const start = Date.parse(body.start), end = Date.parse(body.end);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 8 * 86400000) return NextResponse.json({ error: 'Selecione uma semana válida.' }, { status: 400 });
        const events: unknown[] = [];
        let pageToken = '';
        do {
          const query = new URLSearchParams({ timeMin: new Date(start).toISOString(), timeMax: new Date(end).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250', ...(pageToken ? { pageToken } : {}) });
          const data = await google(`calendars/${calendarId}/events?${query}`);
          events.push(...(data.items || []).map((raw: any) => normalizeEvent(raw, writable)).filter(Boolean));
          pageToken = data.nextPageToken || '';
        } while (pageToken);
        result = events;
      } else if (body.action === 'create' || body.action === 'update') {
        if (!writable) throw new CalendarError('Essa agenda permite apenas visualização.', 403);
        let payload;
        try { payload = eventPayload(body.draft); } catch (error) { throw new CalendarError(error instanceof Error ? error.message : 'Revise os dados da reunião.', 400); }
        if (body.action === 'create') {
          if (typeof body.requestId !== 'string' || !/^[a-f0-9]{32}$/.test(body.requestId)) throw new CalendarError('Reabra o formulário da reunião.', 400);
          if (body.createMeet && !calendar.conferenceProperties?.allowedConferenceSolutionTypes?.includes('hangoutsMeet')) throw new CalendarError('Esta agenda não permite criar Google Meet.', 400);
          try {
            result = await google(`calendars/${calendarId}/events?sendUpdates=none&conferenceDataVersion=1`, { method: 'POST', body: JSON.stringify({ ...payload, id: body.requestId, extendedProperties: { private: { crm_request: body.requestId } }, ...(body.createMeet ? { conferenceData: { createRequest: { requestId: body.requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } } } : {}) }) });
          } catch (error) {
            if (!(error instanceof CalendarError) || error.code !== 'DUPLICATE') throw error;
            const existing = await google(`calendars/${calendarId}/events/${body.requestId}`);
            if (existing.extendedProperties?.private?.crm_request !== body.requestId) throw error;
            const actual = normalizeEvent(existing, writable);
            if (!actual || actual.title !== payload.summary || actual.description !== payload.description || actual.location !== payload.location || actual.allDay !== body.draft.allDay || (actual.allDay ? actual.start !== body.draft.start || actual.end !== body.draft.end : Date.parse(actual.start) !== Date.parse(body.draft.start) || Date.parse(actual.end) !== Date.parse(body.draft.end))) throw new CalendarError('A reunião já foi criada com os dados anteriores. Atualize a agenda e edite a reunião existente.', 409, 'CONFLICT');
            result = existing;
          }
        } else {
          if (typeof body.eventId !== 'string' || !/^[a-zA-Z0-9_-]{1,1024}$/.test(body.eventId) || typeof body.etag !== 'string' || !body.etag || body.etag.length > 256 || /[\r\n]/.test(body.etag)) throw new CalendarError('Atualize a agenda antes de editar.', 400);
          const eventPath = `calendars/${calendarId}/events/${encodeURIComponent(body.eventId)}`;
          const existing = await google(eventPath);
          if (!normalizeEvent(existing, writable)?.editable) throw new CalendarError('Este compromisso só pode ser alterado no Google Agenda.', 403);
          const start = body.draft.allDay ? { ...payload.start, dateTime: null, timeZone: null } : { ...payload.start, date: null };
          const end = body.draft.allDay ? { ...payload.end, dateTime: null, timeZone: null } : { ...payload.end, date: null };
          result = await google(`${eventPath}?sendUpdates=none&conferenceDataVersion=1`, { method: 'PATCH', headers: { 'If-Match': body.etag }, body: JSON.stringify({ ...payload, start, end }) });
        }
      } else throw new CalendarError('Ação inválida.', 400);
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const known = error instanceof CalendarError;
    return NextResponse.json({ error: known ? error.message : 'Não foi possível acessar a agenda. Confira a configuração do servidor e tente novamente.', code: known ? error.code : 'CALENDAR_ERROR' }, { status: known ? error.status : 503 });
  }
}
