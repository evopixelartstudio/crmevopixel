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
} from '@/types/database';


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
  private businessContext: BusinessContext = { ...INITIAL_BUSINESS_CONTEXT };
  private commercialGoals: CommercialGoal = { ...INITIAL_COMMERCIAL_GOALS };
  private conversationSummaries: ConversationSummary[] = [...INITIAL_CONVERSATION_SUMMARIES];
  private nextBestActions: NextBestAction[] = [...INITIAL_NEXT_BEST_ACTIONS];
  private evoInsights: EvoInsightItem[] = [...INITIAL_EVO_INSIGHTS];
  private aiCommands: AICommand[] = [...INITIAL_AI_COMMANDS];
  private aiActionLogs: AIActionLog[] = [...INITIAL_AI_ACTION_LOGS];
  private aiFeedbacks: AIFeedback[] = [];

  // Dashboard Aggregates
  public getDashboardOverview() {
    // Faturamento acumulado = soma de recebidos históricos + projetos atuais
    const historicalReceived = this.historicalProjects.reduce((acc, p) => acc + p.amount_received, 0);
    const activeReceived = this.transactions.filter(t => t.status === 'pago').reduce((acc, t) => acc + t.amount_received, 0);
    const totalAccumulated = historicalReceived + activeReceived;

    const totalContractedActive = this.transactions.reduce((acc, t) => acc + t.amount_contracted, 0);
    const totalPendingActive = this.transactions.filter(t => t.status !== 'pago').reduce((acc, t) => acc + t.amount_pending, 0);

    const monthRevenue = 8800; // Receita realizada no mês corrente
    const pipelineTotal = this.opportunities.reduce((acc, o) => acc + o.estimated_value, 0);
    const completedProjectsCount = this.historicalProjects.length + this.projects.filter(p => p.status === 'concluido').length;
    const ticketMedio = Math.round(totalAccumulated / (completedProjectsCount || 1));

    const attentionItems = [
      {
        id: 'att-1',
        index: '01',
        type: 'lead_hot',
        title: 'Lead quente sem resposta',
        target: 'Silva Advocacia',
        detail: 'Última interação há 2 dias',
        actionLabel: 'Abrir lead',
        link: '/leads/lead-1',
      },
      {
        id: 'att-2',
        index: '02',
        type: 'proposal_pending',
        title: 'Proposta aguardando retorno',
        target: 'Clínica Vida',
        detail: 'R$ 3.500',
        actionLabel: 'Ver proposta',
        link: '/propostas',
      },
      {
        id: 'att-3',
        index: '03',
        type: 'followup_overdue',
        title: 'Follow-up atrasado',
        target: 'Moreira Imóveis',
        detail: 'Cobrança de retorno agendada para ontem',
        actionLabel: 'Resolver',
        link: '/follow-ups',
      },
      {
        id: 'att-4',
        index: '04',
        type: 'n8n_followup',
        title: 'Follow-up automático disparado pela IA',
        target: 'Contabilidade Nova Era',
        detail: 'Nicho: Contabilidade — sem resposta em 3 dias',
        actionLabel: 'Ver conversa',
        link: '/leads/lead-4',
      },
    ];

    return {
      faturamentoAcumulado: 147850, // Faturamento oficial acumulado desde o início
      recebido: 139450,
      aReceber: 8400,
      receitaMes: monthRevenue,
      pipelineAtual: pipelineTotal,
      ticketMedio: 4280,
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
    }
    return lead;
  }

  public addLead(leadData: Omit<Lead, 'id'>): Lead {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
    };
    this.leads.unshift(newLead);
    return newLead;
  }

  public deleteLead(id: string): void {
    this.leads = this.leads.filter(l => l.id !== id);
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
    }
    return opp;
  }

  public addOpportunity(oppData: Omit<Opportunity, 'id'>): Opportunity {
    const newOpp: Opportunity = {
      ...oppData,
      id: `opp-${Date.now()}`,
    };
    this.opportunities.unshift(newOpp);
    return newOpp;
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
    return newClient;
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
    return newProp;
  }

  public updateProposalStatus(id: string, status: Proposal['status']): void {
    const prop = this.proposals.find(p => p.id === id);
    if (prop) prop.status = status;
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
    return newProject;
  }

  public getHistoricalProjects(): HistoricalProject[] {
    return this.historicalProjects;
  }

  // Minha História (Seção 31)
  public getMinhaHistoriaData() {
    const allProjectsCount = this.historicalProjects.length + this.projects.length;
    const clientsCount = this.clients.length + 8; // Inclui clientes históricos atendidos
    const totalContracted = 156250;
    const totalReceived = 147850;
    const totalPending = 8400;

    const yearlyEvolution = [
      { year: '2023', contracted: 24800, received: 24800, pending: 0, projects: 6 },
      { year: '2024', contracted: 46500, received: 45200, pending: 1300, projects: 11 },
      { year: '2025', contracted: 61800, received: 58700, pending: 3100, projects: 14 },
      { year: '2026 (atual)', contracted: 23150, received: 19150, pending: 4000, projects: 5 },
    ];

    return {
      faturamentoAcumulado: totalReceived,
      contratadoAcumulado: totalContracted,
      pendenteAcumulado: totalPending,
      projetosRealizados: allProjectsCount + 12,
      clientesAtendidos: clientsCount,
      ticketMedio: 4280,
      melhorAno: '2025 (R$ 58.700)',
      melhorMes: 'Outubro 2025 (R$ 14.200)',
      servicoMaisRentavel: 'Site Institucional + Automação',
      clienteMaisValioso: 'Alcantara Cirurgia Plástica (R$ 16.800)',
      yearlyEvolution,
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
    const contratado = 34500;
    const recebido = 26100;
    const pendente = 8400;
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
    }
  }

  public addTask(taskData: Omit<TaskItem, 'id'>): TaskItem {
    const newTask: TaskItem = {
      ...taskData,
      id: `tsk-${Date.now()}`,
    };
    this.tasks.unshift(newTask);
    return newTask;
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
    }
    return prospect;
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
