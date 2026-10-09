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

const control = 'rounded-lg border border-[var(--evo-border)] bg-[var(--evo-surface)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--evo-accent)] disabled:opacity-50';

export default function WhatsAppPage() {
  useCrmSync();
  const [token, setToken] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [state, setState] = useState('');
  const [qr, setQr] = useState('');
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [oppId, setOppId] = useState('');
  const generation = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

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
  const contact = contacts.get(selected);
  const opportunities = crmService.getOpportunities().filter(o => contact?.leadIds.includes(o.lead_id ?? ''));
  const opportunity = opportunities.find(o => o.id === oppId) ?? opportunities[0];
  const visible = [...contacts.values()].filter(c => `${c.name} ${c.company} ${c.phone}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));

  const api = useCallback(async (action: string, extra = {}) => {
    const response = await fetch('/api/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...extra }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível acessar o WhatsApp.');
    return data;
  }, [token]);

  useEffect(() => {
    let alive = true;
    void dbService.getPipelineStages().then(data => { if (alive) setStages((data ?? []).filter(s => !isNegotiationStage(s))); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    const check = async () => {
      try {
        const data = await api('status');
        if (alive) { setState(data.instance?.state ?? 'close'); if (data.instance?.state === 'open') setQr(''); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Falha na conexão.'); }
    };
    void check();
    const timer = setInterval(check, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, [unlocked, api]);

  useEffect(() => {
    const revision = ++generation.current;
    setMessages([]); setText(''); setOppId('');
    if (!selected || !unlocked || state !== 'open') { setLoading(false); return; }
    let alive = true, fetching = false;
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const data = await api('messages', { phone: selected });
        if (alive && generation.current === revision) { setMessages(data); setError(''); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Falha ao carregar mensagens.'); }
      finally { fetching = false; if (alive) setLoading(false); }
    };
    setLoading(true); void load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [selected, unlocked, state, api]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);

  async function connect() {
    setBusy(true); setError('');
    try {
      const data = await api('status');
      setUnlocked(true); setState(data.instance?.state ?? 'close');
      if (data.provider === 'go' || data.instance?.state !== 'open') {
        const result = await api('connect');
        if (result.instance?.state === 'open') { setState('open'); setQr(''); setNotice('Recebimento de mensagens configurado.'); return; }
        const image = result.base64 ?? result.qrcode?.base64;
        if (!image || !/^data:image\/png;base64,/.test(image)) throw new Error('QR Code indisponível. Aguarde alguns segundos e tente novamente.');
        setQr(image);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao conectar.'); }
    finally { setBusy(false); }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !text.trim() || state !== 'open') return;
    const revision = generation.current, phone = selected, draft = text;
    setBusy(true); setError('');
    try {
      const sent = await api('send', { phone, text: draft });
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

  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">WhatsApp</h1><p className="text-sm text-[var(--evo-muted)]">Converse com seus contatos e acompanhe as oportunidades.</p></div>
      <span role="status" className="text-sm text-[var(--evo-support)]">{state === 'open' ? 'Conectado' : unlocked ? 'Aguardando conexão' : 'Não conectado'}</span>
    </header>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Chave de acesso<input type="password" autoComplete="off" value={token} disabled={unlocked} onChange={e => setToken(e.target.value)} className={`${control} ml-2`} /></label>
      <button className={control} onClick={connect} disabled={busy || !token}>{busy ? 'Aguarde…' : state === 'open' ? 'Configurar recebimento' : 'Conectar / renovar QR Code'}</button>
      {unlocked && <button className={control} onClick={() => { setUnlocked(false); setState(''); setQr(''); setToken(''); setMessages([]); }}>Bloquear acesso</button>}
    </div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {notice && <p role="status" className="text-sm text-[var(--evo-support)]">{notice}</p>}
    {qr && <div className="flex flex-wrap items-center gap-5 rounded-xl bg-[var(--evo-card)] p-5"><img src={qr} alt="QR Code para conectar o WhatsApp" width={240} height={240} className="bg-white p-3" /><div><h2 className="font-semibold">Conecte seu número</h2><p className="mt-2 text-sm text-[var(--evo-muted)]">No celular, abra WhatsApp → Aparelhos conectados → Conectar aparelho.</p><p className="mt-2 text-sm text-[var(--evo-muted)]">Se o código expirar, clique em renovar QR Code.</p></div></div>}
    <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-xl border border-[var(--evo-border)] bg-[var(--evo-card)] md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={`${selected ? 'hidden md:block' : ''} border-r border-[var(--evo-border)] p-3`}>
        <label className="sr-only" htmlFor="contact-search">Buscar contato</label><input id="contact-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nome ou telefone" className={`${control} w-full`} />
        <div className="mt-3 max-h-[520px] overflow-y-auto">{visible.map(c => <button key={c.phone} onClick={() => { setSelected(c.phone); setNotice(''); setError(''); }} className={`w-full rounded-lg p-3 text-left focus-visible:outline focus-visible:outline-[var(--evo-accent)] ${selected === c.phone ? 'bg-[var(--evo-surface2)]' : 'hover:bg-[var(--evo-surface)]'}`}><div className="truncate text-sm font-medium">{c.name}</div><div className="truncate text-xs text-[var(--evo-muted)]">{c.company}</div><div className="mt-1 text-xs text-[var(--evo-muted)]">+{c.phone}</div></button>)}{!visible.length && <p className="p-3 text-sm text-[var(--evo-muted)]">Nenhum contato com telefone válido. Cadastre o WhatsApp em Clientes ou Leads.</p>}</div>
      </aside>
      <section className={`${!selected ? 'hidden md:flex' : 'flex'} min-w-0 flex-col`}>
        {contact ? <>
          <div className="space-y-3 border-b border-[var(--evo-border)] p-4">
            <div className="flex items-center gap-2"><button aria-label="Voltar aos contatos" className={`${control} md:hidden`} onClick={() => setSelected('')}><ArrowLeft size={16} /></button><h2 className="font-semibold">{contact.name}</h2></div>
            <div className="flex flex-wrap items-center gap-2">
              {opportunities.length > 1 && <select aria-label="Oportunidade" className={control} value={opportunity?.id ?? ''} onChange={e => setOppId(e.target.value)}>{opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}</select>}
              {opportunity ? <label className="text-sm">Etapa <select className={control} value={opportunity.stage_slug} disabled={busy || !stages.length} onChange={e => void classify(e.target.value)}>{!stages.some(s => s.slug === opportunity.stage_slug) && <option value={opportunity.stage_slug}>{opportunity.stage_slug}</option>}{stages.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}</select></label> : <p className="text-sm text-[var(--evo-muted)]">Sem oportunidade vinculada. <Link href="/pipeline" className="underline text-[var(--evo-support)]">Cadastrar no pipeline</Link></p>}
            </div>
          </div>
          <div className="h-[360px] flex-1 space-y-3 overflow-y-auto p-4" aria-label="Histórico de mensagens" aria-busy={loading}>
            {loading ? <p className="text-sm text-[var(--evo-muted)]">Carregando mensagens…</p> : !messages.length && <p className="text-sm text-[var(--evo-muted)]">{state !== 'open' ? 'Conecte o WhatsApp para carregar a conversa.' : 'Nenhuma mensagem sincronizada para este contato.'}</p>}
            {messages.map(m => <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl px-4 py-2 ${m.fromMe ? 'bg-[var(--evo-surface2)]' : 'bg-[var(--evo-surface)]'}`}><p className="whitespace-pre-wrap break-words text-sm">{m.text}</p><p className="mt-1 text-right text-xs text-[var(--evo-muted)]">{m.timestamp ? new Date(m.timestamp * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</p></div></div>)}<div ref={bottom} />
          </div>
          <form onSubmit={send} className="flex items-end gap-2 border-t border-[var(--evo-border)] p-3"><label className="sr-only" htmlFor="message-text">Mensagem</label><textarea id="message-text" rows={2} maxLength={4096} value={text} onChange={e => setText(e.target.value)} placeholder="Escreva sua mensagem" disabled={!unlocked || state !== 'open' || busy} className={`${control} min-w-0 flex-1 resize-none`} /><button type="submit" disabled={busy || !text.trim() || state !== 'open'} className={`${control} flex items-center gap-2`}><Send size={16} />Enviar</button></form>
        </> : <div className="m-auto p-6 text-center text-[var(--evo-muted)]"><MessageSquare className="mx-auto mb-3" /><p>Selecione um contato para abrir a conversa.</p></div>}
      </section>
    </div>
    <p className="text-xs text-[var(--evo-muted)]">Últimas 100 mensagens recebidas pela integração. Atualização a cada 5 segundos. Áudios e anexos aparecem como indicação; o envio nesta versão é de texto.</p>
  </div>;
}
