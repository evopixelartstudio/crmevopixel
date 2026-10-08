import type { Lead, Opportunity } from '@/types/database';

// Uma oportunidade na primeira etapa não comprova que o contato foi iniciado.
export function hasEnteredPipeline(opportunity: Opportunity, leads: Lead[]): boolean {
  if (opportunity.stage_slug !== 'primeiro_contato') return true;
  const lead = leads.find(item => item.id === opportunity.lead_id) || opportunity.leads;
  return lead?.status !== 'novo';
}
