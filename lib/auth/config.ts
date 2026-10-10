export function crmOrigin() {
  const origin = new URL(process.env.CRM_ORIGIN || 'https://crmevopixel.cloud');
  if (origin.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && origin.hostname === 'localhost')) throw new Error('CRM_ORIGIN inválida.');
  return origin.origin;
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value) || value.startsWith('/api/') || value.startsWith('/login')) return '/';
  return value;
}

export function publicSupabaseKey(key: string): boolean {
  if (key.startsWith('sb_publishable_')) return true;
  try { return JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; } catch { return false; }
}
