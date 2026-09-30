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
  MonthlyClient,
} from '@/types/database';

export const INITIAL_SERVICES: Service[] = [
  // WEBSITES
  {
    id: 'srv-1',
    name: 'Site Institucional',
    category: 'WEBSITES',
    description: 'Desenvolvimento web de alta performance com design autoral, SEO técnico e CMS integrado.',
    base_price: 3200,
    delivery_time_days: 14,
    status: 'ativo',
  },
  {
    id: 'srv-2',
    name: 'Landing Page de Alta Conversão',
    category: 'WEBSITES',
    description: 'Página única otimizada para campanhas de tráfego pago com copywriting persuasivo e tracking avançado.',
    base_price: 1800,
    delivery_time_days: 7,
    status: 'ativo',
  },
  {
    id: 'srv-3',
    name: 'Site Jurídico / Especializado',
    category: 'WEBSITES',
    description: 'Estrutura institucional alinhada ao código da OAB e posicionamento de autoridade em nichos regulados.',
    base_price: 3800,
    delivery_time_days: 15,
    status: 'ativo',
  },
  {
    id: 'srv-4',
    name: 'E-commerce Direto',
    category: 'WEBSITES',
    description: 'Loja virtual rápida com checkout transparente, gateway de pagamento e gestão de pedidos.',
    base_price: 5200,
    delivery_time_days: 25,
    status: 'ativo',
  },
  // AUTOMAÇÃO
  {
    id: 'srv-5',
    name: 'Automação WhatsApp & Atendimento',
    category: 'AUTOMAÇÃO',
    description: 'Fluxos automáticos via WhatsApp com qualificação de leads, roteamento e agendamento sem fricção.',
    base_price: 2400,
    delivery_time_days: 10,
    status: 'ativo',
  },
  {
    id: 'srv-6',
    name: 'Agente IA Especialista',
    category: 'AUTOMAÇÃO',
    description: 'Agente conversacional treinado na base de conhecimento da empresa para atendimento 24/7.',
    base_price: 3500,
    delivery_time_days: 14,
    status: 'ativo',
  },
  {
    id: 'srv-7',
    name: 'Follow-up Automático n8n',
    category: 'AUTOMAÇÃO',
    description: 'Régua inteligente de reengajamento automático para orçamentos e propostas pendentes.',
    base_price: 1900,
    delivery_time_days: 8,
    status: 'ativo',
  },
  {
    id: 'srv-8',
    name: 'Implantação de CRM & Processos',
    category: 'AUTOMAÇÃO',
    description: 'Estruturação do funil comercial, etapas de qualificação e métricas de conversão.',
    base_price: 2800,
    delivery_time_days: 12,
    status: 'ativo',
  },
  // PRESENÇA DIGITAL
  {
    id: 'srv-9',
    name: 'Google Meu Negócio & Otimização Local',
    category: 'PRESENÇA DIGITAL',
    description: 'Posicionamento dominante na busca local e Google Maps para captação de clientes na região.',
    base_price: 950,
    delivery_time_days: 5,
    status: 'ativo',
  },
  {
    id: 'srv-10',
    name: 'SEO Orgânico & Conteúdo Técnico',
    category: 'PRESENÇA DIGITAL',
    description: 'Construção de autoridade orgânica e rankeamento para palavras-chave de intenção de compra.',
    base_price: 1600,
    delivery_time_days: 30,
    status: 'ativo',
  },
  {
    id: 'srv-11',
    name: 'Manutenção & Evolução Contínua',
    category: 'PRESENÇA DIGITAL',
    description: 'Hospedagem de alta performance, atualizações de segurança, backup diário e melhorias técnicas contínuas.',
    base_price: 450,
    delivery_time_days: 30,
    status: 'ativo',
  },
  {
    id: 'srv-12',
    name: 'Consultoria Estratégica Digital',
    category: 'PRESENÇA DIGITAL',
    description: 'Diagnóstico de canais, funil comercial e plano de ação para aceleração de vendas.',
    base_price: 2200,
    delivery_time_days: 10,
    status: 'ativo',
  },
];

export const INITIAL_NICHES: Niche[] = [
  {
    id: 'niche-1',
    name: 'Contabilidade',
    description: 'Escritórios contábeis, BPO financeiro e consultorias tributárias.',
    status: 'ativo',
    sequences_count: 1,
  },
  {
    id: 'niche-2',
    name: 'Clínicas / Odonto / Estética',
    description: 'Clínicas médicas, odontológicas, dermatologia e estética avançada.',
    status: 'ativo',
    sequences_count: 1,
  },
  {
    id: 'niche-3',
    name: 'Imobiliárias',
    description: 'Imobiliárias, corretores autônomos de alto padrão e administradoras.',
    status: 'ativo',
    sequences_count: 1,
  },
  {
    id: 'niche-4',
    name: 'Advocacia',
    description: 'Escritórios jurídicos empresariais, trabalhistas e previdenciários.',
    status: 'ativo',
    sequences_count: 1,
  },
  {
    id: 'niche-5',
    name: 'Consultorias & Serviços B2B',
    description: 'Empresas de treinamento, consultoria de gestão e tecnologia.',
    status: 'ativo',
    sequences_count: 1,
  },
];

