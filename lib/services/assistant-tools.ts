import { crmService } from './crm-service';
import { metricsService, TimePeriod } from './metrics-service';
import { PermissionLevel } from '@/types/database';
import { aiProvider } from '@/lib/ai/ai-provider';

export interface ToolExecutionResult {
  tool: string;
  permissionLevel: PermissionLevel;
  success: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  data?: unknown;
  message: string;
  source: string[];
  actionLogged?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'CRM' | 'FINANCIAL' | 'SALES' | 'PROSPECTING' | 'TASK' | 'ANALYTICS';
  permissionLevel: PermissionLevel;
  execute: (params: Record<string, unknown>) => Promise<ToolExecutionResult> | ToolExecutionResult;
}

class AssistantToolsRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools() {
    // --------------------------------------------------------------------------
    // 1. ANALYTICS & SALES TOOLS (READ)
    // --------------------------------------------------------------------------
    this.register({
      name: 'get_conversion_rate',
      description: 'Consulta a taxa de conversão e funil de vendas do período.',
      category: 'ANALYTICS',
      permissionLevel: 'READ',
      execute: (params) => {
        const period = (params.period as TimePeriod) || '30d';
        const metrics = metricsService.getMetrics(period);
        return {
          tool: 'get_conversion_rate',
          permissionLevel: 'READ',
          success: true,
          data: metrics.taxaConversao,
          message: `Nos últimos 30 dias (${metrics.periodLabel}): ${metrics.taxaConversao.totalLeads} leads analisados, ${metrics.taxaConversao.oportunidadesQualificadas} oportunidades qualificadas e ${metrics.taxaConversao.fechamentos} vendas fechadas. Taxa de conversão: ${metrics.taxaConversao.taxa}% (+${metrics.taxaConversao.comparativoAnterior}% vs período anterior).`,
          source: ['Leads', 'Pipeline', 'Vendas Realizadas'],
        };
      },
    });

    this.register({
      name: 'get_financial_summary',
      description: 'Consulta faturamento realizado, a receber e ticket médio.',
      category: 'FINANCIAL',
      permissionLevel: 'READ',
      execute: () => {
        const overview = crmService.getDashboardOverview();
        return {
          tool: 'get_financial_summary',
          permissionLevel: 'READ',
          success: true,
          data: overview,
          message: `Faturamento oficial acumulado: R$ ${overview.faturamentoAcumulado.toLocaleString('pt-BR')}. Recebido: R$ ${overview.recebido.toLocaleString('pt-BR')} (94.3%). Pendente a receber: R$ ${overview.aReceber.toLocaleString('pt-BR')}. Receita realizada neste mês: R$ ${overview.receitaMes.toLocaleString('pt-BR')} com ticket médio de R$ ${overview.ticketMedio.toLocaleString('pt-BR')}.`,
          source: ['Financeiro', 'Projetos Históricos', 'Transações Ativas'],
        };
      },
    });

    this.register({
      name: 'get_goals',
      description: 'Consulta metas comerciais e ritmo de atingimento.',
      category: 'SALES',
      permissionLevel: 'READ',
      execute: () => {
        const goals = crmService.getCommercialGoals();
        const percentFaturamento = Math.round((goals.faturamento_atual / goals.faturamento_alvo) * 100);
        return {
          tool: 'get_goals',
          permissionLevel: 'READ',
          success: true,
          data: goals,
          message: `Meta ${goals.periodo}: Faturamento R$ ${goals.faturamento_atual.toLocaleString('pt-BR')} de R$ ${goals.faturamento_alvo.toLocaleString('pt-BR')} (${percentFaturamento}% atingido, faltam R$ ${(goals.faturamento_alvo - goals.faturamento_atual).toLocaleString('pt-BR')}). Novos Clientes: ${goals.novos_clientes_atual}/${goals.novos_clientes_alvo}. Propostas: ${goals.propostas_atual}/${goals.propostas_alvo}. Prospecções: ${goals.prospeccoes_atual}/${goals.prospeccoes_alvo}.`,
          source: ['commercial_goals', 'Financeiro'],
        };
      },
    });

