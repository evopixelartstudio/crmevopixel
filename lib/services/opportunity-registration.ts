import type { Lead } from '@/types/database';
import { qualifyLeadWithAI } from '@/lib/ai/qualification';
import { getLeadRegistrationInput, type LeadRegistrationValues } from '@/lib/services/lead-registration';

interface LeadPersistence {
  insertLead: (lead: Lead) => Promise<Lead | null>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<boolean>;
}

// Wait for the shared lead record before creating an opportunity that references it.
export async function persistOpportunityLead(
  values: LeadRegistrationValues,
  existingLead: Lead | undefined,
  persistence: LeadPersistence,
): Promise<Lead> {
  const input = getLeadRegistrationInput(values);
  if (existingLead) {
    const lead: Lead = {
      ...existingLead,
      ...input,
      status: existingLead.status === 'convertido' ? 'convertido' : 'em_contato',
    };
    if (!await persistence.updateLead(lead.id, lead)) {
      throw new Error('Não foi possível salvar os dados do lead. Verifique a conexão e tente novamente.');
    }
    return lead;
  }

  const lead = await persistence.insertLead({
    ...qualifyLeadWithAI(input),
    id: crypto.randomUUID(),
    status: 'em_contato',
  });
  if (!lead) {
    throw new Error('Não foi possível cadastrar o lead. Verifique a conexão e tente novamente.');
  }
  return lead;
}

export async function restoreOpportunityLeadStatus(
  lead: Lead,
  originalStatus: Lead['status'],
  persistence: Pick<LeadPersistence, 'updateLead'>,
): Promise<boolean> {
  if (lead.status === originalStatus) return true;
  // Roll back only the pipeline status; keep contact edits and metadata already saved.
  return persistence.updateLead(lead.id, { status: originalStatus });
}
