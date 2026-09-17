import { crmService } from './crm-service';

export type TimePeriod = 'hoje' | '7d' | '30d' | '90d' | 'ano' | 'historico';

export interface CentralMetrics {
  period: TimePeriod;
  periodLabel: string;
  faturamentoTotal: number;
  faturamentoRecebido: number;
  faturamentoPendente: number;
  ticketMedio: number;
  taxaConversao: {
    taxa: number; // Ex: 7.1%
    totalLeads: number;
    oportunidadesQualificadas: number;
    fechamentos: number;
    comparativoAnterior: number; // Ex: +1.4%
  };
  leadsQualificados: number;
  oportunidadesAbertas: {
    quantidade: number;
    valorTotal: number;
  };
  taxaRespostaProspeccao: {
    taxaGeral: number; // Ex: 18.2%
    melhorNicho: {
      nome: string;
      taxa: number;
      etapaMaisEficaz: string;
    };
  };
  receitaPorNicho: {
    nicho: string;
    valor: number;
    percentual: number;
  }[];
  receitaPorServico: {
    servico: string;
    valor: number;
    percentual: number;
  }[];
  metasProgresso: {
    metaFaturamento: number;
    faturamentoRealizado: number;
    percentualAtingido: number;
    faltante: number;
  };
}

class MetricsService {
  public getMetrics(period: TimePeriod = '30d'): CentralMetrics {
    const goals = crmService.getCommercialGoals();
    const opportunities = crmService.getOpportunities();
    const transactions = crmService.getTransactions();
    const leads = crmService.getLeads();
    const historicalProjects = crmService.getHistoricalProjects();
    const monthlySummary = crmService.getMonthlySubscriptionsSummary();

    const periodLabels: Record<TimePeriod, string> = {
      hoje: 'Hoje',
      '7d': 'Últimos 7 dias',
      '30d': 'Últimos 30 dias',
      '90d': 'Últimos 90 dias',
      ano: `Ano corrente (${new Date().getFullYear()})`,
      historico: 'Histórico Total Acumulado',
    };

    // Faturamentos reais
    const historicalReceived = historicalProjects.reduce((acc, p) => acc + (p.amount_received || 0), 0);
    const activeReceived = transactions
      .filter((t) => t.status === 'pago')
      .reduce((acc, t) => acc + (t.amount_received || 0), 0);
    const faturamentoRecebido = historicalReceived + activeReceived + monthlySummary.paidThisMonth;

    const historicalPending = historicalProjects.reduce((acc, p) => acc + (p.amount_pending || 0), 0);
    const activePending = transactions
      .filter((t) => t.status !== 'pago')
      .reduce((acc, t) => acc + (t.amount_pending || 0), 0);
    const faturamentoPendente = historicalPending + activePending + monthlySummary.pendingThisMonth;

    const faturamentoTotal = faturamentoRecebido + faturamentoPendente;

    const totalLeadsPeriodo = leads.length;
    const oportunidadesPeriodo = opportunities.length;
    const fechamentosPeriodo = opportunities.filter((o) => o.stage_slug === 'fechado').length;
    const completedCount = historicalProjects.length + transactions.filter((t) => t.status === 'pago').length;
    const ticketMedio = completedCount > 0 ? Math.round(faturamentoTotal / completedCount) : 0;
    const comparativo = 0;

    const taxaConv = totalLeadsPeriodo > 0
      ? Number(((fechamentosPeriodo / totalLeadsPeriodo) * 100).toFixed(1))
      : 0;

    const openOpps = opportunities.filter((o) => o.stage_slug !== 'fechado' && o.stage_slug !== 'perdido');
    const valorOppsAbertas = openOpps.reduce((acc, o) => acc + (o.estimated_value || 0), 0);

    // Receita por nicho dinâmica
    const nicheMap: Record<string, number> = {};
    leads.forEach((l) => {
      if (l.segment) nicheMap[l.segment] = (nicheMap[l.segment] || 0) + 1;
    });
    const receitaPorNicho = Object.entries(nicheMap).map(([nicho, count]) => ({
      nicho,
      valor: count * ticketMedio,
      percentual: totalLeadsPeriodo > 0 ? Math.round((count / totalLeadsPeriodo) * 100) : 0,
    }));

    // Receita por serviço dinâmica
    const serviceMap: Record<string, number> = {};
    leads.forEach((l) => {
      l.services?.forEach((s) => {
        serviceMap[s] = (serviceMap[s] || 0) + 1;
      });
    });
    const receitaPorServico = Object.entries(serviceMap).map(([servico, count]) => ({
      servico,
      valor: count * ticketMedio,
      percentual: totalLeadsPeriodo > 0 ? Math.round((count / totalLeadsPeriodo) * 100) : 0,
    }));

    const metaFaturamento = goals?.faturamento_alvo || 15000;
    const faturamentoRealizado = goals?.faturamento_atual || faturamentoRecebido;
    const percentualMeta = metaFaturamento > 0
      ? Number(((faturamentoRealizado / metaFaturamento) * 100).toFixed(1))
      : 0;

    return {
      period,
      periodLabel: periodLabels[period],
      faturamentoTotal,
      faturamentoRecebido,
      faturamentoPendente,
      ticketMedio,
      taxaConversao: {
        taxa: taxaConv,
        totalLeads: totalLeadsPeriodo,
        oportunidadesQualificadas: oportunidadesPeriodo,
        fechamentos: fechamentosPeriodo,
        comparativoAnterior: comparativo,
      },
      leadsQualificados: leads.filter((l) => (l.score || 0) >= 70).length,
      oportunidadesAbertas: {
        quantidade: openOpps.length,
        valorTotal: valorOppsAbertas,
      },
      taxaRespostaProspeccao: {
        taxaGeral: 0,
        melhorNicho: {
          nome: '—',
          taxa: 0,
          etapaMaisEficaz: '—',
        },
      },
      receitaPorNicho,
      receitaPorServico,
      metasProgresso: {
        metaFaturamento,
        faturamentoRealizado,
        percentualAtingido: percentualMeta,
        faltante: Math.max(0, metaFaturamento - faturamentoRealizado),
      },
    };
  }
}

export const metricsService = new MetricsService();
