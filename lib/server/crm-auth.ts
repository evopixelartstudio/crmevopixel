import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { crmOrigin, publicSupabaseKey } from '@/lib/auth/config';
import { crmPermission } from '@/lib/server/crm-permission';

export async function sessionDatabase() {
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !publicSupabaseKey(key)) throw new Error('Configure credenciais públicas válidas do Supabase.');
  return createServerClient(url, key, {
    cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: { getAll: () => jar.getAll(), setAll: values => { try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server components refresh in middleware. */ } } },
  });
}

export async function crmIdentity() {
  const db = await sessionDatabase();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;
  if (!await crmPermission(db, user)) return null;
  return { user, db };
}

export async function requireCrmApi(request: Request, admin = false): Promise<NextResponse | null> {
  try {
    const identity = await crmIdentity();
    if (!identity) return NextResponse.json({ error: 'Autenticação e autorização do CRM necessárias.' }, { status: 401 });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('origin') !== crmOrigin()) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
    if (admin) {
      if (!await crmPermission(identity.db, identity.user, true)) return NextResponse.json({ error: 'Acesso de administrador necessário.' }, { status: 403 });
    }
    return null;
  } catch { return NextResponse.json({ error: 'Autenticação indisponível.' }, { status: 503 }); }
}
