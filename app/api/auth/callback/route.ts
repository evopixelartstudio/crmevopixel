import { NextResponse } from 'next/server';
import { sessionDatabase } from '@/lib/server/crm-auth';
import { crmOrigin } from '@/lib/auth/config';
import { crmPermission } from '@/lib/server/crm-permission';

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get('code');
    if (!code) throw new Error('Missing code');
    const db = await sessionDatabase();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) throw error;
    const { data: { user }, error: identityError } = await db.auth.getUser();
    if (!user || identityError || !await crmPermission(db, user)) { await db.auth.signOut(); throw new Error('Forbidden'); }
    return NextResponse.redirect(new URL('/', crmOrigin()));
  } catch { return NextResponse.redirect(new URL('/login?error=access', crmOrigin())); }
}
