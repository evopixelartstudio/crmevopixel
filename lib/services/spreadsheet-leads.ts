import { qualifyLeadWithAI } from '@/lib/ai/qualification';
import type { Lead } from '@/types/database';

const normalizeHeader = (value: string): string => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function parseSpreadsheetLeads(rows: Record<string, unknown>[]): Omit<Lead, 'id'>[] {
  const leads: Omit<Lead, 'id'>[] = [];
  for (const row of rows) {
    const columns = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
    const read = (...aliases: string[]): string => {
      for (const alias of aliases) {
        const value = columns.get(normalizeHeader(alias));
        if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
      }
      return '';
    };
    const name = read('nome', 'name', 'contato', 'nome do contato', 'nome completo', 'contact name', 'full name');
    const company = read('empresa', 'company', 'company name', 'company_name', 'nome da empresa', 'nome empresa', 'organização', 'razão social', 'nome fantasia', 'title', 'business name');
    const phone = read('telefone', 'phone', 'phone number', 'telefone comercial', 'celular', 'tel');
    const whatsapp = read('whatsapp', 'whats', 'numero whatsapp', 'whatsapp number') || phone;
    const email = read('email', 'e-mail', 'email address', 'correio eletrônico');
    // Não criar contatos fictícios para linhas vazias ou colunas desconhecidas.
    if (!name && !company && !phone && !whatsapp && !email) continue;
    const qualified = qualifyLeadWithAI({
      name: name || company || email || whatsapp,
      company_name: company || name || email || whatsapp,
      phone,
      whatsapp,
      email,
      segment: read('nicho', 'segmento', 'segment', 'categoria', 'category', 'category name'),
      city: read('cidade', 'city', 'municipio') || 'Não informada',
      state: read('estado', 'state', 'uf') || 'Não informado',
      role: read('cargo', 'função', 'role'),
      instagram: read('instagram', 'insta', 'instagram url'),
      google_business: read('google meu negócio', 'gmb', 'google maps', 'google_business', 'google maps url', 'url'),
    });
    qualified.website = read('site', 'website', 'website url', 'site da empresa');
    const notes = read('observações', 'observacao', 'notes', 'notas');
    if (notes) qualified.notes = `${notes}\n${qualified.notes}`;
    leads.push(qualified);
  }
  return leads;
}
