import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { cloudDatabase } from './crm-access';

export const AGENDA_COOKIE = 'crm_agenda_session';
export const OAUTH_COOKIE = 'crm_agenda_oauth';
export const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'];

export class CalendarError extends Error {
  constructor(message: string, public status = 503, public code = 'CALENDAR_ERROR') { super(message); }
}

export function calendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new CalendarError('Configure a conexão com o Google Agenda no servidor.', 503, 'CONFIG_MISSING');
  const url = new URL(redirectUri);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new CalendarError('A conexão com o Google exige HTTPS.');
  encryptionKey();
  return { clientId, clientSecret, redirectUri, origin: url.origin };
}

function encryptionKey() {
  const encoded = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY || '';
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new CalendarError('Configure a chave de criptografia da Agenda no servidor.', 503, 'CONFIG_MISSING');
  return key;
}

export function seal(value: unknown, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function unseal<T>(value: string, purpose: string): T {
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length < 29) throw new Error('Invalid encrypted value');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
}

export function pkceChallenge(verifier: string) { return createHash('sha256').update(verifier).digest('base64url'); }

export function sessionId(request: NextRequest): string | null {
  try {
    const session = unseal<{ id: string; expires: number }>(request.cookies.get(AGENDA_COOKIE)?.value || '', 'session');
    return /^[0-9a-f-]{36}$/i.test(session.id) && session.expires > Date.now() ? session.id : null;
  } catch { return null; }
}

export function cookieOptions() {
  return { httpOnly: true, secure: calendarConfig().origin.startsWith('https:'), sameSite: 'lax' as const, path: '/' };
}

export async function googleToken(parameters: Record<string, string>) {
  const config = calendarConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...parameters }),
    cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new CalendarError('Autorize sua conta Google novamente para continuar.', 401, 'RECONNECT');
  const token = await response.json();
  if (typeof token.access_token !== 'string') throw new CalendarError('O Google não confirmou a autorização.');
  return token as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
}

export async function connection(request: NextRequest) {
  const id = sessionId(request);
  if (!id) throw new CalendarError('Conecte sua conta Google para abrir a agenda.', 401, 'RECONNECT');
  const db = cloudDatabase();
  const { data, error } = await db.from('google_calendar_connections').select('*').eq('id', id).maybeSingle();
  if (error) throw new CalendarError('Não foi possível carregar a conexão. Execute o SQL da Agenda no Supabase.');
  if (!data) throw new CalendarError('Conecte sua conta Google novamente.', 401, 'RECONNECT');
  return { db, data };
}

export async function googleCalendar(request: NextRequest) {
  const { db, data } = await connection(request);
  let credentials = unseal<{ accessToken: string; refreshToken: string; expires: number }>(data.credentials, 'credentials');
  if (credentials.expires < Date.now() + 60000) {
    const token = await googleToken({ grant_type: 'refresh_token', refresh_token: credentials.refreshToken });
    credentials = { accessToken: token.access_token, refreshToken: token.refresh_token || credentials.refreshToken, expires: Date.now() + token.expires_in * 1000 };
    const { error } = await db.from('google_calendar_connections').update({ credentials: seal(credentials, 'credentials'), updated_at: new Date().toISOString() }).eq('id', data.id);
    if (error) throw new CalendarError('Não foi possível atualizar a conexão no Supabase.');
  }
  return async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
      ...init, headers: { Authorization: `Bearer ${credentials.accessToken}`, 'Content-Type': 'application/json', ...init.headers },
      cache: 'no-store', signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      if (response.status === 401) throw new CalendarError('Autorize sua conta Google novamente.', 401, 'RECONNECT');
      if (response.status === 412) throw new CalendarError('Esta reunião mudou no Google. Atualize a agenda antes de editar.', 409, 'CONFLICT');
      if (response.status === 409) throw new CalendarError('Essa reunião já foi criada.', 409, 'DUPLICATE');
      if (response.status === 403) throw new CalendarError('Sua conta não tem permissão para essa ação nesta agenda.', 403);
      throw new CalendarError('O Google não confirmou a operação. Atualize a agenda antes de tentar novamente.', 502);
    }
    return response.json();
  };
}
