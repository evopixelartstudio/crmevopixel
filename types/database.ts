export type Temperature = 'quente' | 'morno' | 'frio' | 'desqualificado';
export type Priority = 'alta' | 'media' | 'baixa';
export type ServiceCategory = 'WEBSITES' | 'AUTOMAÇÃO' | 'PRESENÇA DIGITAL';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'commercial' | 'operator';
  avatar_url?: string;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  base_price: number;
  delivery_time_days: number;
  status: 'ativo' | 'inativo';
}

export interface Niche {
  id: string;
  name: string;
  description: string;
  status: 'ativo' | 'inativo';
  sequences_count?: number;
}

export interface MessageSequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  name: string;
  message_text: string;
  wait_days: number;
  channel: 'whatsapp' | 'email' | 'instagram';
  status: 'ativo' | 'rascunho' | 'arquivada';
}

export interface MessageSequence {
  id: string;
  niche_id: string;
  niche_name?: string;
  name: string;
  status: 'ativa' | 'rascunho' | 'arquivada';
  steps: MessageSequenceStep[];
}

export interface LeadSequenceProgress {
  id: string;
  lead_id: string;
  sequence_id: string;
  sequence_name?: string;
  current_step_id?: string;
  current_step_name?: string;
  current_step_order?: number;
  status: 'aguardando_envio' | 'enviado' | 'aguardando_resposta' | 'respondido' | 'pausado' | 'concluido_sem_resposta';
  last_sent_at?: string;
  next_due_at?: string;
  paused_reason?: string;
}

export interface MessageLog {
  id: string;
  lead_id: string;
  sequence_step_id?: string;
  step_name?: string;
  channel: string;
  sent_text: string;
  direction: 'enviada' | 'recebida';
  sent_at: string;
  source: 'manual' | 'automatica_n8n';
  status: 'entregue' | 'lida' | 'falhou' | 'pendente';
}

export interface Lead {
  id: string;
  name: string;
  company_name: string;
  role?: string;
  segment: string; // nicho
  niche_id?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  city: string;
  state: string;
  score: number;
  temperature: Temperature;
  status: 'novo' | 'em_abordagem' | 'em_conversa' | 'qualificado' | 'desqualificado' | 'convertido';
  services: string[]; // Serviços identificados
  last_contact_at?: string;
  next_action?: string;
  next_action_at?: string;
  notes?: string;
  sequence_progress?: LeadSequenceProgress;
  ai_analysis?: {
    data_points: string[];
    inferences: string[];
    recommendations: string[];
    main_hook: string;
    should_approach: boolean;
    reason_if_not?: string;
  };
}

export interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

export interface Opportunity {
  id: string;
  lead_id: string;
  lead_name: string;
  company_name: string;
  stage_slug: string;
  title: string;
  estimated_value: number;
  probability: number;
  score: number;
  temperature: Temperature;
  priority: Priority;
  services: string[];
  last_interaction?: string;
  approach_strategy?: string;
  n8n_automated?: boolean;
}

export interface Client {
  id: string;
  name: string;
  company_name: string;
  segment: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  total_contracted: number;
  total_received: number;
  total_pending: number;
  lifetime_value: number;
  projects_count: number;
  last_project_at?: string;
  status: 'ativo' | 'inativo';
  cross_sell_opportunities?: string[];
}

export interface ProposalItem {
  id: string;
  service_id: string;
  service_name: string;
  description: string;
  price: number;
  discount: number;
  total: number;
}

export interface Proposal {
  id: string;
  code: string;
  client_id?: string;
  client_name: string;
  company_name: string;
  items: ProposalItem[];
  subtotal: number;
  discount: number;
  total: number;
  installments_count: number;
  installments_description: string;
  status: 'rascunho' | 'enviada' | 'visualizada' | 'aceita' | 'recusada' | 'expirada';
  created_at: string;
  valid_until: string;
}

export interface Contract {
  id: string;
  code: string;
  client_name: string;
  company_name: string;
  services_summary: string;
  total_amount: number;
  status: 'rascunho' | 'enviado' | 'visualizado' | 'aguardando_assinatura' | 'assinado' | 'cancelado';
  signed_at?: string;
  signature_provider?: string;
  start_date: string;
  end_date?: string;
}

export interface Project {
  id: string;
  client_name: string;
  company_name: string;
  name: string;
  status: 'aguardando_inicio' | 'briefing' | 'em_desenvolvimento' | 'revisao' | 'ajustes' | 'aguardando_cliente' | 'concluido' | 'cancelado';
  services: {
    service_name: string;
    checklist: { item: string; completed: boolean }[];
  }[];
  start_date: string;
  deadline: string;
  progress_percentage: number;
}

export interface HistoricalProject {
  id: string;
  client_name: string;
  company_name: string;
  services_summary: string;
  amount_contracted: number;
  amount_received: number;
  amount_pending: number;
  project_date: string;
  status: 'concluido' | 'parcial' | 'cancelado';
  notes?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  related_to: string; // Ex: 'Clínica Vida' ou 'Projeto Website'
  due_date: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';
  priority: Priority;
}

