'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { crmService } from '@/lib/services/crm-service';
import { dbService } from '@/lib/supabase/db-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { formatWhatsAppNumber } from '@/lib/utils/whatsapp';
import { isNegotiationStage } from '@/lib/services/pipeline-stages';
import type { WhatsAppMessage } from '@/lib/services/whatsapp-messages';
import type { PipelineStage } from '@/types/database';
import type { WhatsAppConversation } from '@/lib/services/whatsapp-inbox';

const control = 'rounded-lg border border-[var(--evo-border)] bg-[var(--evo-surface)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--evo-accent)] disabled:opacity-50';

export default function WhatsAppPage() {
  useCrmSync();
  const [state, setState] = useState('');
  const [qr, setQr] = useState('');
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [inboxError, setInboxError] = useState('');
  const [inboxLoading, setInboxLoading] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [oppId, setOppId] = useState('');
  const generation = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const inboxRevision = useRef(0);

  // Merge by phone without matching unrelated companies by name.
  const contacts = new Map<string, { phone: string; name: string; company: string; leadIds: string[]; clientId?: string }>();
  for (const client of crmService.getClients()) {
    const phone = formatWhatsAppNumber(client.whatsapp || client.phone);
    if (/^\d{10,15}$/.test(phone)) contacts.set(phone, { phone, name: client.name, company: client.company_name, leadIds: [], clientId: client.id });
  }
  for (const lead of crmService.getLeads()) {
    const phone = formatWhatsAppNumber(lead.whatsapp || lead.phone);
    if (!/^\d{10,15}$/.test(phone)) continue;
    const existing = contacts.get(phone);
    if (existing) existing.leadIds.push(lead.id);
    else contacts.set(phone, { phone, name: lead.name, company: lead.company_name, leadIds: [lead.id] });
  }
  for (const conversation of conversations) {
    if (!contacts.has(conversation.phone)) contacts.set(conversation.phone, { phone: conversation.phone, name: `+${conversation.phone}`, company: '', leadIds: [] });
  }
  const summaries = new Map(conversations.map(c => [c.phone, c]));
  const unreadTotal = conversations.reduce((total, c) => total + c.unread, 0);
  const contact = contacts.get(selected);
  const opportunities = crmService.getOpportunities().filter(o => contact?.leadIds.includes(o.lead_id ?? ''));
  const opportunity = opportunities.find(o => o.id === oppId) ?? opportunities[0];
  const visible = [...contacts.values()].filter(c => `${c.name} ${c.company} ${c.phone}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
    .sort((a, b) => (summaries.get(b.phone)?.timestamp ?? 0) - (summaries.get(a.phone)?.timestamp ?? 0) || a.name.localeCompare(b.name, 'pt-BR'));

  const api = useCallback(async (action: string, extra = {}) => {
    const response = await fetch('/api/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.code === 'CONFIG_MISSING' ? 'Configure a integração na VPS para conectar o WhatsApp.' : data.error || 'Não foi possível acessar o WhatsApp.');
    return data;
  }, []);

  const refreshInbox = useCallback(async () => {
    const revision = ++inboxRevision.current;
    try {
      const data = await api('conversations');
      if (revision === inboxRevision.current) { setConversations(data); setInboxError(''); }
    } catch (e) { if (revision === inboxRevision.current) setInboxError(e instanceof Error ? e.message : 'Falha ao carregar conversas.'); }
    finally { if (revision === inboxRevision.current) setInboxLoading(false); }
  }, [api]);

  useEffect(() => {
    void refreshInbox();
    const timer = setInterval(() => void refreshInbox(), 5000);
    return () => { clearInterval(timer); inboxRevision.current++; };
  }, [refreshInbox]);

  useEffect(() => {
    let alive = true;
    void dbService.getPipelineStages().then(data => { if (alive) setStages((data ?? []).filter(s => !isNegotiationStage(s))); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const data = await api('status');
        if (alive) { setState(data.instance?.state ?? 'close'); setConnectionError(''); if (data.instance?.state === 'open') setQr(''); }
      } catch (e) { if (alive) { setState('error'); setConnectionError(e instanceof Error ? e.message : 'Falha na conexão.'); } }
      finally { checking = false; }
    };
    void check();
    const timer = setInterval(check, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, [api]);

  useEffect(() => {
    const revision = ++generation.current;
    setMessages([]); setText(''); setOppId('');
    if (!selected) { setLoading(false); return; }
    let alive = true, fetching = false;
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const data = await api('messages', { phone: selected });
        if (alive && generation.current === revision) {
          setMessages(data); setError('');
          if (document.visibilityState === 'visible' && data.some((m: WhatsAppMessage) => !m.fromMe && m.status === 'received')) {
            const through = Math.max(...data.map((m: WhatsAppMessage) => m.timestamp || 0));
            await api('read', { phone: selected, through });
            if (alive && generation.current === revision) await refreshInbox();
          }
        }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Falha ao carregar mensagens.'); }
      finally { fetching = false; if (alive) setLoading(false); }
    };
    setLoading(true); void load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [selected, api, refreshInbox]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);

  async function connect() {
    setBusy(true); setError(''); setConnectionError('');
    try {
      const data = await api('status');
      setState(data.instance?.state ?? 'close');
      if (data.provider === 'go' || data.instance?.state !== 'open') {
        const result = await api('connect');
        if (result.instance?.state === 'open') { setState('open'); setQr(''); setNotice('Recebimento de mensagens configurado.'); return; }
        const image = result.base64 ?? result.qrcode?.base64;
        if (!image || !/^data:image\/png;base64,/.test(image)) throw new Error('QR Code indisponível. Aguarde alguns segundos e tente novamente.');
        setQr(image);
      }
    } catch (e) { setState('error'); setConnectionError(e instanceof Error ? e.message : 'Falha ao conectar.'); }
    finally { setBusy(false); }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !text.trim() || state !== 'open') return;
    const revision = generation.current, phone = selected, draft = text;
    setBusy(true); setError('');
    try {
      const sent = await api('send', { phone, text: draft });
      void refreshInbox();
      if (revision === generation.current) {
        setText(''); setNotice('Mensagem enviada.');
        if (sent.key?.id) setMessages(current => [...current.filter(m => m.id !== sent.key.id), { id: sent.key.id, fromMe: true, text: draft.trim(), timestamp: Number(sent.messageTimestamp) || Date.now() / 1000, status: sent.status ?? '' }]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível enviar.'); }
    finally { setBusy(false); }
  }

  async function classify(slug: string) {
    if (!opportunity || busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await crmService.updateOpportunityStageConfirmed(opportunity.id, slug); setNotice('Etapa salva no pipeline.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar etapa.'); }
    finally { setBusy(false); }
  }

  return <div className="flex h-full min-h-0 flex-col gap-3">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><h1 className="text-xl font-semibold">WhatsApp</h1>{unreadTotal > 0 && <span role="status" className="text-xs text-[var(--evo-support)]">{unreadTotal} não {unreadTotal === 1 ? 'lida' : 'lidas'}</span>}</div>
      <div className="flex flex-wrap items-center gap-3">
        <span role="status" className="flex items-center gap-2 text-xs text-[var(--evo-muted)]"><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${state === 'open' ? 'bg-[var(--evo-support)]' : state === 'error' ? 'bg-amber-400' : 'bg-[var(--evo-muted)]'}`} />{state === 'open' ? 'Conectado' : state === 'error' ? 'Conexão indisponível' : !state ? 'Verificando…' : 'Desconectado'}</span>
        <button className={control} onClick={connect} disabled={busy}>{busy ? 'Aguarde…' : state === 'open' ? 'Configurar recebimento' : qr ? 'Renovar QR Code' : 'Conectar'}</button>
      </div>
    </header>
    {connectionError && <div role="alert" className="shrink-0 rounded-lg bg-[var(--evo-surface)] px-4 py-3 text-sm">
      <p className="text-amber-200">{connectionError}</p>
      <details className="mt-1 text-xs text-[var(--evo-muted)]"><summary className="w-fit cursor-pointer py-1 focus-visible:outline focus-visible:outline-[var(--evo-accent)]">Como resolver</summary><p className="mt-2 max-w-2xl leading-relaxed">Confira o arquivo .env na pasta do CRM na VPS: EVOLUTION_PROVIDER=go, EVOLUTION_API_URL, EVOLUTION_API_KEY (token da instância), EVOLUTION_INSTANCE e EVOLUTION_WEBHOOK_URL. Recrie o container após salvar. Se a configuração já estiver completa, verifique a instância na Evolution GO e tente conectar novamente.</p></details>
    </div>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {inboxError && <p role="alert" className="text-sm text-red-300">{inboxError} <button onClick={() => void refreshInbox()} className="underline">Tentar novamente</button></p>}
    {notice && <p role="status" className="text-sm text-[var(--evo-support)]">{notice}</p>}
    {qr && <div className="flex max-h-[45vh] shrink-0 flex-wrap items-center gap-4 overflow-y-auto rounded-xl bg-[var(--evo-card)] p-4"><img src={qr} alt="QR Code para conectar o WhatsApp" width={180} height={180} className="bg-white p-2" /><div><h2 className="font-semibold">Conecte seu número</h2><p className="mt-2 text-sm text-[var(--evo-muted)]">WhatsApp → Aparelhos conectados → Conectar aparelho.</p></div></div>}
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-[var(--evo-border)] bg-[var(--evo-card)] md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className={`${selected ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-[var(--evo-border)] p-3`}>
        <label className="sr-only" htmlFor="contact-search">Buscar contato</label><input id="contact-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nome ou telefone" className={`${control} w-full`} />
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto" aria-busy={inboxLoading}>{visible.map(c => {
          const summary = summaries.get(c.phone);
          return <button key={c.phone} aria-pressed={selected === c.phone} onClick={() => { setSelected(c.phone); setNotice(''); setError(''); }} className={`w-full rounded-lg px-3 py-3 text-left focus-visible:outline focus-visible:outline-[var(--evo-accent)] ${selected === c.phone ? 'bg-[var(--evo-surface2)]' : 'hover:bg-[var(--evo-surface)]'}`}>
            <div className="flex items-center justify-between gap-2"><span className={`truncate text-sm ${summary?.unread ? 'font-semibold' : 'font-medium'}`}>{c.name}</span>{summary && <time dateTime={new Date(summary.timestamp * 1000).toISOString()} className="shrink-0 text-[10px] text-[var(--evo-muted)]">{new Date(summary.timestamp * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time>}</div>
            <div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-[var(--evo-muted)]">{summary ? `${summary.fromMe ? 'Você: ' : ''}${summary.preview}` : c.company && c.company !== c.name ? c.company : `+${c.phone}`}</span>{!!summary?.unread && <span aria-label={`${summary.unread} mensagens não lidas`} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--evo-accent)] px-1 text-[10px] font-semibold text-[var(--evo-bg)]">{summary.unread}</span>}</div>
          </button>;
        })}{!visible.length && <p className="p-3 text-sm text-[var(--evo-muted)]">{inboxLoading ? 'Carregando conversas…' : 'Nenhum contato encontrado.'}</p>}</div>
      </aside>
      <section className={`${!selected ? 'hidden md:flex' : 'flex'} min-h-0 min-w-0 flex-col`}>
        {contact ? <>
          <div className="shrink-0 space-y-2 border-b border-[var(--evo-border)] p-4">
            <div className="flex items-center gap-2"><button aria-label="Voltar aos contatos" className={`${control} md:hidden`} onClick={() => setSelected('')}><ArrowLeft size={16} /></button><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{contact.name}</h2><p className="mt-1 text-xs text-[var(--evo-muted)]">+{contact.phone}</p></div></div>
            <div className="flex flex-wrap items-center gap-2">
              {opportunities.length > 1 && <select aria-label="Oportunidade" className={control} value={opportunity?.id ?? ''} onChange={e => setOppId(e.target.value)}>{opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}</select>}
              {opportunity ? <label className="text-sm">Etapa <select className={control} value={opportunity.stage_slug} disabled={busy || !stages.length} onChange={e => void classify(e.target.value)}>{!stages.some(s => s.slug === opportunity.stage_slug) && <option value={opportunity.stage_slug}>{opportunity.stage_slug}</option>}{stages.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}</select></label> : <p className="text-sm text-[var(--evo-muted)]">{!contact.clientId && !contact.leadIds.length ? <>Número ainda não cadastrado. <Link href="/leads" className="underline text-[var(--evo-support)]">Cadastrar lead</Link></> : <>Sem oportunidade vinculada. <Link href="/pipeline" className="underline text-[var(--evo-support)]">Cadastrar no pipeline</Link></>}</p>}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-label="Histórico de mensagens" aria-busy={loading}>
            {loading ? <p className="text-sm text-[var(--evo-muted)]">Carregando mensagens…</p> : !messages.length && <p className="text-sm text-[var(--evo-muted)]">{state !== 'open' ? 'Conecte o WhatsApp para carregar a conversa.' : 'Nenhuma mensagem sincronizada para este contato.'}</p>}
            {messages.map(m => <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl px-4 py-2 ${m.fromMe ? 'bg-[var(--evo-surface2)]' : 'bg-[var(--evo-surface)]'}`}><p className="whitespace-pre-wrap break-words text-sm">{m.text}</p><p className="mt-1 text-right text-xs text-[var(--evo-muted)]">{m.timestamp ? new Date(m.timestamp * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</p></div></div>)}<div ref={bottom} />
          </div>
          <form onSubmit={send} className="flex items-end gap-2 border-t border-[var(--evo-border)] p-3"><label className="sr-only" htmlFor="message-text">Mensagem</label><textarea id="message-text" lang="pt-BR" spellCheck={true} autoCorrect="on" autoCapitalize="sentences" rows={2} maxLength={4096} value={text} onChange={e => setText(e.target.value)} placeholder="Escreva sua mensagem" disabled={state !== 'open' || busy} className={`${control} min-w-0 flex-1 resize-none`} /><button type="submit" disabled={busy || !text.trim() || state !== 'open'} className={`${control} flex items-center gap-2`}><Send size={16} />Enviar</button></form>
        </> : <div className="m-auto p-6 text-center text-[var(--evo-muted)]"><MessageSquare size={28} strokeWidth={1.5} className="mx-auto mb-3" /><p className="text-sm">Selecione uma conversa</p></div>}
      </section>
    </div>
  </div>;
}
