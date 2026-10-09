import type { WhatsAppMessage } from '@/lib/services/whatsapp-messages';

export function normalizeGoStatus(response: any) {
  const data = response?.data ?? response;
  const connected = data?.connected ?? data?.Connected;
  const loggedIn = data?.loggedIn ?? data?.LoggedIn;
  return { provider: 'go', instance: { state: connected === true && loggedIn === true ? 'open' : 'close' } };
}

export function normalizeGoQr(response: any) {
  const data = response?.data ?? response;
  return { base64: data?.code ?? data?.base64 ?? '' };
}

export interface GoStoredMessage extends WhatsAppMessage { phone: string }

export function parseGoMessage(event: any): GoStoredMessage | null {
  if (!['message', 'sendmessage', 'send_message'].includes(String(event?.event).toLowerCase())) return null;
  const data = event.data;
  const info = data?.Info ?? data?.info ?? (data?.key ? { ID: data.key.id, Chat: data.key.remoteJid, IsFromMe: data.key.fromMe, Timestamp: data.messageTimestamp } : null);
  const payload = data?.Message ?? data?.message;
  if (!info || !payload || typeof info.ID !== 'string') return null;
  const isFromMe = info.IsFromMe === true || String(event.event).toLowerCase().replace('_', '') === 'sendmessage' || !!payload.deviceSentMessage;
  const chat = info.Chat;
  if (typeof chat !== 'string' || !/@(s\.whatsapp\.net|lid)$/.test(chat)) return null;
  // Never treat LIDs, groups or broadcast identifiers as customer phone numbers.
  const candidates = [chat, info.ChatAlt, isFromMe ? info.RecipientAlt : info.SenderAlt, isFromMe ? payload.deviceSentMessage?.destinationJid : info.Sender];
  const jid = candidates.find(value => typeof value === 'string' && value.endsWith('@s.whatsapp.net')) ?? '';
  const phone = jid.split('@')[0].split(':')[0];
  if (!/^\d{10,15}$/.test(phone)) return null;
  let normalized = payload;
  for (let depth = 0; depth < 5; depth++) {
    const inner = normalized.deviceSentMessage?.message ?? normalized.ephemeralMessage?.message ?? normalized.viewOnceMessage?.message ?? normalized.viewOnceMessageV2?.message;
    if (!inner) break;
    normalized = inner;
  }
  const text = normalized.conversation ?? normalized.extendedTextMessage?.text ?? normalized.imageMessage?.caption ?? normalized.videoMessage?.caption
    ?? (normalized.audioMessage ? '[Áudio]' : normalized.imageMessage ? '[Imagem]' : normalized.documentMessage ? '[Documento]' : normalized.videoMessage ? '[Vídeo]' : '[Mensagem não suportada]');
  const time = typeof info.Timestamp === 'number' || /^\d+(\.\d+)?$/.test(String(info.Timestamp)) ? Number(info.Timestamp) : Date.parse(info.Timestamp) / 1000;
  if (!Number.isFinite(time) || typeof text !== 'string') return null;
  return { id: info.ID, phone, fromMe: isFromMe, text, timestamp: time, status: 'received' };
}
