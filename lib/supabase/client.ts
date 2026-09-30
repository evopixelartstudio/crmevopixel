import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getInitialConfig() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('evocrm_supabase_url');
    const localKey = localStorage.getItem('evocrm_supabase_anon_key');
    if (localUrl && localKey && !localUrl.includes('placeholder')) {
      return { url: localUrl, key: localKey };
    }
  }

  return { url: envUrl, key: envKey };
}

const config = getInitialConfig();

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
          persistSession: true,
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
  if (typeof window !== 'undefined') {
    localStorage.setItem('evocrm_supabase_url', url);
    localStorage.setItem('evocrm_supabase_anon_key', key);
  }
  activeClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Export compatível com código existente
export const supabase = getSupabase();
