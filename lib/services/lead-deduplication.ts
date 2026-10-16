import type { Lead } from '@/types/database';
import { cleanPhoneNumber, whatsAppPhoneKey } from '@/lib/utils/whatsapp';
import { recoverSpreadsheetWhatsApp } from '@/lib/services/spreadsheet-leads';

export interface LeadDuplicate {
  phone_key: string;
  entity_type: 'lead' | 'client';
  entity_id: string;
  name: string;
  company_name: string;
  deleted_at: string | null;
  location: 'leads' | 'pipeline' | 'clients' | 'trash';
  url?: string;
  inputIndex?: number;
}

export interface LeadImportResult {
  created: Lead[];
  duplicates: LeadDuplicate[];
  failed: { index: number; message: string }[];
  total: number;
  withoutPhone?: number;
}

export const duplicateLocationLabels = {
  leads: 'Leads', pipeline: 'Pipeline', clients: 'Clientes', trash: 'Lixeira / oportunidades perdidas',
} as const;

export function getLeadPhoneKeys(record: { phone?: string | null; whatsapp?: string | null; notes?: string | null }): string[] {
  // Match the effective contact shown by parseLeadFromSupabase for older imports.
  let notes = typeof record.notes === 'string' ? record.notes : '';
  const metadata = notes.match(/<!--METADATA:([\s\S]*?)-->/);
  if (metadata) {
    try {
      // The CRM removes a valid metadata block before recovering spreadsheet data.
      if (JSON.parse(metadata[1]) !== null) notes = notes.replace(/<!--METADATA:[\s\S]*?-->/, '').trim();
    } catch { /* Invalid metadata remains visible in the original record as well. */ }
  }
  const recovered = cleanPhoneNumber(recoverSpreadsheetWhatsApp(notes));
  const stored = cleanPhoneNumber(record.whatsapp || '') || cleanPhoneNumber(record.phone || '');
  const wasTruncated = recovered.length > 11 && stored === recovered.slice(0, 11);
  const phone = wasTruncated ? recovered : cleanPhoneNumber(record.phone || '') || recovered;
  const whatsapp = wasTruncated ? recovered : stored || recovered;
  return Array.from(new Set([phone, whatsapp].flatMap(value => {
    if (!value) return [];
    const digits = cleanPhoneNumber(value);
    return /^\d{10,15}$/.test(digits) ? [whatsAppPhoneKey(value)] : [];
  })));
}

export class LeadDuplicateError extends Error {
  constructor(public duplicates: LeadDuplicate[], message?: string) {
    const match = duplicates[0];
    super(message || (match
      ? `Este telefone já pertence a ${match.company_name || match.name || 'um contato'} em ${duplicateLocationLabels[match.location]}. Abra o cadastro existente para evitar uma nova prospecção.`
      : 'Este telefone já está cadastrado no CRM. Use o cadastro existente.'));
    this.name = 'LeadDuplicateError';
  }
}

/** PostgreSQL trigger errors carry only CRM identifiers and the contact snapshot. */
export function duplicateMatchesFromDatabase(error: { code?: string; message?: string; details?: string }): LeadDuplicate[] | null {
  if (error.code !== '23505' || !error.message?.includes('LEAD_PHONE_DUPLICATE')) return null;
  try {
    const details = JSON.parse(error.details || '{}');
    const matches = Array.isArray(details.matches) ? details.matches : [];
    return matches.filter((match: Record<string, unknown>) => ['lead', 'client'].includes(String(match.entity_type)) && typeof match.entity_id === 'string')
      .map((match: Record<string, unknown>) => ({
        phone_key: String(match.phone_key || ''), entity_type: match.entity_type,
        entity_id: match.entity_id, name: String(match.name || ''), company_name: String(match.company_name || ''),
        deleted_at: typeof match.deleted_at === 'string' ? match.deleted_at : null,
        location: match.deleted_at ? 'trash' : match.entity_type === 'client' ? 'clients' : 'leads',
        ...(match.deleted_at ? {} : { url: match.entity_type === 'client' ? `/clientes/${match.entity_id}` : `/leads/${match.entity_id}` }),
      }));
  } catch { return []; }
}
