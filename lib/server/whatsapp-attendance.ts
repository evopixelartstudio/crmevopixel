import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { whatsAppPhoneAliases, whatsAppPhoneKey } from '@/lib/utils/whatsapp';

export interface WhatsAppAttendance {
  owner: 'human' | 'ai';
  pausedUntil: string | null;
  version: string;
}

interface Pause { phone: string; pausado_ate: string | null }
const pending = new Map<string, Promise<void>>();
const pauseHours = 8;

export class AttendanceConflict extends Error {
  constructor(public state: WhatsAppAttendance) {
    super('O atendimento mudou em outra sessão. Confira o estado atualizado e tente novamente.');
  }
}

async function snapshot(db: SupabaseClient, phone: string) {
  const aliases = whatsAppPhoneAliases(phone);
  const { data, error } = await db.from('bot_pausa').select('phone, pausado_ate').in('phone', aliases);
  if (error || !Array.isArray(data)) throw new Error('Não foi possível consultar o atendimento. Tente novamente.');
  const pauses = (data as Pause[]).sort((a, b) => a.phone.localeCompare(b.phone));
  const until = Math.max(0, ...pauses.map(row => Date.parse(row.pausado_ate || '') || 0));
  const state: WhatsAppAttendance = {
    owner: until > Date.now() ? 'human' : 'ai',
    pausedUntil: until > Date.now() ? new Date(until).toISOString() : null,
    version: createHash('sha256').update(JSON.stringify(pauses)).digest('hex'),
  };
  return { state, pauses, aliases };
}

export async function getWhatsAppAttendance(db: SupabaseClient, phone: string): Promise<WhatsAppAttendance> {
  return (await snapshot(db, phone)).state;
}

export async function changeWhatsAppAttendance(db: SupabaseClient, phone: string, owner: WhatsAppAttendance['owner'], version: string): Promise<WhatsAppAttendance> {
  // Serializa ações do CRM para o mesmo telefone, inclusive variantes com nono dígito.
  const key = whatsAppPhoneKey(phone);
  const previous = pending.get(key) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  pending.set(key, current);
  await previous;
  try {
    const before = await snapshot(db, phone);
    if (before.state.version !== version) throw new AttendanceConflict(before.state);
    if (before.state.owner === owner) return before.state;
    if (owner === 'human') {
      const until = new Date(Date.now() + pauseHours * 60 * 60 * 1000).toISOString();
      const rows = before.aliases.map(alias => ({ phone: alias, pausado_ate: until, motivo: 'humano_assumiu_conversa' }));
      const { data, error } = await db.from('bot_pausa').upsert(rows, { onConflict: 'phone' }).select('phone, pausado_ate');
      if (error || !Array.isArray(data) || !rows.every(row => data.some(saved => saved.phone === row.phone && Date.parse(saved.pausado_ate) === Date.parse(until)))) {
        throw new Error('Não foi possível confirmar a pausa da IA. Tente novamente.');
      }
    } else {
      // Não apaga uma intervenção nova que o n8n gravou depois da leitura.
      const deadlines = before.pauses.map(row => row.pausado_ate).filter((value): value is string => value !== null);
      const { error } = await db.from('bot_pausa').delete().in('phone', before.aliases).in('pausado_ate', deadlines);
      if (error) throw new Error('Não foi possível devolver a conversa para IA. Tente novamente.');
    }
    const after = await snapshot(db, phone);
    if (after.state.owner !== owner) throw new AttendanceConflict(after.state);
    return after.state;
  } finally {
    release();
    if (pending.get(key) === current) pending.delete(key);
  }
}
