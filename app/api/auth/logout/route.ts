import { NextResponse } from 'next/server';
import { requireCrmApi, sessionDatabase } from '@/lib/server/crm-auth';
import { crmOrigin } from '@/lib/auth/config';

export async function POST(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  if (request.headers.get('origin') !== crmOrigin()) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  try {
    const db = await sessionDatabase();
    const { error } = await db.auth.signOut();
    if (error) throw error;
    const response = NextResponse.json({ success: true });
    response.cookies.set('crm_agenda_session', '', { path: '/', httpOnly: true, maxAge: 0 });
    response.cookies.set('crm_agenda_oauth', '', { path: '/', httpOnly: true, maxAge: 0 });
    return response;
  } catch { return NextResponse.json({ error: 'Não foi possível sair. Tente novamente.' }, { status: 503 }); }
}