export interface FollowUpItem {
  id: string;
  target_name: string;
  company_name: string;
  context: string;
  due_date: string;
  next_action: string;
  is_automated: boolean;
  type: 'hoje' | 'atrasado' | 'proximo' | 'automatico';
  status: 'pendente' | 'concluido' | 'atrasado';
}

export interface FinancialTransaction {
  id: string;
  title: string;
  client_name: string;
  category: string;
  amount_contracted: number;
  amount_received: number;
  amount_pending: number;
  due_date: string;
  status: 'pago' | 'pendente' | 'parcialmente_pago' | 'atrasado' | 'cancelado';
}

export interface BusinessInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  metric?: string;
  action_label?: string;
  link?: string;
}

// ==============================================================================
// EVOLUÇÃO — INTELIGÊNCIA, EVO ASSISTANT, PROSPECTS & METAS
// ==============================================================================

export type PermissionLevel = 'READ' | 'WRITE' | 'RESTRICTED';

export type ProspectStatus =
  | 'new'
  | 'analyzed'
  | 'priority'
  | 'contacted'
  | 'responded'
  | 'converted_to_lead'
  | 'discarded';

export interface Prospect {
  id: string;
  nome: string;
  empresa: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  site?: string;
  instagram?: string;
  cidade: string;
  estado: string;
  segment: string;
  niche_id?: string;
  icp_score: number; // 0 a 100
  opportunity_score: number; // 0 a 100
  digital_presence_score: number; // 0 a 100
  observations?: string;
  source: string;
  suggested_service: string;
  identified_signals: string[];
  status: ProspectStatus;
  converted_lead_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessContext {
  id: string;
  nome_empresa: string;
  descricao: string;
  servicos: string[];
  ticket_medio: number;
  icp: {
    tamanho_empresa: string;
    faturamento_estimado: string;
    decisor: string;
    presenca_digital: string;
  };
  nichos_prioritarios: string[];
  regiao_atuacao: string;
  objetivos: string[];
  metas: string[];
  regras_comerciais: string[];
  tom_comunicacao: string;
  servicos_prioritarios: string[];
  servicos_evitar: string[];
  created_at: string;
  updated_at: string;
}

export interface CommercialGoal {
  id: string;
  periodo: string; // Ex: 'Março 2026'
  faturamento_alvo: number;
  faturamento_atual: number;
  novos_clientes_alvo: number;
  novos_clientes_atual: number;
  propostas_alvo: number;
  propostas_atual: number;
  leads_qualificados_alvo: number;
  leads_qualificados_atual: number;
  prospeccoes_alvo: number;
  prospeccoes_atual: number;
  status: 'em_progresso' | 'atingida' | 'superada' | 'encerrada';
}

export interface ConversationSummary {
  id: string;
  conversation_id: string;
  lead_id: string;
  lead_name: string;
  company_name: string;
  summary: string;
  intent: string;
  lead_temperature: Temperature;
  lead_score: number;
  services_detected: string[];
  objections: string[];
  next_action: string;
  ai_confidence: number;
  updated_at: string;
}

export interface AICommand {
  id: string;
  user_id?: string;
  session_id: string;
  intent: string;
  input: string;
  tool_used?: string;
  permission_level: PermissionLevel;
  parameters: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'success' | 'error' | 'cancelled';
  created_at: string;
}

export interface AIActionLog {
  id: string;
  user_id?: string;
  command_id?: string;
  action_type: 'create' | 'update' | 'delete' | 'register_payment';
  entity_type: 'lead' | 'client' | 'opportunity' | 'task' | 'payment' | 'prospect' | 'contract' | 'proposal';
  entity_id: string;
  entity_label?: string;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  created_at: string;
}

export interface AIFeedback {
  id: string;
  user_id?: string;
  entity_type: string;
  entity_id: string;
  recommendation: string;
  feedback: 'positive' | 'negative';
  reason?: string;
  created_at: string;
}

export interface NextBestAction {
  id: string;
  entity_type: 'lead' | 'opportunity' | 'client' | 'dashboard';
  entity_id: string;
  entity_name: string;
  action_title: string;
  reason: string;
  action_label: string;
  action_link: string;
  priority: Priority;
  data_source: string;
}

export interface EvoInsightItem {
  id: string;
  type: 'DADO' | 'INFERENCIA' | 'RECOMENDACAO';
  title: string;
  explanation: string;
  period: string; // Ex: 'Últimos 30 dias', 'Mês atual'
  data_source: string;
  suggested_action?: {
    label: string;
    link: string;
  };
}

export interface MonthlyClient {
  id: string;
  client_id?: string;
  client_name: string;
  company_name: string;
  segment: string;
  plan_name: string; // Ex: 'Suporte & Manutenção Web', 'Gestão IA & Automação n8n', 'Hospedagem & SEO'
  monthly_value: number; // R$ valor da mensalidade
  billing_day: number; // Dia de vencimento no mês (1 a 31)
  payment_method: 'pix' | 'boleto' | 'cartao' | 'transferencia';
  status: 'ativo' | 'inadimplente' | 'pausado' | 'cancelado';
  current_month_status: 'pago' | 'pendente' | 'atrasado';
  start_date: string;
  last_payment_date?: string;
  notes?: string;
}


