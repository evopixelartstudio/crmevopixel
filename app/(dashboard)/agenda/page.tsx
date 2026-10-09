'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Plus, RefreshCw, Video, X } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { addDays, eventsForDay, localDateTime, zonedDateTime, type AgendaEvent, type CalendarChoice } from '@/lib/services/calendar-events';

const control = 'rounded-lg border border-[var(--evo-border)] bg-[var(--evo-surface)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--evo-accent)] disabled:opacity-50';
const primary = 'rounded-lg bg-[var(--evo-accent)] px-3 py-2 text-sm font-semibold text-[var(--evo-bg)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--evo-accent)] disabled:opacity-50';
const initialZone = 'America/Rio_Branco';
function today(zone: string) { return localDateTime(new Date().toISOString(), zone).slice(0, 10); }
function monday(day: string) { const weekday = new Date(`${day}T12:00:00Z`).getUTCDay(); return addDays(day, -(weekday === 0 ? 6 : weekday - 1)); }
function dayLabel(day: string, options: Intl.DateTimeFormatOptions) { return new Date(`${day}T12:00:00Z`).toLocaleDateString('pt-BR', { ...options, timeZone: 'UTC' }); }
function timeLabel(iso: string, zone: string) { return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: zone, hour: '2-digit', minute: '2-digit' }); }

interface Editor { event?: AgendaEvent; requestId: string; title: string; description: string; location: string; start: string; end: string; allDay: boolean; createMeet: boolean }

