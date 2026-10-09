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
  if (!['Message', 'SendMessage', 'MESSAGE', 'SEND_MESSAGE'].includes(event?.event)) return null;
  const data = event.data;
  const info = data?.Info ?? data?.info;
  const payload = data?.Message ?? data?.message;
  if (!info || !payload || typeof info.ID !== 'string') return null;
  const isFromMe = info.IsFromMe === true;
  const chat = info.Chat;
  if (typeof chat !== 'string' || /@(g\.us|broadcast)$/.test(chat)) return null;
  // Never treat LIDs, groups or broadcast identifiers as customer phone numbers.
  const jid = typeof chat === 'string' && chat.endsWith('@s.whatsapp.net') ? chat
    : !isFromMe && typeof info.SenderAlt === 'string' && info.SenderAlt.endsWith('@s.whatsapp.net') ? info.SenderAlt : '';
  const phone = jid.split('@')[0].split(':')[0];
  if (!/^\d{10,15}$/.test(phone)) return null;
  const normalized = payload.ephemeralMessage?.message ?? payload;
  const text = normalized.conversation ?? normalized.extendedTextMessage?.text ?? normalized.imageMessage?.caption ?? normalized.videoMessage?.caption
    ?? (normalized.audioMessage ? '[Áudio]' : normalized.imageMessage ? '[Imagem]' : normalized.documentMessage ? '[Documento]' : normalized.videoMessage ? '[Vídeo]' : '[Mensagem não suportada]');
  const time = typeof info.Timestamp === 'number' ? info.Timestamp : Date.parse(info.Timestamp) / 1000;
  if (!Number.isFinite(time) || typeof text !== 'string') return null;
  return { id: info.ID, phone, fromMe: isFromMe, text, timestamp: time, status: 'received' };
}
