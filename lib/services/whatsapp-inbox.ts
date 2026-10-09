export interface InboxMessage {
  phone: string;
  from_me: boolean;
  body: string;
  sent_at: string;
  status: string;
}

export interface WhatsAppConversation {
  phone: string;
  preview: string;
  timestamp: number;
  fromMe: boolean;
  unread: number;
}

export function summarizeInbox(rows: InboxMessage[]): WhatsAppConversation[] {
  const conversations = new Map<string, WhatsAppConversation>();
  for (const row of rows) {
    const timestamp = Date.parse(row.sent_at) / 1000;
    if (!/^\d{10,15}$/.test(row.phone) || !Number.isFinite(timestamp)) continue;
    let conversation = conversations.get(row.phone);
    if (!conversation) {
      conversation = { phone: row.phone, preview: row.body, timestamp, fromMe: row.from_me, unread: 0 };
      conversations.set(row.phone, conversation);
    } else if (timestamp > conversation.timestamp) {
      conversation.preview = row.body;
      conversation.timestamp = timestamp;
      conversation.fromMe = row.from_me;
    }
    if (!row.from_me && row.status === 'received') conversation.unread++;
  }
  return [...conversations.values()].sort((a, b) => b.timestamp - a.timestamp || a.phone.localeCompare(b.phone));
}
