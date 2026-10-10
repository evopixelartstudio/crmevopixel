import { requireCrmApi } from '@/lib/server/crm-auth';
import { NextResponse } from 'next/server';
import { cloudDatabase } from '@/lib/server/crm-access';
import { whatsAppPhoneKey } from '@/lib/utils/whatsapp';
import { contactChanges } from '@/lib/services/contact-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (typeof body.phone !== 'string' || !/^\d{10,15}$/.test(body.phone) || !['get','update'].includes(body.action)) return NextResponse.json({ error: 'Contato inválido.' }, { status: 400 });
    const phone = whatsAppPhoneKey(body.phone), db = cloudDatabase();
    // Do not overwrite an existing source or ownership based on message direction.
    const { error: insertError } = await db.from('crm_contacts').upsert({ phone_key: phone }, { onConflict: 'phone_key', ignoreDuplicates: true });
    if (insertError) throw insertError;
    let contact;
    if (body.action === 'update') {
      if (!Number.isSafeInteger(body.revision) || body.revision < 0 || !body.changes || typeof body.changes !== 'object') return NextResponse.json({ error: 'Atualize os dados do contato antes de salvar.' }, { status: 400 });
      let changes;
      try { changes = contactChanges(body.changes); } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
      const { data, error } = await db.from('crm_contacts').update(changes).eq('phone_key', phone).eq('revision', body.revision).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'O contato foi alterado em outra sessão. Atualize antes de salvar.', code: 'CONFLICT' }, { status: 409 });
      contact = data;
    } else {
      const { data, error } = await db.from('crm_contacts').select('*').eq('phone_key', phone).single();
      if (error) throw error;
      contact = data;
    }
    const { data: settings, error } = await db.from('crm_automation_settings').select('enabled').eq('id', true).single();
    if (error) throw error;
    return NextResponse.json({ contact, agentActive: settings.enabled === true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Classificação indisponível. Execute 20261009_contact_foundation.sql no Supabase e confira as credenciais da VPS.', code: 'SCHEMA_MISSING' }, { status: 503 }); }
}