export const INITIAL_SEQUENCES: MessageSequence[] = [
  {
    id: 'seq-1',
    niche_id: 'niche-1',
    niche_name: 'Contabilidade',
    name: 'Prospecção Ativa BPO & Contabilidade',
    status: 'ativa',
    steps: [
      {
        id: 'step-1-1',
        sequence_id: 'seq-1',
        step_order: 1,
        name: 'Etapa 1 — Abertura Consultiva',
        message_text: 'Olá {nome}, tudo bem? Notei que a {empresa} tem forte atuação em {cidade}, mas ao pesquisar encontrei apenas um perfil básico sem canal de pré-qualificação ágil. Vocês hoje perdem muito tempo triando clientes que chegam pelo WhatsApp sem perfil financeiro?',
        wait_days: 2,
        channel: 'whatsapp',
        status: 'ativo',
      },
      {
        id: 'step-1-2',
        sequence_id: 'seq-1',
        step_order: 2,
        name: 'Etapa 2 — Follow-up 1 (Insight de Conversão)',
        message_text: '{nome}, passando rápido: na semana passada estruturamos um fluxo no WhatsApp para outro escritório que filtrou 65% das dúvidas repetitivas e já entregou o lead pronto com faturamento estimado. Faz sentido mostrar um resumo de 3 min em áudio ou vídeo?',
        wait_days: 3,
        channel: 'whatsapp',
        status: 'ativo',
      },
      {
        id: 'step-1-3',
        sequence_id: 'seq-1',
        step_order: 3,
        name: 'Etapa 3 — Follow-up 2 (Diagnóstico Direto)',
        message_text: '{nome}, imagino que sua rotina esteja corrida com o fechamento contábil. Se a prioridade no momento não for otimizar a captação e automação comercial da {empresa}, sem problemas! Caso queira revisitar mês que vem, estamos por aqui.',
        wait_days: 5,
        channel: 'whatsapp',
        status: 'ativo',
      },
      {
        id: 'step-1-4',
        sequence_id: 'seq-1',
        step_order: 4,
        name: 'Encerramento — Arquivamento Educado',
        message_text: '{nome}, para não ocupar seu tempo vou encerrar nossos contatos por aqui. Desejo sucesso no crescimento da {empresa}. Se um dia precisar acelerar a presença e automação digital, meu contato fica salvo!',
        wait_days: 0,
        channel: 'whatsapp',
        status: 'ativo',
      },
    ],
  },
  {
    id: 'seq-2',
    niche_id: 'niche-2',
    niche_name: 'Clínicas / Odonto / Estética',
    name: 'Captação & Agendamento Particular',
    status: 'ativa',
    steps: [
      {
        id: 'step-2-1',
        sequence_id: 'seq-2',
        step_order: 1,
        name: 'Etapa 1 — Abertura (Velocidade de Resposta)',
        message_text: 'Olá {nome}, tudo bem? Vi o posicionamento da {empresa} em {cidade}. Fiz um teste rápido na busca local e reparei que vocês não possuem confirmação e agendamento instantâneo via WhatsApp. Quantas consultas particulares acabam escapando por demora no retorno da recepção?',
        wait_days: 2,
        channel: 'whatsapp',
        status: 'ativo',
      },
      {
        id: 'step-2-2',
        sequence_id: 'seq-2',
        step_order: 2,
        name: 'Etapa 2 — Follow-up 1 (Estudo de Caso)',
        message_text: '{nome}, só para complementar: clínicas que automatizam a triagem inicial aumentam em média 38% o comparecimento e reduzem faltas com lembrete automático. Gostaria de ver o fluxo funcionando na prática?',
        wait_days: 3,
        channel: 'whatsapp',
        status: 'ativo',
      },
      {
        id: 'step-2-3',
        sequence_id: 'seq-2',
        step_order: 3,
        name: 'Etapa 3 — Follow-up 2 (Encerramento Gradual)',
        message_text: '{nome}, tudo bem? Acredito que a equipe já esteja bem atendida nesse quesito. Se quiser avaliar uma modernização do site ou automação mais adiante, fico à disposição!',
        wait_days: 4,
        channel: 'whatsapp',
        status: 'ativo',
      },
    ],
  },
  {
    id: 'seq-3',
    niche_id: 'niche-4',
    niche_name: 'Advocacia',
    name: 'Posicionamento Jurídico & Autoridade Digital',
    status: 'ativa',
    steps: [
      {
        id: 'step-4-1',
        sequence_id: 'seq-3',
        step_order: 1,
        name: 'Etapa 1 — Abertura (Autoridade e SEO Local)',
        message_text: 'Dr(a). {nome}, tudo bem? Acompanhei algumas decisões e menções da {empresa}. Notei que a presença digital de vocês no Google não reflete a relevância técnica dos casos que atendem em {cidade}. Vocês já recebem clientes qualificados diretamente pelo site institucional hoje?',
        wait_days: 3,
        channel: 'whatsapp',
        status: 'ativo',
      },
      {
        id: 'step-4-2',
        sequence_id: 'seq-3',
        step_order: 2,
        name: 'Etapa 2 — Follow-up 1 (Conformidade OAB)',
        message_text: 'Dr(a). {nome}, desenvolvemos plataformas jurídicas estritamente alinhadas ao Provimento da OAB, com foco em retenção de clientes corporativos. Gostaria de receber um diagnóstico de 2 minutos sobre o posicionamento atual da banca?',
        wait_days: 3,
        channel: 'whatsapp',
        status: 'ativo',
      },
    ],
  },
];

