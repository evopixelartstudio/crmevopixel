import { qualifyLeadWithAI } from '@/lib/ai/qualification';
import type { Lead } from '@/types/database';

const normalizeHeader = (value: string): string => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function recoverSpreadsheetBusinessName(notes: string): string | undefined {
  const marker = 'Dados originais da planilha:';
  const start = notes.indexOf(marker);
  if (start < 0) return undefined;
  for (const line of notes.slice(start + marker.length).split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    if (normalizeHeader(line.slice(0, separator)) === 'nomedonegocio') {
      return line.slice(separator + 1).trim() || undefined;
    }
  }
  return undefined;
}

export function recoverSpreadsheetWhatsApp(notes: string): string | undefined {
  const marker = 'Dados originais da planilha:';
  const start = notes.indexOf(marker);
  if (start < 0) return undefined;
  for (const line of notes.slice(start + marker.length).split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    if (['whatsapptelefone', 'telefonewhatsapp', 'whatsapp', 'telefone', 'phone', 'phonenumber', 'celular'].includes(normalizeHeader(line.slice(0, separator)))) {
      const value = line.slice(separator + 1).trim();
      if (value) return value;
    }
  }
  return undefined;
}

export function parseSpreadsheetLeads(rows: Record<string, unknown>[]): Omit<Lead, 'id'>[] {
  const leads: Omit<Lead, 'id'>[] = [];
  for (const [index, row] of rows.entries()) {
    const originalData = Object.entries(row)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim());
    if (originalData.length === 0) continue;
    const columns = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
    const read = (...aliases: string[]): string => {
      for (const alias of aliases) {
        const value = columns.get(normalizeHeader(alias));
        if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
      }
      return '';
    };
    const name = read('nome', 'name', 'contato', 'nome do contato', 'nome completo', 'contact name', 'full name');
    const company = read('empresa', 'company', 'company name', 'company_name', 'nome da empresa', 'nome empresa', 'nome do negócio', 'nome de negócio', 'nome negócio', 'negócio', 'nome do estabelecimento', 'estabelecimento', 'organização', 'razão social', 'nome fantasia', 'title', 'business name');
    const phone = read('telefone', 'phone', 'phone number', 'telefone comercial', 'celular', 'tel');
    const whatsapp = read('whatsapp', 'whatsapp / telefone', 'telefone / whatsapp', 'whatsapp link', 'link whatsapp', 'whats', 'numero whatsapp', 'whatsapp number') || phone;
    const email = read('email', 'e-mail', 'email address', 'correio eletrônico');
    const qualified = qualifyLeadWithAI({
      name: name || company || email || whatsapp || `Contato importado ${index + 1}`,
      company_name: company || name || 'Empresa não informada',
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
    qualified.notes = `${qualified.notes}\nDados originais da planilha:\n${originalData.map(([key, value]) => `${key}: ${String(value)}`).join('\n')}`;
    leads.push(qualified);
  }
  return leads;
}
