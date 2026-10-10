import { NextResponse } from 'next/server';
import { sessionDatabase } from '@/lib/server/crm-auth';
import { crmOrigin } from '@/lib/auth/config';
import { crmPermission } from '@/lib/server/crm-permission';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== crmOrigin()) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 1024) return NextResponse.json({ error: 'Revise o e-mail e a senha.' }, { status: 400 });
    const db = await sessionDatabase();
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: 'Não foi possível entrar. Revise suas credenciais e tente novamente.' }, { status: 401 });
    const { data: { user }, error: identityError } = await db.auth.getUser();
    if (identityError || !user || !await crmPermission(db, user)) {
      await db.auth.signOut();
      return NextResponse.json({ error: 'Solicite ao administrador autorização para acessar o CRM.' }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Não foi possível entrar. Tente novamente.' }, { status: 503 }); }
}
