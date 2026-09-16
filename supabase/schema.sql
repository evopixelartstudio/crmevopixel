-- ==============================================================================
-- EVOCRM - Sistema Operacional Comercial e Operacional da EvoPixel
-- Schema PostgreSQL / Supabase
-- ==============================================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ESTRUTURA BASE & USUÁRIOS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'commercial', 'operator'
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    trading_name TEXT,
    cnpj TEXT,
    segment TEXT, -- Nicho de atuação
    website TEXT,
    instagram TEXT,
    city TEXT,
    state TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. CATÁLOGO DE SERVIÇOS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'WEBSITES', 'AUTOMAÇÃO', 'PRESENÇA DIGITAL'
    description TEXT,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_time_days INTEGER DEFAULT 15,
    status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. PROSPECÇÃO POR NICHO & SEQUÊNCIAS (SEÇÃO 18.1 & 18.2)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS niches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'Contabilidade', 'Clínicas / Odonto / Estética', 'Imobiliárias', 'Consultorias', 'Advocacia'
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    niche_id UUID NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa', 'rascunho', 'arquivada'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES message_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL, -- 1 = Abertura, 2 = Follow-up 1, 3 = Follow-up 2...
    name TEXT NOT NULL, -- 'Etapa 1 - Abertura', 'Etapa 2 - Follow-up 1'
    message_text TEXT NOT NULL, -- Suporta variáveis: {nome}, {empresa}, {cidade}, {observacao}
    wait_days INTEGER NOT NULL DEFAULT 2, -- Dias de espera antes da próxima etapa
    channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'instagram'
    status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'rascunho', 'arquivada'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. LEADS & QUALIFICAÇÃO
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'Prospecção Ativa IA', 'Indicação', 'Google', 'Instagram', 'Inbound'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    niche_id UUID REFERENCES niches(id) ON DELETE SET NULL,
    source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    instagram TEXT,
    website TEXT,
    city TEXT,
    state TEXT,
    segment TEXT, -- mesmo que o nicho
    score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
    temperature TEXT NOT NULL DEFAULT 'morno', -- 'quente', 'morno', 'frio', 'desqualificado'
    status TEXT NOT NULL DEFAULT 'novo', -- 'novo', 'em_abordagem', 'em_conversa', 'qualificado', 'desqualificado', 'convertido'
    last_contact_at TIMESTAMPTZ,
    next_action TEXT,
    next_action_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_services (
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    opportunity_level TEXT NOT NULL DEFAULT 'media', -- 'alta', 'media', 'baixa'
    score INTEGER DEFAULT 75,
    justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (lead_id, service_id)
);

CREATE TABLE IF NOT EXISTS lead_sequence_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES message_sequences(id) ON DELETE CASCADE,
    current_step_id UUID REFERENCES message_sequence_steps(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'aguardando_envio', -- 'aguardando_envio', 'enviado', 'aguardando_resposta', 'respondido', 'pausado', 'concluido_sem_resposta'
    last_sent_at TIMESTAMPTZ,
    next_due_at TIMESTAMPTZ,
    paused_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_lead_active_sequence UNIQUE (lead_id)
);

CREATE TABLE IF NOT EXISTS message_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sequence_step_id UUID REFERENCES message_sequence_steps(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    sent_text TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'enviada', -- 'enviada', 'recebida'
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'automatica_n8n', -- 'manual', 'automatica_n8n'
    status TEXT NOT NULL DEFAULT 'entregue', -- 'pendente', 'entregue', 'lida', 'falhou'
    n8n_execution_id TEXT
);

-- ------------------------------------------------------------------------------
-- 5. PIPELINE & OPORTUNIDADES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE, -- 'novo_lead', 'qualificacao', 'primeiro_contato', 'diagnostico', 'proposta', 'negociacao', 'fechado', 'perdido'
    display_order INTEGER NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
    title TEXT NOT NULL,
    estimated_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    probability INTEGER NOT NULL DEFAULT 50, -- 0 a 100
    score INTEGER NOT NULL DEFAULT 70,
    temperature TEXT NOT NULL DEFAULT 'morno',
    priority TEXT NOT NULL DEFAULT 'media', -- 'alta', 'media', 'baixa'
    recommended_channel TEXT DEFAULT 'whatsapp',
    main_hook TEXT,
    secondary_hook TEXT,
    approach_strategy TEXT,
    ai_analysis TEXT,
    status TEXT NOT NULL DEFAULT 'identificada', -- 'identificada', 'em_abordagem', 'em_conversa', 'diagnostico', 'proposta', 'negociacao', 'ganha', 'perdida'
    closed_at TIMESTAMPTZ,
    loss_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunity_services (
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    estimated_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (opportunity_id, service_id)
);

