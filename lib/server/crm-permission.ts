import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';

// Lista apenas no servidor: permite a primeira camada sem criar tabelas/RPCs.
// Sem a configuração explícita, mantém a autorização original via crm_members.
export async function crmPermission(db: Pick<SupabaseClient, 'rpc'>, user: User, admin = false): Promise<boolean> {
  const configured = process.env.CRM_ADMIN_EMAILS;
  if (configured !== undefined) {
    const emails = configured.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    return Boolean(user.email_confirmed_at && user.email && emails.includes(user.email.toLowerCase()));
  }
  const result = await db.rpc(admin ? 'crm_is_admin' : 'crm_is_member');
  return !result.error && result.data === true;
}
