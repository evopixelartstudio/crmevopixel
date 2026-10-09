import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { formatWhatsAppNumber } from '@/lib/utils/whatsapp';
import { normalizeWhatsAppMessages } from '@/lib/services/whatsapp-messages';
import { cloudDatabase } from '@/lib/server/crm-access';
import { normalizeGoStatus, normalizeGoQr } from '@/lib/services/evolution-go';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function evolution(path: string, body?: unknown) {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  if (!url || !key || !process.env.EVOLUTION_INSTANCE) throw new Error('Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE no servidor.');
  const response = await fetch(`${url.replace(/\/$/, '')}/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`O serviço WhatsApp retornou ${response.status}. Verifique a instância e a conexão no servidor.`);
  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const instance = encodeURIComponent(process.env.EVOLUTION_INSTANCE ?? '');
    const go = process.env.EVOLUTION_PROVIDER === 'go';
    let result: unknown;
    switch (body.action) {
      case 'status': result = go ? normalizeGoStatus(await evolution('instance/status')) : await evolution(`instance/connectionState/${instance}`); break;
      case 'connect': {
        if (!go) { result = await evolution(`instance/connect/${instance}`); break; }
        const hook = process.env.EVOLUTION_WEBHOOK_URL;
        if (!hook) throw new Error('Configure EVOLUTION_WEBHOOK_URL para receber mensagens no Supabase.');
        await evolution('instance/connect', { webhookUrl: hook, subscribe: ['MESSAGE', 'SEND_MESSAGE', 'CONNECTION'] });
        if (normalizeGoStatus(await evolution('instance/status')).instance.state === 'open') {
          result = { instance: { state: 'open' } }; break;
        }
        result = normalizeGoQr(await evolution('instance/qr')); break;
      }
      case 'messages':
      case 'send': {
        if (typeof body.phone !== 'string') return NextResponse.json({ error: 'Informe um telefone válido.' }, { status: 400 });
        const number = formatWhatsAppNumber(body.phone);
        if (!/^\d{10,15}$/.test(number)) return NextResponse.json({ error: 'Telefone inválido. Inclua DDD e número.' }, { status: 400 });
        if (body.action === 'messages') {
          if (go) {
            const { data, error } = await cloudDatabase().from('whatsapp_messages').select('message_id, from_me, body, sent_at, status').eq('instance', process.env.EVOLUTION_INSTANCE!).eq('phone', number).order('sent_at', { ascending: false }).limit(100);
            if (error) throw new Error('Não foi possível consultar o histórico. Execute 20261009_crm_cloud_only.sql e verifique o Supabase.');
            result = (data ?? []).reverse().map(m => ({ id: m.message_id, fromMe: m.from_me, text: m.body, timestamp: Date.parse(m.sent_at) / 1000, status: m.status }));
          } else result = normalizeWhatsAppMessages(await evolution(`chat/findMessages/${instance}`, { where: { key: { remoteJid: `${number}@s.whatsapp.net` } }, page: 1, offset: 100 }));
        } else {
          if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 4096) return NextResponse.json({ error: 'Escreva uma mensagem de até 4096 caracteres.' }, { status: 400 });
          if (go) {
            const db = cloudDatabase(), id = randomUUID(), sentAt = new Date().toISOString();
            const { error } = await db.from('whatsapp_messages').insert({ instance: process.env.EVOLUTION_INSTANCE, message_id: id, phone: number, from_me: true, body: body.text.trim(), sent_at: sentAt, status: 'pending' });
            if (error) throw new Error('O Supabase não está pronto para salvar mensagens. Execute 20261009_crm_cloud_only.sql antes de enviar.');
            let sent;
            try { sent = await evolution('send/text', { number, text: body.text.trim(), id, formatJid: true }); }
            catch (sendError) {
              await db.from('whatsapp_messages').update({ status: 'unconfirmed' }).eq('instance', process.env.EVOLUTION_INSTANCE!).eq('message_id', id);
              throw new Error('Envio não confirmado. Confira o WhatsApp antes de tentar novamente para evitar mensagem duplicada.');
            }
            const info = sent?.data?.Info ?? sent?.data?.info ?? {};
            const { error: saveError } = await db.from('whatsapp_messages').update({ status: 'sent' }).eq('instance', process.env.EVOLUTION_INSTANCE!).eq('message_id', id);
            result = { key: { id, fromMe: true }, messageTimestamp: Date.parse(sentAt) / 1000, status: saveError ? 'unconfirmed' : 'sent', providerId: info.ID };
          } else result = await evolution(`message/sendText/${instance}`, { number, text: body.text.trim() });
        }
        break;
      }
      default: return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Requisição inválida.' : error instanceof Error ? error.message : 'Não foi possível acessar o WhatsApp.' }, { status: 502 });
  }
}