-- ------------------------------------------------------------------------------
-- 6. CLIENTES (CLIENT 360)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    cnpj TEXT,
    total_contracted NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_pending NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    last_project_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo', 'pausado'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. PROPOSTAS & CONTRATOS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    code TEXT NOT NULL UNIQUE, -- 'PROP-2026-001'
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    installments_count INTEGER DEFAULT 1,
    installments_description TEXT,
    status TEXT NOT NULL DEFAULT 'rascunho', -- 'rascunho', 'enviada', 'visualizada', 'aceita', 'recusada', 'expirada'
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE, -- 'CONT-2026-001'
    total_amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'rascunho', -- 'rascunho', 'enviado', 'visualizado', 'aguardando_assinatura', 'assinado', 'cancelado'
    signed_at TIMESTAMPTZ,
    signature_provider TEXT, -- 'Clicksign', 'DocuSign', 'Manual'
    signature_document_id TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. PROJETOS & HISTÓRICO
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aguardando_inicio', -- 'aguardando_inicio', 'briefing', 'em_desenvolvimento', 'revisao', 'ajustes', 'aguardando_cliente', 'concluido', 'cancelado'
    start_date DATE,
    deadline DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    checklist_status JSONB DEFAULT '[]'::jsonb, -- lista de itens de checklist para este serviço
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historical_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    services_summary TEXT NOT NULL, -- Ex: 'Site Institucional + Google Meu Negócio'
    amount_contracted NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_pending NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    project_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'concluido', -- 'concluido', 'parcial', 'cancelado'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. TAREFAS & FOLLOW-UPS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_andamento', 'concluida', 'atrasada'
    priority TEXT NOT NULL DEFAULT 'media', -- 'alta', 'media', 'baixa'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    context TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    next_action TEXT NOT NULL,
    is_automated BOOLEAN NOT NULL DEFAULT false, -- True se disparado pela IA/n8n
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'concluido', 'atrasado', 'cancelado'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. FINANCEIRO (SEPARAÇÃO: CONTRATADO vs RECEBIDO vs PENDENTE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'receita', 'despesa'
    category TEXT NOT NULL, -- 'Serviço Website', 'Automação', 'Recorrência Mensal', etc.
    amount_contracted NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_pending NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    payment_date DATE,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'parcialmente_pago', 'pago', 'atrasado', 'cancelado'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'pix', 'boleto', 'cartao', 'transferencia'
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    proof_url TEXT
);

-- ------------------------------------------------------------------------------
-- 11. COMUNICAÇÃO, AUTOMAÇÃO N8N & EVOLUTION API
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    external_id TEXT, -- WhatsApp JID ou phone
    last_message_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'aberta', -- 'aberta', 'fechada', 'pausada'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL, -- 'user', 'contact', 'ia', 'n8n'
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'entregue'
);