// Dados operacionais iniciados vazios (sem dados fictícios)
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_OPPORTUNITIES: Opportunity[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_PROPOSALS: Proposal[] = [];
export const INITIAL_CONTRATOS: Contract[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_HISTORICAL_PROJECTS: HistoricalProject[] = [];
export const INITIAL_FOLLOW_UPS: FollowUpItem[] = [];
export const INITIAL_TASKS: TaskItem[] = [];
export const INITIAL_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [];
export const INITIAL_MESSAGE_LOGS: MessageLog[] = [];
export const INITIAL_INSIGHTS: BusinessInsight[] = [];
export const INITIAL_PROSPECTS: Prospect[] = [];
export const INITIAL_MONTHLY_CLIENTS: MonthlyClient[] = [];

export const INITIAL_BUSINESS_CONTEXT: BusinessContext = {
  id: 'ctx-1',
  nome_empresa: 'EvoPixel',
  descricao: 'Estúdio boutique de desenvolvimento de software, automação inteligente e presença digital premium.',
  servicos: [
    'Site Institucional',
    'Landing Page de Alta Conversão',
    'Automação WhatsApp & Atendimento',
    'Agente IA Especialista',
    'Integração de Sistemas & Webhooks (n8n)',
    'Identidade Visual & Direção de Arte',
    'Google Meu Negócio & Otimização Local',
  ],
  ticket_medio: 0,
  icp: {
    tamanho_empresa: '5 a 50 colaboradores',
    faturamento_estimado: 'R$ 50.000 a R$ 500.000 / mês',
    decisor: 'Sócio-fundador, Diretor Comercial, Head Médico ou Gestor Operacional',
    presenca_digital: 'Ativa mas com gargalos técnicos',
  },
  nichos_prioritarios: [
    'Clínicas Médicas / Odonto / Estética',
    'Contabilidade & Finanças B2B',
    'Imobiliárias & Corretores de Alto Padrão',
    'Consultorias & Serviços B2B',
  ],
  regiao_atuacao: 'Brasil',
  objetivos: [
    'Consolidar o posicionamento editorial premium',
    'Elevar a retenção por meio de contratos de automação e mensalidades contínuas',
  ],
  metas: [
    'R$ 15.000 de receita no mês corrente',
    '8 novos clientes fechados',
  ],
  regras_comerciais: [
    'Não conceder desconto à vista superior a 10%',
    'Propostas válidas por no máximo 10 dias corridos',
    'Início de desenvolvimento somente após sinal de entrada ou contrato assinado',
  ],
  tom_comunicacao: 'Editorial, consultivo, sóbrio, analítico e sem jargões superficiais.',
  servicos_prioritarios: [
    'Site Institucional + Automação WhatsApp',
    'Agente IA Especialista n8n',
    'Landing Page de Alta Conversão',
  ],
  servicos_evitar: [
    'Projetos avulsos sem alinhamento com escopo técnico',
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-09-16T00:00:00Z',
};

export const INITIAL_COMMERCIAL_GOALS: CommercialGoal = {
  id: 'goal-2026-03',
  periodo: 'Março 2026',
  faturamento_alvo: 15000,
  faturamento_atual: 0,
  novos_clientes_alvo: 8,
  novos_clientes_atual: 0,
  propostas_alvo: 20,
  propostas_atual: 0,
  leads_qualificados_alvo: 40,
  leads_qualificados_atual: 0,
  prospeccoes_alvo: 100,
  prospeccoes_atual: 0,
  status: 'em_progresso',
};

export const INITIAL_CONVERSATION_SUMMARIES: ConversationSummary[] = [];
export const INITIAL_NEXT_BEST_ACTIONS: NextBestAction[] = [];
export const INITIAL_EVO_INSIGHTS: EvoInsightItem[] = [];
export const INITIAL_AI_COMMANDS: AICommand[] = [];
export const INITIAL_AI_ACTION_LOGS: AIActionLog[] = [];
