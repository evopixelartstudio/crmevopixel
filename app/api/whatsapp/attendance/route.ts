import { NextResponse } from 'next/server';
import { requireCrmApi } from '@/lib/server/crm-auth';
import { cloudDatabase } from '@/lib/server/crm-access';
import { AttendanceConflict, changeWhatsAppAttendance, getWhatsAppAttendance } from '@/lib/server/whatsapp-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (typeof body.phone !== 'string' || !/^\d{10,15}$/.test(body.phone) || !['get', 'update'].includes(body.action)) {
      return NextResponse.json({ error: 'Selecione uma conversa válida.' }, { status: 400 });
    }
    if (body.action === 'update' && (!['human', 'ai'].includes(body.owner) || typeof body.version !== 'string' || !/^[a-f0-9]{64}$/.test(body.version))) {
      return NextResponse.json({ error: 'Atualize o atendimento antes de alterar o responsável.' }, { status: 400 });
    }
    const db = cloudDatabase();
    const state = body.action === 'get'
      ? await getWhatsAppAttendance(db, body.phone)
      : await changeWhatsAppAttendance(db, body.phone, body.owner, body.version);
    return NextResponse.json({ state }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AttendanceConflict) {
      return NextResponse.json({ error: error.message, state: error.state }, { status: 409 });
    }
    return NextResponse.json({ error: 'Não foi possível sincronizar o atendimento. Tente novamente.' }, { status: 503 });
  }
}
