import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { crmOrigin, publicSupabaseKey } from '@/lib/auth/config';
import { isPublicAsset } from '@/lib/server/public-assets';
import { crmPermission } from '@/lib/server/crm-permission';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const asset = path.startsWith('/_next/static/');
  const publicRoute = ['/login', '/api/auth/login', '/api/auth/github', '/api/auth/callback', '/robots.txt', '/sitemap.xml', '/api/whatsapp/webhook'].includes(path) || await isPublicAsset(path);
  let response = NextResponse.next({ request });
  if (!publicRoute) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key || !publicSupabaseKey(key)) throw new Error('Missing auth config');
      const db = createServerClient(url, key, {
        cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: values => {
            values.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      });
      const { data: { user }, error } = await db.auth.getUser();
      const authorized = user && !error ? await crmPermission(db, user) : false;
      if (!authorized) {
        const denied = path.startsWith('/api/') || asset
          ? NextResponse.json({ error: 'Acesso ao CRM não autorizado.' }, { status: 401 })
          : NextResponse.redirect(new URL('/login', crmOrigin()));
        response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie));
        response = denied;
      }
    } catch {
      response = path.startsWith('/api/') || asset
        ? NextResponse.json({ error: 'Autenticação indisponível.' }, { status: 503 })
        : NextResponse.redirect(new URL('/login', crmOrigin()));
    }
  }
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { runtime: 'nodejs', matcher: ['/((?!_next/image|favicon.ico|logo-[^/]+\\.png).*)'] };
