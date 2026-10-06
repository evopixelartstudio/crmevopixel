import {
  INITIAL_CLIENTS,
  INITIAL_CONTRATOS,
  INITIAL_FINANCIAL_TRANSACTIONS,
  INITIAL_FOLLOW_UPS,
  INITIAL_HISTORICAL_PROJECTS,
  INITIAL_INSIGHTS,
  INITIAL_LEADS,
  INITIAL_MESSAGE_LOGS,
  INITIAL_NICHES,
  INITIAL_OPPORTUNITIES,
  INITIAL_PROJECTS,
  INITIAL_PROPOSALS,
  INITIAL_SEQUENCES,
  INITIAL_SERVICES,
  INITIAL_TASKS,
  INITIAL_PROSPECTS,
  INITIAL_BUSINESS_CONTEXT,
  INITIAL_COMMERCIAL_GOALS,
  INITIAL_CONVERSATION_SUMMARIES,
  INITIAL_NEXT_BEST_ACTIONS,
  INITIAL_EVO_INSIGHTS,
  INITIAL_AI_COMMANDS,
  INITIAL_AI_ACTION_LOGS,
  INITIAL_MONTHLY_CLIENTS,
} from '@/lib/mock-data';
import {
  Client,
  Contract,
  FinancialTransaction,
  FollowUpItem,
  HistoricalProject,
  Lead,
  MessageLog,
  MessageSequence,
  Niche,
  Opportunity,
  Project,
  Proposal,
  Service,
  TaskItem,
  BusinessInsight,
  Prospect,
  BusinessContext,
  CommercialGoal,
  ConversationSummary,
  NextBestAction,
  EvoInsightItem,
  AICommand,
  AIActionLog,
  AIFeedback,
  MonthlyClient,
  MonthlyExpense,
  PaymentMethod,
} from '@/types/database';
import { dbService } from '@/lib/supabase/db-service';


const normStr = (s?: string | null): string => (s || '').trim().toLowerCase();

