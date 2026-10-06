import { getSupabase } from '@/lib/supabase/client';
import type { PipelineStage } from '@/types/database';

export async function ensureFollowUpStages(stages: PipelineStage[]): Promise<PipelineStage[]> {
  const result = [...stages];
  const supabase = getSupabase();
  const first = result.find(stage => stage.slug === 'follow_up' || stage.slug === 'follow_up_1');
  const definitions = [
    { slug: first?.slug || 'follow_up', name: 'Follow-up 1', color: '#A78BFA' },
    { slug: 'follow_up_2', name: 'Follow-up 2', color: '#C084FC' },
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
      const proposalOrder = result.find(stage => stage.slug === 'proposta')?.display_order || 0;
      const { data, error } = await supabase.from('pipeline_stages').insert({
        ...definition, display_order: proposalOrder + (definition.slug === 'follow_up_2' ? 2 : 1),
      }).select('id, name, slug, display_order, color').single();
      if (error || !data) throw new Error(`Não foi possível criar ${definition.name}: ${error?.message || 'Gravação não confirmada'}`);
      result.push(data as PipelineStage);
    }
  }
  const followUps = definitions.map(definition => result.find(stage => stage.slug === definition.slug)!);
  const ordered = result.filter(stage => !followUps.includes(stage)).sort((a, b) => a.display_order - b.display_order);
  const proposalIndex = ordered.findIndex(stage => stage.slug === 'proposta');
  ordered.splice(proposalIndex >= 0 ? proposalIndex + 1 : ordered.length, 0, ...followUps);
  return ordered;
}
