import { requireCrmApi } from '@/lib/server/crm-auth';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { agendaOrigin, calendarConfig, cookieOptions, GOOGLE_SCOPES, OAUTH_COOKIE, pkceChallenge, seal } from '@/lib/server/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const denied = await requireCrmApi(_request);
  if (denied) return denied;
  try {
    const config = calendarConfig();
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: GOOGLE_SCOPES.join(' '), access_type: 'offline', prompt: 'consent', state, code_challenge: pkceChallenge(verifier), code_challenge_method: 'S256' }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_COOKIE, seal({ state, verifier, expires: Date.now() + 600000 }, 'oauth'), { ...cookieOptions(), maxAge: 600 });
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  } catch {
    return NextResponse.redirect(new URL('/agenda?google=config', agendaOrigin()));
  }
}