class CrmService {
  private services: Service[] = [...INITIAL_SERVICES];
  private niches: Niche[] = [...INITIAL_NICHES];
  private sequences: MessageSequence[] = [...INITIAL_SEQUENCES];
  private leads: Lead[] = [...INITIAL_LEADS];
  private opportunities: Opportunity[] = [];
  private clients: Client[] = [...INITIAL_CLIENTS];
  private proposals: Proposal[] = [...INITIAL_PROPOSALS];
  private contracts: Contract[] = [...INITIAL_CONTRATOS];
  private projects: Project[] = [...INITIAL_PROJECTS];
  private historicalProjects: HistoricalProject[] = [...INITIAL_HISTORICAL_PROJECTS];
  private followUps: FollowUpItem[] = [...INITIAL_FOLLOW_UPS];
  private tasks: TaskItem[] = [...INITIAL_TASKS];
  private transactions: FinancialTransaction[] = [...INITIAL_FINANCIAL_TRANSACTIONS];
  private monthlyExpenses: MonthlyExpense[] = [];
  private messageLogs: MessageLog[] = [...INITIAL_MESSAGE_LOGS];
  private insights: BusinessInsight[] = [...INITIAL_INSIGHTS];
  private prospects: Prospect[] = [...INITIAL_PROSPECTS];
  private monthlyClients: MonthlyClient[] = [...INITIAL_MONTHLY_CLIENTS];
  private businessContext: BusinessContext = { ...INITIAL_BUSINESS_CONTEXT };
  private commercialGoals: CommercialGoal = { ...INITIAL_COMMERCIAL_GOALS };
  private conversationSummaries: ConversationSummary[] = [...INITIAL_CONVERSATION_SUMMARIES];
  private nextBestActions: NextBestAction[] = [...INITIAL_NEXT_BEST_ACTIONS];
  private evoInsights: EvoInsightItem[] = [...INITIAL_EVO_INSIGHTS];
  private aiCommands: AICommand[] = [...INITIAL_AI_COMMANDS];
  private aiActionLogs: AIActionLog[] = [...INITIAL_AI_ACTION_LOGS];
  private aiFeedbacks: AIFeedback[] = [];
  private initializedFromSupabase = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
      this.initFromSupabase();
    }
  }

  private saveToLocalStorage(key: string, data: any): void {
    if (typeof window === 'undefined') return;
    if (key === 'opps') return; // Oportunidades são gerenciadas 100% via Supabase
    try {
      localStorage.setItem(`evocrm_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn(`Erro ao salvar ${key} no localStorage:`, e);
    }
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('evocrm_opps');
      const cachedLeads = localStorage.getItem('evocrm_leads');
      if (cachedLeads) {
        const parsed = JSON.parse(cachedLeads);
        if (Array.isArray(parsed)) {
          this.leads = parsed.map((l: any) => ({
            ...l,
            name: l.name || 'Contato',
            company_name: l.company_name || l.name || 'Empresa',
          }));
        }
      }
      const cachedClients = localStorage.getItem('evocrm_clients');
      if (cachedClients) {
        const parsed = JSON.parse(cachedClients);
        if (Array.isArray(parsed)) {
          this.clients = parsed.map((c: any) => ({
            ...c,
            name: c.name || c.company_name || 'Cliente',
            company_name: c.company_name || c.name || 'Empresa',
          }));
        }
      }
      const cachedProjects = localStorage.getItem('evocrm_projects');
      if (cachedProjects) {
        const parsed = JSON.parse(cachedProjects);
        if (Array.isArray(parsed)) {
          this.projects = parsed.map((p: any) => ({
            ...p,
            name: p.name || 'Projeto',
            company_name: p.company_name || p.client_name || p.name || 'Cliente',
            client_name: p.client_name || p.company_name || 'Contato',
            services: Array.isArray(p.services) ? p.services : [],
          }));
        }
      }
      const cachedHistorical = localStorage.getItem('evocrm_historical_projects');
      if (cachedHistorical) {
        const parsed = JSON.parse(cachedHistorical);
        if (Array.isArray(parsed)) {
          this.historicalProjects = parsed.map((hp: any) => ({
            ...hp,
            company_name: hp.company_name || hp.client_name || 'Cliente',
            client_name: hp.client_name || hp.company_name || 'Contato',
          }));
        }
      }
      const cachedMonthly = localStorage.getItem('evocrm_monthly_clients');
      if (cachedMonthly) {
        const parsed = JSON.parse(cachedMonthly);
        if (Array.isArray(parsed)) {
          this.monthlyClients = parsed.map((m: any) => ({
            ...m,
            company_name: m.company_name || m.client_name || 'Cliente',
            client_name: m.client_name || m.company_name || 'Contato',
          }));
        }
      }
      const cachedServices = localStorage.getItem('evocrm_services');
      if (cachedServices) {
        const parsed = JSON.parse(cachedServices);
        if (Array.isArray(parsed)) {
          this.services = parsed;
        }
      }
      const cachedTasks = localStorage.getItem('evocrm_tasks');
      if (cachedTasks) {
        const parsed = JSON.parse(cachedTasks);
        if (Array.isArray(parsed)) {
          this.tasks = parsed.map((t: any) => ({
            ...t,
            title: t.title || 'Tarefa',
            related_to: t.related_to || t.description || 'Operação EvoPixel',
            due_date: t.due_date || new Date().toISOString().split('T')[0],
            status: t.status || 'pendente',
            priority: t.priority || 'media',
          }));
        }
      }
      const cachedTransactions = localStorage.getItem('evocrm_transactions');
      if (cachedTransactions) {
        const parsed = JSON.parse(cachedTransactions);
        if (Array.isArray(parsed)) {
          this.transactions = parsed.map((t: any) => ({
            ...t,
            title: t.title || 'Lançamento',
            client_name: t.client_name || t.title || 'Cliente',
            amount_contracted: Number(t.amount_contracted) || 0,
            amount_received: Number(t.amount_received) || 0,
            amount_pending: Number(t.amount_pending) || 0,
            due_date: t.due_date || new Date().toISOString().split('T')[0],
          }));
        }
      }
      const cachedExpenses = localStorage.getItem('evocrm_monthly_expenses');
      if (cachedExpenses) {
        const parsed = JSON.parse(cachedExpenses);
        if (Array.isArray(parsed)) {
          this.monthlyExpenses = parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar do localStorage:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Erro no listener do crmService:', err);
      }
    });
  }

  public async initFromSupabase(force = false): Promise<void> {
    if (this.initializedFromSupabase && !force) return;
    try {
      const [
        clients,
        monthly,
        leads,
        prospects,
        opps,
        proposals,
        contracts,
        projects,
        historical,
        tasks,
        transactions,
        services,
      ] = await Promise.all([
        dbService.getClients(),
        dbService.getMonthlyClients(),
        dbService.getLeads(),
        dbService.getProspects(),
        dbService.getOpportunities(),
        dbService.getProposals(),
        dbService.getContracts(),
        dbService.getProjects(),
        dbService.getHistoricalProjects(),
        dbService.getTasks(),
        dbService.getTransactions(),
        dbService.getServices(),
      ]);

      let changed = false;
      const hasLocalServices =
        typeof window !== 'undefined' && localStorage.getItem('evocrm_services') !== null;
      if (!hasLocalServices && services && services.length > 0) {
        this.services = services;
        this.saveToLocalStorage('services', this.services);
        changed = true;
      }
      if (projects && projects.length > 0) {
        const localMap = new Map(this.projects.map(p => [p.id, p]));
        this.projects = projects.map(p => {
          const local = localMap.get(p.id);
          return {
            ...local,
            ...p,
            name: p.name || local?.name || 'Projeto',
            company_name: p.company_name || local?.company_name || p.client_name || p.name || 'Cliente',
            client_name: p.client_name || local?.client_name || p.company_name || 'Contato',
            services: Array.isArray(p.services) ? p.services : (local?.services || []),
            website_url: p.website_url || local?.website_url,
          };
        });
        this.saveToLocalStorage('projects', this.projects);
        changed = true;
      }
      if (historical && historical.length > 0) {
        const localMap = new Map(this.historicalProjects.map(p => [p.id, p]));
        this.historicalProjects = historical.map(p => {
          const local = localMap.get(p.id);
          return {
            ...local,
            ...p,
            company_name: p.company_name || local?.company_name || p.client_name || 'Cliente',
            client_name: p.client_name || local?.client_name || p.company_name || 'Contato',
            website_url: p.website_url || local?.website_url,
          };
        });
        this.saveToLocalStorage('historical_projects', this.historicalProjects);
        changed = true;
      }
      if (clients && clients.length > 0) { 
        const localClientMap = new Map(this.clients.map(c => [normStr(c.company_name), c]));
        this.clients = clients.map(c => {
          const cNorm = normStr(c.company_name);
          const local = localClientMap.get(cNorm);
          const completedProjSite =
            this.projects.find(p => p.status === 'concluido' && normStr(p.company_name) === cNorm && p.website_url)?.website_url ||
            this.historicalProjects.find(p => normStr(p.company_name) === cNorm && p.website_url)?.website_url;
          return {
            ...c,
            name: c.name || c.company_name || 'Cliente',
            company_name: c.company_name || c.name || 'Empresa',
            website_url: c.website_url || local?.website_url || completedProjSite,
          };
        });
        this.saveToLocalStorage('clients', this.clients);
        changed = true; 
      }
      if (monthly && monthly.length > 0) {
        this.monthlyClients = monthly;
        this.saveToLocalStorage('monthly_clients', this.monthlyClients);
        changed = true;
      }
      if (leads !== null) {
        this.leads = leads;
        this.saveToLocalStorage('leads', this.leads);
        changed = true;
      }
      if (prospects && prospects.length > 0) { this.prospects = prospects; changed = true; }
      if (opps !== null) {
        this.opportunities = opps;
        changed = true;
      }
      if (proposals && proposals.length > 0) { this.proposals = proposals; changed = true; }
      if (contracts && contracts.length > 0) { this.contracts = contracts; changed = true; }
      const hasLocalTasks =
        typeof window !== 'undefined' && localStorage.getItem('evocrm_tasks') !== null;
      if (!hasLocalTasks && tasks && tasks.length > 0) {
        this.tasks = tasks.map((t: any) => ({
          ...t,
          title: t.title || 'Tarefa',
          related_to: t.related_to || t.description || 'Operação EvoPixel',
        }));
        this.saveToLocalStorage('tasks', this.tasks);
        changed = true;
      }
      const hasLocalTx =
        typeof window !== 'undefined' && localStorage.getItem('evocrm_transactions') !== null;
      if (!hasLocalTx && transactions && transactions.length > 0) {
        this.transactions = transactions.map((t: any) => ({
          ...t,
          title: t.title || 'Lançamento',
          client_name: t.client_name || t.title || 'Cliente',
        }));
        this.saveToLocalStorage('transactions', this.transactions);
        changed = true;
      }

      this.initializedFromSupabase = true;
      if (changed) {
        this.notify();
      }
    } catch (err) {
      console.warn('Carregamento inicial do Supabase ignorado ou sem conexão:', err);
    }
  }

  // Dashboard Aggregates — Cálculos Estritamente Dinâmicos
  public getDashboardOverview(period: 'hoje' | '7d' | '30d' | '90d' | 'ano' | 'historico' = 'historico') {
    const isDateInPeriod = (dateStr: string | undefined): boolean => {
      if (!dateStr || period === 'historico') return true;
      const d = new Date(dateStr);
      const now = new Date();
      if (period === 'hoje') {
        return d.toDateString() === now.toDateString();
      } else if (period === '7d') {
        return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) && d <= now;
      } else if (period === '30d') {
        return d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) && d <= now;
      } else if (period === '90d') {
        return d >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) && d <= now;
      } else if (period === 'ano') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    const filteredHistorical = this.historicalProjects.filter((p) => isDateInPeriod(p.project_date));
    const filteredTransactions = this.transactions.filter(
      (t) =>
        isDateInPeriod(t.due_date) &&
        !filteredHistorical.some(
          (hp) =>
            normStr(hp.company_name) === normStr(t.client_name) &&
            hp.amount_contracted === t.amount_contracted &&
            hp.project_date === t.due_date
        )
    );

    const historicalReceived = filteredHistorical.reduce((acc, p) => acc + (p.amount_received || 0), 0);
    const activeReceived = filteredTransactions
      .filter((t) => t.status === 'pago')
      .reduce((acc, t) => acc + (t.amount_received || 0), 0);
    const monthlyPaidThisMonth = this.monthlyClients
      .filter((c) => c.status === 'ativo' && c.current_month_status === 'pago')
      .reduce((acc, c) => acc + (c.monthly_value || 0), 0);
    const totalAccumulated = historicalReceived + activeReceived + (['hoje','7d'].includes(period) ? 0 : monthlyPaidThisMonth);

    const historicalPending = filteredHistorical.reduce((acc, p) => acc + (p.amount_pending || 0), 0);
    const activePending = filteredTransactions
      .filter((t) => t.status !== 'pago')
      .reduce((acc, t) => acc + (t.amount_pending || 0), 0);
    const monthlyPendingThisMonth = this.monthlyClients
      .filter((c) => c.status === 'ativo' && c.current_month_status !== 'pago')
      .reduce((acc, c) => acc + (c.monthly_value || 0), 0);
    const totalPending = historicalPending + activePending + (['hoje','7d'].includes(period) ? 0 : monthlyPendingThisMonth);

    // Receita realizada no mês corrente
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMonthTxReceived = this.transactions
      .filter((t) => {
        if (t.status !== 'pago' || !t.due_date) return false;
        const d = new Date(t.due_date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((acc, t) => acc + (t.amount_received || 0), 0);
    const monthRevenue = currentMonthTxReceived + monthlyPaidThisMonth;

    const pipelineTotal = this.opportunities.reduce((acc, o) => acc + (o.estimated_value || 0), 0);
    const completedProjectsCount =
      this.historicalProjects.length + this.projects.filter((p) => p.status === 'concluido').length;
    const ticketMedio = completedProjectsCount > 0 ? Math.round(totalAccumulated / completedProjectsCount) : 0;

    // Itens de atenção gerados dinamicamente a partir dos dados reais
    const attentionItems: {
      id: string;
      index: string;
      type: string;
      title: string;
      target: string;
      detail: string;
      actionLabel: string;
      link: string;
    }[] = [];

    // 1. Leads quentes aguardando ação
    const hotLeads = this.leads.filter(
      (l) => l.temperature === 'quente' && l.status !== 'convertido' && l.status !== 'desqualificado'
    );
    hotLeads.slice(0, 2).forEach((l) => {
      attentionItems.push({
        id: `att-lead-${l.id}`,
        index: `0${attentionItems.length + 1}`,
        type: 'lead_hot',
        title: 'Lead quente aguardando ação',
        target: l.company_name || l.name || 'Lead',
        detail: l.segment || 'Sem interação recente',
        actionLabel: 'Abrir lead',
        link: `/leads/${l.id}`,
      });
    });

    // 2. Propostas pendentes de aceite
    const pendingProposals = this.proposals.filter(
      (p) => p.status === 'enviada' || p.status === 'visualizada'
    );
    pendingProposals.slice(0, 2).forEach((p) => {
      attentionItems.push({
        id: `att-prop-${p.id}`,
        index: `0${attentionItems.length + 1}`,
        type: 'proposal_pending',
        title: 'Proposta aguardando retorno',
        target: p.company_name || p.client_name || 'Cliente',
        detail: `R$ ${(Number(p.total) || 0).toLocaleString('pt-BR')}`,
        actionLabel: 'Ver proposta',
        link: '/propostas',
      });
    });

    // 3. Tarefas atrasadas
    const overdueTasks = this.tasks.filter((t) => t.status === 'atrasada');
    overdueTasks.slice(0, 2).forEach((t) => {
      attentionItems.push({
        id: `att-task-${t.id}`,
        index: `0${attentionItems.length + 1}`,
        type: 'followup_overdue',
        title: 'Tarefa pendente / atrasada',
        target: t.related_to || t.title || 'Tarefa',
        detail: `Prazo: ${t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : '—'}`,
        actionLabel: 'Ver tarefa',
        link: '/tarefas',
      });
    });

    // 4. Mensalidades atrasadas
    const overdueMonthly = this.monthlyClients.filter(
      (c) => c.status === 'inadimplente' || c.current_month_status === 'atrasado'
    );
    overdueMonthly.slice(0, 2).forEach((c) => {
      attentionItems.push({
        id: `att-month-${c.id}`,
        index: `0${attentionItems.length + 1}`,
        type: 'payment_overdue',
        title: 'Mensalidade atrasada',
        target: c.company_name || c.client_name || 'Cliente',
        detail: `R$ ${(Number(c.monthly_value) || 0).toLocaleString('pt-BR')} — Vencimento dia ${c.billing_day || 10}`,
        actionLabel: 'Ver mensalistas',
        link: '/mensalidades',
      });
    });

    return {
      faturamentoAcumulado: totalAccumulated,
      recebido: totalAccumulated,
      aReceber: totalPending,
      receitaMes: monthRevenue,
      pipelineAtual: pipelineTotal,
      ticketMedio: ticketMedio,
      attentionItems,
    };
  }

  // Leads
  public getLeads(): Lead[] {
    return this.leads;
  }

  public getLeadById(id: string): Lead | undefined {
    return this.leads.find(l => l.id === id);
  }

  public updateLeadStatus(id: string, status: Lead['status']): Lead | undefined {
    const lead = this.leads.find(l => l.id === id);
    if (lead) {
      lead.status = status;
      this.saveToLocalStorage('leads', this.leads);
      dbService.updateLead(id, { status });
      this.notify();
    }
    return lead;
  }

  public updateLead(id: string, data: Partial<Lead>): Lead | undefined {
    const lead = this.leads.find(l => l.id === id);
    if (lead) {
      Object.assign(lead, data);
      this.saveToLocalStorage('leads', this.leads);
      dbService.updateLead(id, data);
      this.notify();
    }
    return lead;
  }

  public addLead(leadData: Omit<Lead, 'id'>): Lead {
    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `lead-${Date.now()}`;
    const newLead: Lead = {
      ...leadData,
      id: generatedId,
    };
    this.leads.unshift(newLead);
    this.saveToLocalStorage('leads', this.leads);
    this.notify();

    dbService.insertLead(newLead).then((inserted) => {
      if (inserted && inserted.id && inserted.id !== newLead.id) {
        newLead.id = inserted.id;
        this.saveToLocalStorage('leads', this.leads);
        this.notify();
      }
    });

    return newLead;
  }

  public async addLeads(leadsData: Omit<Lead, 'id'>[]): Promise<void> {
    if (leadsData.length === 0) return;

    const newLeads: Lead[] = leadsData.map((leadData, index) => ({
      ...leadData,
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `lead-${Date.now()}-${index}`,
    }));
    this.leads.unshift(...newLeads);
    this.saveToLocalStorage('leads', this.leads);
    this.notify();

    const insertedLeads = await Promise.all(newLeads.map(l => dbService.insertLead(l)));
    let idsChanged = false;
    insertedLeads.forEach((inserted, index) => {
      if (inserted && inserted.id && inserted.id !== newLeads[index].id) {
        newLeads[index].id = inserted.id;
        idsChanged = true;
      }
    });
    if (idsChanged) {
      this.saveToLocalStorage('leads', this.leads);
      this.notify();
    }
  }

  public deleteLead(id: string): void {
    this.leads = this.leads.filter(l => l.id !== id);
    this.saveToLocalStorage('leads', this.leads);
    dbService.deleteLead(id);
    this.notify();
  }

  public deleteLeads(ids: string[]): void {
    const idSet = new Set(ids);
    this.leads = this.leads.filter(l => !idSet.has(l.id));
    this.saveToLocalStorage('leads', this.leads);
    dbService.deleteLeads(ids);
    this.notify();
  }

  // Sequências & Nichos (Seção 18.1 & 18.2)
  public getSequences(): MessageSequence[] {
    return this.sequences;
  }

  public getSequenceByNiche(nicheId: string): MessageSequence | undefined {
    return this.sequences.find(s => s.niche_id === nicheId);
  }

  public updateSequenceStepText(sequenceId: string, stepId: string, newText: string, waitDays?: number) {
    const seq = this.sequences.find(s => s.id === sequenceId);
    if (seq) {
      const step = seq.steps.find(st => st.id === stepId);
      if (step) {
        step.message_text = newText;
        if (waitDays !== undefined) step.wait_days = waitDays;
      }
    }
    return seq;
  }

  public pauseLeadSequence(leadId: string, reason: string) {
    const lead = this.leads.find(l => l.id === leadId);
    if (lead?.sequence_progress) {
      lead.sequence_progress.status = 'pausado';
      lead.sequence_progress.paused_reason = reason;
    }
    return lead;
  }

  public advanceLeadSequence(leadId: string) {
    const lead = this.leads.find(l => l.id === leadId);
    if (lead?.sequence_progress) {
      const currentOrder = lead.sequence_progress.current_step_order || 1;
      const nextOrder = currentOrder + 1;
      const seq = this.sequences.find(s => s.id === lead.sequence_progress?.sequence_id);
      const nextStep = seq?.steps.find(st => st.step_order === nextOrder);

      if (nextStep) {
        lead.sequence_progress.current_step_id = nextStep.id;
        lead.sequence_progress.current_step_name = nextStep.name;
        lead.sequence_progress.current_step_order = nextStep.step_order;
        lead.sequence_progress.status = 'aguardando_resposta';
        lead.sequence_progress.last_sent_at = new Date().toISOString();

        // Registra log da mensagem enviada
        this.messageLogs.unshift({
          id: `ml-${Date.now()}`,
          lead_id: lead.id,
          step_name: nextStep.name,
          channel: 'WhatsApp (Evolution API)',
          sent_text: nextStep.message_text
            .replace('{nome}', lead.name)
            .replace('{empresa}', lead.company_name)
            .replace('{cidade}', lead.city),
          direction: 'enviada',
          sent_at: new Date().toISOString(),
          source: 'automatica_n8n',
          status: 'entregue',
        });
      } else {
        lead.sequence_progress.status = 'concluido_sem_resposta';
        lead.temperature = 'frio';
      }
    }
    return lead;
  }

  // Pipeline Kanban
  public checkPropostaAutoFollowUp(): boolean {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    let modified = false;

    this.opportunities.forEach((opp) => {
      // Normalizar 'negociacao' legada para 'proposta'
      if (opp.stage_slug === 'negociacao') {
        opp.stage_slug = 'proposta';
        modified = true;
      }

      if (opp.stage_slug === 'proposta') {
        const enteredTime = opp.stage_entered_at
          ? new Date(opp.stage_entered_at).getTime()
          : (opp.updated_at ? new Date(opp.updated_at).getTime() : (opp.created_at ? new Date(opp.created_at).getTime() : now));

        if (!opp.stage_entered_at) {
          opp.stage_entered_at = new Date(enteredTime).toISOString();
        }

        // Se permaneceu por 24h ou mais em 'proposta', move automaticamente para 'follow_up'
        if (now - enteredTime >= TWENTY_FOUR_HOURS) {
          opp.stage_slug = 'follow_up';
          opp.stage_entered_at = new Date().toISOString();
          opp.updated_at = new Date().toISOString();
          opp.last_interaction = 'Transição automática para Follow-up após 24h em Proposta';
          dbService.updateOpportunityStage(opp.id, 'follow_up');
          modified = true;
        }
      }
    });

    if (modified) {
      this.saveToLocalStorage('opps', this.opportunities);
      this.notify();
    }
    return modified;
  }

  public getOpportunities(): Opportunity[] {
    this.checkPropostaAutoFollowUp();
    return this.opportunities;
  }

  private handleOpportunityEnteredProjectInProgress(opp: Opportunity): void {
    const projectLabel = (opp.company_name || opp.lead_name || opp.title || 'Cliente').trim();
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const standardChecklistTasks = [
      'Briefing',
      'Jogar no ar',
      'Testar botões e adaptabilidade',
      'Cadastrar no Google Analytics',
    ];

    // Inserir em ordem reversa com unshift para que 'Briefing' fique no topo
    [...standardChecklistTasks].reverse().forEach((taskTitle, idx) => {
      const alreadyExists = this.tasks.some(
        (t) =>
          normStr(t.related_to) === normStr(projectLabel) &&
          normStr(t.title) === normStr(taskTitle)
      );
      if (!alreadyExists) {
        const newTask: TaskItem = {
          id:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `tsk-${Date.now()}-${idx}`,
          title: taskTitle,
          related_to: projectLabel,
          due_date: dueDate,
          status: 'pendente',
          priority: 'alta',
        };
        this.tasks.unshift(newTask);
        dbService.insertTask(newTask);
      }
    });
    this.saveToLocalStorage('tasks', this.tasks);

    // Garantir também a criação do projeto ativo na aba Projetos se ainda não existir
    const existingProj = this.projects.find(
      (p) => normStr(p.company_name) === normStr(projectLabel) && p.status !== 'concluido'
    );
    if (!existingProj) {
      const lead = this.leads.find(
        (l) =>
          l.id === opp.lead_id ||
          normStr(l.company_name) === normStr(projectLabel)
      );
      this.addProject({
        client_name: opp.lead_name || lead?.name || projectLabel,
        company_name: projectLabel,
        segment: lead?.segment || 'Geral',
        name: opp.title || `Projeto - ${projectLabel}`,
        status: 'em_desenvolvimento',
        services: [
          {
            service_name:
              opp.services && opp.services.length > 0
                ? opp.services.join(' + ')
                : opp.title || 'Entrega Principal',
            checklist: standardChecklistTasks.map((item) => ({ item, completed: false })),
          },
        ],
        start_date: new Date().toISOString().split('T')[0],
        deadline: dueDate,
        progress_percentage: 0,
        website_url: lead?.website || undefined,
        amount_contracted: Number(opp.estimated_value) || 0,
        amount_received: 0,
      });
    }
  }

  private handleOpportunityClosed(opp: Opportunity): void {
    const companyName = (opp.company_name || opp.lead_name || 'Cliente').trim();
    const clientName = (opp.lead_name || opp.company_name || 'Contato Principal').trim();
    const projectValue = Number(opp.estimated_value) || 0;
    const today = new Date().toISOString().split('T')[0];
    const servicesSummary =
      opp.services && opp.services.length > 0
        ? opp.services.join(', ')
        : opp.title || 'Serviços Contratados';

    // 1. Atualizar status do Lead vinculado para 'convertido'
    const lead = this.leads.find(
      (l) =>
        l.id === opp.lead_id ||
        normStr(l.company_name) === normStr(companyName)
    );
    if (lead && lead.status !== 'convertido') {
      lead.status = 'convertido';
      this.saveToLocalStorage('leads', this.leads);
      dbService.updateLead(lead.id, { status: 'convertido' });
    }

    // 2. Registrar no Histórico (que também sincroniza/cria o Cliente em this.clients)
    const alreadyInHistory = this.historicalProjects.some(
      (hp) =>
        (hp.notes && hp.notes.includes(opp.id)) ||
        (normStr(hp.company_name) === normStr(companyName) &&
          hp.amount_contracted === projectValue &&
          hp.project_date === today)
    );
    if (!alreadyInHistory) {
      this.addHistoricalProject({
        client_name: lead?.name || clientName,
        company_name: companyName,
        segment: lead?.segment || 'Geral',
        services_summary: servicesSummary,
        amount_contracted: projectValue,
        amount_received: projectValue,
        amount_pending: 0,
        project_date: today,
        status: 'liquidado',
        website_url: lead?.website || undefined,
        notes: `Fechado automaticamente pelo Pipeline (${opp.id})`,
      });
    } else {
      // Garantir que o cliente exista na lista de clientes mesmo se já estava no histórico
      const existingClient = this.clients.find(
        (c) => normStr(c.company_name) === normStr(companyName)
      );
      if (!existingClient) {
        this.addClient({
          name: lead?.name || clientName,
          company_name: companyName,
          segment: lead?.segment || 'Geral',
          email: lead?.email,
          phone: lead?.phone,
          whatsapp: lead?.whatsapp,
          website_url: lead?.website,
          status: 'ativo',
          total_contracted: projectValue,
          total_received: projectValue,
          total_pending: 0,
          lifetime_value: projectValue,
          projects_count: 1,
          last_project_at: today,
        });
      }
    }

    // Enriquecer dados de contato do cliente a partir do Lead
    const clientRecord = this.clients.find(
      (c) => normStr(c.company_name) === normStr(companyName)
    );
    if (clientRecord && lead) {
      if (!clientRecord.email && lead.email) clientRecord.email = lead.email;
      if (!clientRecord.phone && lead.phone) clientRecord.phone = lead.phone;
      if (!clientRecord.whatsapp && lead.whatsapp) clientRecord.whatsapp = lead.whatsapp;
      if (!clientRecord.website_url && lead.website) clientRecord.website_url = lead.website;
      if ((!clientRecord.segment || clientRecord.segment === 'Geral') && lead.segment) {
        clientRecord.segment = lead.segment;
      }
      if ((!clientRecord.name || clientRecord.name === 'N/A') && (lead.name || clientName)) {
        clientRecord.name = lead.name || clientName;
      }
      this.saveToLocalStorage('clients', this.clients);
      dbService.updateClient(clientRecord.id, clientRecord);
    }

    // 3. Registrar nas Finanças (Lançamento Financeiro)
    const alreadyInFinance = this.transactions.some(
      (t) =>
        normStr(t.client_name) === normStr(companyName) &&
        t.amount_contracted === projectValue &&
        t.due_date === today
    );
    if (!alreadyInFinance) {
      this.addFinancialTransaction({
        title: opp.title || `Projeto - ${companyName}`,
        client_name: companyName,
        category: (opp.services && opp.services[0]) || 'Projeto Fechado',
        amount_contracted: projectValue,
        amount_received: projectValue,
        amount_pending: 0,
        due_date: today,
        status: 'pago',
      });
    }
  }

  public setOpportunitiesFromSupabase(opps: Opportunity[]): void {
    this.opportunities = opps;
    this.notify();
  }

  public triggerStageSideEffects(opp: Opportunity, newStageSlug: string): void {
    const slugNorm = (newStageSlug || '').toLowerCase();
    if (slugNorm.includes('andamento') || slugNorm === 'projeto_em_andamento') {
      this.handleOpportunityEnteredProjectInProgress(opp);
      this.notify();
    } else if (slugNorm.includes('fechado') || slugNorm.includes('ganho') || slugNorm === 'won') {
      this.handleOpportunityClosed(opp);
      this.notify();
    }
  }

  public updateOpportunityStage(id: string, newStageSlug: string): Opportunity | undefined {
    const opp = this.opportunities.find(o => o.id === id);
    if (opp) {
      const now = new Date().toISOString();
      opp.stage_slug = newStageSlug;
      opp.updated_at = now;
      opp.stage_entered_at = now;
      if (newStageSlug === 'fechado') {
        opp.probability = 100;
      } else if (newStageSlug === 'projeto_em_andamento') {
        opp.probability = 90;
      }
      dbService.updateOpportunityStage(id, newStageSlug);

      if (newStageSlug === 'projeto_em_andamento') {
        this.handleOpportunityEnteredProjectInProgress(opp);
      } else if (newStageSlug === 'fechado') {
        this.handleOpportunityClosed(opp);
      }

      this.notify();
    }
    return opp;
  }

  public addOpportunity(oppData: Omit<Opportunity, 'id'>): Opportunity {
    let newId = '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      newId = crypto.randomUUID();
    } else {
      newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    const now = new Date().toISOString();
    const newOpp: Opportunity = {
      ...oppData,
      id: newId,
      created_at: (oppData as any).created_at || now,
      updated_at: (oppData as any).updated_at || now,
      stage_entered_at: (oppData as any).stage_entered_at || now,
    };
    this.opportunities.unshift(newOpp);
    dbService.insertOpportunity(newOpp);
    this.saveToLocalStorage('opps', this.opportunities);

    // Quando o lead entra no Pipeline (ex: Primeiro Contato), marca como 'em_contato' e retira da fila inicial de Leads
    const linkedLead = this.leads.find(
      (l) => l.id === newOpp.lead_id || normStr(l.company_name) === normStr(newOpp.company_name)
    );
    if (linkedLead && linkedLead.status !== 'convertido') {
      linkedLead.status = 'em_contato';
      this.saveToLocalStorage('leads', this.leads);
      dbService.updateLead(linkedLead.id, { status: 'em_contato' });
    }

    if (newOpp.stage_slug === 'projeto_em_andamento') {
      this.handleOpportunityEnteredProjectInProgress(newOpp);
    } else if (newOpp.stage_slug === 'fechado') {
      this.handleOpportunityClosed(newOpp);
    }

    this.notify();
    return newOpp;
  }

  public updateOpportunity(id: string, data: Partial<Opportunity>): Opportunity | undefined {
    const opp = this.opportunities.find(o => o.id === id);
    if (!opp) return undefined;

    const previousStage = opp.stage_slug;
    const now = new Date().toISOString();
    Object.assign(opp, data, { updated_at: now });

    if (data.stage_slug && data.stage_slug !== previousStage) {
      opp.stage_entered_at = now;
      if (data.stage_slug === 'fechado') {
        opp.probability = 100;
      } else if (data.stage_slug === 'projeto_em_andamento') {
        opp.probability = 90;
      }
    }

    // Sincronizar alterações com o Lead vinculado, se existir
    const linkedLead = this.leads.find(
      (l) => l.id === opp.lead_id || normStr(l.company_name) === normStr(opp.company_name)
    );
    if (linkedLead) {
      if (data.company_name !== undefined) linkedLead.company_name = data.company_name;
      if (data.lead_name !== undefined) linkedLead.name = data.lead_name;
      if (data.temperature !== undefined) linkedLead.temperature = data.temperature;
      if (data.services !== undefined) linkedLead.services = data.services;
      this.saveToLocalStorage('leads', this.leads);
      dbService.updateLead(linkedLead.id, linkedLead);
    }

    this.saveToLocalStorage('opps', this.opportunities);
    dbService.updateOpportunity(id, opp);

    if (opp.stage_slug === 'projeto_em_andamento' && previousStage !== 'projeto_em_andamento') {
      this.handleOpportunityEnteredProjectInProgress(opp);
    } else if (opp.stage_slug === 'fechado' && previousStage !== 'fechado') {
      this.handleOpportunityClosed(opp);
    }

    this.notify();
    return opp;
  }

  public deleteOpportunity(id: string): void {
    const targetOpp = this.opportunities.find(o => o.id === id);
    this.opportunities = this.opportunities.filter(o => o.id !== id);
    dbService.deleteOpportunity(id);
    this.saveToLocalStorage('opps', this.opportunities);

    // Remover também o lead vinculado para que não volte a aparecer na lista de Leads
    if (targetOpp) {
      const matchingLead = this.leads.find(
        (l) => l.id === targetOpp.lead_id || normStr(l.company_name) === normStr(targetOpp.company_name)
      );
      if (matchingLead) {
        this.leads = this.leads.filter((l) => l.id !== matchingLead.id);
        this.saveToLocalStorage('leads', this.leads);
        dbService.deleteLead(matchingLead.id);
      }
    }

    this.notify();
  }

  // Nichos
  public getNiches(): Niche[] {
    return this.niches;
  }

  public addNiche(nicheData: Omit<Niche, 'id'>): Niche {
    const newNiche: Niche = {
      ...nicheData,
      id: `niche-${Date.now()}`,
    };
    this.niches.push(newNiche);
    this.notify();
    return newNiche;
  }

  public deleteNiche(id: string): void {
    this.niches = this.niches.filter(n => n.id !== id);
    this.notify();
  }

  // Serviços
  public getServices(): Service[] {
    return this.services;
  }

  public addService(serviceData: Omit<Service, 'id' | 'status'> & { status?: Service['status'] }): Service {
    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `srv-${Date.now()}`;
    const newService: Service = {
      name: serviceData.name,
      category: serviceData.category,
      description: serviceData.description || 'Serviço padrão da EvoPixel',
      base_price: Number(serviceData.base_price) || 0,
      delivery_time_days: Number(serviceData.delivery_time_days) || 7,
      status: serviceData.status || 'ativo',
      id: generatedId,
    };
    this.services.push(newService);
    this.saveToLocalStorage('services', this.services);
    this.notify();

    dbService.insertService(newService).then((inserted) => {
      if (inserted && inserted.id && inserted.id !== newService.id) {
        newService.id = inserted.id;
        this.saveToLocalStorage('services', this.services);
        this.notify();
      }
    });

    return newService;
  }

  public updateService(id: string, serviceData: Partial<Service>): boolean {
    const index = this.services.findIndex(s => s.id === id);
    if (index !== -1) {
      const originalName = this.services[index].name;
      this.services[index] = {
        ...this.services[index],
        ...serviceData,
        base_price:
          serviceData.base_price !== undefined
            ? Number(serviceData.base_price)
            : this.services[index].base_price,
        delivery_time_days:
          serviceData.delivery_time_days !== undefined
            ? Number(serviceData.delivery_time_days)
            : this.services[index].delivery_time_days,
      };
      this.saveToLocalStorage('services', this.services);
      dbService.updateService(id, this.services[index], originalName);
      this.notify();
      return true;
    }
    return false;
  }

  public deleteService(id: string): boolean {
    const target = this.services.find(s => s.id === id);
    const initialLength = this.services.length;
    this.services = this.services.filter(s => s.id !== id);
    if (this.services.length < initialLength) {
      this.saveToLocalStorage('services', this.services);
      dbService.deleteService(id, target?.name);
      this.notify();
      return true;
    }
    return false;
  }

  // Clientes
  public getClients(): Client[] {
    return this.clients;
  }

  public getClientById(id: string): Client | undefined {
    return this.clients.find(c => c.id === id);
  }

  public getClientWebsites(companyName: string, clientDirectWebsite?: string): string[] {
    const urls = new Set<string>();
    const normCompany = normStr(companyName);
    if (clientDirectWebsite && clientDirectWebsite.trim()) {
      urls.add(clientDirectWebsite.trim());
    }
    this.projects.forEach(p => {
      if (
        p.status === 'concluido' &&
        p.website_url &&
        p.website_url.trim() &&
        normStr(p.company_name) === normCompany
      ) {
        urls.add(p.website_url.trim());
      }
    });
    this.historicalProjects.forEach(hp => {
      if (
        hp.website_url &&
        hp.website_url.trim() &&
        normStr(hp.company_name) === normCompany
      ) {
        urls.add(hp.website_url.trim());
      }
    });
    return Array.from(urls);
  }

  public addClient(clientData: Omit<Client, 'id'>): Client {
    const newClient: Client = {
      ...clientData,
      id: `cli-${Date.now()}`,
    };
    this.clients.unshift(newClient);
    this.saveToLocalStorage('clients', this.clients);
    dbService.insertClient(newClient);
    this.notify();
    return newClient;
  }

  public updateClient(id: string, data: Partial<Client>): Client | undefined {
    const client = this.clients.find(c => c.id === id);
    if (client) {
      Object.assign(client, data);
      this.saveToLocalStorage('clients', this.clients);
      dbService.updateClient(id, data);
      this.notify();
    }
    return client;
  }

  public deleteClient(id: string): void {
    this.clients = this.clients.filter(c => c.id !== id);
    this.saveToLocalStorage('clients', this.clients);
    dbService.deleteClient(id);
    this.notify();
  }

  // Propostas & Contratos
  public getProposals(): Proposal[] {
    return this.proposals;
  }

  public addProposal(propData: Omit<Proposal, 'id'>): Proposal {
    const newProp: Proposal = {
      ...propData,
      id: `prop-${Date.now()}`,
    };
    this.proposals.unshift(newProp);
    dbService.insertProposal(newProp);
    this.notify();
    return newProp;
  }

  public updateProposalStatus(id: string, status: Proposal['status']): void {
    const prop = this.proposals.find(p => p.id === id);
    if (prop) {
      prop.status = status;
      dbService.updateProposal(id, { status });
      this.notify();
    }
  }

  public deleteProposal(id: string): void {
    this.proposals = this.proposals.filter(p => p.id !== id);
    dbService.deleteProposal(id);
    this.notify();
  }

  public getContracts(): Contract[] {
    return this.contracts;
  }

  public addContract(contractData: Omit<Contract, 'id'>): Contract {
    const newContract: Contract = {
      ...contractData,
      id: `cont-${Date.now()}`,
    };
    this.contracts.unshift(newContract);
    dbService.insertContract(newContract);
    this.notify();
    return newContract;
  }

  public createContractFromProposal(proposalId: string): Contract | null {
    const prop = this.proposals.find(p => p.id === proposalId);
    if (!prop) return null;
    prop.status = 'aceita';

    const newContract: Contract = {
      id: `cont-${Date.now()}`,
      code: `CONT-2026-${String(this.contracts.length + 1).padStart(3, '0')}`,
      company_name: prop.company_name,
      client_name: prop.client_name,
      services_summary: prop.items.map(i => i.service_name).join(' + '),
      total_amount: prop.total,
      status: 'aguardando_assinatura',
      start_date: new Date().toISOString().split('T')[0],
      signature_provider: 'Clicksign',
    };
    this.contracts.unshift(newContract);

    this.logAiAction({
      action_type: 'create',
      entity_type: 'contract',
      entity_id: newContract.id,
      entity_label: `Contrato ${newContract.code} gerado da proposta ${prop.code}`,
    });

    return newContract;
  }

  public signContract(id: string): void {
    const contract = this.contracts.find(c => c.id === id);
    if (contract) {
      contract.status = 'assinado';
      contract.signed_at = new Date().toISOString();
    }
  }

  // Projetos & Histórico
  public getProjects(): Project[] {
    return this.projects;
  }

  public addProject(projectData: Omit<Project, 'id'>): Project {
    const newProject: Project = {
      ...projectData,
      id: `proj-${Date.now()}`,
    };
    this.projects.unshift(newProject);
    this.saveToLocalStorage('projects', this.projects);
    dbService.insertProject(newProject);
    if (newProject.status === 'concluido') {
      this.syncClientWithCompletedProject(newProject);
    }
    this.notify();
    return newProject;
  }

  public updateProject(id: string, data: Partial<Project>): Project | undefined {
    const project = this.projects.find(p => p.id === id);
    if (project) {
      Object.assign(project, data);
      this.saveToLocalStorage('projects', this.projects);
      dbService.updateProject(id, project);
      if (project.status === 'concluido') {
        this.syncClientWithCompletedProject(project);
      }
      this.notify();
    }
    return project;
  }

  public completeProject(id: string, websiteUrl?: string): Project | undefined {
    const project = this.projects.find(p => p.id === id);
    if (project) {
      project.status = 'concluido';
      project.progress_percentage = 100;
      project.services.forEach(s => {
        s.checklist.forEach(c => {
          c.completed = true;
        });
      });
      if (websiteUrl !== undefined && websiteUrl.trim() !== '') {
        project.website_url = websiteUrl.trim();
      }
      this.saveToLocalStorage('projects', this.projects);
      dbService.updateProject(id, project);
      this.syncClientWithCompletedProject(project);
      this.notify();
    }
    return project;
  }

  public deleteProject(id: string): void {
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveToLocalStorage('projects', this.projects);
    dbService.deleteProject(id);
    this.notify();
  }

  public toggleProjectChecklist(projectId: string, serviceIndex: number, checkIndex: number): Project | undefined {
    const project = this.projects.find(p => p.id === projectId);
    if (project && project.services[serviceIndex]?.checklist[checkIndex]) {
      const item = project.services[serviceIndex].checklist[checkIndex];
      item.completed = !item.completed;

      // Recalcular porcentagem
      let totalItems = 0;
      let completedItems = 0;
      project.services.forEach(s => {
        s.checklist.forEach(c => {
          totalItems++;
          if (c.completed) completedItems++;
        });
      });
      project.progress_percentage = Math.round((completedItems / (totalItems || 1)) * 100);
      this.saveToLocalStorage('projects', this.projects);
      dbService.updateProject(projectId, project);
      this.notify();
    }
    return project;
  }

  public addHistoricalProject(project: Omit<HistoricalProject, 'id'>): HistoricalProject {
    const newProject: HistoricalProject = {
      ...project,
      id: `hist-${Date.now()}`,
    };
    this.historicalProjects.unshift(newProject);
    this.saveToLocalStorage('historical_projects', this.historicalProjects);
    dbService.insertHistoricalProject(newProject);
    this.syncClientWithHistoricalProject(newProject);
    this.notify();
    return newProject;
  }

  public updateHistoricalProject(id: string, data: Partial<HistoricalProject>): HistoricalProject | undefined {
    const proj = this.historicalProjects.find(p => p.id === id);
    if (proj) {
      Object.assign(proj, data);
      this.saveToLocalStorage('historical_projects', this.historicalProjects);
      dbService.updateHistoricalProject(id, proj);
      this.syncClientWithHistoricalProject(proj);
      this.notify();
    }
    return proj;
  }

  public deleteHistoricalProject(id: string): void {
    this.historicalProjects = this.historicalProjects.filter(p => p.id !== id);
    this.saveToLocalStorage('historical_projects', this.historicalProjects);
    dbService.deleteHistoricalProject(id);
    this.notify();
  }

  private syncClientWithCompletedProject(proj: Project) {
    let client = this.clients.find(
      c =>
        normStr(c.company_name) === normStr(proj.company_name) ||
        (c.name && proj.client_name && normStr(c.name) === normStr(proj.client_name))
    );

    const contracted = proj.amount_contracted || 0;
    const received = proj.amount_received !== undefined ? proj.amount_received : contracted;
    const pending = Math.max(0, contracted - received);

    if (!client) {
      this.addClient({
        name: proj.client_name || proj.company_name,
        company_name: proj.company_name,
        segment: proj.segment || 'Geral',
        website_url: proj.website_url,
        status: 'ativo',
        total_contracted: contracted,
        total_received: received,
        total_pending: pending,
        lifetime_value: received,
        projects_count: 1,
        last_project_at: proj.deadline || new Date().toISOString().split('T')[0],
      });
    } else {
      const normCompany = normStr(client.company_name);
      const histProjects = this.historicalProjects.filter(
        p => normStr(p.company_name) === normCompany
      );
      const completedActiveProjects = this.projects.filter(
        p => p.status === 'concluido' && normStr(p.company_name) === normCompany
      );

      const histContracted = histProjects.reduce((sum, p) => sum + (p.amount_contracted || 0), 0);
      const histReceived = histProjects.reduce((sum, p) => sum + (p.amount_received || 0), 0);
      const histPending = histProjects.reduce((sum, p) => sum + (p.amount_pending || 0), 0);

      const activeContracted = completedActiveProjects.reduce((sum, p) => sum + (p.amount_contracted || 0), 0);
      const activeReceived = completedActiveProjects.reduce(
        (sum, p) => sum + (p.amount_received !== undefined ? p.amount_received : (p.amount_contracted || 0)),
        0
      );
      const activePending = Math.max(0, activeContracted - activeReceived);

      client.total_contracted = histContracted + activeContracted;
      client.total_received = histReceived + activeReceived;
      client.total_pending = histPending + activePending;
      client.lifetime_value = client.total_received;
      client.projects_count = histProjects.length + completedActiveProjects.length;
      client.last_project_at = proj.deadline || new Date().toISOString().split('T')[0];
      if (proj.website_url) {
        client.website_url = proj.website_url;
      }
      if (proj.segment && (!client.segment || client.segment === 'Geral')) {
        client.segment = proj.segment;
      }
      this.saveToLocalStorage('clients', this.clients);
      dbService.updateClient(client.id, client);
    }
  }

  private syncClientWithHistoricalProject(proj: HistoricalProject) {
    let client = this.clients.find(
      c => normStr(c.company_name) === normStr(proj.company_name) || 
           (c.name && proj.client_name && normStr(c.name) === normStr(proj.client_name))
    );

    if (!client) {
      this.addClient({
        name: proj.client_name || 'N/A',
        company_name: proj.company_name,
        segment: proj.segment || 'Geral',
        website_url: proj.website_url,
        status: 'ativo',
        total_contracted: proj.amount_contracted || 0,
        total_received: proj.amount_received || 0,
        total_pending: proj.amount_pending || 0,
        lifetime_value: proj.amount_received || 0,
        projects_count: 1,
        last_project_at: proj.project_date,
      });
    } else {
      const normCompany = normStr(client.company_name);
      const histProjects = this.historicalProjects.filter(p => normStr(p.company_name) === normCompany);
      const completedActiveProjects = this.projects.filter(
        p => p.status === 'concluido' && normStr(p.company_name) === normCompany
      );
      const activeContracted = completedActiveProjects.reduce((sum, p) => sum + (p.amount_contracted || 0), 0);
      const activeReceived = completedActiveProjects.reduce(
        (sum, p) => sum + (p.amount_received !== undefined ? p.amount_received : (p.amount_contracted || 0)),
        0
      );
      const activePending = Math.max(0, activeContracted - activeReceived);

      client.total_contracted = histProjects.reduce((sum, p) => sum + (p.amount_contracted || 0), 0) + activeContracted;
      client.total_received = histProjects.reduce((sum, p) => sum + (p.amount_received || 0), 0) + activeReceived;
      client.total_pending = histProjects.reduce((sum, p) => sum + (p.amount_pending || 0), 0) + activePending;
      client.lifetime_value = client.total_received;
      client.projects_count = histProjects.length + completedActiveProjects.length;
      client.last_project_at = proj.project_date;
      if (proj.website_url) {
        client.website_url = proj.website_url;
      }
      if (proj.segment && (!client.segment || client.segment === 'Geral')) {
        client.segment = proj.segment;
      }
      this.saveToLocalStorage('clients', this.clients);
      dbService.updateClient(client.id, client);
    }
  }

  public getHistoricalProjects(): HistoricalProject[] {
    return this.historicalProjects;
  }

  // Meu Histórico (Seção 31) — Cálculos Dinâmicos
  public getMinhaHistoriaData() {
    const nonDuplicateTx = this.transactions.filter(
      (t) =>
        !this.historicalProjects.some(
          (hp) =>
            normStr(hp.company_name) === normStr(t.client_name) &&
            hp.amount_contracted === t.amount_contracted &&
            hp.project_date === t.due_date
        )
    );

    const allProjectsCount = this.historicalProjects.length + this.projects.length;
    const clientsCount = this.clients.length;
    const totalContracted =
      this.historicalProjects.reduce((acc, p) => acc + (p.amount_contracted || 0), 0) +
      nonDuplicateTx.reduce((acc, t) => acc + (t.amount_contracted || 0), 0);
    const totalReceived =
      this.historicalProjects.reduce((acc, p) => acc + (p.amount_received || 0), 0) +
      nonDuplicateTx.filter((t) => t.status === 'pago').reduce((acc, t) => acc + (t.amount_received || 0), 0);
    const totalPending =
      this.historicalProjects.reduce((acc, p) => acc + (p.amount_pending || 0), 0) +
      nonDuplicateTx.filter((t) => t.status !== 'pago').reduce((acc, t) => acc + (t.amount_pending || 0), 0);

    const yearlyMap: Record<string, { contracted: number; received: number; pending: number; projects: number }> = {};
    this.historicalProjects.forEach((hp) => {
      const yr = hp.project_date ? new Date(hp.project_date).getFullYear().toString() : `${new Date().getFullYear()}`;
      if (!yearlyMap[yr]) yearlyMap[yr] = { contracted: 0, received: 0, pending: 0, projects: 0 };
      yearlyMap[yr].contracted += hp.amount_contracted || 0;
      yearlyMap[yr].received += hp.amount_received || 0;
      yearlyMap[yr].pending += hp.amount_pending || 0;
      yearlyMap[yr].projects += 1;
    });

    const yearlyEvolution =
      Object.keys(yearlyMap).length > 0
        ? Object.entries(yearlyMap).map(([year, d]) => ({ year, ...d }))
        : [
            { year: '2023', contracted: 0, received: 0, pending: 0, projects: 0 },
            { year: '2024', contracted: 0, received: 0, pending: 0, projects: 0 },
            { year: '2025', contracted: 0, received: 0, pending: 0, projects: 0 },
            { year: '2026', contracted: 0, received: 0, pending: 0, projects: 0 },
          ];

    return {
      faturamentoAcumulado: totalReceived,
      contratadoAcumulado: totalContracted,
      pendenteAcumulado: totalPending,
      projetosRealizados: allProjectsCount,
      clientesAtendidos: clientsCount,
      ticketMedio: allProjectsCount > 0 ? Math.round(totalReceived / allProjectsCount) : 0,
      melhorAno: Object.keys(yearlyMap).length > 0 ? Object.keys(yearlyMap)[0] : '—',
      melhorMes: '—',
      servicoMaisRentavel: this.services.length > 0 ? this.services[0].name : '—',
      clienteMaisValioso: this.clients.length > 0 ? this.clients[0].company_name : '—',
      yearlyEvolution,
    };
  }

  // Evolução Mensal do Faturamento (12 meses do ano corrente)
  public getMonthlyEvolution() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();

    const months = [
      { key: 0, label: 'Jan', fullName: 'Janeiro' },
      { key: 1, label: 'Fev', fullName: 'Fevereiro' },
      { key: 2, label: 'Mar', fullName: 'Março' },
      { key: 3, label: 'Abr', fullName: 'Abril' },
      { key: 4, label: 'Mai', fullName: 'Maio' },
      { key: 5, label: 'Jun', fullName: 'Junho' },
      { key: 6, label: 'Jul', fullName: 'Julho' },
      { key: 7, label: 'Ago', fullName: 'Agosto' },
      { key: 8, label: 'Set', fullName: 'Setembro' },
      { key: 9, label: 'Out', fullName: 'Outubro' },
      { key: 10, label: 'Nov', fullName: 'Novembro' },
      { key: 11, label: 'Dez', fullName: 'Dezembro' },
    ];

    const activeMRR = this.monthlyClients
      .filter((c) => c.status === 'ativo')
      .reduce((acc, c) => acc + (c.monthly_value || 0), 0);

    return months.map((m) => {
      // Transações pagas do mês (desconsiderando duplicatas já lançadas no histórico)
      const txRevenue = this.transactions
        .filter((t) => {
          if (t.status !== 'pago') return false;
          const d = new Date(t.due_date);
          if (d.getFullYear() !== currentYear || d.getMonth() !== m.key) return false;
          const isDuplicatedInHist = this.historicalProjects.some(
            (hp) =>
              normStr(hp.company_name) === normStr(t.client_name) &&
              hp.amount_contracted === t.amount_contracted &&
              hp.project_date === t.due_date
          );
          return !isDuplicatedInHist;
        })
        .reduce((acc, t) => acc + (t.amount_received || 0), 0);

      // Histórico do mês
      const histRevenue = this.historicalProjects
        .filter((hp) => {
          if (!hp.project_date) return false;
          const d = new Date(hp.project_date);
          return d.getFullYear() === currentYear && d.getMonth() === m.key;
        })
        .reduce((acc, hp) => acc + (hp.amount_received || 0), 0);

      // Mensalistas do mês
      const monthlyRevenue = m.key <= currentMonthIdx ? activeMRR : 0;
      const total = txRevenue + histRevenue + monthlyRevenue;

      return {
        month: m.label,
        fullName: m.fullName,
        value: total,
        isCurrent: m.key === currentMonthIdx,
      };
    });
  }

  // Clientes Mensalistas / Recorrência (MRR)
  public getMonthlyClients(): MonthlyClient[] {
    return this.monthlyClients;
  }

  public getMonthlyClientById(id: string): MonthlyClient | undefined {
    return this.monthlyClients.find((c) => c.id === id);
  }

  public addMonthlyClient(data: Omit<MonthlyClient, 'id'>): MonthlyClient {
    const newClient: MonthlyClient = {
      ...data,
      id: `mth-${Date.now()}`,
    };
    this.monthlyClients.unshift(newClient);
    this.saveToLocalStorage('monthly_clients', this.monthlyClients);
    dbService.insertMonthlyClient(newClient);
    this.notify();
    return newClient;
  }

  public updateMonthlyClient(id: string, data: Partial<MonthlyClient>): MonthlyClient | undefined {
    const client = this.monthlyClients.find((c) => c.id === id);
    if (client) {
      Object.assign(client, data);
      this.saveToLocalStorage('monthly_clients', this.monthlyClients);
      dbService.updateMonthlyClient(id, data);
      this.notify();
    }
    return client;
  }

  public deleteMonthlyClient(id: string): void {
    this.monthlyClients = this.monthlyClients.filter((c) => c.id !== id);
    this.saveToLocalStorage('monthly_clients', this.monthlyClients);
    dbService.deleteMonthlyClient(id);
    this.notify();
  }

  public toggleMonthlyPaymentStatus(
    id: string,
    status: 'pago' | 'pendente' | 'atrasado'
  ): MonthlyClient | undefined {
    const client = this.monthlyClients.find((c) => c.id === id);
    if (client) {
      client.current_month_status = status;
      if (status === 'pago') {
        client.last_payment_date = new Date().toISOString().split('T')[0];
      }
      this.saveToLocalStorage('monthly_clients', this.monthlyClients);
      dbService.updateMonthlyClient(id, {
        current_month_status: client.current_month_status,
        last_payment_date: client.last_payment_date,
      });
      this.notify();
    }
    return client;
  }

  public getMonthlySubscriptionsSummary() {
    const activeClients = this.monthlyClients.filter((c) => c.status === 'ativo');
    const mrr = activeClients.reduce((acc, c) => acc + (c.monthly_value || 0), 0);
    const arr = mrr * 12;
    const paidThisMonth = activeClients
      .filter((c) => c.current_month_status === 'pago')
      .reduce((acc, c) => acc + (c.monthly_value || 0), 0);
    const pendingThisMonth = activeClients
      .filter((c) => c.current_month_status !== 'pago')
      .reduce((acc, c) => acc + (c.monthly_value || 0), 0);

    return {
      mrr,
      arr,
      totalActive: activeClients.length,
      paidThisMonth,
      pendingThisMonth,
    };
  }

  // Financeiro (Seção 32) & Gastos Mensais
  public getFinancialTransactions(): FinancialTransaction[] {
    return this.transactions;
  }

  public getTransactions(): FinancialTransaction[] {
    return this.transactions;
  }

  public addFinancialTransaction(
    txData: Omit<FinancialTransaction, 'id'>,
    options?: { auto_create_expense?: boolean }
  ): FinancialTransaction {
    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `fin-${Date.now()}`;
    const newTx: FinancialTransaction = {
      ...txData,
      id: generatedId,
    };
    this.transactions.unshift(newTx);
    this.saveToLocalStorage('transactions', this.transactions);
    dbService.insertTransaction(newTx);

    // Se houver taxa e a opção de gerar despesa estiver ativada, lança a saída operacional automaticamente
    if (options?.auto_create_expense && newTx.fee_amount && newTx.fee_amount > 0) {
      const pMethod = newTx.payment_method || 'Mercado Pago';
      this.addMonthlyExpense({
        title: `Taxa Gateway (${pMethod}) — ${newTx.title}`,
        category: 'Taxas Bancárias / Gateway (Mercado Pago)',
        amount: Number(newTx.fee_amount) || 0,
        due_day: new Date(newTx.due_date || new Date()).getDate() || 10,
        due_date: newTx.due_date || new Date().toISOString().split('T')[0],
        recurring: false,
        status: 'pago',
        notes: `Retenção de taxa de gateway na entrada de ${newTx.client_name}. Bruto: R$ ${newTx.gross_amount || newTx.amount_contracted}, Líquido: R$ ${newTx.net_amount || ((newTx.gross_amount || newTx.amount_contracted) - (newTx.fee_amount || 0))}.`,
      });
    }

    this.notify();
    return newTx;
  }

  public settleFinancialTransaction(
    id: string,
    settlement: {
      payment_method: PaymentMethod;
      gross_amount: number;
      fee_amount: number;
      net_amount: number;
      payment_date?: string;
      auto_create_expense?: boolean;
    }
  ): FinancialTransaction | undefined {
    const tx = this.transactions.find((t) => t.id === id);
    if (!tx) return undefined;

    const pDate = settlement.payment_date || new Date().toISOString().split('T')[0];
    tx.status = 'pago';
    tx.payment_method = settlement.payment_method;
    tx.gross_amount = settlement.gross_amount;
    tx.fee_amount = settlement.fee_amount;
    tx.net_amount = settlement.net_amount;
    tx.amount_received = settlement.gross_amount;
    tx.amount_pending = 0;
    tx.payment_date = pDate;

    this.saveToLocalStorage('transactions', this.transactions);
    dbService.updateTransaction(id, tx);

    if (settlement.auto_create_expense && settlement.fee_amount > 0) {
      this.addMonthlyExpense({
        title: `Taxa Gateway (${settlement.payment_method}) — ${tx.title}`,
        category: 'Taxas Bancárias / Gateway (Mercado Pago)',
        amount: settlement.fee_amount,
        due_day: new Date(pDate).getDate() || 10,
        due_date: pDate,
        recurring: false,
        status: 'pago',
        notes: `Retenção automática de gateway na liquidação do cliente ${tx.client_name}. Bruto: R$ ${settlement.gross_amount}, Líquido: R$ ${settlement.net_amount}.`,
      });
    }

    this.notify();
    return tx;
  }

  public settleHistoricalProject(
    id: string,
    settlement: {
      payment_method: PaymentMethod;
      gross_amount: number;
      fee_amount: number;
      net_amount: number;
      payment_date?: string;
      auto_create_expense?: boolean;
    }
  ): HistoricalProject | undefined {
    const proj = this.historicalProjects.find((p) => p.id === id);
    if (!proj) return undefined;

    const pDate = settlement.payment_date || proj.project_date || new Date().toISOString().split('T')[0];
    proj.status = 'concluido';
    proj.amount_contracted = settlement.gross_amount;
    proj.amount_received = settlement.gross_amount;
    proj.amount_pending = 0;

    const metaTag = `[GATEWAY:${settlement.payment_method}|GROSS:${settlement.gross_amount}|FEE:${settlement.fee_amount}|NET:${settlement.net_amount}|DATE:${pDate}]`;
    const cleanDesc = (proj.notes || '').replace(/\[GATEWAY:[^\]]+\]/g, '').trim();
    proj.notes = cleanDesc ? `${cleanDesc} ${metaTag}` : metaTag;

    this.saveToLocalStorage('historical_projects', this.historicalProjects);
    dbService.updateHistoricalProject(id, proj);
    this.syncClientWithHistoricalProject(proj);

    if (settlement.auto_create_expense && settlement.fee_amount > 0) {
      this.addMonthlyExpense({
        title: `Taxa Gateway (${settlement.payment_method}) — ${proj.company_name}`,
        category: 'Taxas Bancárias / Gateway (Mercado Pago)',
        amount: settlement.fee_amount,
        due_day: new Date(pDate).getDate() || 10,
        due_date: pDate,
        recurring: false,
        status: 'pago',
        notes: `Retenção automática de gateway na liquidação do projeto ${proj.company_name}. Bruto: R$ ${settlement.gross_amount}, Líquido: R$ ${settlement.net_amount}.`,
      });
    }

    this.notify();
    return proj;
  }

  public updateFinancialTransaction(
    id: string,
    data: Partial<FinancialTransaction>
  ): FinancialTransaction | undefined {
    const tx = this.transactions.find((t) => t.id === id);
    if (tx) {
      Object.assign(tx, data);
      this.saveToLocalStorage('transactions', this.transactions);
      dbService.updateTransaction(id, tx);
      this.notify();
    }
    return tx;
  }

  public toggleFinancialTransactionStatus(id: string): FinancialTransaction | undefined {
    const tx = this.transactions.find((t) => t.id === id);
    if (tx) {
      if (tx.status === 'pago') {
        tx.status = 'pendente';
        tx.amount_received = 0;
        tx.amount_pending = tx.amount_contracted;
      } else {
        tx.status = 'pago';
        tx.amount_received = tx.amount_contracted;
        tx.amount_pending = 0;
      }
      this.saveToLocalStorage('transactions', this.transactions);
      dbService.updateTransaction(id, tx);
      this.notify();
    }
    return tx;
  }

  public deleteFinancialTransaction(id: string): void {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.saveToLocalStorage('transactions', this.transactions);
    dbService.deleteTransaction(id);
    this.notify();
  }

  // Gastos Mensais / Despesas Operacionais
  public getMonthlyExpenses(): MonthlyExpense[] {
    return this.monthlyExpenses;
  }

  public addMonthlyExpense(data: Omit<MonthlyExpense, 'id'>): MonthlyExpense {
    const newExpense: MonthlyExpense = {
      ...data,
      id: `exp-${Date.now()}`,
    };
    this.monthlyExpenses.unshift(newExpense);
    this.saveToLocalStorage('monthly_expenses', this.monthlyExpenses);
    this.notify();
    return newExpense;
  }

  public updateMonthlyExpense(
    id: string,
    data: Partial<MonthlyExpense>
  ): MonthlyExpense | undefined {
    const exp = this.monthlyExpenses.find((e) => e.id === id);
    if (exp) {
      Object.assign(exp, data);
      this.saveToLocalStorage('monthly_expenses', this.monthlyExpenses);
      this.notify();
    }
    return exp;
  }

  public toggleMonthlyExpenseStatus(id: string): MonthlyExpense | undefined {
    const exp = this.monthlyExpenses.find((e) => e.id === id);
    if (exp) {
      exp.status = exp.status === 'pago' ? 'pendente' : 'pago';
      this.saveToLocalStorage('monthly_expenses', this.monthlyExpenses);
      this.notify();
    }
    return exp;
  }

  public deleteMonthlyExpense(id: string): void {
    this.monthlyExpenses = this.monthlyExpenses.filter((e) => e.id !== id);
    this.saveToLocalStorage('monthly_expenses', this.monthlyExpenses);
    this.notify();
  }

  public getFinancialSummary() {
    const nonDuplicateTx = this.transactions.filter(
      (t) =>
        !this.historicalProjects.some(
          (hp) =>
            normStr(hp.company_name) === normStr(t.client_name) &&
            hp.amount_contracted === t.amount_contracted &&
            hp.project_date === t.due_date
        )
    );

    const histContratado = this.historicalProjects.reduce((acc, p) => acc + (p.amount_contracted || 0), 0);
    const histRecebido = this.historicalProjects.reduce((acc, p) => acc + (p.amount_received || 0), 0);
    const histPendente = this.historicalProjects.reduce((acc, p) => acc + (p.amount_pending || 0), 0);

    const txContratado = nonDuplicateTx.reduce((acc, t) => acc + (t.amount_contracted || 0), 0);
    const txRecebido = nonDuplicateTx
      .filter((t) => t.status === 'pago')
      .reduce((acc, t) => acc + (t.amount_received || 0), 0);
    const txPendente = nonDuplicateTx
      .filter((t) => t.status !== 'pago')
      .reduce((acc, t) => acc + (t.amount_pending || 0), 0);

    const contratado = histContratado + txContratado;
    const recebido = histRecebido + txRecebido;
    const pendente = histPendente + txPendente;

    const gastosMensais = this.monthlyExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const gastosPagos = this.monthlyExpenses
      .filter((e) => e.status === 'pago')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const gastosPendentes = this.monthlyExpenses
      .filter((e) => e.status !== 'pago')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const saldoLiquido = recebido - gastosMensais;

    return {
      contratado,
      recebido,
      pendente,
      gastosMensais,
      gastosPagos,
      gastosPendentes,
      saldoLiquido,
    };
  }

  // Follow-ups & Tarefas
  public getFollowUps(): FollowUpItem[] {
    return this.followUps;
  }

  public completeFollowUp(id: string): void {
    const fu = this.followUps.find(f => f.id === id);
    if (fu) fu.status = 'concluido';
  }

  public addFollowUp(itemData: Omit<FollowUpItem, 'id'>): FollowUpItem {
    const newFu: FollowUpItem = {
      ...itemData,
      id: `fu-${Date.now()}`,
    };
    this.followUps.unshift(newFu);
    return newFu;
  }

  public getTasks(): TaskItem[] {
    return this.tasks;
  }

  public toggleTaskStatus(id: string): void {
    const t = this.tasks.find(tk => tk.id === id);
    if (t) {
      t.status = t.status === 'concluida' ? 'pendente' : 'concluida';
      this.saveToLocalStorage('tasks', this.tasks);
      dbService.updateTask(id, { status: t.status });
      this.notify();
    }
  }

  public addTask(taskData: Omit<TaskItem, 'id'>): TaskItem {
    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tsk-${Date.now()}`;
    const newTask: TaskItem = {
      ...taskData,
      id: generatedId,
    };
    this.tasks.unshift(newTask);
    this.saveToLocalStorage('tasks', this.tasks);
    dbService.insertTask(newTask);
    this.notify();
    return newTask;
  }

  public deleteTask(id: string): void {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveToLocalStorage('tasks', this.tasks);
    dbService.deleteTask(id);
    this.notify();
  }

  // Logs & Insights
  public getMessageLogs(leadId?: string): MessageLog[] {
    if (leadId) {
      return this.messageLogs.filter(m => m.lead_id === leadId);
    }
    return this.messageLogs;
  }

  public addMessageLog(logData: Omit<MessageLog, 'id'>): MessageLog {
    const newLog: MessageLog = {
      ...logData,
      id: `ml-${Date.now()}`,
    };
    this.messageLogs.unshift(newLog);
    return newLog;
  }

  public getInsights(): BusinessInsight[] {
    return this.insights;
  }

  // ============================================================================
  // EVOLUÇÃO — PROSPECTS (PROSPECÇÃO PURA vs LEADS vs OPORTUNIDADES)
  // ============================================================================
  public getProspects(): Prospect[] {
    return this.prospects;
  }

  public getProspectById(id: string): Prospect | undefined {
    return this.prospects.find(p => p.id === id);
  }

  public updateProspectStatus(id: string, status: Prospect['status']): Prospect | undefined {
    const prospect = this.prospects.find(p => p.id === id);
    if (prospect) {
      prospect.status = status;
      prospect.updated_at = new Date().toISOString();
      dbService.updateProspectStatus(id, status);
      this.notify();
    }
    return prospect;
  }

  public addProspect(prospectData: Omit<Prospect, 'id'>): Prospect {
    const newProspect: Prospect = {
      ...prospectData,
      id: `prp-${Date.now()}`,
    };
    this.prospects.unshift(newProspect);
    dbService.insertProspect(newProspect);
    this.notify();
    return newProspect;
  }

  public deleteProspect(id: string): void {
    this.prospects = this.prospects.filter(p => p.id !== id);
    dbService.deleteProspect(id);
    this.notify();
  }

  public deleteProspects(ids: string[]): void {
    const idSet = new Set(ids);
    this.prospects = this.prospects.filter(p => !idSet.has(p.id));
    ids.forEach(id => dbService.deleteProspect(id));
    this.notify();
  }

  public convertProspectToLead(prospectId: string): Lead | undefined {
    const prospect = this.prospects.find(p => p.id === prospectId);
    if (!prospect) return undefined;

    // Criar o novo Lead correspondente sem duplicar
    const newLead: Lead = {
      id: `lead-conv-${Date.now()}`,
      name: prospect.nome,
      company_name: prospect.empresa,
      role: 'Decisor / Contato Principal',
      segment: prospect.segment,
      email: prospect.email,
      phone: prospect.telefone,
      whatsapp: prospect.whatsapp,
      instagram: prospect.instagram,
      website: prospect.site,
      city: prospect.cidade,
      state: prospect.estado,
      score: prospect.icp_score,
      temperature: prospect.icp_score >= 85 ? 'quente' : 'morno',
      status: 'novo',
      services: [prospect.suggested_service],
      notes: `Convertido de Prospect. Sinais identificados: ${prospect.identified_signals.join('; ')}`,
      last_contact_at: new Date().toISOString(),
      ai_analysis: {
        data_points: prospect.identified_signals,
        inferences: ['Empresa com demanda urgente de modernização de presença e atendimento.'],
        recommendations: [`Apresentar ${prospect.suggested_service} com foco em ROI.`],
        main_hook: `Vimos que seu atendimento no WhatsApp pode ser potencializado com ${prospect.suggested_service}.`,
        should_approach: true,
      },
    };

    this.leads.unshift(newLead);
    prospect.status = 'converted_to_lead';
    prospect.converted_lead_id = newLead.id;
    prospect.updated_at = new Date().toISOString();

    return newLead;
  }

  // ============================================================================
  // CONTEXTO OPERACIONAL & METAS
  // ============================================================================
  public getBusinessContext(): BusinessContext {
    return this.businessContext;
  }

  public getCommercialGoals(): CommercialGoal {
    return this.commercialGoals;
  }

  public updateCommercialGoals(update: Partial<CommercialGoal>): CommercialGoal {
    this.commercialGoals = {
      ...this.commercialGoals,
      ...update,
    };
    return this.commercialGoals;
  }

  // ============================================================================
  // INTELIGÊNCIA: EVO DIZ, PRÓXIMAS AÇÕES & RESUMOS
  // ============================================================================
  public getEvoInsights(): EvoInsightItem[] {
    return this.evoInsights;
  }

  public getNextBestActions(): NextBestAction[] {
    return this.nextBestActions;
  }

  public getConversationSummaries(): ConversationSummary[] {
    return this.conversationSummaries;
  }

  // ============================================================================
  // AUDITORIA & HISTÓRICO DE IA (ai_commands & ai_action_logs & ai_feedback)
  // ============================================================================
  public getAiCommands(): AICommand[] {
    return this.aiCommands;
  }

  public addAiCommand(cmd: Omit<AICommand, 'id' | 'created_at'>): AICommand {
    const newCmd: AICommand = {
      ...cmd,
      id: `cmd-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.aiCommands.unshift(newCmd);
    return newCmd;
  }

  public getAiActionLogs(): AIActionLog[] {
    return this.aiActionLogs;
  }

  public logAiAction(action: Omit<AIActionLog, 'id' | 'created_at'>): AIActionLog {
    const newLog: AIActionLog = {
      ...action,
      id: `act-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.aiActionLogs.unshift(newLog);
    return newLog;
  }

  public addAiFeedback(feedback: Omit<AIFeedback, 'id' | 'created_at'>): AIFeedback {
    const newFeedback: AIFeedback = {
      ...feedback,
      id: `fb-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.aiFeedbacks.unshift(newFeedback);
    return newFeedback;
  }

  // Ações de escrita diretas acionadas pelo Assistant
  public registerPaymentViaAssistant(clientName: string, amount: number, method: string = 'pix') {
    // Localizar ou associar
    const tx = this.transactions.find(t => normStr(t.client_name).includes(normStr(clientName)) && t.status !== 'pago');
    const beforeData = tx ? { ...tx } : null;

    if (tx) {
      tx.amount_received += amount;
      tx.amount_pending = Math.max(0, tx.amount_pending - amount);
      if (tx.amount_pending === 0) {
        tx.status = 'pago';
      } else {
        tx.status = 'parcialmente_pago';
      }
    }

    // Registrar ação auditada
    this.logAiAction({
      action_type: 'register_payment',
      entity_type: 'payment',
      entity_id: tx ? tx.id : `tx-${Date.now()}`,
      entity_label: `${clientName} — R$ ${amount.toLocaleString('pt-BR')} (${method.toUpperCase()})`,
      before_data: beforeData as Record<string, unknown> | undefined,
      after_data: { clientName, amount, method, status: 'pago' },
    });

    return {
      success: true,
      clientName,
      amount,
      status: 'pago',
      message: `Pagamento de R$ ${amount.toLocaleString('pt-BR')} registrado com sucesso para ${clientName}.`,
    };
  }
}


// Singleton para o serviço do CRM
export const crmService = new CrmService();