export default function AgendaPage() {
  const { theme } = useTheme();
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [email, setEmail] = useState('');
  const [calendars, setCalendars] = useState<CalendarChoice[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const [week, setWeek] = useState(() => monday(today(initialZone)));
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const revision = useRef(0);
  const titleInput = useRef<HTMLInputElement>(null);
  const calendar = calendars.find(c => c.id === calendarId);
  const zone = calendar?.timeZone || initialZone;
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  const api = useCallback(async (action: string, extra = {}) => {
    const response = await fetch('/api/agenda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }), cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) {
      if (data.code === 'RECONNECT') { setConnected(false); setEvents([]); setEditor(null); }
      if (data.code === 'CONFIG_MISSING') setConfigured(false);
      throw new Error(data.error || 'Não foi possível acessar a agenda.');
    }
    return data;
  }, []);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      try {
        const result = new URLSearchParams(window.location.search).get('google');
        if (result) {
          window.history.replaceState(null, '', '/agenda');
          const failures: Record<string, string> = {
            session: 'A autorização expirou ou o cookie de conexão não chegou. Clique em Conectar Google Agenda e conclua na mesma aba.',
            denied: 'A autorização foi cancelada no Google. Conecte novamente para permitir o acesso.',
            token: 'O Google não confirmou a autorização. Confira as credenciais e a URI de retorno na VPS e conecte novamente.',
            client: 'O Google recusou as credenciais. Copie o ID e o segredo diretamente do cliente OAuth para o ambiente da VPS e implante novamente.',
            permissions: 'Faltou uma permissão da Agenda. Conecte novamente e marque as permissões para eventos e lista de agendas na tela do Google.',
            identity: 'Não foi possível confirmar sua conta Google. Conecte novamente e autorize o acesso ao e-mail.',
            database: 'A autorização chegou, mas a conexão não foi salva no Supabase. Confira o SQL da Agenda, a URL do projeto e a chave service_role na VPS.',
          };
          if (failures[result]) setError(failures[result]);
          if (result === 'failed') setError('A conexão não foi concluída. Confira as permissões no Google e o SQL da Agenda e tente novamente.');
          if (result === 'config') setError('Configure a conexão com o Google Agenda no servidor.');
          if (result === 'connected') setNotice('Google Agenda conectado.');
        }
        const status = await api('status');
        if (!alive) return;
        setConfigured(status.configured); setConnected(status.connected); setEmail(status.email || '');
        if (status.connected) {
          const choices: CalendarChoice[] = await api('calendars');
          if (!alive) return;
          setCalendars(choices);
          const first = choices.find(c => c.primary) || choices[0];
          if (first) { setCalendarId(first.id); setWeek(monday(today(first.timeZone))); }
        }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Falha ao conectar.'); }
      finally { if (alive) setChecking(false); }
    };
    void init();
    return () => { alive = false; };
  }, [api]);

  const refresh = useCallback(async () => {
    if (!connected || !calendarId) return;
    const version = ++revision.current;
    setLoading(true);
    try {
      const data = await api('events', { calendarId, start: zonedDateTime(`${week}T00:00`, zone), end: zonedDateTime(`${addDays(week, 7)}T00:00`, zone) });
      if (version === revision.current) { setEvents(data); setError(''); }
    } catch (e) { if (version === revision.current) setError(e instanceof Error ? e.message : 'Falha ao carregar a semana.'); }
    finally { if (version === revision.current) setLoading(false); }
  }, [api, calendarId, connected, week, zone]);

  useEffect(() => {
    setEvents([]); setEditor(null);
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000);
    return () => { revision.current++; clearInterval(timer); };
  }, [refresh]);

  useEffect(() => { if (editor) titleInput.current?.focus(); }, [!!editor]);

  function newEvent(day = days.includes(today(zone)) ? today(zone) : week) {
    if (!calendar?.writable) return;
    setError(''); setNotice('');
    setEditor({ requestId: crypto.randomUUID().replaceAll('-', ''), title: '', description: '', location: '', start: `${day}T09:00`, end: `${day}T10:00`, allDay: false, createMeet: false });
  }

  function editEvent(event: AgendaEvent) {
    setError(''); setNotice('');
    setEditor({ event, requestId: '', title: event.title, description: event.description, location: event.location, start: event.allDay ? event.start : localDateTime(event.start, zone), end: event.allDay ? addDays(event.end, -1) : localDateTime(event.end, zone), allDay: event.allDay, createMeet: false });
  }

  function toggleAllDay(allDay: boolean) {
    setEditor(current => current && ({ ...current, allDay, start: allDay ? current.start.slice(0, 10) : `${current.start}T09:00`, end: allDay ? current.end.slice(0, 10) : `${current.end}T10:00` }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || busy || !calendar?.writable) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const draft = { title: editor.title, description: editor.description, location: editor.location, allDay: editor.allDay, timeZone: zone,
        start: editor.allDay ? editor.start : zonedDateTime(editor.start, zone), end: editor.allDay ? addDays(editor.end, 1) : zonedDateTime(editor.end, zone) };
      await api(editor.event ? 'update' : 'create', { calendarId, draft, eventId: editor.event?.id, etag: editor.event?.etag, requestId: editor.requestId, createMeet: editor.createMeet });
      setEditor(null); setNotice('Reunião salva no Google Agenda.');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true); setError('');
    try { await api('disconnect'); setConnected(false); setCalendars([]); setCalendarId(''); setEvents([]); setEditor(null); setEmail(''); setNotice('Conta desconectada deste CRM.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao desconectar.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-semibold">Agenda</h1><p className="mt-1 text-sm text-[var(--evo-muted)]">Reuniões e programação da semana.</p></div>
      {connected && <div className="flex items-center gap-3"><span className="max-w-48 truncate text-xs text-[var(--evo-muted)]" title={email}>{email}</span><button onClick={() => void disconnect()} disabled={busy} className={control}>Desconectar</button></div>}
    </header>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {notice && <p role="status" className="text-sm text-[var(--evo-support)]">{notice}</p>}
    {checking ? <p role="status" className="py-12 text-sm text-[var(--evo-muted)]">Verificando sua agenda…</p> : !connected ? <div className="flex flex-col items-start gap-4 rounded-xl border border-[var(--evo-border)] bg-[var(--evo-card)] p-6 md:p-8">
      <CalendarDays size={28} className="text-[var(--evo-support)]" />
      <div><h2 className="font-semibold">Sua semana, junto do CRM</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--evo-muted)]">Conecte sua conta para acompanhar compromissos e criar ou editar reuniões. As alterações são salvas no Google Agenda.</p></div>
      {configured ? <a href="/api/agenda/connect" className={primary}>Conectar Google Agenda</a> : <p className="text-sm text-[var(--evo-muted)]">A conexão ainda precisa ser configurada na VPS. O passo a passo está em docs/GOOGLE_AGENDA.md.</p>}
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button aria-label="Semana anterior" disabled={busy} onClick={() => setWeek(addDays(week, -7))} className={control}><ChevronLeft size={16} /></button>
          <button disabled={busy} onClick={() => setWeek(monday(today(zone)))} className={control}>Hoje</button>
          <button aria-label="Próxima semana" disabled={busy} onClick={() => setWeek(addDays(week, 7))} className={control}><ChevronRight size={16} /></button>
          <h2 className="ml-1 text-sm font-medium">{dayLabel(week, { day: 'numeric', month: 'short' })} – {dayLabel(addDays(week, 6), { day: 'numeric', month: 'short', year: 'numeric' })}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="calendar-choice">Agenda do Google</label><select id="calendar-choice" value={calendarId} disabled={busy} onChange={e => setCalendarId(e.target.value)} className={`${control} max-w-64`}>{calendars.map(c => <option key={c.id} value={c.id}>{c.name}{!c.writable ? ' · Somente leitura' : ''}</option>)}</select>
          <button aria-label="Atualizar agenda" onClick={() => void refresh()} disabled={loading || busy} className={control}><RefreshCw size={16} /></button>
          <button onClick={() => newEvent()} disabled={!calendar?.writable || busy} className={`${primary} flex items-center gap-2`}><Plus size={16} />Nova reunião</button>
        </div>
      </div>
      <p className="text-xs text-[var(--evo-muted)]">Horários em {zone.replaceAll('_', ' ')}{loading ? ' · Atualizando…' : ''}</p>
      {!calendars.length && <p className="text-sm text-[var(--evo-muted)]">Nenhuma agenda disponível para esta conta.</p>}
      <div className={`grid items-start gap-5 ${editor ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
        <div className="min-w-0 overflow-x-auto rounded-xl border border-[var(--evo-border)]" aria-busy={loading}>
          <div className="grid grid-cols-1 md:min-w-[770px] md:grid-cols-7">
            {days.map(day => {
              const dailyEvents = eventsForDay(events, day, zone);
              const isToday = day === today(zone);
              return <section key={day} aria-label={dayLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })} className="min-w-0 border-b border-[var(--evo-border)] last:border-b-0 md:min-h-[410px] md:border-b-0 md:border-r md:last:border-r-0">
                <div className={`flex items-center justify-between gap-2 border-b border-[var(--evo-border)] px-3 py-3 ${isToday ? 'bg-[var(--evo-surface2)]' : 'bg-[var(--evo-card)]'}`}>
                  <h3 className={`text-xs ${isToday ? 'text-[var(--evo-accent)]' : 'text-[var(--evo-muted)]'}`}>{dayLabel(day, { weekday: 'short' })}<span className="ml-2 text-sm font-semibold">{day.slice(-2)}</span></h3>
                  {calendar?.writable && <button aria-label={`Criar reunião em ${dayLabel(day, { day: 'numeric', month: 'long' })}`} onClick={() => newEvent(day)} disabled={busy} className="rounded p-1 hover:bg-[var(--evo-surface)] focus-visible:outline focus-visible:outline-[var(--evo-accent)]"><Plus size={14} /></button>}
                </div>
                <div className="space-y-2 p-2">
                  {loading && !events.length ? <div className="h-20 rounded-lg bg-[var(--evo-surface)]" /> : !dailyEvents.length ? <p className="px-1 py-4 text-xs text-[var(--evo-muted)]">Sem compromissos</p> : dailyEvents.map(event => <button key={event.id} onClick={() => editEvent(event)} disabled={busy} className="w-full rounded-lg bg-[var(--evo-surface)] px-3 py-3 text-left hover:bg-[var(--evo-surface2)] focus-visible:outline focus-visible:outline-[var(--evo-accent)]">
                    <p className="text-[11px] text-[var(--evo-support)]">{event.allDay ? 'Dia inteiro' : `${timeLabel(event.start, zone)} – ${timeLabel(event.end, zone)}`}</p>
                    <p className="mt-1 break-words text-sm font-medium">{event.title}</p>
                    {event.meet && <p className="mt-2 flex items-center gap-1 text-[10px] text-[var(--evo-muted)]"><Video size={12} />Google Meet</p>}
                  </button>)}
                </div>
              </section>;
            })}
          </div>
        </div>
        {editor && <aside className="order-first rounded-xl border border-[var(--evo-border)] bg-[var(--evo-card)] p-5 xl:order-last" aria-label={editor.event ? 'Detalhes da reunião' : 'Nova reunião'}>
          <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold">{editor.event ? editor.event.editable ? 'Editar reunião' : 'Detalhes da reunião' : 'Nova reunião'}</h2><button aria-label="Fechar formulário" onClick={() => setEditor(null)} disabled={busy} className={control}><X size={16} /></button></div>
          {editor.event?.recurring && <p className="mb-4 text-xs text-[var(--evo-muted)]">A alteração vale apenas para esta ocorrência.</p>}
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={busy || (editor.event && !editor.event.editable)} style={{ colorScheme: theme }} className="space-y-4 disabled:opacity-70">
              <label className="block text-xs text-[var(--evo-muted)]">Título<input ref={titleInput} required maxLength={200} value={editor.title} onChange={e => setEditor({ ...editor, title: e.target.value })} className={`${control} mt-1 w-full`} lang="pt-BR" spellCheck /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.allDay} onChange={e => toggleAllDay(e.target.checked)} />Dia inteiro</label>
              <label className="block text-xs text-[var(--evo-muted)]">Início<input required type={editor.allDay ? 'date' : 'datetime-local'} value={editor.start} onChange={e => setEditor({ ...editor, start: e.target.value })} className={`${control} mt-1 w-full`} /></label>
              <label className="block text-xs text-[var(--evo-muted)]">Término<input required type={editor.allDay ? 'date' : 'datetime-local'} value={editor.end} min={editor.start} onChange={e => setEditor({ ...editor, end: e.target.value })} className={`${control} mt-1 w-full`} /></label>
              <label className="block text-xs text-[var(--evo-muted)]">Local<input maxLength={1000} value={editor.location} onChange={e => setEditor({ ...editor, location: e.target.value })} className={`${control} mt-1 w-full`} /></label>
              <label className="block text-xs text-[var(--evo-muted)]">Descrição<textarea rows={3} maxLength={8000} value={editor.description} onChange={e => setEditor({ ...editor, description: e.target.value })} className={`${control} mt-1 w-full`} lang="pt-BR" spellCheck /></label>
              {!editor.event && calendar?.canMeet && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.createMeet} onChange={e => setEditor({ ...editor, createMeet: e.target.checked })} />Criar link do Google Meet</label>}
            </fieldset>
            {editor.event?.meet && <a href={editor.event.meet} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--evo-support)] underline"><Video size={16} />Entrar no Google Meet</a>}
            {editor.event?.url && <a href={editor.event.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[var(--evo-muted)] underline"><ExternalLink size={14} />Abrir no Google Agenda</a>}
            {(!editor.event || editor.event.editable) && <button type="submit" disabled={busy} className={`${primary} w-full`}>{busy ? 'Salvando…' : 'Salvar no Google Agenda'}</button>}
          </form>
        </aside>}
      </div>
    </>}
  </div>;
}
