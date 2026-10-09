import { NextResponse } from 'next/server';
import { cloudDatabase, secretsMatch } from '@/lib/server/crm-access';
import { parseGoMessage } from '@/lib/services/evolution-go';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 1048576) return NextResponse.json({ error: 'Evento muito grande.' }, { status: 413 });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1048576) return NextResponse.json({ error: 'Evento muito grande.' }, { status: 413 });
    const event = JSON.parse(raw);
    if (!secretsMatch(typeof event.instanceToken === 'string' ? event.instanceToken : '', process.env.EVOLUTION_API_KEY)) return NextResponse.json({ error: 'Evento não autorizado.' }, { status: 401 });
    const message = parseGoMessage(event);
    if (!message) return NextResponse.json({ received: true, stored: false });
    const { error } = await cloudDatabase().from('whatsapp_messages').upsert({
      instance: process.env.EVOLUTION_INSTANCE || 'evocrm', message_id: message.id, phone: message.phone,
      from_me: message.fromMe, body: message.text, sent_at: new Date(message.timestamp * 1000).toISOString(), status: message.fromMe ? 'sent' : 'received',
    }, { onConflict: 'instance,message_id' });
    if (error) return NextResponse.json({ error: 'Não foi possível persistir o evento no Supabase.' }, { status: 503 });
    return NextResponse.json({ received: true, stored: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Evento inválido.' : 'Falha ao receber evento.' }, { status: error instanceof SyntaxError ? 400 : 503 });
  }
}
