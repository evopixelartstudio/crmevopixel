export interface ContactContext {
  id: string;
  phone_key: string;
  origin: 'unknown' | 'outbound' | 'inbound';
  acquisition_channel: 'unknown' | 'whatsapp' | 'instagram' | 'referral' | 'website' | 'other';
  relationship: 'lead' | 'client' | 'former_client';
  attendance_owner: 'human' | 'ai';
  assigned_to: string;
  automation_enabled: boolean;
  revision: number;
  updated_at: string;
}

export function contactChanges(value: any): Record<string, unknown> & { changed_by: string } {
  const result: Record<string, unknown> & { changed_by: string } = { changed_by: 'crm' };
  const enums: Record<string, string[]> = {
    origin: ['unknown','outbound','inbound'], acquisition_channel: ['unknown','whatsapp','instagram','referral','website','other'],
    relationship: ['lead','client','former_client'], attendance_owner: ['human','ai'],
  };
  for (const [key, options] of Object.entries(enums)) if (key in value) {
    if (!options.includes(value[key])) throw new Error('Classificação inválida.');
    result[key] = value[key];
  }
  if ('relationship' in result) result.relationship_confirmed = true;
  if ('assigned_to' in value) {
    if (typeof value.assigned_to !== 'string' || value.assigned_to.length > 120) throw new Error('Informe um responsável com até 120 caracteres.');
    result.assigned_to = value.assigned_to.trim();
  }
  // Ownership changes always make the individual automation flag consistent.
  if ('attendance_owner' in result) result.automation_enabled = result.attendance_owner === 'ai';
  return result;
}
