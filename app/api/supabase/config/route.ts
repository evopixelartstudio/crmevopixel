import { requireCrmApi } from '@/lib/server/crm-auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { publicSupabaseKey } from '@/lib/auth/config';

export async function GET(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const isConfigured = Boolean(url && anonKey && !url.includes('placeholder') && !url.includes('seu-projeto'));

  let connected = false;
  let connectionMessage = '';

  if (isConfigured) {
    try {
      // Teste de ping na API REST do Supabase
      const testRes = await fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: AbortSignal.timeout(4000),
      });

      if (testRes.ok || testRes.status === 200 || testRes.status === 404) {
        connected = true;
        connectionMessage = 'Conexão ativa com o Supabase';
      } else {
        connectionMessage = `Supabase retornou status HTTP ${testRes.status}`;
      }
    } catch (err: any) {
      connectionMessage = `Falha ao alcançar o servidor do Supabase: ${err?.message || 'Timeout'}`;
    }
  } else {
    connectionMessage = 'Supabase não configurado';
  }

  return NextResponse.json({
    isConfigured,
    connected,
    url: isConfigured ? url : '',
    hasAnonKey: Boolean(anonKey),
    message: connectionMessage,
  });
}

export async function POST(request: Request) {
  const denied = await requireCrmApi(request, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    let { url, anonKey, serviceRoleKey } = body;

    url = (url || '').trim().replace(/\/+$/, '');
    anonKey = (anonKey || '').trim();
    serviceRoleKey = (serviceRoleKey || '').trim();

    // Evita SSRF, injeção de linhas no .env e chaves privadas em variáveis públicas.
    let projectUrl: URL;
    try { projectUrl = new URL(url); } catch { return NextResponse.json({ error: 'URL inválida.' }, { status: 400 }); }
    if (projectUrl.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(projectUrl.hostname) || projectUrl.port || projectUrl.username || projectUrl.password || projectUrl.pathname !== '/' || projectUrl.search || projectUrl.hash || /[\r\n\s#]/.test(anonKey + serviceRoleKey) || !publicSupabaseKey(anonKey)) {
      return NextResponse.json({ error: 'Use a URL HTTPS do projeto Supabase e sua chave pública anon/publishable. Segredos são exclusivos do servidor.' }, { status: 400 });
    }

    if (!url || !anonKey) {
      return NextResponse.json(
        { success: false, error: 'A URL do projeto e a Chave Anon são obrigatórias.' },
        { status: 400 }
      );
    }

    if (!url.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'A URL do Supabase deve iniciar com https:// (ex: https://xyz.supabase.co)' },
        { status: 400 }
      );
    }

    // 1. Testar conexão antes de gravar
    try {
      const testRes = await fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!testRes.ok && testRes.status !== 200 && testRes.status !== 404) {
        return NextResponse.json(
          {
            success: false,
            error: `Erro ao conectar ao Supabase (Status HTTP ${testRes.status}). Verifique se a URL e a Anon Key estão corretas.`,
          },
          { status: 400 }
        );
      }
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Não foi possível conectar ao Supabase em ${url}. Verifique sua conexão com a internet e a URL digitada.`,
        },
        { status: 400 }
      );
    }

    // 2. Gravar no arquivo .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Atualizar ou adicionar chaves
    const updateEnvVar = (content: string, key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        return content.replace(regex, () => `${key}=${value}`);
      } else {
        return content ? `${content.trim()}\n${key}=${value}\n` : `${key}=${value}\n`;
      }
    };

    envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_SUPABASE_URL', url);
    envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey);
    if (serviceRoleKey) {
      envContent = updateEnvVar(envContent, 'SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    // 3. Atualizar variáveis em memória do processo atual
    process.env['NEXT_PUBLIC_' + 'SUPABASE_URL'] = url;
    process.env['NEXT_PUBLIC_' + 'SUPABASE_ANON_KEY'] = anonKey;
    if (serviceRoleKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão com o Supabase configurada e salva com sucesso!',
      url,
      connected: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro inesperado ao salvar configuração.' },
      { status: 500 }
    );
  }
}

