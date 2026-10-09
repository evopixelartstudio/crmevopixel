import { NextResponse } from 'next/server';
import { cloudDatabase } from '@/lib/server/crm-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await cloudDatabase().from('rabisco_boards').select('cards, connections, strokes').eq('id', 'principal').maybeSingle();
    if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01' ? 'Execute supabase/migrations/20261009_crm_cloud_only.sql no SQL Editor do Supabase.' : 'Não foi possível carregar o Rabisco do Supabase.');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao carregar Rabisco.' }, { status: 503 }); }
}

export async function PUT(request: Request) {
  try {
    const board = await request.json();
    if (!board || ![board.cards, board.connections, board.strokes].every(Array.isArray)) return NextResponse.json({ error: 'Quadro inválido.' }, { status: 400 });
    const { data, error } = await cloudDatabase().from('rabisco_boards').upsert({ id: 'principal', cards: board.cards, connections: board.connections, strokes: board.strokes, updated_at: new Date().toISOString() }, { onConflict: 'id' }).select('id').single();
    if (error || !data) throw new Error('Não foi possível salvar no Supabase. Verifique a configuração e execute 20261009_crm_cloud_only.sql.');
    return NextResponse.json({ saved: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao salvar Rabisco.' }, { status: 503 }); }
}