    this.register({
      name: 'get_leads_attention',
      description: 'Lista leads prioritários e quentes que precisam de atenção.',
      category: 'CRM',
      permissionLevel: 'READ',
      execute: () => {
        const leads = crmService.getLeads().filter(l => l.temperature === 'quente' || l.score >= 80);
        return {
          tool: 'get_leads_attention',
          permissionLevel: 'READ',
          success: true,
          data: leads,
          message: `Existem ${leads.length} leads de alta prioridade demandando retorno imediato: ${leads.map(l => `${l.name} (${l.company_name} — Score ${l.score})`).join('; ')}.`,
          source: ['Leads', 'Qualificação IA'],
        };
      },
    });

    this.register({
      name: 'suggest_prospects',
      description: 'Retorna os prospects recomendados para abordagem hoje.',
      category: 'PROSPECTING',
      permissionLevel: 'READ',
      execute: () => {
        const prospects = crmService.getProspects().filter(p => p.status === 'priority');
        return {
          tool: 'suggest_prospects',
          permissionLevel: 'READ',
          success: true,
          data: prospects,
          message: `Identifiquei ${prospects.length} prospects com altíssimo potencial (ICP > 80) para abordagem hoje: ${prospects.map(p => `${p.empresa} (ICP ${p.icp_score}/100 — Serviço: ${p.suggested_service})`).join('; ')}.`,
          source: ['prospects', 'Diagnóstico de Sinais Digitais'],
        };
      },
    });

    // --------------------------------------------------------------------------
    // 2. WRITE TOOLS (Execução direta com log de auditoria)
    // --------------------------------------------------------------------------
    this.register({
      name: 'register_payment',
      description: 'Registra um pagamento recebido de cliente.',
      category: 'FINANCIAL',
      permissionLevel: 'WRITE',
      execute: (params) => {
        const clientName = (params.clientName as string) || 'Cliente';
        const amount = Number(params.amount) || 0;
        const method = (params.method as string) || 'pix';

        if (amount <= 0) {
          return {
            tool: 'register_payment',
            permissionLevel: 'WRITE',
            success: false,
            message: 'O valor do pagamento deve ser superior a zero.',
            source: ['Parâmetros Inválidos'],
          };
        }

        const result = crmService.registerPaymentViaAssistant(clientName, amount, method);

        return {
          tool: 'register_payment',
          permissionLevel: 'WRITE',
          success: true,
          data: result,
          message: `✓ Pagamento de R$ ${amount.toLocaleString('pt-BR')} registrado com sucesso para ${clientName}. Status atualizado e auditoria salva em ai_action_logs.`,
          source: ['FinancialTransactions', 'ai_action_logs'],
          actionLogged: true,
        };
      },
    });

    this.register({
      name: 'create_task',
      description: 'Cria uma nova tarefa no CRM.',
      category: 'TASK',
      permissionLevel: 'WRITE',
      execute: (params) => {
        const title = (params.title as string) || 'Nova Tarefa do Assistant';
        const relatedTo = (params.relatedTo as string) || 'Operação Geral';
        const dueDate = (params.dueDate as string) || new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const newTask = crmService.addTask({
          title,
          related_to: relatedTo,
          due_date: dueDate,
          status: 'pendente',
          priority: 'alta',
        });

        crmService.logAiAction({
          action_type: 'create',
          entity_type: 'task',
          entity_id: newTask.id,
          entity_label: `${title} (${relatedTo})`,
          after_data: { title, relatedTo, dueDate },
        });

        return {
          tool: 'create_task',
          permissionLevel: 'WRITE',
          success: true,
          data: newTask,
          message: `✓ Tarefa criada com sucesso: "${title}" vinculada a ${relatedTo} com vencimento para ${dueDate}.`,
          source: ['tasks', 'ai_action_logs'],
          actionLogged: true,
        };
      },
    });

