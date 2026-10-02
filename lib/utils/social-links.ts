/**
 * Utilitários para abertura rápida de Instagram e Google Maps (Google Meu Negócio)
 */

export function formatInstagramUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/instagram\.com\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }

  const handle = trimmed.replace(/^@+/, '').replace(/\/+$/, '').trim();
  if (!handle) return null;
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}

export function openInstagramProfile(
  rawInstagram?: string | null,
  companyName?: string,
  onMissing?: () => void
): void {
  const url = formatInstagramUrl(rawInstagram);
  if (!url) {
    if (onMissing) {
      onMissing();
    } else {
      alert(
        `O perfil do Instagram de "${companyName || 'este contato'}" ainda não foi cadastrado.`
      );
    }
    return;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function formatGoogleMapsUrl(
  rawGoogleBusiness?: string | null,
  fallbackCompanyName?: string | null,
  fallbackCity?: string | null
): string | null {
  const raw = (rawGoogleBusiness || '').trim();

  if (raw) {
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    if (/^(www\.)?(google\.com\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(raw)) {
      return `https://${raw}`;
    }
    const query = fallbackCity && !raw.toLowerCase().includes(fallbackCity.toLowerCase())
      ? `${raw} ${fallbackCity}`
      : raw;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const comp = (fallbackCompanyName || '').trim();
  if (comp) {
    const query = fallbackCity ? `${comp} ${fallbackCity}` : comp;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return null;
}

export function openGoogleMapsProfile(
  rawGoogleBusiness?: string | null,
  companyName?: string | null,
  city?: string | null,
  onMissing?: () => void
): void {
  const url = formatGoogleMapsUrl(rawGoogleBusiness, companyName, city);
  if (!url) {
    if (onMissing) {
      onMissing();
    } else {
      alert(
        `O link do Google Meu Negócio / Maps de "${companyName || 'este contato'}" não foi informado.`
      );
    }
    return;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
