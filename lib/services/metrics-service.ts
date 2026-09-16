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

    const periodLabels: Record<TimePeriod, string> = {
      hoje: 'Hoje',
      '7d': 'Últimos 7 dias',
      '30d': 'Últimos 30 dias',
      '90d': 'Últimos 90 dias',
      ano: 'Ano corrente (2026)',
      historico: 'Histórico Total Acumulado',
    };

    // Cálculos dependentes do período
    let faturamentoTotal = 147850;
    let faturamentoRecebido = 139450;
    let faturamentoPendente = 8400;
    let ticketMedio = 4280;
    let totalLeadsPeriodo = 84;
    let oportunidadesPeriodo = 19;
    let fechamentosPeriodo = 6;
    let comparativo = 1.4;

    if (period === 'hoje') {
      faturamentoTotal = 2400;
      faturamentoRecebido = 2000;
      faturamentoPendente = 400;
      ticketMedio = 2400;
      totalLeadsPeriodo = 3;
      oportunidadesPeriodo = 1;
      fechamentosPeriodo = 1;
      comparativo = 0;
    } else if (period === '7d') {
      faturamentoTotal = 4800;
      faturamentoRecebido = 4800;
      faturamentoPendente = 0;
      ticketMedio = 3800;
      totalLeadsPeriodo = 18;
      oportunidadesPeriodo = 5;
      fechamentosPeriodo = 2;
      comparativo = 0.8;
    } else if (period === '30d') {
      faturamentoTotal = 11800;
      faturamentoRecebido = 8800;
      faturamentoPendente = 3000;
      ticketMedio = 4280;
      totalLeadsPeriodo = 84;
      oportunidadesPeriodo = 19;
      fechamentosPeriodo = 6;
      comparativo = 1.4;
    } else if (period === '90d') {
      faturamentoTotal = 28400;
      faturamentoRecebido = 23150;
      faturamentoPendente = 5250;
      ticketMedio = 4450;
      totalLeadsPeriodo = 160;
      oportunidadesPeriodo = 38;
      fechamentosPeriodo = 12;
      comparativo = 2.1;
    } else if (period === 'ano') {
      faturamentoTotal = 31550;
      faturamentoRecebido = 23150;
      faturamentoPendente = 8400;
      ticketMedio = 4520;
      totalLeadsPeriodo = 210;
      oportunidadesPeriodo = 52;
      fechamentosPeriodo = 16;
      comparativo = 3.2;
    }

    const taxaConv = Number(((fechamentosPeriodo / (totalLeadsPeriodo || 1)) * 100).toFixed(1));

    const openOpps = opportunities.filter(o => o.stage_slug !== 'fechado' && o.stage_slug !== 'perdido');
    const valorOppsAbertas = openOpps.reduce((acc, o) => acc + o.estimated_value, 0);

    const receitaPorNicho = [
      { nicho: 'Clínicas / Odonto / Estética', valor: 54800, percentual: 37 },
      { nicho: 'Contabilidade & B2B', valor: 41200, percentual: 28 },
      { nicho: 'Imobiliárias', valor: 28450, percentual: 19 },
      { nicho: 'Consultorias & Engenharia', valor: 23400, percentual: 16 },
    ];

    const receitaPorServico = [
      { servico: 'Sites Institucionais', valor: 62400, percentual: 42 },
      { servico: 'Automação & IA (n8n/WhatsApp)', valor: 41500, percentual: 28 },
      { servico: 'Landing Pages de Conversão', valor: 29800, percentual: 20 },
      { servico: 'Identidade & Posicionamento Local', valor: 14150, percentual: 10 },
    ];

    const metaFaturamento = goals?.faturamento_alvo || 15000;
    const faturamentoRealizado = goals?.faturamento_atual || 8800;
    const percentualMeta = Number(((faturamentoRealizado / metaFaturamento) * 100).toFixed(1));

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
      leadsQualificados: leads.filter(l => l.score >= 70).length,
      oportunidadesAbertas: {
        quantidade: openOpps.length,
        valorTotal: valorOppsAbertas,
      },
      taxaRespostaProspeccao: {
        taxaGeral: 18.2,
        melhorNicho: {
          nome: 'Contabilidade',
          taxa: 34.0,
          etapaMaisEficaz: 'Etapa 2 — Follow-up 1',
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