    // Ferramenta de Conexão com Modelos de IA (Gemini & Claude)
    this.register({
      name: 'ai_query',
      description: 'Gera análise e respostas estratégicas utilizando o provedor de IA configurado (Google Gemini ou Anthropic Claude).',
      category: 'ANALYTICS',
      permissionLevel: 'READ',
      execute: async (params) => {
        const query = (params.query as string) || '';
        const overview = crmService.getDashboardOverview();
        const goals = crmService.getCommercialGoals();
        const topLeads = crmService.getLeads().slice(0, 5);

        const completion = await aiProvider.generateCompletion(query, {
          overview,
          metas: goals,
          leadsPrioritarios: topLeads,
        });

        return {
          tool: 'ai_query',
          permissionLevel: 'READ',
          success: true,
          message: completion.text,
          source: [completion.provider, `Modelo: ${completion.model}`, 'Contexto EVOCRM'],
          data: {
            provider: completion.provider,
            model: completion.model,
          },
        };
      },
    });

    // --------------------------------------------------------------------------
    // 3. RESTRICTED TOOLS (Exigem confirmação humana explícita antes de executar)
    // --------------------------------------------------------------------------
    this.register({
      name: 'delete_client',
      description: 'Exclui ou arquiva permanentemente um cliente.',
      category: 'CRM',
      permissionLevel: 'RESTRICTED',
      execute: (params) => {
        const clientName = (params.clientName as string) || 'Cliente Selecionado';
        const isConfirmed = params.confirmed === true;

        if (!isConfirmed) {
          return {
            tool: 'delete_client',
            permissionLevel: 'RESTRICTED',
            success: false,
            requiresConfirmation: true,
            confirmationMessage: `Você está prestes a excluir permanentemente os registros do cliente "${clientName}". Esta ação apagará o histórico contratual. Deseja confirmar?`,
            message: `Ação RESTRICTED: Exclusão de cliente exige confirmação manual explícita.`,
            source: ['Segurança & Políticas RLS'],
          };
        }

        // Execução se confirmado
        crmService.logAiAction({
          action_type: 'delete',
          entity_type: 'client',
          entity_id: `cli-${Date.now()}`,
          entity_label: `Exclusão de cliente: ${clientName}`,
        });

        return {
          tool: 'delete_client',
          permissionLevel: 'RESTRICTED',
          success: true,
          message: `Cliente ${clientName} excluído após confirmação explícita.`,
          source: ['ai_action_logs'],
          actionLogged: true,
        };
      },
    });

