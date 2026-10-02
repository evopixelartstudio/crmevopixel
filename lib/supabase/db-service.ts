import { getSupabase, isSupabaseConfigured } from './client';
import {
  Lead,
  Client,
  Prospect,
  Opportunity,
  PipelineStage,
  MonthlyClient,
  Proposal,
  Contract,
  Project,
  HistoricalProject,
  TaskItem,
  FinancialTransaction,
  Service,
} from '@/types/database';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function sanitizeLeadForSupabase(lead: Partial<Lead>): any {
  let notes = lead.notes || '';
  const metadata: any = {};
  if (lead.google_business) metadata.google_business = lead.google_business;
  if (Array.isArray(lead.services) && lead.services.length > 0) metadata.services = lead.services;
  if (lead.sequence_progress) metadata.sequence_progress = lead.sequence_progress;
  if (lead.ai_analysis) metadata.ai_analysis = lead.ai_analysis;

  if (Object.keys(metadata).length > 0) {
    const cleanedNotes = notes.replace(/<!--METADATA:[\s\S]*?-->/, '').trim();
    notes = cleanedNotes
      ? `${cleanedNotes}\n<!--METADATA:${JSON.stringify(metadata)}-->`
      : `<!--METADATA:${JSON.stringify(metadata)}-->`;
  }

  const payload: any = {};
  if (lead.id && isValidUUID(lead.id)) payload.id = lead.id;
  if (lead.name !== undefined) payload.name = lead.name;
  if (lead.company_name !== undefined) payload.company_name = lead.company_name;
  if (lead.role !== undefined) payload.role = lead.role || null;
  if (lead.email !== undefined) payload.email = lead.email || null;
  if (lead.phone !== undefined) payload.phone = lead.phone || null;
  if (lead.whatsapp !== undefined) payload.whatsapp = lead.whatsapp || null;
  if (lead.instagram !== undefined) payload.instagram = lead.instagram || null;
  if (lead.website !== undefined) payload.website = lead.website || null;
  if (lead.city !== undefined) payload.city = lead.city || null;
  if (lead.state !== undefined) payload.state = lead.state || null;
  if (lead.segment !== undefined) payload.segment = lead.segment || null;
  if (lead.score !== undefined) payload.score = lead.score;
  if (lead.temperature !== undefined) payload.temperature = lead.temperature;
  if (lead.status !== undefined) payload.status = lead.status;
  if (lead.next_action !== undefined) payload.next_action = lead.next_action || null;
  if (lead.next_action_at !== undefined) payload.next_action_at = lead.next_action_at || null;
  if (lead.last_contact_at !== undefined) payload.last_contact_at = lead.last_contact_at || null;
  if (lead.company_id && isValidUUID(lead.company_id)) payload.company_id = lead.company_id;
  if (lead.niche_id && isValidUUID(lead.niche_id)) payload.niche_id = lead.niche_id;
  if (lead.source_id && isValidUUID(lead.source_id)) payload.source_id = lead.source_id;
  payload.notes = notes || null;
  payload.updated_at = new Date().toISOString();

  return payload;
}

export function parseLeadFromSupabase(row: any): Lead {
  let google_business = row.google_business || '';
  let services: string[] = Array.isArray(row.services) ? row.services : [];
  let sequence_progress = row.sequence_progress;
  let ai_analysis = row.ai_analysis;
  let notes = row.notes || '';

  if (notes && notes.includes('<!--METADATA:')) {
    const match = notes.match(/<!--METADATA:([\s\S]*?)-->/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.google_business && !google_business) google_business = parsed.google_business;
        if (Array.isArray(parsed.services) && services.length === 0) services = parsed.services;
        if (parsed.sequence_progress && !sequence_progress) sequence_progress = parsed.sequence_progress;
        if (parsed.ai_analysis && !ai_analysis) ai_analysis = parsed.ai_analysis;
        notes = notes.replace(/<!--METADATA:[\s\S]*?-->/, '').trim();
      } catch (e) {}
    }
  }

  return {
    ...row,
    notes,
    google_business,
    services,
    sequence_progress,
    ai_analysis,
  } as Lead;
}

