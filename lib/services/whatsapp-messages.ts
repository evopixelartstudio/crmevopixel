export interface WhatsAppMessage {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;
  status: string;
}

// Evolution v2 can return a paginated envelope or a flat list.
export function normalizeWhatsAppMessages(data: any): WhatsAppMessage[] {
  const records = Array.isArray(data) ? data : data?.messages?.records ?? data?.messages ?? data?.records ?? [];
  if (!Array.isArray(records)) return [];
  const unique = new Map<string, WhatsAppMessage>();
  for (const record of records) {
    const payload = record.message?.ephemeralMessage?.message ?? record.message ?? {};
    const text = payload.conversation ?? payload.extendedTextMessage?.text ?? payload.imageMessage?.caption ?? payload.videoMessage?.caption;
    const id = record.key?.id ?? record.id;
    if (!id) continue;
    unique.set(String(id), {
      id: String(id), fromMe: Boolean(record.key?.fromMe),
      text: text || (payload.audioMessage ? '[Áudio]' : payload.imageMessage ? '[Imagem]' : payload.videoMessage ? '[Vídeo]' : payload.documentMessage ? '[Documento]' : '[Mensagem não suportada]'),
      timestamp: Number(record.messageTimestamp) || 0, status: String(record.status ?? ''),
    });
  }
  return [...unique.values()].sort((a, b) => a.timestamp - b.timestamp);
}
