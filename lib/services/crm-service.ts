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
} from '@/types/database';
import { dbService } from '@/lib/supabase/db-service';


class CrmService {
  private services: Service[] = [...INITIAL_SERVICES];
  private niches: Niche[] = [...INITIAL_NICHES];
  private sequences: MessageSequence[] = [...INITIAL_SEQUENCES];
  private leads: Lead[] = [...INITIAL_LEADS];
  private opportunities: Opportunity[] = [...INITIAL_OPPORTUNITIES];
  private clients: Client[] = [...INITIAL_CLIENTS];
  private proposals: Proposal[] = [...INITIAL_PROPOSALS];
  private contracts: Contract[] = [...INITIAL_CONTRATOS];
  private projects: Project[] = [...INITIAL_PROJECTS];
  private historicalProjects: HistoricalProject[] = [...INITIAL_HISTORICAL_PROJECTS];
  private followUps: FollowUpItem[] = [...INITIAL_FOLLOW_UPS];
  private tasks: TaskItem[] = [...INITIAL_TASKS];
  private transactions: FinancialTransaction[] = [...INITIAL_FINANCIAL_TRANSACTIONS];
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
      this.initFromSupabase();
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
      ]);

      let changed = false;
      if (clients && clients.length > 0) { this.clients = clients; changed = true; }
      if (monthly && monthly.length > 0) { this.monthlyClients = monthly; changed = true; }
      if (leads && leads.length > 0) { this.leads = leads; changed = true; }
      if (prospects && prospects.length > 0) { this.prospects = prospects; changed = true; }
      if (opps && opps.length > 0) { this.opportunities = opps; changed = true; }
      if (proposals && proposals.length > 0) { this.proposals = proposals; changed = true; }
      if (contracts && contracts.length > 0) { this.contracts = contracts; changed = true; }
      if (projects && projects.length > 0) { this.projects = projects; changed = true; }
      if (historical && historical.length > 0) { this.historicalProjects = historical; changed = true; }
      if (tasks && tasks.length > 0) { this.tasks = tasks; changed = true; }
      if (transactions && transactions.length > 0) { this.transactions = transactions; changed = true; }

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
    const filteredTransactions = this.transactions.filter((t) => isDateInPeriod(t.due_date));

    const historicalReceived = filteredHistorical.reduce((acc, p) => acc + (p.amount_received || 0), 0);
    const activeReceived = filteredTransactions
      .filter((t) => t.status === 'pago')
      .reduce((acc, t) => acc + (t.amount_received || 0), 0);
    const monthlyPaidThisMonth = this.monthlyClients
      .filter((c) => c.status === 'ativo' && c.current_month_status === 'pago')
      .reduce((acc, c) => acc + (c.monthly_value || 0), 0);
    // If period is not historico/ano/30d, maybe monthly shouldn't count? We leave it for now or assume it counts if period includes this month. 
    // Usually MRR is counted as this month.
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
        target: l.company_name || l.name,
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
        target: p.company_name || p.client_name,
        detail: `R$ ${p.total.toLocaleString('pt-BR')}`,
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
        target: t.related_to || t.title,
        detail: `Prazo: ${new Date(t.due_date).toLocaleDateString('pt-BR')}`,
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
        target: c.company_name || c.client_name,
        detail: `R$ ${c.monthly_value.toLocaleString('pt-BR')} — Vencimento dia ${c.billing_day}`,
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
      dbService.updateLead(id, { status });
      this.notify();
    }
    return lead;
  }

  public addLead(leadData: Omit<Lead, 'id'>): Lead {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
    };
    this.leads.unshift(newLead);
    dbService.insertLead(newLead);
    this.notify();
    return newLead;
  }

  public deleteLead(id: string): void {
    this.leads = this.leads.filter(l => l.id !== id);
    dbService.deleteLead(id);
    this.notify();
  }

  // Sequências & Nichos (Seção 18.1 & 18.2)
  public getNiches(): Niche[] {
    return this.niches;
  }

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
  public getOpportunities(): Opportunity[] {
    return this.opportunities;
  }

  public updateOpportunityStage(id: string, newStageSlug: string): Opportunity | undefined {
    const opp = this.opportunities.find(o => o.id === id);
    if (opp) {
      opp.stage_slug = newStageSlug;
      dbService.updateOpportunityStage(id, newStageSlug);
      this.notify();
    }
    return opp;
  }

  public addOpportunity(oppData: Omit<Opportunity, 'id'>): Opportunity {
    const newOpp: Opportunity = {
      ...oppData,
      id: `opp-${Date.now()}`,
    };
    this.opportunities.unshift(newOpp);
    dbService.insertOpportunity(newOpp);
    this.notify();
    return newOpp;
  }

  public deleteOpportunity(id: string): void {
    this.opportunities = this.opportunities.filter(o => o.id !== id);
    dbService.deleteOpportunity(id);
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

  public addService(serviceData: Omit<Service, 'id'>): Service {
    const newService: Service = {
      ...serviceData,
      id: `srv-${Date.now()}`,
    };
    this.services.push(newService);
    return newService;
  }

  public updateService(id: string, serviceData: Partial<Service>): boolean {
    const index = this.services.findIndex(s => s.id === id);
    if (index !== -1) {
      this.services[index] = { ...this.services[index], ...serviceData };
      return true;
    }
    return false;
  }

  public deleteService(id: string): boolean {
    const initialLength = this.services.length;
    this.services = this.services.filter(s => s.id !== id);
    return this.services.length < initialLength;
  }

  // Clientes
  public getClients(): Client[] {
    return this.clients;
  }

  public getClientById(id: string): Client | undefined {
    return this.clients.find(c => c.id === id);
  }

  public addClient(clientData: Omit<Client, 'id'>): Client {
    const newClient: Client = {
      ...clientData,
      id: `cli-${Date.now()}`,
    };
    this.clients.unshift(newClient);
    dbService.insertClient(newClient);
    this.notify();
    return newClient;
  }

  public updateClient(id: string, data: Partial<Client>): Client | undefined {
    const client = this.clients.find(c => c.id === id);
    if (client) {
      Object.assign(client, data);
      dbService.updateClient(id, data);
      this.notify();
    }
    return client;
  }

  public deleteClient(id: string): void {
    this.clients = this.clients.filter(c => c.id !== id);
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
    }
    return project;
  }

  public addHistoricalProject(project: Omit<HistoricalProject, 'id'>): HistoricalProject {
    const newProject: HistoricalProject = {
      ...project,
      id: `hist-${Date.now()}`,
    };
    this.historicalProjects.unshift(newProject);
    dbService.insertHistoricalProject(newProject);
    this.syncClientWithHistoricalProject(newProject);
    this.notify();
    return newProject;
  }

  public updateHistoricalProject(id: string, data: Partial<HistoricalProject>): HistoricalProject | undefined {
    const proj = this.historicalProjects.find(p => p.id === id);
    if (proj) {
      Object.assign(proj, data);
      dbService.updateHistoricalProject(id, data);
      this.syncClientWithHistoricalProject(proj);
      this.notify();
    }
    return proj;
  }

  public deleteHistoricalProject(id: string): void {
    this.historicalProjects = this.historicalProjects.filter(p => p.id !== id);
    dbService.deleteHistoricalProject(id);
    this.notify();
  }

  private syncClientWithHistoricalProject(proj: HistoricalProject) {
    let client = this.clients.find(
      c => c.company_name.toLowerCase() === proj.company_name.toLowerCase() || 
           (c.name && proj.client_name && c.name.toLowerCase() === proj.client_name.toLowerCase())
    );

    if (!client) {
      this.addClient({
        name: proj.client_name || 'N/A',
        company_name: proj.company_name,
        segment: 'Geral',
        status: 'ativo',
        total_contracted: proj.amount_contracted || 0,
        total_received: proj.amount_received || 0,
        total_pending: proj.amount_pending || 0,
        lifetime_value: proj.amount_received || 0,
        projects_count: 1,
        last_project_at: proj.project_date,
      });
    } else {
      const histProjects = this.historicalProjects.filter(p => p.company_name.toLowerCase() === client!.company_name.toLowerCase());
      client.total_contracted = histProjects.reduce((sum, p) => sum + (p.amount_contracted || 0), 0);
      client.total_received = histProjects.reduce((sum, p) => sum + (p.amount_received || 0), 0);
      client.total_pending = histProjects.reduce((sum, p) => sum + (p.amount_pending || 0), 0);
      client.lifetime_value = client.total_received;
      client.projects_count = histProjects.length;
      client.last_project_at = proj.project_date;
      dbService.updateClient(client.id, client);
    }
  }

  public getHistoricalProjects(): HistoricalProject[] {
    return this.historicalProjects;
  }

  // Meu Histórico (Seção 31) — Cálculos Dinâmicos
  public getMinhaHistoriaData() {
    const allProjectsCount = this.historicalProjects.length + this.projects.length;
    const clientsCount = this.clients.length;
    const totalContracted =
      this.historicalProjects.reduce((acc, p) => acc + (p.amount_contracted || 0), 0) +
      this.transactions.reduce((acc, t) => acc + (t.amount_contracted || 0), 0);
    const totalReceived =
      this.historicalProjects.reduce((acc, p) => acc + (p.amount_received || 0), 0) +
      this.transactions.filter((t) => t.status === 'pago').reduce((acc, t) => acc + (t.amount_received || 0), 0);
    const totalPending =
      this.historicalProjects.reduce((acc, p) => acc + (p.amount_pending || 0), 0) +
      this.transactions.filter((t) => t.status !== 'pago').reduce((acc, t) => acc + (t.amount_pending || 0), 0);

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
      // Transações pagas do mês
      const txRevenue = this.transactions
        .filter((t) => {
          if (t.status !== 'pago') return false;
          const d = new Date(t.due_date);
          return d.getFullYear() === currentYear && d.getMonth() === m.key;
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
    dbService.insertMonthlyClient(newClient);
    this.notify();
    return newClient;
  }

  public updateMonthlyClient(id: string, data: Partial<MonthlyClient>): MonthlyClient | undefined {
    const client = this.monthlyClients.find((c) => c.id === id);
    if (client) {
      Object.assign(client, data);
      dbService.updateMonthlyClient(id, data);
      this.notify();
    }
    return client;
  }

  public deleteMonthlyClient(id: string): void {
    this.monthlyClients = this.monthlyClients.filter((c) => c.id !== id);
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

  // Financeiro (Seção 32)
  public getFinancialTransactions(): FinancialTransaction[] {
    return this.transactions;
  }

  public getTransactions(): FinancialTransaction[] {
    return this.transactions;
  }

  public addFinancialTransaction(txData: Omit<FinancialTransaction, 'id'>): FinancialTransaction {
    const newTx: FinancialTransaction = {
      ...txData,
      id: `fin-${Date.now()}`,
    };
    this.transactions.unshift(newTx);
    return newTx;
  }

  public getFinancialSummary() {
    const contratado = this.transactions.reduce((acc, t) => acc + (t.amount_contracted || 0), 0);
    const recebido = this.transactions
      .filter((t) => t.status === 'pago')
      .reduce((acc, t) => acc + (t.amount_received || 0), 0);
    const pendente = this.transactions
      .filter((t) => t.status !== 'pago')
      .reduce((acc, t) => acc + (t.amount_pending || 0), 0);
    return { contratado, recebido, pendente };
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
      dbService.updateTask(id, { status: t.status });
      this.notify();
    }
  }

  public addTask(taskData: Omit<TaskItem, 'id'>): TaskItem {
    const newTask: TaskItem = {
      ...taskData,
      id: `tsk-${Date.now()}`,
    };
    this.tasks.unshift(newTask);
    dbService.insertTask(newTask);
    this.notify();
    return newTask;
  }

  public deleteTask(id: string): void {
    this.tasks = this.tasks.filter(t => t.id !== id);
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
    const tx = this.transactions.find(t => t.client_name.toLowerCase().includes(clientName.toLowerCase()) && t.status !== 'pago');
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