export class DatabaseService {
  // ============================================================================
  // CLIENTES
  // ============================================================================
  public async getClients(): Promise<Client[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) {
        console.error('Supabase getClients error:', error);
        return null;
      }
      return data as Client[];
    } catch (err) {
      console.error('Supabase getClients exception:', err);
      return null;
    }
  }

  public async insertClient(client: Client): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      
      // Remover ID mock (ex: 'client-...' ou 'cli-...') para que o Supabase gere o UUID
      let dataToInsert: any = { ...client };
      if (dataToInsert.id && (dataToInsert.id.startsWith('client-') || dataToInsert.id.startsWith('cli-'))) {
        delete dataToInsert.id;
      }

      let { error } = await supabase.from('clients').upsert([dataToInsert]);
      if (error) {
        const { website_url, instagram, google_business, ...fallbackData } = dataToInsert;
        const retry = await supabase.from('clients').upsert([fallbackData]);
        error = retry.error;
      }
      if (error) console.error('Supabase insertClient error:', error);
      return !error;
    } catch (err) {
      console.error('Supabase insertClient exception:', err);
      return false;
    }
  }

  public async updateClient(id: string, data: Partial<Client>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      
      // Remover ID mock
      let dataToUpdate: any = { ...data };
      if (dataToUpdate.id && (dataToUpdate.id.startsWith('client-') || dataToUpdate.id.startsWith('cli-'))) {
        delete dataToUpdate.id;
      }

      let { error } = await supabase.from('clients').update(dataToUpdate).eq('id', id);
      if (error) {
        const { website_url, instagram, google_business, ...fallbackData } = dataToUpdate;
        const retry = await supabase.from('clients').update(fallbackData).eq('id', id);
        error = retry.error;
      }
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteClient(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('clients').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // CLIENTES MENSALISTAS (MRR)
  // ============================================================================
  public async getMonthlyClients(): Promise<MonthlyClient[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('monthly_clients')
        .select('*')
        .order('billing_day', { ascending: true });
      if (error || !data) return null;
      return data as MonthlyClient[];
    } catch {
      return null;
    }
  }

  public async insertMonthlyClient(client: MonthlyClient): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const dataToInsert: any = { ...client };
      if (dataToInsert.id && !isValidUUID(dataToInsert.id)) {
        delete dataToInsert.id;
      }
      if (dataToInsert.client_id && !isValidUUID(dataToInsert.client_id)) {
        delete dataToInsert.client_id;
      }
      if (dataToInsert.start_date && dataToInsert.start_date.includes('T')) {
        dataToInsert.start_date = dataToInsert.start_date.split('T')[0];
      }
      const { error } = await supabase.from('monthly_clients').upsert([dataToInsert]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateMonthlyClient(id: string, data: Partial<MonthlyClient>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const dataToUpdate: any = { ...data };
      if (dataToUpdate.id && !isValidUUID(dataToUpdate.id)) {
        delete dataToUpdate.id;
      }
      if (dataToUpdate.client_id && !isValidUUID(dataToUpdate.client_id)) {
        delete dataToUpdate.client_id;
      }
      if (dataToUpdate.start_date && dataToUpdate.start_date.includes('T')) {
        dataToUpdate.start_date = dataToUpdate.start_date.split('T')[0];
      }
      const { error } = await supabase.from('monthly_clients').update(dataToUpdate).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteMonthlyClient(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('monthly_clients').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // LEADS
  // ============================================================================
  public async getLeads(): Promise<Lead[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) {
        if (error) console.error('Supabase getLeads error:', error);
        return null;
      }
      return data.map(parseLeadFromSupabase);
    } catch (err) {
      console.error('Supabase getLeads exception:', err);
      return null;
    }
  }

  public async insertLead(lead: Lead): Promise<Lead | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const payload = sanitizeLeadForSupabase(lead);
      const { data, error } = await supabase.from('leads').upsert([payload]).select();
      if (error) {
        console.error('Supabase insertLead error:', error);
        return null;
      }
      if (data && data.length > 0) {
        return parseLeadFromSupabase(data[0]);
      }
      return null;
    } catch (err) {
      console.error('Supabase insertLead exception:', err);
      return null;
    }
  }

  public async updateLead(id: string, data: Partial<Lead>): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const payload = sanitizeLeadForSupabase(data);
      delete payload.id;
      const { error } = await supabase.from('leads').update(payload).eq('id', id);
      if (error) console.error('Supabase updateLead error:', error);
      return !error;
    } catch (err) {
      console.error('Supabase updateLead exception:', err);
      return false;
    }
  }

  public async deleteLead(id: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) console.error('Supabase deleteLead error:', error);
      return !error;
    } catch (err) {
      console.error('Supabase deleteLead exception:', err);
      return false;
    }
  }

  public async deleteLeads(ids: string[]): Promise<boolean> {
    const validUuids = ids.filter(isValidUUID);
    if (!isSupabaseConfigured() || validUuids.length === 0) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('leads').delete().in('id', validUuids);
      if (error) console.error('Supabase deleteLeads error:', error);
      return !error;
    } catch (err) {
      console.error('Supabase deleteLeads exception:', err);
      return false;
    }
  }

  // ============================================================================
  // PROSPECTOS (PROSPECÇÃO ATIVA IA)
  // ============================================================================
  public async getProspects(): Promise<Prospect[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('icp_score', { ascending: false });
      if (error || !data) return null;
      return data as Prospect[];
    } catch {
      return null;
    }
  }

  public async insertProspect(prospect: Prospect): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('prospects').upsert([prospect]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateProspectStatus(id: string, status: Prospect['status']): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('prospects')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteProspect(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('prospects').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // PIPELINE STAGES & OPORTUNIDADES (public.pipeline_stages & public.opportunities)
  // ============================================================================
  public async getPipelineStages(): Promise<PipelineStage[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('id, name, slug, display_order, color')
        .order('display_order', { ascending: true });
      if (error || !data) {
        if (error) console.error('Supabase getPipelineStages error:', error);
        return null;
      }
      return data as PipelineStage[];
    } catch (err) {
      console.error('Supabase getPipelineStages exception:', err);
      return null;
    }
  }

  public async getOpportunities(): Promise<Opportunity[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const [stagesRes, oppsRes] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('id, name, slug, display_order, color')
          .order('display_order', { ascending: true }),
        supabase
          .from('opportunities')
          .select('*, leads(*)'),
      ]);

      if (oppsRes.error || !oppsRes.data) {
        if (oppsRes.error) console.error('Supabase getOpportunities error:', oppsRes.error);
        return null;
      }

      const stages = (stagesRes.data || []) as PipelineStage[];
      const stageById = new Map(stages.map((s) => [s.id, s]));
      const defaultStage = stages[0];

      return oppsRes.data.map((row: any) => {
        const rawLead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
        const parsedLead = rawLead ? parseLeadFromSupabase(rawLead) : null;
        const matchedStage = row.stage_id ? stageById.get(row.stage_id) : defaultStage;

        return {
          id: row.id,
          lead_id: row.lead_id || null,
          stage_id: row.stage_id || matchedStage?.id,
          company_id: row.company_id ?? null,
          title: row.title || parsedLead?.company_name || 'Oportunidade',
          estimated_value: Number(row.estimated_value) || 0,
          probability: Number(row.probability) || 0,
          status: row.status || 'aberta',
          stage_slug: matchedStage?.slug || row.stage_slug || 'primeiro_contato',
          lead_name: parsedLead?.name || row.lead_name || 'Contato Principal',
          company_name: parsedLead?.company_name || row.company_name || row.title || 'Cliente',
          score: parsedLead?.score ?? row.score ?? 80,
          temperature: parsedLead?.temperature || row.temperature || 'quente',
          priority: row.priority || 'alta',
          services:
            parsedLead?.services && parsedLead.services.length > 0
              ? parsedLead.services
              : Array.isArray(row.services)
              ? row.services
              : [],
          created_at: row.created_at,
          updated_at: row.updated_at,
          stage_entered_at: row.updated_at || row.created_at,
          leads: parsedLead,
        } as Opportunity;
      });
    } catch (err) {
      console.error('Supabase getOpportunities exception:', err);
      return null;
    }
  }

  private async resolveStageId(stageIdOrSlug?: string): Promise<string | null> {
    if (stageIdOrSlug && isValidUUID(stageIdOrSlug)) {
      return stageIdOrSlug;
    }
    const stages = await this.getPipelineStages();
    if (!stages || stages.length === 0) return null;
    if (stageIdOrSlug) {
      const norm = stageIdOrSlug.trim().toLowerCase();
      const bySlug = stages.find(
        (s) =>
          (s.slug || '').toLowerCase() === norm ||
          (s.name || '').toLowerCase() === norm
      );
      if (bySlug) return bySlug.id;
    }
    return stages[0].id;
  }

  public async insertOpportunity(opportunity: Opportunity): Promise<Opportunity | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const stageId = await this.resolveStageId(opportunity.stage_id || opportunity.stage_slug);
      if (!stageId) {
        console.error('Supabase insertOpportunity: Nenhuma etapa encontrada em public.pipeline_stages');
        return null;
      }

      const payload: Record<string, any> = {
        lead_id: isValidUUID(opportunity.lead_id) ? opportunity.lead_id : null,
        stage_id: stageId,
        company_id: isValidUUID(opportunity.company_id) ? opportunity.company_id : null,
        title: opportunity.title || opportunity.company_name || 'Nova Oportunidade',
        estimated_value: Number(opportunity.estimated_value) || 0,
        probability: Number(opportunity.probability) || 0,
        status: opportunity.status || 'aberta',
      };

      if (isValidUUID(opportunity.id)) {
        payload.id = opportunity.id;
      }

      const { data, error } = await supabase
        .from('opportunities')
        .insert([payload])
        .select('*, leads(*)')
        .single();

      if (error) {
        console.error('Supabase insertOpportunity error:', error);
        return null;
      }

      if (data) {
        opportunity.id = data.id;
        opportunity.stage_id = data.stage_id;
      }
      return data as any;
    } catch (err) {
      console.error('Supabase insertOpportunity exception:', err);
      return null;
    }
  }

  public async updateOpportunityStage(id: string, stageIdOrSlug: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const stageId = await this.resolveStageId(stageIdOrSlug);
      if (!stageId) return false;

      const { error } = await supabase
        .from('opportunities')
        .update({ stage_id: stageId })
        .eq('id', id);
      if (error) console.error('Supabase updateOpportunityStage error:', error);
      return !error;
    } catch (err) {
      console.error('Supabase updateOpportunityStage exception:', err);
      return false;
    }
  }

  public async updateOpportunity(id: string, data: Partial<Opportunity>): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const payload: Record<string, any> = {};

      if (data.stage_id && isValidUUID(data.stage_id)) {
        payload.stage_id = data.stage_id;
      } else if (data.stage_slug) {
        const resolved = await this.resolveStageId(data.stage_slug);
        if (resolved) payload.stage_id = resolved;
      }
      if (data.lead_id !== undefined) {
        payload.lead_id = isValidUUID(data.lead_id) ? data.lead_id : null;
      }
      if (data.company_id !== undefined) {
        payload.company_id = isValidUUID(data.company_id) ? data.company_id : null;
      }
      if (data.title !== undefined) payload.title = data.title;
      if (data.estimated_value !== undefined) payload.estimated_value = Number(data.estimated_value) || 0;
      if (data.probability !== undefined) payload.probability = Number(data.probability) || 0;
      if (data.status !== undefined) payload.status = data.status;

      if (Object.keys(payload).length === 0) return true;

      const { error } = await supabase.from('opportunities').update(payload).eq('id', id);
      if (error) console.error('Supabase updateOpportunity error:', error);
      return !error;
    } catch (err) {
      console.error('Supabase updateOpportunity exception:', err);
      return false;
    }
  }

  public async deleteOpportunity(id: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('opportunities').delete().eq('id', id);
      if (error) console.error('Supabase deleteOpportunity error:', error);
      return !error;
    } catch (err) {
      console.error('Supabase deleteOpportunity exception:', err);
      return false;
    }
  }

  // ============================================================================
  // PROPOSTAS
  // ============================================================================
  public async getProposals(): Promise<Proposal[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return null;
      return data as Proposal[];
    } catch {
      return null;
    }
  }

  public async insertProposal(proposal: Proposal): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('proposals').upsert([proposal]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateProposal(id: string, data: Partial<Proposal>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('proposals').update(data).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteProposal(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // CONTRATOS
  // ============================================================================
  public async getContracts(): Promise<Contract[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('contracts').select('*');
      if (error || !data) return null;
      return data as Contract[];
    } catch {
      return null;
    }
  }

  public async insertContract(contract: Contract): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('contracts').upsert([contract]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateContract(id: string, data: Partial<Contract>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('contracts').update(data).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteContract(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // PROJETOS & MEU HISTÓRICO
  // ============================================================================
  private parseMetadataFromNotes(row: any): any {
    let notes = row.notes || '';
    let parsedMeta: any = {};
    if (notes && notes.includes('<!--METADATA:')) {
      const match = notes.match(/<!--METADATA:([\s\S]*?)-->/);
      if (match) {
        try {
          parsedMeta = JSON.parse(match[1]);
          notes = notes.replace(/<!--METADATA:[\s\S]*?-->/, '').trim();
        } catch {}
      }
    }
    return {
      ...parsedMeta,
      ...row,
      website_url: row.website_url || parsedMeta.website_url || undefined,
      segment: row.segment || parsedMeta.segment || undefined,
      notes,
    };
  }

  private packMetadataIntoNotes(data: any, extraFields: string[]): any {
    let notes = (data.notes || '').replace(/<!--METADATA:[\s\S]*?-->/, '').trim();
    const meta: any = {};
    for (const field of extraFields) {
      if (data[field] !== undefined) {
        meta[field] = data[field];
      }
    }
    if (Object.keys(meta).length > 0) {
      notes = notes
        ? `${notes}\n<!--METADATA:${JSON.stringify(meta)}-->`
        : `<!--METADATA:${JSON.stringify(meta)}-->`;
    }
    return { ...data, notes: notes || null };
  }

  public async getProjects(): Promise<Project[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('projects').select('*');
      if (error || !data) return null;
      return data.map((row) => this.parseMetadataFromNotes(row)) as Project[];
    } catch {
      return null;
    }
  }

  public async insertProject(project: Project): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      let dataToInsert: any = this.packMetadataIntoNotes(project, [
        'website_url',
        'segment',
        'client_name',
        'company_name',
        'services',
        'progress_percentage',
        'amount_contracted',
        'amount_received',
      ]);
      if (dataToInsert.id && (dataToInsert.id.startsWith('proj-') || !isValidUUID(dataToInsert.id))) {
        delete dataToInsert.id;
      }
      let { error } = await supabase.from('projects').upsert([dataToInsert]);
      if (error && dataToInsert.website_url !== undefined) {
        const { website_url, segment, amount_contracted, amount_received, ...fallbackData } = dataToInsert;
        const retry = await supabase.from('projects').upsert([fallbackData]);
        error = retry.error;
      }
      return !error;
    } catch {
      return false;
    }
  }

  public async updateProject(id: string, data: Partial<Project>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      let dataToUpdate: any = this.packMetadataIntoNotes(data, [
        'website_url',
        'segment',
        'client_name',
        'company_name',
        'services',
        'progress_percentage',
        'amount_contracted',
        'amount_received',
      ]);
      if (dataToUpdate.id && !isValidUUID(dataToUpdate.id)) {
        delete dataToUpdate.id;
      }
      let { error } = await supabase.from('projects').update(dataToUpdate).eq('id', id);
      if (error && dataToUpdate.website_url !== undefined) {
        const { website_url, segment, amount_contracted, amount_received, ...fallbackData } = dataToUpdate;
        const retry = await supabase.from('projects').update(fallbackData).eq('id', id);
        error = retry.error;
      }
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteProject(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('projects').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async getHistoricalProjects(): Promise<HistoricalProject[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('historical_projects')
        .select('*')
        .order('project_date', { ascending: false });
      if (error || !data) {
        console.error('Supabase getHistoricalProjects error:', error);
        return null;
      }
      return data.map((row) => this.parseMetadataFromNotes(row)) as HistoricalProject[];
    } catch (err) {
      console.error('Supabase getHistoricalProjects exception:', err);
      return null;
    }
  }

  public async insertHistoricalProject(project: HistoricalProject): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();

      // Remover ID mock (ex: 'hist-...') para que o Supabase gere o UUID
      let dataToInsert: any = this.packMetadataIntoNotes(project, ['website_url', 'segment']);
      if (dataToInsert.id && dataToInsert.id.startsWith('hist-')) {
        delete dataToInsert.id;
      }

      let { error } = await supabase.from('historical_projects').upsert([dataToInsert]);
      if (error && (dataToInsert.website_url !== undefined || dataToInsert.segment !== undefined)) {
        const { website_url, segment, ...fallbackData } = dataToInsert;
        const retry = await supabase.from('historical_projects').upsert([fallbackData]);
        error = retry.error;
      }
      if (error) console.error('Supabase insertHistoricalProject error:', error);
      return !error;
    } catch (err) {
      console.error('Supabase insertHistoricalProject exception:', err);
      return false;
    }
  }

  public async updateHistoricalProject(id: string, data: Partial<HistoricalProject>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();

      // Remover ID mock
      let dataToUpdate: any = this.packMetadataIntoNotes(data, ['website_url', 'segment']);
      if (dataToUpdate.id && dataToUpdate.id.startsWith('hist-')) {
        delete dataToUpdate.id;
      }

      let { error } = await supabase.from('historical_projects').update(dataToUpdate).eq('id', id);
      if (error && (dataToUpdate.website_url !== undefined || dataToUpdate.segment !== undefined)) {
        const { website_url, segment, ...fallbackData } = dataToUpdate;
        const retry = await supabase.from('historical_projects').update(fallbackData).eq('id', id);
        error = retry.error;
      }
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteHistoricalProject(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('historical_projects').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // TAREFAS
  // ============================================================================
  public async getTasks(): Promise<TaskItem[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        title: row.title || 'Tarefa',
        related_to: row.related_to || row.description || 'Operação EvoPixel',
        due_date: row.due_date || new Date().toISOString().split('T')[0],
        status: row.status || 'pendente',
        priority: row.priority || 'media',
      })) as TaskItem[];
    } catch {
      return null;
    }
  }

  public async insertTask(task: TaskItem): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const payload: any = {
        title: task.title,
        description: task.related_to || 'Operação EvoPixel',
        due_date: task.due_date,
        status: task.status || 'pendente',
        priority: task.priority || 'media',
      };
      if (task.id && isValidUUID(task.id)) {
        payload.id = task.id;
      }
      const { error } = await supabase.from('tasks').upsert([payload]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateTask(id: string, data: Partial<TaskItem>): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const payload: any = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.related_to !== undefined) payload.description = data.related_to;
      if (data.due_date !== undefined) payload.due_date = data.due_date;
      if (data.status !== undefined) payload.status = data.status;
      if (data.priority !== undefined) payload.priority = data.priority;
      const { error } = await supabase.from('tasks').update(payload).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteTask(id: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // LANÇAMENTOS FINANCEIROS
  // ============================================================================
  public async getTransactions(): Promise<FinancialTransaction[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('due_date', { ascending: false });
      if (error || !data) return null;
      return data.map((row: any) => {
        const parsed = this.parseMetadataFromNotes(row);
        return {
          id: parsed.id,
          title: parsed.title || 'Lançamento Financeiro',
          client_name: parsed.client_name || parsed.title || 'Cliente',
          category: parsed.category || 'Serviços',
          amount_contracted: Number(parsed.amount_contracted) || 0,
          amount_received: Number(parsed.amount_received) || 0,
          amount_pending: Number(parsed.amount_pending) || 0,
          due_date: parsed.due_date || new Date().toISOString().split('T')[0],
          status: parsed.status || 'pendente',
        } as FinancialTransaction;
      });
    } catch {
      return null;
    }
  }

  public async insertTransaction(tx: FinancialTransaction): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const packed = this.packMetadataIntoNotes(tx, ['client_name']);
      const payload: any = {
        title: tx.title,
        type: 'receita',
        category: tx.category || 'Serviços',
        amount_contracted: Number(tx.amount_contracted) || 0,
        amount_received: Number(tx.amount_received) || 0,
        amount_pending: Number(tx.amount_pending) || 0,
        due_date: tx.due_date,
        status: tx.status || 'pendente',
        notes: packed.notes,
      };
      if (tx.id && isValidUUID(tx.id)) {
        payload.id = tx.id;
      }
      const { error } = await supabase.from('financial_transactions').upsert([payload]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateTransaction(id: string, data: Partial<FinancialTransaction>): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const packed = this.packMetadataIntoNotes(data, ['client_name']);
      const payload: any = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.category !== undefined) payload.category = data.category;
      if (data.amount_contracted !== undefined) payload.amount_contracted = Number(data.amount_contracted) || 0;
      if (data.amount_received !== undefined) payload.amount_received = Number(data.amount_received) || 0;
      if (data.amount_pending !== undefined) payload.amount_pending = Number(data.amount_pending) || 0;
      if (data.due_date !== undefined) payload.due_date = data.due_date;
      if (data.status !== undefined) payload.status = data.status;
      if (packed.notes !== undefined) payload.notes = packed.notes;
      const { error } = await supabase.from('financial_transactions').update(payload).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !isValidUUID(id)) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // CATÁLOGO DE SERVIÇOS
  // ============================================================================
  public async getServices(): Promise<Service[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });
      if (error || !data) return null;
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description || '',
        base_price: Number(row.base_price) || 0,
        delivery_time_days: Number(row.delivery_time_days) || 7,
        status: row.status || 'ativo',
      })) as Service[];
    } catch {
      return null;
    }
  }

  public async insertService(service: Service): Promise<Service | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const payload: any = {
        name: service.name,
        category: service.category,
        description: service.description || '',
        base_price: Number(service.base_price) || 0,
        delivery_time_days: Number(service.delivery_time_days) || 7,
        status: service.status || 'ativo',
      };
      if (service.id && isValidUUID(service.id)) {
        payload.id = service.id;
      }
      const { data, error } = await supabase.from('services').upsert([payload]).select();
      if (error || !data || data.length === 0) return null;
      const row = data[0];
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description || '',
        base_price: Number(row.base_price) || 0,
        delivery_time_days: Number(row.delivery_time_days) || 7,
        status: row.status || 'ativo',
      };
    } catch {
      return null;
    }
  }

  public async updateService(id: string, data: Partial<Service>, originalName?: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) payload.name = data.name;
      if (data.category !== undefined) payload.category = data.category;
      if (data.description !== undefined) payload.description = data.description;
      if (data.base_price !== undefined) payload.base_price = Number(data.base_price) || 0;
      if (data.delivery_time_days !== undefined) payload.delivery_time_days = Number(data.delivery_time_days) || 7;
      if (data.status !== undefined) payload.status = data.status;

      if (isValidUUID(id)) {
        const { error } = await supabase.from('services').update(payload).eq('id', id);
        return !error;
      } else if (originalName) {
        const { error } = await supabase.from('services').update(payload).eq('name', originalName);
        return !error;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async deleteService(id: string, name?: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      if (isValidUUID(id)) {
        const { error } = await supabase.from('services').delete().eq('id', id);
        return !error;
      } else if (name) {
        const { error } = await supabase.from('services').delete().eq('name', name);
        return !error;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const dbService = new DatabaseService();
