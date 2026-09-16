import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      status: 'pending_configuration',
      message: 'Supabase ainda não configurado no .env.local. Insira sua URL e Anon Key.',
      urlConfigured: Boolean(url && !url.includes('seu-projeto')),
      keyConfigured: hasKey,
      serviceKeyConfigured: hasServiceKey,
      tablesRequired: [
        'users',
        'companies',
        'contacts',
        'services',
        'niches',
        'message_sequences',
        'message_sequence_steps',
        'leads',
        'pipeline_stages',
        'opportunities',
        'clients',
        'proposals',
        'contracts',
        'projects',
        'historical_projects',
        'tasks',
        'follow_ups',
        'financial_transactions',
        'conversations',
        'messages',
        'business_context',
        'commercial_goals',
        'prospects',
        'conversation_summaries',
        'ai_commands',
        'ai_action_logs',
        'ai_feedback',
      ],
      schemaFile: 'supabase/schema.sql',
    });
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({
      status: 'error',
      message: 'Não foi possível inicializar o cliente Supabase.',
    });
  }

  try {
    // Testar consulta em tabela existente
    const { data, error } = await supabase.from('leads').select('count').limit(1);

    if (error) {
      return NextResponse.json({
        status: 'connected_needs_tables',
        message: 'Conexão com Supabase bem-sucedida, mas as tabelas ainda precisam ser criadas.',
        error: error.message,
        schemaFile: 'supabase/schema.sql',
      });
    }

    return NextResponse.json({
      status: 'connected_active',
      message: 'Supabase conectado com sucesso e tabelas ativas!',
      data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({
      status: 'connection_error',
      message: `Erro ao conectar com o Supabase: ${errorMsg}`,
    });
  }
}
