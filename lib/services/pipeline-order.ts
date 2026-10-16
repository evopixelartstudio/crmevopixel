import type { Opportunity } from '@/types/database';

type PipelineEntry = Pick<Opportunity, 'id' | 'stage_entered_at' | 'created_at'>;

function timestamp(value?: string): number {
  const result = Date.parse(value || '');
  return Number.isFinite(result) ? result : 0;
}

// Contact or price edits must not change a card's place in its stage.
export function comparePipelineEntryNewestFirst(a: PipelineEntry, b: PipelineEntry): number {
  const aCreated = timestamp(a.created_at);
  const bCreated = timestamp(b.created_at);
  return (timestamp(b.stage_entered_at) || bCreated) - (timestamp(a.stage_entered_at) || aCreated)
    || bCreated - aCreated
    || a.id.localeCompare(b.id);
}
