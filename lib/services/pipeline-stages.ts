import type { PipelineStage } from '@/types/database';

export function isNegotiationStage(stage: PipelineStage): boolean {
  return stage.slug === 'negociacao' || stage.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'negociacao';
}

function replacementSlug(stage: PipelineStage): string | undefined {
  const name = stage.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (isNegotiationStage(stage) || stage.slug === 'orcamento' || name === 'orcamento') return 'proposta';
  if (stage.slug === 'projeto_em_andamento' || name === 'projeto em andamento') return 'fechado';
}

export function getVisiblePipelineStages(stages: PipelineStage[]): PipelineStage[] {
  const order: Record<string, number> = {
    primeiro_contato: 0,
    sem_resposta: 1,
    qualificado: 2,
    proposta: 4,
    follow_up: 5,
    follow_up_1: 5,
    follow_up_2: 6,
    fechado: 7,
  };
  return stages.filter(stage => !replacementSlug(stage)).sort((a, b) =>
    (order[a.slug] ?? 3) - (order[b.slug] ?? 3) || a.display_order - b.display_order
  );
}

export function getPipelineStageMap(stages: PipelineStage[]): Map<string, PipelineStage> {
  return new Map(stages.map(stage => {
    const slug = replacementSlug(stage);
    if (!slug) return [stage.id, stage];
    const replacement = stages.find(candidate => candidate.slug === slug);
    if (!replacement) {
      const name = slug === 'proposta' ? 'Proposta' : 'Fechado';
      throw new Error(`A etapa ${name} precisa existir para substituir ${stage.name}.`);
    }
    return [stage.id, replacement];
  }));
}

// Editar outros campos de um card agrupado não deve mudar sua etapa real.
export function resolvePipelineStageEdit(originalId: string | undefined, selectedId: string, stageMap: Map<string, PipelineStage>): string | undefined {
  return originalId && stageMap.get(originalId)?.id === selectedId ? originalId : selectedId || originalId;
}
