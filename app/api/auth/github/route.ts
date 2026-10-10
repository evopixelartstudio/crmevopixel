import { NextResponse } from 'next/server';
import { sessionDatabase } from '@/lib/server/crm-auth';
import { crmOrigin } from '@/lib/auth/config';

export async function GET() {
  try {
    const db = await sessionDatabase();
    const { data, error } = await db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${crmOrigin()}/api/auth/callback`, skipBrowserRedirect: true } });
    if (error || !data.url) throw new Error('OAuth unavailable');
    return NextResponse.redirect(data.url);
  } catch { return NextResponse.redirect(new URL('/login?error=oauth', crmOrigin())); }
}
