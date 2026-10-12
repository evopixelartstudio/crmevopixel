'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, UserRound } from 'lucide-react';
import type { WhatsAppAttendance } from '@/lib/server/whatsapp-attendance';

const control = 'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--evo-accent)] disabled:cursor-not-allowed disabled:opacity-50';

export function ConversationAttendanceControls({ phone }: { phone: string }) {
  const [state, setState] = useState<WhatsAppAttendance | null>(null);
  const [busy, setBusy] = useState(false);
  const [changingOwner, setChangingOwner] = useState<WhatsAppAttendance['owner'] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  const saving = useRef(false);
  const mounted = useRef(false);
  const request = useCallback(async (action: 'get' | 'update', extra = {}) => {
    const response = await fetch('/api/whatsapp/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, phone, ...extra }),
    });
    return { response, data: await response.json() };
  }, [phone]);

  const load = useCallback(async () => {
    if (saving.current) return;
    const version = ++generation.current;
    try {
      const { response, data } = await request('get');
      if (!response.ok) throw new Error(data.error);
      if (mounted.current && version === generation.current) { setState(data.state); setError(''); }
    } catch (error) {
      if (mounted.current && version === generation.current) setError(error instanceof Error ? error.message : 'Não foi possível carregar o atendimento.');
    }
  }, [request]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => { mounted.current = false; generation.current++; clearInterval(timer); };
  }, [load]);

  async function change(owner: WhatsAppAttendance['owner']) {
    if (!state || saving.current) return;
    saving.current = true;
    const version = ++generation.current;
    setBusy(true); setChangingOwner(owner); setError(''); setNotice('');
    try {
      const { response, data } = await request('update', { owner, version: state.version });
      if (!mounted.current || version !== generation.current) return;
      if (data.state) setState(data.state);
      if (!response.ok) throw new Error(data.error);
      setNotice(owner === 'human' ? 'Conversa assumida. A IA está pausada por 8 horas.' : 'Conversa liberada para IA. O atendimento automático depende de o agente estar ativo.');
    } catch (error) {
      if (mounted.current && version === generation.current) setError(error instanceof Error ? error.message : 'Não foi possível alterar o atendimento.');
    } finally {
      saving.current = false;
      if (mounted.current && version === generation.current) { setBusy(false); setChangingOwner(null); }
    }
  }

  return <div className="space-y-2" aria-busy={busy}>
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Controle de atendimento">
      <button type="button" onClick={() => void change('human')} disabled={busy || !state || state.owner === 'human'} className={`${control} border-[var(--evo-border)] bg-[var(--evo-surface)] text-[var(--evo-text)] hover:border-[var(--evo-support)]`}><UserRound size={16} aria-hidden="true" />{changingOwner === 'human' ? 'Assumindo...' : 'Assumir conversa'}</button>
      <button type="button" onClick={() => void change('ai')} disabled={busy || !state || state.owner === 'ai'} className={`${control} border-[var(--evo-border)] bg-[var(--evo-surface2)] text-[var(--evo-accent)] hover:border-[var(--evo-accent)]`}><Bot size={16} aria-hidden="true" />{changingOwner === 'ai' ? 'Devolvendo...' : 'Devolver para IA'}</button>
      <span className="text-xs text-[var(--evo-muted)]" role="status">{state ? state.owner === 'human' ? 'Atendimento humano · IA pausada' : 'IA liberada' : 'Verificando atendimento...'}</span>
    </div>
    {state?.pausedUntil && <p className="text-xs text-[var(--evo-muted)]">Pausa até {new Date(state.pausedUntil).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.</p>}
    {error && <div className="flex flex-wrap items-center gap-2"><p role="alert" className="text-xs text-red-300">{error}</p><button type="button" onClick={() => void load()} disabled={busy} className="text-xs text-[var(--evo-accent)] underline underline-offset-4">Tentar novamente</button></div>}
    {notice && <p role="status" className="text-xs text-[var(--evo-support)]">{notice}</p>}
  </div>;
}
