'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContactContext } from '@/lib/services/contact-context';

const control = 'rounded-lg border border-[var(--evo-border)] bg-[var(--evo-surface)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--evo-accent)] disabled:opacity-50';
export function ContactContextPanel({ phone }: { phone: string }) {
  const [contact, setContact] = useState<ContactContext | null>(null);
  const [agentActive, setAgentActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [responsible, setResponsible] = useState('');
  const revision = useRef(0);
  const saving = useRef(false);
  const request = useCallback(async (action: string, extra = {}) => {
    const response = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, phone, ...extra }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }, [phone]);
  useEffect(() => {
    let alive = true;
    const load = async () => { if (saving.current) return; const version = ++revision.current; try {
      const data = await request('get');
      if (alive && version === revision.current) { setContact(data.contact); setAgentActive(data.agentActive); setError(''); }
    } catch (e) { if (alive && version === revision.current) setError((e as Error).message); } };
    void load(); const timer = setInterval(() => void load(), 10000);
    return () => { alive = false; clearInterval(timer); revision.current++; };
  }, [request]);
  useEffect(() => { setResponsible(contact?.assigned_to || ''); }, [contact?.assigned_to]);
  async function save(changes: Partial<ContactContext>) {
    if (!contact || saving.current) return;
    saving.current = true; revision.current++;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await request('update', { revision: contact.revision, changes });
      setContact(data.contact); setAgentActive(data.agentActive);
      setNotice(changes.attendance_owner === 'ai' && !data.agentActive ? 'Preparado para a IA. A automação continua desligada.' : 'Dados salvos no Supabase.');
    } catch (e) { setError((e as Error).message); }
    finally { saving.current = false; setBusy(false); }
  }
  return <details className="text-sm">
    <summary className="w-fit cursor-pointer py-1 text-[var(--evo-support)] focus-visible:outline focus-visible:outline-[var(--evo-accent)]">Classificação e atendimento{contact ? ` · ${contact.attendance_owner === 'human' ? 'Humano' : agentActive ? 'IA' : 'IA preparada'}` : ''}</summary>
    <div className="mt-2 space-y-3">
      {contact ? <>
        <div className="flex flex-wrap items-center gap-2"><button className={control} disabled={busy || contact.attendance_owner === 'human'} onClick={() => void save({ attendance_owner: 'human' })}>Assumir atendimento</button><button className={control} disabled={busy || contact.attendance_owner === 'ai'} onClick={() => void save({ attendance_owner: 'ai' })}>Devolver à IA</button>{!agentActive && <span className="text-xs text-[var(--evo-muted)]">IA ainda não ativada</span>}</div>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--evo-muted)]">Origem<select className={control} disabled={busy} value={contact.origin} onChange={e => void save({ origin: e.target.value as ContactContext['origin'] })}><option value="unknown">Não informada</option><option value="outbound">Prospecção ativa</option><option value="inbound">Lead receptivo</option></select></label>
          <label className="flex flex-col gap-1 text-xs text-[var(--evo-muted)]">Canal de aquisição<select className={control} disabled={busy} value={contact.acquisition_channel} onChange={e => void save({ acquisition_channel: e.target.value as ContactContext['acquisition_channel'] })}><option value="unknown">Não informado</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="referral">Indicação</option><option value="website">Site</option><option value="other">Outro</option></select></label>
          <label className="flex flex-col gap-1 text-xs text-[var(--evo-muted)]">Relacionamento<select className={control} disabled={busy} value={contact.relationship} onChange={e => void save({ relationship: e.target.value as ContactContext['relationship'] })}><option value="lead">Lead</option><option value="client">Cliente</option><option value="former_client">Ex-cliente</option></select></label>
        </div>
        <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void save({ assigned_to: responsible }); }}><label className="flex min-w-0 flex-col gap-1 text-xs text-[var(--evo-muted)]">Responsável humano<input className={control} value={responsible} maxLength={120} onChange={e => setResponsible(e.target.value)} placeholder="Nome do responsável" /></label><button className={control} disabled={busy || responsible.trim() === contact.assigned_to}>Salvar responsável</button></form>
      </> : !error && <p className="text-xs text-[var(--evo-muted)]">Carregando classificação…</p>}
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      {notice && <p role="status" className="text-xs text-[var(--evo-support)]">{notice}</p>}
    </div>
  </details>;
}
