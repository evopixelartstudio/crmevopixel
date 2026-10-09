/**
 * Utilitários para integração e abertura de conversas no WhatsApp
 */

export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const value = String(phone).trim();
  if (/^(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(value)) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      const number = url.hostname.replace(/^www\./, '') === 'wa.me'
        ? url.pathname.slice(1).split('/')[0]
        : url.searchParams.get('phone') || '';
      return number.replace(/\D/g, '');
    } catch { return ''; }
  }
  return value.replace(/\D/g, '');
}

export function formatWhatsAppNumber(phone?: string): string {
  const clean = cleanPhoneNumber(phone);
  if (!clean) return '';
  
  // Se tem 10 dígitos (DDD + 8 dígitos) ou 11 dígitos (DDD + 9 dígitos), adiciona DDI 55 do Brasil
  if (clean.length === 10 || clean.length === 11) {
    return `55${clean}`;
  }
  
  // Se já começa com 55 e tem 12 ou 13 dígitos
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    return clean;
  }

  return clean;
}

export function getWhatsAppUrl(phone?: string, text?: string): string {
  const formatted = formatWhatsAppNumber(phone);
  if (!formatted) return '';

  const baseUrl = `https://wa.me/${formatted}`;
  if (text && text.trim()) {
    return `${baseUrl}?text=${encodeURIComponent(text.trim())}`;
  }
  return baseUrl;
}

// WhatsApp may identify Brazilian mobiles without the ninth digit.
// Only mobile prefixes qualify; landlines and foreign numbers stay distinct.
export function whatsAppPhoneKey(phone: string): string {
  const number = formatWhatsAppNumber(phone);
  return /^55\d{2}9[6-9]\d{7}$/.test(number) ? number.slice(0, 4) + number.slice(5) : number;
}

export function whatsAppPhoneAliases(phone: string): string[] {
  const key = whatsAppPhoneKey(phone);
  return /^55\d{2}[6-9]\d{7}$/.test(key) ? [key, key.slice(0, 4) + '9' + key.slice(4)] : [key];
}

export function openWhatsApp(phone?: string, text?: string): boolean {
  const url = getWhatsAppUrl(phone, text);
  if (!url) {
    return false;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

