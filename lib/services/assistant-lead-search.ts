import type { Lead } from '@/types/database';
import { cleanPhoneNumber, whatsAppPhoneKey } from '@/lib/utils/whatsapp';

export type LeadSearchField = 'any' | 'phone' | 'name' | 'email' | 'company';
export interface LeadSearchParams {
  query: string;
  field?: LeadSearchField;
}

export const normalizeLeadSearchText = (value: string): string => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function isCompletePhoneQuery(value: string): boolean {
  const digits = cleanPhoneNumber(value);
  return digits.length >= 10 && digits.length <= 15 && !/[a-z]/i.test(value.replace(/(?:https?:\/\/)?(?:www\.)?(?:wa\.me|(?:api|web)\.whatsapp\.com)\/[^\s]*/gi, ''));
}

/** Phone searches require the complete number with area code; no suffix matching. */
export function searchCrmLeads(leads: Lead[], { query, field = 'any' }: LeadSearchParams): Lead[] {
  const text = normalizeLeadSearchText(query);
  if (!text) return [];
  const phoneSearch = field === 'phone' || (field === 'any' && isCompletePhoneQuery(query));
  if (phoneSearch) {
    if (!isCompletePhoneQuery(query)) return [];
    const key = whatsAppPhoneKey(query);
    return leads.filter(lead => [lead.phone, lead.whatsapp].some(phone =>
      phone && isCompletePhoneQuery(phone) && whatsAppPhoneKey(phone) === key));
  }
  const fields = field === 'name' ? ['name'] : field === 'company' ? ['company_name'] : field === 'email' ? ['email'] : ['name', 'company_name', 'email'];
  const words = text.split(' ');
  return leads.filter(lead => fields.some(key => {
    const value = normalizeLeadSearchText(String(lead[key as keyof Lead] || ''));
    return words.every(word => value.includes(word));
  }));
}

/** Deterministic CRM lookups work even before an AI provider has been configured. */
export function parseLeadSearch(input: string): LeadSearchParams | null {
  const text = normalizeLeadSearchText(input);
  // Never turn a requested write into a read, or let a casual mention trigger a write.
  if (/\b(pagou|registre|registrar|crie|criar|adicione|adicionar|agende|agendar|exclua|excluir|apague|apagar|delete|deletar|cancele|cancelar)\b/.test(text)) return null;
  const phone = input.match(/(?:https?:\/\/)?(?:www\.)?(?:wa\.me|(?:api|web)\.whatsapp\.com)\/[^\s]+/i)?.[0]
    || input.match(/\+?\(?\d[\d().\s-]{7,}\d/)?.[0]?.trim();
  if (phone && isCompletePhoneQuery(phone)) return { query: phone, field: 'phone' };
  const email = input.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
  if (email) return { query: email, field: 'email' };

  const hasLookup = /\b(ach[ae]|achar|encontr[ae]|encontrar|procur[ae]|procurar|busc[ae]|busque|buscar|localiz[ae]|localizar|pesquis[ae]|pesquisar|mostr[ae]|mostrar|trag[ae]|traz|consult[ae]|consultar|cad[eê]|quem|tem|existe)\b/.test(text);
  const hasEntity = /\b(leads?|contatos?|cadastros?|clientes?|crm|empresas?|email|e-mail|telefone|numero|whatsapp)\b/.test(text);
  if (!(hasLookup && hasEntity) && !/^(?:lead|contato|empresa|nome|email|e-mail|telefone|numero|whatsapp)\s*[:=]/.test(text)) return null;

  let field: LeadSearchField = 'any';
  let query = input;
  if (/\b(telefone|numero|whatsapp)\b/.test(text)) {
    field = 'phone';
    query = phone || '';
  } else if (/\b(email|e-mail)\b/.test(text)) {
    field = 'email';
    query = input.replace(/^.*?\b(?:email|e-mail)\b\s*(?:de\s+)?[:=]?\s*/i, '');
  } else if (/\b(empresa|nome|chamad[oa])\b/.test(text)) {
    field = /\bempresa\b/.test(text) ? 'company' : 'name';
    query = input.replace(/^.*?\b(?:empresa|nome|chamad[oa])\b\s*(?:(?:de|da|do|é)\s+)?[:=]?\s*/i, '');
  } else {
    query = input.replace(/^.*?\b(?:leads?|contatos?|cadastros?|clientes?)\b\s*(?:(?:pelo|pela|com|de|da|do|por|o|a|um|uma)\s+)*/i, '');
    if (query === input) query = input.replace(/^.*?\b(?:ache|achar|encontre|encontrar|procure|procurar|busque|buscar|localize|localizar|pesquise|pesquisar|mostre|mostrar|traga|traz|consulte|consultar)\b\s*(?:por\s+)?/i, '');
  }
  query = query.replace(/\s+(?:no|do|dentro do)\s+crm\b.*$/i, '').replace(/^[\s"'“”:=]+|[\s"'“”?.!]+$/g, '').trim();
  if (/^(?:um|uma|algum|alguma|o|a|todos|todas|por favor)?$/i.test(query)) query = '';
  return { query, field };
}

export const AI_LEAD_CONTEXT_LIMIT = 100;

export function getLeadContext(leads: Lead[], query: string, limit = AI_LEAD_CONTEXT_LIMIT) {
  const words = normalizeLeadSearchText(query).split(/[^\p{L}\p{N}@.]+/u).filter(word => word.length >= 3);
  const ranked = leads.map((lead, index) => {
    const searchable = normalizeLeadSearchText([lead.name, lead.company_name, lead.email, lead.phone, lead.whatsapp].filter(Boolean).join(' '));
    return { lead, index, relevance: words.filter(word => searchable.includes(word)).length };
  }).sort((a, b) => b.relevance - a.relevance || a.index - b.index);
  return {
    totalLeads: leads.length,
    limiteLeads: limit,
    contextoParcial: leads.length > limit,
    criterioSelecao: 'Correspondências com a pergunta primeiro; demais na ordem do CRM. Use search_leads para uma busca completa.',
    leads: ranked.slice(0, limit).map(({ lead }) => ({
      id: lead.id, name: lead.name, company_name: lead.company_name, email: lead.email,
      phone: lead.phone, whatsapp: lead.whatsapp, city: lead.city, state: lead.state,
      segment: lead.segment, status: lead.status, temperature: lead.temperature,
      score: lead.score, next_action: lead.next_action, next_action_at: lead.next_action_at,
    })),
  };
}
