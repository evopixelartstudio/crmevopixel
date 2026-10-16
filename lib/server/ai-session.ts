import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type AIProvider = 'gemini' | 'claude';
export const AI_COOKIES = { gemini: 'crm_ai_gemini', claude: 'crm_ai_claude' } as const;

function encryptionKey() {
  const secret = process.env.AI_SESSION_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 32) throw new Error('A proteção das chaves de IA está indisponível. Configure AI_SESSION_ENCRYPTION_KEY ou SUPABASE_SERVICE_ROLE_KEY no servidor.');
  return createHash('sha256').update('evocrm:ai-session:v1:').update(secret).digest();
}

export function sealAIKey(provider: AIProvider, apiKey: string, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`evocrm:${provider}:${userId}`));
  const payload = JSON.stringify({ apiKey, expires: Date.now() + 12 * 60 * 60 * 1000 });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function readAIKey(provider: AIProvider, value: string | undefined, userId: string): string | null {
  if (!value) return null;
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.length < 29 || bytes.length > 2048) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(`evocrm:${provider}:${userId}`));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    return typeof payload.apiKey === 'string' && payload.expires > Date.now() ? payload.apiKey : null;
  } catch { return null; }
}
