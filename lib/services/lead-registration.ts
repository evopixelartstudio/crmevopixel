import type { Lead } from '@/types/database';

export interface LeadRegistrationValues {
  name: string;
  company_name: string;
  segment: string;
  city: string;
  whatsapp: string;
  email: string;
  instagram: string;
  google_business: string;
}

export function getLeadRegistrationValues(lead?: Partial<Lead> | null): LeadRegistrationValues {
  return {
    name: lead?.name || '',
    company_name: lead?.company_name || '',
    segment: lead?.segment || 'Contabilidade',
    city: lead?.city || '',
    whatsapp: lead?.whatsapp || lead?.phone || '',
    email: lead?.email || '',
    instagram: lead?.instagram || '',
    google_business: lead?.google_business || '',
  };
}

export function getLeadRegistrationInput(values: LeadRegistrationValues) {
  return {
    name: values.name.trim() || values.company_name.trim() || 'Contato não informado',
    company_name: values.company_name.trim() || 'Empresa não informada',
    segment: values.segment.trim(),
    city: values.city.trim(),
    whatsapp: values.whatsapp.trim(),
    phone: values.whatsapp.trim(),
    email: values.email.trim(),
    instagram: values.instagram.trim(),
    google_business: values.google_business.trim(),
  };
}
