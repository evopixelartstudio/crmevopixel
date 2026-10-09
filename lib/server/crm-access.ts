import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export function secretsMatch(actual: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hasCrmAccess(request: Request): boolean {
  return secretsMatch(request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '', process.env.CRM_ACCESS_TOKEN || process.env.CRM_WHATSAPP_ACCESS_TOKEN);
}

export function cloudDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
