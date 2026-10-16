import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { duplicateMatchesFromDatabase, getLeadPhoneKeys, type LeadDuplicate } from '@/lib/services/lead-deduplication';

export const LEAD_DEDUP_MIGRATION = '20261016_lead_phone_deduplication.sql';
export const registryFields = 'phone_key,entity_type,entity_id,name,company_name,deleted_at';

export class LeadRegistrationError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

export async function requireLeadDeduplication(db: SupabaseClient) {
  const { error } = await db.from('crm_phone_registry').select('phone_key').limit(1);
  if (error) throw new LeadRegistrationError(`A verificação de telefones está indisponível. Aplique a migração ${LEAD_DEDUP_MIGRATION} e confira a conexão antes de cadastrar ou importar.`);
}

export async function decorateLeadDuplicates(db: SupabaseClient, rows: LeadDuplicate[]): Promise<LeadDuplicate[]> {
  const ids = Array.from(new Set(rows.filter(row => row.entity_type === 'lead' && !row.deleted_at).map(row => row.entity_id)));
  const locations = new Map<string, { location: LeadDuplicate['location']; url?: string }>();
  for (let offset = 0; offset < ids.length; offset += 200) {
    const group = ids.slice(offset, offset + 200);
    const { data, error } = await db.from('opportunities').select('id,lead_id,status,loss_reason').in('lead_id', group);
    if (error) throw new LeadRegistrationError('O telefone já existe no CRM, mas não foi possível consultar sua etapa. Atualize a conexão e tente novamente.');
    for (const opportunity of data || []) {
      const lost = ['perdido', 'lost', 'arquivado', 'descartado', 'deleted'].includes(String(opportunity.status || '').toLowerCase()) || !!opportunity.loss_reason;
      if (locations.get(opportunity.lead_id)?.location === 'pipeline') continue;
      locations.set(opportunity.lead_id, lost ? { location: 'trash', url: '/pipeline?view=lost' } : { location: 'pipeline', url: '/pipeline' });
    }
  }
  return rows.map(row => row.deleted_at ? { ...row, location: 'trash', url: undefined }
    : row.entity_type === 'client' ? { ...row, location: 'clients', url: `/clientes/${row.entity_id}` }
    : { ...row, location: 'leads' as const, url: `/leads/${row.entity_id}`, ...locations.get(row.entity_id) });
}

export async function findLeadDuplicates(db: SupabaseClient, keys: string[]): Promise<LeadDuplicate[]> {
  if (!keys.length) return [];
  const { data, error } = await db.from('crm_phone_registry').select(registryFields).in('phone_key', keys);
  if (error) throw new LeadRegistrationError('Não foi possível verificar os telefones já cadastrados. Tente novamente antes de importar.');
  return decorateLeadDuplicates(db, (data || []) as LeadDuplicate[]);
}

export function preferredDuplicate(matches: LeadDuplicate[]): LeadDuplicate | undefined {
  const priority = { clients: 0, pipeline: 1, trash: 2, leads: 3 };
  return [...matches].sort((a, b) => priority[a.location] - priority[b.location] || a.entity_id.localeCompare(b.entity_id))[0];
}

export async function createUniqueLead(db: SupabaseClient, lead: Record<string, unknown>) {
  const keys = getLeadPhoneKeys(lead as { phone?: string; whatsapp?: string });
  const known = await findLeadDuplicates(db, keys);
  if (known.length) return { duplicates: known };
  // INSERT, never UPSERT: an existing identifier must not overwrite a contact.
  const { data, error } = await db.from('leads').insert(lead).select('*').single();
  if (error) {
    const matches = duplicateMatchesFromDatabase(error);
    if (matches !== null) {
      const refreshed = await findLeadDuplicates(db, keys);
      return { duplicates: refreshed.length ? refreshed : await decorateLeadDuplicates(db, matches) };
    }
    throw new LeadRegistrationError('Não foi possível salvar este lead no CRM. Nenhuma gravação foi confirmada. Verifique a conexão e tente novamente.');
  }
  if (!data?.id) throw new LeadRegistrationError('O banco não confirmou o cadastro do lead. Atualize o CRM antes de tentar novamente.');
  return { lead: data };
}
