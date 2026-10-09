import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { BoardCard, BoardConnection, BoardStroke } from '@/app/(dashboard)/mensagens/page';

export interface RabiscoBoard {
  cards: BoardCard[];
  connections: BoardConnection[];
  strokes: BoardStroke[];
}

function rabiscoStorageError(action: 'carregar' | 'salvar', error: { code?: string; message: string }): Error {
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return new Error('O banco precisa da atualização do Rabisco. Execute supabase/migrations/20261006_create_rabisco_boards.sql no SQL Editor do projeto Supabase conectado ao CRM e clique em Tentar novamente.');
  }
  return new Error(`Erro ao ${action} Rabisco: ${error.message}`);
}

export async function loadRabiscoBoard(): Promise<RabiscoBoard | null> {
  if (!isSupabaseConfigured()) throw new Error('Configure o Supabase para carregar o Rabisco.');
  const { data, error } = await getSupabase().from('rabisco_boards')
    .select('cards, connections, strokes').eq('id', 'principal').maybeSingle();
  if (error) throw rabiscoStorageError('carregar', error);
  return data as RabiscoBoard | null;
}

export async function saveRabiscoBoard(board: RabiscoBoard): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Configure o Supabase para salvar o Rabisco.');
  const { data, error } = await getSupabase().from('rabisco_boards').upsert({
    id: 'principal', ...board, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select('id').single();
  if (error) throw rabiscoStorageError('salvar', error);
  if (!data) throw new Error('Erro ao salvar Rabisco: Gravação não confirmada');
}
