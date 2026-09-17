import { getSupabase, isSupabaseConfigured } from './client';
import {
  Lead,
  Client,
  Prospect,
  Opportunity,
  MonthlyClient,
  Proposal,
  Contract,
  Project,
  HistoricalProject,
  TaskItem,
  FinancialTransaction,
} from '@/types/database';

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
      if (error || !data) return null;
      return data as Client[];
    } catch {
      return null;
    }
  }

  public async insertClient(client: Client): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('clients').upsert([client]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateClient(id: string, data: Partial<Client>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('clients').update(data).eq('id', id);
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
      const { error } = await supabase.from('monthly_clients').upsert([client]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateMonthlyClient(id: string, data: Partial<MonthlyClient>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('monthly_clients').update(data).eq('id', id);
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
        .order('score', { ascending: false });
      if (error || !data) return null;
      return data as Lead[];
    } catch {
      return null;
    }
  }

  public async insertLead(lead: Lead): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('leads').upsert([lead]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateLead(id: string, data: Partial<Lead>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('leads').update(data).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteLead(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('leads').delete().eq('id', id);
      return !error;
    } catch {
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

  // ============================================================================
  // OPORTUNIDADES / PIPELINE KANBAN
  // ============================================================================
  public async getOpportunities(): Promise<Opportunity[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('opportunities').select('*');
      if (error || !data) return null;
      return data as Opportunity[];
    } catch {
      return null;
    }
  }

  public async insertOpportunity(opportunity: Opportunity): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('opportunities').upsert([opportunity]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateOpportunityStage(id: string, stageSlug: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('opportunities')
        .update({ stage_slug: stageSlug, updated_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteOpportunity(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('opportunities').delete().eq('id', id);
      return !error;
    } catch {
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
  public async getProjects(): Promise<Project[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('projects').select('*');
      if (error || !data) return null;
      return data as Project[];
    } catch {
      return null;
    }
  }

  public async insertProject(project: Project): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('projects').upsert([project]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateProject(id: string, data: Partial<Project>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('projects').update(data).eq('id', id);
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
      if (error || !data) return null;
      return data as HistoricalProject[];
    } catch {
      return null;
    }
  }

  public async insertHistoricalProject(project: HistoricalProject): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('historical_projects').upsert([project]);
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
      return data as TaskItem[];
    } catch {
      return null;
    }
  }

  public async insertTask(task: TaskItem): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('tasks').upsert([task]);
      return !error;
    } catch {
      return false;
    }
  }

  public async updateTask(id: string, data: Partial<TaskItem>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('tasks').update(data).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteTask(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
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
      return data as FinancialTransaction[];
    } catch {
      return null;
    }
  }

  public async insertTransaction(tx: FinancialTransaction): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('financial_transactions').upsert([tx]);
      return !error;
    } catch {
      return false;
    }
  }
}

export const dbService = new DatabaseService();
