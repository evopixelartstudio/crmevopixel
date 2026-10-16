import { NextResponse } from 'next/server';
import { requireCrmApi } from '@/lib/server/crm-auth';
import { cloudDatabase } from '@/lib/server/crm-access';
import { createUniqueLead, findLeadDuplicates, LeadRegistrationError, preferredDuplicate, requireLeadDeduplication } from '@/lib/server/lead-deduplication';
import { getLeadPhoneKeys, type LeadDuplicate, type LeadImportResult } from '@/lib/services/lead-deduplication';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const textFields: Record<string, number> = { name: 500, company_name: 500, role: 200, email: 320, phone: 300, whatsapp: 300, instagram: 2000, website: 2048, city: 200, state: 100, segment: 300, next_action: 4000, notes: 65536 };

function leadPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LeadRegistrationError('Dados do lead inválidos.', 400);
  const input = value as Record<string, unknown>;
  const payload: Record<string, unknown> = { id: input.id || crypto.randomUUID() };
  if (typeof payload.id !== 'string' || !uuid.test(payload.id)) throw new LeadRegistrationError('Identificador do lead inválido.', 400);
  for (const [field, limit] of Object.entries(textFields)) {
    if (input[field] === undefined) continue;
    if (input[field] !== null && (typeof input[field] !== 'string' || (input[field] as string).length > limit)) throw new LeadRegistrationError(`O campo ${field} é inválido ou excede o tamanho permitido.`, 400);
    payload[field] = typeof input[field] === 'string' ? input[field].trim() : null;
  }
  if (!payload.name || !payload.company_name) throw new LeadRegistrationError('Informe o nome do contato e da empresa.', 400);
  for (const field of ['company_id', 'source_id', 'niche_id']) {
    if (input[field] === undefined || input[field] === null) continue;
    if (typeof input[field] !== 'string' || !uuid.test(input[field] as string)) throw new LeadRegistrationError('O cadastro vinculado precisa ter um identificador válido.', 400);
    payload[field] = input[field];
  }
  for (const [field, choices] of Object.entries({ status: ['novo', 'em_abordagem', 'em_contato', 'em_conversa', 'qualificado', 'desqualificado', 'convertido'], temperature: ['frio', 'morno', 'quente', 'desqualificado'] })) {
    if (input[field] === undefined) continue;
    if (!choices.includes(String(input[field]))) throw new LeadRegistrationError('Situação ou temperatura inválida.', 400);
    payload[field] = input[field];
  }
  if (input.score !== undefined) {
    if (typeof input.score !== 'number' || !Number.isFinite(input.score) || input.score < 0 || input.score > 100) throw new LeadRegistrationError('Pontuação do lead inválida.', 400);
    payload.score = input.score;
  }
  for (const field of ['next_action_at', 'last_contact_at']) {
    if (input[field] === undefined) continue;
    if (input[field] !== null && (typeof input[field] !== 'string' || (input[field] as string).length > 64 || Number.isNaN(Date.parse(input[field] as string)))) throw new LeadRegistrationError('Data do lead inválida.', 400);
    payload[field] = input[field];
  }
  payload.updated_at = new Date().toISOString();
  return payload;
}

export async function POST(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2 * 1024 * 1024) return json({ error: 'O lote é muito grande. Importe em lotes menores.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'Solicitação JSON inválida.' }, 400); }
    if (!body || !['create', 'import', 'check'].includes(body.action)) return json({ error: 'Ação de cadastro inválida.' }, 400);
    if (body.action === 'check') {
      const value = body.lead || { phone: body.phone };
      if (typeof value !== 'object' || !value || [value.phone, value.whatsapp].some(item => item != null && (typeof item !== 'string' || item.length > 300))) return json({ error: 'Telefone inválido.' }, 400);
      const keys = getLeadPhoneKeys(value);
      if (!keys.length) return json({ error: 'Informe um telefone completo com DDD para verificar a duplicidade.' }, 400);
      const db = cloudDatabase();
      await requireLeadDeduplication(db);
      return json({ duplicates: await findLeadDuplicates(db, keys) });
    }
    const inputs = body.action === 'create' ? [body.lead] : body.leads;
    if (!Array.isArray(inputs) || !inputs.length || inputs.length > 200) return json({ error: 'Envie entre 1 e 200 leads por lote.' }, 400);
    // Validate the whole request before making the first write.
    const leads = inputs.map(leadPayload);
    const db = cloudDatabase();
    await requireLeadDeduplication(db);
    if (body.action === 'create') {
      const result = await createUniqueLead(db, leads[0]);
      return result.lead ? json({ lead: result.lead }, 201) : json({ error: 'Este telefone já está cadastrado no CRM. Use o cadastro existente.', duplicates: result.duplicates }, 409);
    }
    const result: LeadImportResult = { created: [], duplicates: [], failed: [], total: leads.length, withoutPhone: leads.filter(lead => !getLeadPhoneKeys(lead as { phone?: string; whatsapp?: string }).length).length };
    // Requests in each group run together; database locks arbitrate same-phone races.
    for (let offset = 0; offset < leads.length; offset += 8) {
      const outcomes = await Promise.allSettled(leads.slice(offset, offset + 8).map(lead => createUniqueLead(db, lead)));
      outcomes.forEach((outcome, index) => {
        const inputIndex = offset + index;
        if (outcome.status === 'rejected') {
          result.failed.push({ index: inputIndex, message: outcome.reason instanceof Error ? outcome.reason.message : 'Não foi possível confirmar o cadastro desta linha.' });
        } else if (outcome.value.lead) result.created.push(outcome.value.lead);
        else {
          const match = preferredDuplicate(outcome.value.duplicates || []);
          result.duplicates.push({ ...(match || { phone_key: getLeadPhoneKeys(leads[inputIndex] as { phone?: string; whatsapp?: string })[0] || '', entity_type: 'lead', entity_id: '', name: '', company_name: '', deleted_at: null, location: 'leads' } as LeadDuplicate), inputIndex });
        }
      });
    }
    return json(result);
  } catch (error) {
    return json({ error: error instanceof LeadRegistrationError ? error.message : 'Não foi possível verificar ou cadastrar os leads. Nenhuma gravação foi confirmada nesta solicitação.' }, error instanceof LeadRegistrationError ? error.status : 503);
  }
}