CREATE TABLE IF NOT EXISTS automation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name TEXT NOT NULL, -- 'lead.created', 'prospecting.sequence.started', etc.
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'disparado', -- 'disparado', 'processado', 'falhou'
    n8n_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'alert', 'action_required', 'success', 'info'
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL, -- 'lead', 'opportunity', 'contract', 'project', 'finance'
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. INTELIGÊNCIA ARTIFICIAL (EVO INTELLIGENCE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL, -- 'lead', 'pipeline', 'business'
    entity_id UUID,
    score INTEGER,
    data_points JSONB,     -- DADOS REAIS (fatos verificados)
    inferences JSONB,      -- INFERÊNCIAS (deduções da IA)
    recommendations JSONB, -- RECOMENDAÇÕES (próximos passos sugeridos)
    approach_suggestion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    insight_text TEXT NOT NULL,
    category TEXT NOT NULL, -- 'cross_sell', 'lead_prioritization', 'pricing', 'retention'
    action_label TEXT,
    action_link TEXT,
    metric_highlight TEXT,
    status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa', 'arquivada', 'aplicada'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. CONTEXTO OPERACIONAL DA EVOPIXEL & METAS (SEÇÃO 04 & 14)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS business_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    nome_empresa TEXT NOT NULL DEFAULT 'EvoPixel',
    descricao TEXT NOT NULL,
    servicos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ticket_medio NUMERIC(12, 2) NOT NULL DEFAULT 4280.00,
    icp JSONB NOT NULL DEFAULT '{}'::jsonb,
    nichos_prioritarios JSONB NOT NULL DEFAULT '[]'::jsonb,
    regiao_atuacao TEXT NOT NULL DEFAULT 'Brasil (Remoto / Presencial SP/PR)',
    objetivos JSONB NOT NULL DEFAULT '[]'::jsonb,
    metas JSONB NOT NULL DEFAULT '[]'::jsonb,
    regras_comerciais JSONB NOT NULL DEFAULT '[]'::jsonb,
    tom_comunicacao TEXT NOT NULL DEFAULT 'Editorial, consultivo, sóbrio e altamente profissional',
    servicos_prioritarios JSONB NOT NULL DEFAULT '[]'::jsonb,
    servicos_evitar JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commercial_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periodo TEXT NOT NULL, -- '2026-03', '2026-Q1', '2026-anual'
    faturamento_alvo NUMERIC(12, 2) NOT NULL DEFAULT 15000.00,
    faturamento_atual NUMERIC(12, 2) NOT NULL DEFAULT 8800.00,
    novos_clientes_alvo INTEGER NOT NULL DEFAULT 8,
    novos_clientes_atual INTEGER NOT NULL DEFAULT 3,
    propostas_alvo INTEGER NOT NULL DEFAULT 20,
    propostas_atual INTEGER NOT NULL DEFAULT 7,
    leads_qualificados_alvo INTEGER NOT NULL DEFAULT 40,
    leads_qualificados_atual INTEGER NOT NULL DEFAULT 19,
    prospeccoes_alvo INTEGER NOT NULL DEFAULT 100,
    prospeccoes_atual INTEGER NOT NULL DEFAULT 64,
    status TEXT NOT NULL DEFAULT 'em_progresso', -- 'em_progresso', 'atingida', 'superada', 'encerrada'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 14. PROSPECTS — PROSPECÇÃO PURA (SEÇÃO 09 & 10)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    empresa TEXT NOT NULL,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    site TEXT,
    instagram TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    niche_id UUID REFERENCES niches(id) ON DELETE SET NULL,
    icp_score INTEGER NOT NULL DEFAULT 50 CHECK (icp_score >= 0 AND icp_score <= 100),
    opportunity_score INTEGER NOT NULL DEFAULT 50 CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
    digital_presence_score INTEGER NOT NULL DEFAULT 50 CHECK (digital_presence_score >= 0 AND digital_presence_score <= 100),
    observations TEXT,
    source TEXT NOT NULL DEFAULT 'Prospecção Ativa IA',
    suggested_service TEXT,
    identified_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'analyzed', 'priority', 'contacted', 'responded', 'converted_to_lead', 'discarded'
    converted_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 15. EVO ASSISTANT, RESUMOS & AUDITORIA DE AÇÕES DA IA (SEÇÕES 05, 06, 07, 08)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    intent TEXT NOT NULL,
    lead_temperature TEXT NOT NULL DEFAULT 'morno',
    lead_score INTEGER NOT NULL DEFAULT 50,
    services_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
    objections JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_action TEXT NOT NULL,
    ai_confidence NUMERIC(4, 2) NOT NULL DEFAULT 0.85,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    intent TEXT NOT NULL,
    input TEXT NOT NULL,
    tool_used TEXT,
    permission_level TEXT NOT NULL DEFAULT 'READ', -- 'READ', 'WRITE', 'RESTRICTED'
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'success', 'error', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    command_id UUID REFERENCES ai_commands(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'register_payment'
    entity_type TEXT NOT NULL, -- 'lead', 'client', 'opportunity', 'task', 'payment', 'prospect'
    entity_id TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    feedback TEXT NOT NULL CHECK (feedback IN ('positive', 'negative')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 16. SEGURANÇA & ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------

ALTER TABLE business_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para acesso autenticado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_business_context') THEN
        CREATE POLICY authenticated_read_business_context ON business_context FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_manage_prospects') THEN
        CREATE POLICY authenticated_manage_prospects ON prospects FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_manage_goals') THEN
        CREATE POLICY authenticated_manage_goals ON commercial_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_manage_ai_logs') THEN
        CREATE POLICY authenticated_manage_ai_logs ON ai_action_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_manage_ai_commands') THEN
        CREATE POLICY authenticated_manage_ai_commands ON ai_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_manage_ai_feedback') THEN
        CREATE POLICY authenticated_manage_ai_feedback ON ai_feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

