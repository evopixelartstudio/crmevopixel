import { getSupabase } from '@/lib/supabase/client';
import type { PipelineStage } from '@/types/database';

export async function ensurePipelineStages(stages: PipelineStage[]): Promise<PipelineStage[]> {
  const result = stages.map(stage => ({ ...stage }));
  const supabase = getSupabase();
  const first = result.find(stage => stage.slug === 'follow_up' || stage.slug === 'follow_up_1');
  const definitions = [
    { slug: 'qualificado', name: 'Qualificado', color: '#34D399' },
    { slug: first?.slug || 'follow_up', name: 'Follow-up 1', color: '#A78BFA' },
    { slug: 'follow_up_2', name: 'Follow-up 2', color: '#C084FC' },
    { slug: 'sem_resposta', name: 'Sem resposta', color: '#EAB308' },
  ];
  for (const definition of definitions) {
    const existing = result.find(stage => stage.slug === definition.slug);
    if (existing) {
      if (existing.name !== definition.name) {
        const { error } = await supabase.from('pipeline_stages').update({ name: definition.name }).eq('id', existing.id);
        if (error) throw new Error(`Não foi possível configurar ${definition.name}: ${error.message}`);
        existing.name = definition.name;
      }
    } else {
      const nextOrder = Math.max(0, ...result.map(stage => stage.display_order)) + 1;
      const { data, error } = await supabase.from('pipeline_stages').insert({
        ...definition, display_order: nextOrder,
      }).select('id, name, slug, display_order, color').single();
      if (error || !data) throw new Error(`Não foi possível criar ${definition.name}: ${error?.message || 'Gravação não confirmada'}`);
      result.push(data as PipelineStage);
    }
  }
  const required = definitions.map(definition => result.find(stage => stage.slug === definition.slug)!);
  const [qualified, followUpOne, followUpTwo, noResponse] = required;
  const ordered = result.filter(stage => !required.includes(stage)).sort((a, b) => a.display_order - b.display_order);
  const contactIndex = ordered.findIndex(stage => stage.slug === 'primeiro_contato');
  const initialProposalIndex = ordered.findIndex(stage => stage.slug === 'proposta');
  const salesIndex = contactIndex >= 0 ? contactIndex + 1 : initialProposalIndex >= 0 ? initialProposalIndex : 0;
  ordered.splice(salesIndex, 0, noResponse, qualified);
  const proposalIndex = ordered.findIndex(stage => stage.slug === 'proposta');
  ordered.splice(proposalIndex >= 0 ? proposalIndex + 1 : ordered.length, 0, followUpOne, followUpTwo);
  return ordered;
}
