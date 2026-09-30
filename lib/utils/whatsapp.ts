/**
 * Utilitários para integração e abertura de conversas no WhatsApp
 */

export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
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

export function openWhatsApp(phone?: string, text?: string): boolean {
  const url = getWhatsAppUrl(phone, text);
  if (!url) {
    return false;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

