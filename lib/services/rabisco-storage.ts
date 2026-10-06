import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { BoardCard, BoardConnection, BoardStroke } from '@/app/(dashboard)/mensagens/page';

export interface RabiscoBoard {
  cards: BoardCard[];
  connections: BoardConnection[];
  strokes: BoardStroke[];
}

export async function loadRabiscoBoard(): Promise<RabiscoBoard | null> {
  if (!isSupabaseConfigured()) throw new Error('Configure o Supabase para carregar o Rabisco.');
  const { data, error } = await getSupabase().from('rabisco_boards')
    .select('cards, connections, strokes').eq('id', 'principal').maybeSingle();
  if (error) throw new Error(`Erro ao carregar Rabisco: ${error.message}`);
  return data as RabiscoBoard | null;
}

export async function saveRabiscoBoard(board: RabiscoBoard): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Configure o Supabase para salvar o Rabisco.');
  const { data, error } = await getSupabase().from('rabisco_boards').upsert({
    id: 'principal', ...board, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select('id').single();
  if (error || !data) throw new Error(`Erro ao salvar Rabisco: ${error?.message || 'Gravação não confirmada'}`);
}
