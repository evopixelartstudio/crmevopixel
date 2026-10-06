import { getSupabase } from '@/lib/supabase/client';

export async function deletePipelineOpportunities(ids: string[]): Promise<string[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('opportunities').delete().in('id', uniqueIds).select('id');
  if (error) throw new Error(error.message);
  return (data || []).map((row: { id: string }) => row.id);
}
