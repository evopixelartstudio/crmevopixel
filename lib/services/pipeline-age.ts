import type { Opportunity } from '@/types/database';

export function isStageOverdue(opp: Pick<Opportunity, 'stage_entered_at' | 'stage_slug' | 'status'>, now = Date.now()): boolean {
  if (opp.status && opp.status !== 'aberto') return false;
  if (['fechado', 'projeto_em_andamento', 'ganho', 'perdido'].includes(opp.stage_slug)) return false;
  const since = Date.parse(opp.stage_entered_at || '');
  return Number.isFinite(since) && now - since > 48 * 60 * 60 * 1000;
}
