import { createClient, SupabaseClient } from '@supabase/supabase-js';

let runtimeConfig: { url: string; key: string } | null = null;

function getInitialConfig() {
  if (runtimeConfig) return runtimeConfig;
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  // Configuração publicada é compartilhada por todos os dispositivos.
  if (envUrl && envKey && !envUrl.includes('placeholder') && !envUrl.includes('seu-projeto')) {
    return { url: envUrl, key: envKey };
  }

  return { url: envUrl, key: envKey };
}


export function isSupabaseConfigured(): boolean {
  const c = getInitialConfig();
  return Boolean(
    c.url &&
    c.key &&
    !c.url.includes('placeholder') &&
    !c.url.includes('seu-projeto')
  );
}

let activeClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const c = getInitialConfig();
  if (isSupabaseConfigured()) {
    if (!activeClient) {
      activeClient = createClient(c.url, c.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
        },
      });
    }
    return activeClient;
  }

  // Cliente inerte para evitar quebras se não configurado
  return createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: { persistSession: false },
  });
}

export function updateClientConfig(url: string, key: string) {
  runtimeConfig = { url, key };
  activeClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
    },
  });
}

// Export compatível com código existente
export const supabase = getSupabase();
