import type { PipelineStage } from '@/types/database';

export function isNegotiationStage(stage: PipelineStage): boolean {
  return stage.slug === 'negociacao' || stage.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'negociacao';
}

export function getPipelineStageMap(stages: PipelineStage[]): Map<string, PipelineStage> {
  const proposal = stages.find(stage => stage.slug === 'proposta');
  if (!proposal && stages.some(isNegotiationStage)) {
    throw new Error('A etapa Proposta precisa existir para substituir Negociação.');
  }
  return new Map(stages.map(stage => [stage.id, isNegotiationStage(stage) ? proposal! : stage]));
}
