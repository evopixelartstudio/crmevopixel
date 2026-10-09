import type { BoardCard, BoardConnection, BoardStroke } from '@/app/(dashboard)/mensagens/page';

export interface RabiscoBoard {
  cards: BoardCard[];
  connections: BoardConnection[];
  strokes: BoardStroke[];
}

export async function loadRabiscoBoard(accessKey: string): Promise<RabiscoBoard | null> {
  const response = await fetch('/api/rabisco', { headers: { Authorization: `Bearer ${accessKey}` }, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o Rabisco.');
  return data;
}

export async function saveRabiscoBoard(board: RabiscoBoard, accessKey: string): Promise<void> {
  const response = await fetch('/api/rabisco', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessKey}` }, body: JSON.stringify(board) });
  const data = await response.json();
  if (!response.ok || data.saved !== true) throw new Error(data.error || 'O Supabase não confirmou o salvamento.');
}
