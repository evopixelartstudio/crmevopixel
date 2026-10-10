import { requireCrmApi } from '@/lib/server/crm-auth';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { cloudDatabase, secretsMatch } from '@/lib/server/crm-access';
import { AGENDA_COOKIE, agendaOrigin, CalendarError, calendarConfig, cookieOptions, googleToken, OAUTH_COOKIE, seal, unseal } from '@/lib/server/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  let response: NextResponse;
  let failure = 'config';
  try {
    const config = calendarConfig();
    failure = 'session';
    const oauth = unseal<{ state: string; verifier: string; expires: number }>(request.cookies.get(OAUTH_COOKIE)?.value || '', 'oauth');
    if (oauth.expires < Date.now() || !secretsMatch(request.nextUrl.searchParams.get('state') || '', oauth.state)) throw new Error('Invalid OAuth state');
    failure = 'denied';
    if (request.nextUrl.searchParams.has('error')) throw new Error('Denied');
    const code = request.nextUrl.searchParams.get('code');
    if (!code) throw new Error('Missing code');
    failure = 'token';
    const token = await googleToken({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: oauth.verifier });
    failure = 'permissions';
    const granted = new Set((token.scope || '').split(' '));
    if (!granted.has('https://www.googleapis.com/auth/calendar.events') || !granted.has('https://www.googleapis.com/auth/calendar.calendarlist.readonly') || !token.refresh_token) throw new Error('Missing permission');
    failure = 'identity';
    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!userResponse.ok) throw new Error('Identity failure');
    const user = await userResponse.json();
    if (!user.sub || !user.email || user.email_verified !== true) throw new Error('Invalid identity');
    const id = randomUUID();
    failure = 'database';
    const { error } = await cloudDatabase().from('google_calendar_connections').insert({
      id, google_subject: user.sub, email: user.email,
      credentials: seal({ accessToken: token.access_token, refreshToken: token.refresh_token, expires: Date.now() + token.expires_in * 1000 }, 'credentials'),
    });
    if (error) throw new Error('Database failure');
    response = NextResponse.redirect(new URL('/agenda?google=connected', config.origin));
    // Session cookie only: no events or Google tokens in browser storage.
    response.cookies.set(AGENDA_COOKIE, seal({ id, expires: Date.now() + 7 * 86400000 }, 'session'), cookieOptions());
  } catch (error) {
    if (error instanceof CalendarError && error.code === 'OAUTH_CLIENT') failure = 'client';
    response = NextResponse.redirect(new URL(`/agenda?google=${failure}`, agendaOrigin()));
  }
  response.cookies.set(OAUTH_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