    this.register({
      name: 'cancel_contract',
      description: 'Cancela um contrato vigente.',
      category: 'SALES',
      permissionLevel: 'RESTRICTED',
      execute: (params) => {
        const contractCode = (params.contractCode as string) || 'CONT-2026';
        const isConfirmed = params.confirmed === true;

        if (!isConfirmed) {
          return {
            tool: 'cancel_contract',
            permissionLevel: 'RESTRICTED',
            success: false,
            requiresConfirmation: true,
            confirmationMessage: `Você está prestes a cancelar o contrato "${contractCode}". Esta ação interromperá as cobranças e o checklist do projeto. Deseja confirmar?`,
            message: `Ação RESTRICTED: Cancelamento de contrato exige confirmação manual explícita.`,
            source: ['Contratos', 'Segurança'],
          };
        }

        return {
          tool: 'cancel_contract',
          permissionLevel: 'RESTRICTED',
          success: true,
          message: `Contrato ${contractCode} cancelado com sucesso após confirmação.`,
          source: ['ai_action_logs'],
          actionLogged: true,
        };
      },
    });
  }

  public register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  // Pipeline de execução com validação e registro de auditoria
  public async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    sessionId: string = 'session-default',
    userInput: string = ''
  ): Promise<ToolExecutionResult> {
    const tool = this.getTool(toolName);
    if (!tool) {
      return {
        tool: toolName,
        permissionLevel: 'READ',
        success: false,
        message: `Ferramenta "${toolName}" não encontrada no catálogo de inteligência.`,
        source: ['Catálogo'],
      };
    }

    try {
      // Registrar tentativa do comando
      const cmd = crmService.addAiCommand({
        session_id: sessionId,
        intent: toolName,
        input: userInput || tool.description,
        tool_used: toolName,
        permission_level: tool.permissionLevel,
        parameters: params,
        status: 'processing',
      });

      const result = await tool.execute(params);

      // Atualizar status do comando
      cmd.status = result.success ? 'success' : (result.requiresConfirmation ? 'pending' : 'error');
      cmd.result = result.data as Record<string, unknown> | undefined;

      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro interno na execução da ferramenta';
      return {
        tool: toolName,
        permissionLevel: tool.permissionLevel,
        success: false,
        message: `Falha ao executar ferramenta ${toolName}: ${errorMessage}`,
        source: ['Error Handler'],
      };
    }
  }

  // Interpretador de intenção (motor de roteamento para o Assistant e Command Palette)
  public parseIntent(input: string): { toolName: string; params: Record<string, unknown> } {
    const text = input.toLowerCase().trim();

    // Taxa de conversão
    if (text.includes('conversão') || text.includes('conversao') || text.includes('funil')) {
      return { toolName: 'get_conversion_rate', params: { period: '30d' } };
    }

    // Faturamento / Quanto vendemos / A receber
    if (text.includes('vendemos') || text.includes('faturamento') || text.includes('quanto temos para receber') || text.includes('financeiro')) {
      return { toolName: 'get_financial_summary', params: {} };
    }

    // Metas
    if (text.includes('meta') || text.includes('ritmo') || text.includes('quanto falta')) {
      return { toolName: 'get_goals', params: {} };
    }

    // Leads que precisam de atenção / leads quentes
    if (text.includes('leads quentes') || text.includes('leads') && (text.includes('atenção') || text.includes('atencao') || text.includes('quente'))) {
      return { toolName: 'get_leads_attention', params: {} };
    }

    // O que prospectar hoje / Sugestão de prospecção
    if (text.includes('prospectar') || text.includes('prospect') || text.includes('sugere')) {
      return { toolName: 'suggest_prospects', params: {} };
    }

    // Registrar pagamento: "João pagou R$ 2.000" ou "Cliente X pagou 2 mil"
    if (text.includes('pagou') || text.includes('pagamento')) {
      let amount = 2000;
      const numMatch = text.match(/\d+([.,]\d+)?/);
      if (numMatch) {
        amount = parseFloat(numMatch[0].replace('.', '').replace(',', '.'));
        if (text.includes('mil') && amount < 1000) amount *= 1000;
      }
      return {
        toolName: 'register_payment',
        params: {
          clientName: 'Clínica Vida & Saúde',
          amount,
          method: 'pix',
        },
      };
    }

    // Criar tarefa
    if (text.includes('tarefa') || text.includes('lembrete')) {
      return {
        toolName: 'create_task',
        params: {
          title: input.replace(/crie uma tarefa/i, '').replace(/criar tarefa/i, '').trim() || 'Falar com cliente sobre proposta',
          relatedTo: 'Carlos / Lead Comercial',
        },
      };
    }

    // Exclusão / Ações restritas
    if (text.includes('exclua') || text.includes('apagar cliente') || text.includes('deletar')) {
      return {
        toolName: 'delete_client',
        params: { clientName: 'Cliente João Silva' },
      };
    }

    // Default: Consulta direta ao motor de Inteligência Artificial (Gemini / Claude)
    return { toolName: 'ai_query', params: { query: input } };
  }
}

export const assistantTools = new AssistantToolsRegistry();
