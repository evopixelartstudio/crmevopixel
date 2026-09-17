'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { metricsService, TimePeriod } from '@/lib/services/metrics-service';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Clock,
  ArrowRight,
  Flame,
  CheckCircle2,
  Zap,
  Target,
  Bot,
  Compass,
  Building2,
  HelpCircle,
  BarChart2,
  ExternalLink,
  CalendarCheck,
} from 'lucide-react';

export default function DashboardPage() {
  useCrmSync();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');
  const metrics = metricsService.getMetrics(selectedPeriod);

  const overview = crmService.getDashboardOverview();
  const opportunities = crmService.getOpportunities();
  const sequences = crmService.getSequences();
  const prospects = crmService.getProspects();
  const evoInsights = crmService.getEvoInsights();
  const nextBestActions = crmService.getNextBestActions();
  const commercialGoals = crmService.getCommercialGoals();
  const monthlyEvolution = crmService.getMonthlyEvolution();
  const monthlySummary = crmService.getMonthlySubscriptionsSummary();
  const maxMonthVal = Math.max(...monthlyEvolution.map((m) => m.value), 1);

  // Filtra prospects recomendados para hoje (ICP >= 80 e status priority)
  const prospectsToProspectToday = prospects.filter((p) => p.status === 'priority').slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Saudação, Seletor Temporal & Cabeçalho Executivo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F1F9A1]" />
            Visão Geral & Inteligência da EvoPixel
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#E7ECE8] font-heading">
            Olá, Oliveira.
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1 max-w-xl">
            Acompanhe a inteligência comercial, metas do ciclo, faturamento acumulado e as ações que exigem atenção imediata.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor Temporal (Seção 19) */}
          <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] p-1 rounded-xl flex items-center gap-1">
            {(
              [
                { key: 'hoje', label: 'Hoje' },
                { key: '7d', label: '7d' },
                { key: '30d', label: '30d' },
                { key: '90d', label: '90d' },
                { key: 'ano', label: 'Ano' },
                { key: 'historico', label: 'Total' },
              ] as { key: TimePeriod; label: string }[]
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedPeriod(item.key)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg transition-colors ${
                  selectedPeriod === item.key
                    ? 'bg-[#163832] text-[#F1F9A1] font-semibold border border-[#8EB69B]/30'
                    : 'text-[#65706A] hover:text-[#E7ECE8]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Link href="/assistant">
            <Button variant="secondary" size="sm" className="gap-2 text-xs">
              <Bot className="w-3.5 h-3.5 text-[#F1F9A1]" />
              <span>Evo Assistant</span>
            </Button>
          </Link>
          <Link href="/prospects">
            <Button variant="primary" size="sm" className="gap-2 text-xs">
              <Target className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Prospects</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Grid de Faturamento Acumulado & Métricas Principais com Contexto Temporal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card Principal Grande: Faturamento Acumulado (7 cols) */}
        <div className="lg:col-span-7 bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)] rounded-2xl p-6 lg:p-7 relative overflow-hidden transition-all duration-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading text-[#9BA6A0] uppercase tracking-wider">
                  Faturamento Acumulado
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10201E] text-[#8EB69B] border border-[rgba(218,241,222,0.06)]">
                  {metrics.periodLabel}
                </span>
              </div>
              <div className="text-3xl lg:text-4xl font-semibold text-[#F1F9A1] font-heading mt-2 tracking-tight">
                R$ {overview.faturamentoAcumulado.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-[#8EB69B] mt-1">
                Desde o início da EvoPixel (baseado em projetos realizados e vigentes)
              </p>
            </div>
            <Link href="/minha-historia">
              <Button variant="ghost" size="sm" className="text-xs text-[#8EB69B] hover:text-[#F1F9A1] gap-1">
                <span>Ver Meu Histórico</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Comparativo: Recebido vs A Receber */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[rgba(218,241,222,0.06)]">
            <div className="p-3.5 rounded-xl bg-[#10201E]/70 border border-[rgba(218,241,222,0.05)]">
              <span className="text-[11px] text-[#9BA6A0]">Recebido</span>
              <div className="text-xl font-medium text-[#E7ECE8] font-heading mt-1">
                R$ {overview.recebido.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-[#8EB69B]">
                {overview.faturamentoAcumulado + overview.aReceber > 0
                  ? `${(((overview.recebido) / (overview.faturamentoAcumulado + overview.aReceber)) * 100).toFixed(1)}% liquidado`
                  : '0% liquidado'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#10201E]/70 border border-[rgba(218,241,222,0.05)]">
              <span className="text-[11px] text-[#9BA6A0]">A receber</span>
              <div className="text-xl font-medium text-[#E7ECE8] font-heading mt-1">
                R$ {overview.aReceber.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-[#9BA6A0]">Em aberto / parcelas</span>
            </div>
          </div>

          {/* Gráfico de evolução de faturamento por mês (12 meses) */}
          <div className="mt-6 pt-5 border-t border-[rgba(218,241,222,0.06)]">
            <div className="flex items-center justify-between text-xs text-[#9BA6A0] mb-3">
              <span className="font-heading">Evolução de Faturamento por Mês</span>
              <span className="text-[11px] font-mono text-[#8EB69B]">
                Total Ano: R$ {monthlyEvolution.reduce((acc, m) => acc + m.value, 0).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="h-20 flex items-end gap-1.5 sm:gap-2 pt-2">
              {monthlyEvolution.map((m) => {
                const heightPct = m.value > 0 ? Math.max(20, Math.round((m.value / maxMonthVal) * 100)) : 8;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all relative ${
                        m.value > 0
                          ? m.isCurrent
                            ? 'bg-[#F1F9A1] hover:brightness-110'
                            : 'bg-[#235347] hover:bg-[#8EB69B]'
                          : m.isCurrent
                          ? 'bg-[#163832] border-t border-[#F1F9A1]/50'
                          : 'bg-[#10201E]/80 hover:bg-[#163832]'
                      }`}
                      title={`${m.fullName}: R$ ${m.value.toLocaleString('pt-BR')}`}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#050706] text-[9px] text-[#E7ECE8] rounded border border-[rgba(218,241,222,0.1)] whitespace-nowrap pointer-events-none z-10 font-mono">
                        R$ {m.value.toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] font-mono ${
                        m.isCurrent ? 'text-[#F1F9A1] font-semibold' : 'text-[#65706A]'
                      }`}
                    >
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Métricas Secundárias (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            label="Taxa de Conversão"
            value={`${metrics.taxaConversao.taxa}%`}
            subtitle={`${metrics.taxaConversao.fechamentos} vendas em ${metrics.taxaConversao.totalLeads} leads`}
            trend={`+${metrics.taxaConversao.comparativoAnterior}% vs anterior`}
            trendPositive={true}
          />
          <MetricCard
            label="Pipeline Ativo"
            value={`R$ ${metrics.oportunidadesAbertas.valorTotal.toLocaleString('pt-BR')}`}
            subtitle={`${metrics.oportunidadesAbertas.quantidade} oportunidades abertas`}
            trend="R$ 8.4k em negociação"
            trendPositive={true}
          />
          <MetricCard
            label="Ticket Médio"
            value={`R$ ${metrics.ticketMedio.toLocaleString('pt-BR')}`}
            subtitle="Por projeto fechado"
            trend="+18% no período"
            trendPositive={true}
          />
          <MetricCard
            label="Resposta Prospecção"
            value={`${metrics.taxaRespostaProspeccao.taxaGeral}%`}
            subtitle={`Melhor: ${metrics.taxaRespostaProspeccao.melhorNicho.nome} (${metrics.taxaRespostaProspeccao.melhorNicho.taxa}%)`}
            trend={metrics.taxaRespostaProspeccao.melhorNicho.etapaMaisEficaz}
            trendPositive={true}
          />
        </div>
      </div>

      {/* 2.5 BLOCO: CLIENTES MENSALISTAS & RECEITA RECORRENTE (MRR) */}
      <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)] rounded-2xl p-6 transition-all shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] flex items-center justify-center text-[#F1F9A1] shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#E7ECE8] font-heading">
                  Clientes Mensalistas & Recorrência
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#163832] text-[#F1F9A1] border border-[#F1F9A1]/20">
                  MRR
                </span>
              </div>
              <p className="text-xs text-[#9BA6A0] mt-0.5 max-w-xl">
                Controle de clientes com contratos contínuos de suporte, hospedagem, evolução web e automação IA.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t lg:border-t-0 border-[rgba(218,241,222,0.06)] pt-4 lg:pt-0">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#65706A]">MRR Contratado</span>
              <div className="text-xl font-semibold font-mono text-[#F1F9A1] mt-0.5">
                R$ {monthlySummary.mrr.toLocaleString('pt-BR')}
                <span className="text-xs text-[#8EB69B] font-normal">/mês</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#65706A]">Assinantes Ativos</span>
              <div className="text-xl font-semibold font-mono text-[#E7ECE8] mt-0.5">
                {monthlySummary.totalActive}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#65706A]">Pago este mês</span>
              <div className="text-xl font-semibold font-mono text-[#8EB69B] mt-0.5">
                R$ {monthlySummary.paidThisMonth.toLocaleString('pt-BR')}
              </div>
            </div>
            <Link href="/mensalidades">
              <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                <span>Ver Mensalistas</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8EB69B]" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. NOVO BLOCO: METAS DO CICLO (Seção 14 da Spec) */}
      <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#8EB69B]">
                Metas do Ciclo
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10201E] text-[#F1F9A1] border border-[rgba(218,241,222,0.06)]">
                {commercialGoals.periodo}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[#E7ECE8] font-heading mt-0.5">
              Progresso Comercial de {commercialGoals.periodo}
            </h3>
          </div>
          <div className="text-xs text-[#9BA6A0] font-mono">
            Faturamento: R$ {commercialGoals.faturamento_atual.toLocaleString('pt-BR')} de R$ {commercialGoals.faturamento_alvo.toLocaleString('pt-BR')} ({Math.round((commercialGoals.faturamento_atual / commercialGoals.faturamento_alvo) * 100)}%)
          </div>
        </div>

        {/* Barra de Progresso Principal */}
        <div className="w-full bg-[#07100F] h-2.5 rounded-full overflow-hidden mb-6 border border-[rgba(218,241,222,0.06)]">
          <div
            className="bg-gradient-to-r from-[#235347] to-[#F1F9A1] h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (commercialGoals.faturamento_atual / commercialGoals.faturamento_alvo) * 100)}%` }}
          />
        </div>

        {/* Indicadores das 4 Metas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-[rgba(218,241,222,0.06)]">
          <div>
            <span className="text-[11px] text-[#65706A]">Novos Clientes</span>
            <div className="text-base font-semibold text-[#E7ECE8] font-heading mt-0.5">
              {commercialGoals.novos_clientes_atual} / {commercialGoals.novos_clientes_alvo}
            </div>
            <span className="text-[10px] text-[#8EB69B]">
              {Math.round((commercialGoals.novos_clientes_atual / commercialGoals.novos_clientes_alvo) * 100)}% da meta
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#65706A]">Propostas Enviadas</span>
            <div className="text-base font-semibold text-[#E7ECE8] font-heading mt-0.5">
              {commercialGoals.propostas_atual} / {commercialGoals.propostas_alvo}
            </div>
            <span className="text-[10px] text-[#8EB69B]">
              {Math.round((commercialGoals.propostas_atual / commercialGoals.propostas_alvo) * 100)}% da meta
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#65706A]">Leads Qualificados</span>
            <div className="text-base font-semibold text-[#E7ECE8] font-heading mt-0.5">
              {commercialGoals.leads_qualificados_atual} / {commercialGoals.leads_qualificados_alvo}
            </div>
            <span className="text-[10px] text-[#8EB69B]">
              {Math.round((commercialGoals.leads_qualificados_atual / commercialGoals.leads_qualificados_alvo) * 100)}% da meta
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#65706A]">Prospecções Realizadas</span>
            <div className="text-base font-semibold text-[#E7ECE8] font-heading mt-0.5">
              {commercialGoals.prospeccoes_atual} / {commercialGoals.prospeccoes_alvo}
            </div>
            <span className="text-[10px] text-[#8EB69B]">
              {Math.round((commercialGoals.prospeccoes_atual / commercialGoals.prospeccoes_alvo) * 100)}% da meta
            </span>
          </div>
        </div>
      </div>

      {/* 4. NOVO BLOCO: EVO DIZ (Seção 12 da Spec — DADO vs INFERÊNCIA vs RECOMENDAÇÃO) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#E7ECE8] font-heading flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#F1F9A1]" />
              EVO DIZ
            </h2>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Insights calculados pelo motor de inteligência analítica a partir dos dados reais da operação.
            </p>
          </div>
          <Link href="/intelligence" className="text-xs text-[#8EB69B] hover:text-[#F1F9A1] transition-colors">
            Abrir Central de Inteligência →
          </Link>
        </div>

        {evoInsights.length === 0 ? (
          <div className="py-8 px-6 rounded-2xl bg-[#0C1A19]/50 border border-[rgba(218,241,222,0.06)] text-center">
            <Sparkles className="w-5 h-5 text-[#8EB69B] mx-auto mb-2" />
            <p className="text-sm text-[#E7ECE8] font-medium">Motor Evo Intelligence Pronto</p>
            <p className="text-xs text-[#9BA6A0] mt-0.5 max-w-md mx-auto">
              Conforme você cadastrar seus leads, propostas e clientes, a inteligência analítica gerará recomendações e análises automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {evoInsights.map((item) => (
              <div
                key={item.id}
                className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.18)] rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span
                      className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded tracking-wider uppercase ${
                        item.type === 'DADO'
                          ? 'bg-[#10201E] text-[#8EB69B] border border-[#8EB69B]/30'
                          : item.type === 'INFERENCIA'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-[#163832] text-[#F1F9A1] border border-[#F1F9A1]/30'
                      }`}
                    >
                      [{item.type}]
                    </span>
                    <span className="text-[10px] font-mono text-[#65706A]">
                      {item.period}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-[#E7ECE8] font-heading leading-snug mb-2">
                    {item.title}
                  </h4>

                  <p className="text-xs text-[#9BA6A0] leading-relaxed">
                    {item.explanation}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[rgba(218,241,222,0.06)] space-y-2">
                  <div className="text-[10px] font-mono text-[#65706A]">
                    Origem: {item.data_source}
                  </div>
                  {item.suggested_action && (
                    <Link href={item.suggested_action.link}>
                      <Button variant="secondary" size="sm" className="w-full text-xs gap-1 py-1 h-7">
                        <span>{item.suggested_action.label}</span>
                        <ArrowRight className="w-3 h-3 text-[#8EB69B]" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. BLOCO PRESERVADO: "O que precisa da sua atenção" (Seção 14 da Spec) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#E7ECE8] font-heading flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#F1F9A1]" />
              O que precisa da sua atenção
            </h2>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Ações reais e prioritárias que não podem ficar paradas no ciclo comercial.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#9BA6A0]">
            <span>6 automações n8n ativas</span>
          </div>
        </div>

        {overview.attentionItems.length === 0 ? (
          <div className="py-8 px-6 rounded-2xl bg-[#0C1A19]/50 border border-[rgba(218,241,222,0.06)] text-center">
            <CheckCircle2 className="w-5 h-5 text-[#8EB69B] mx-auto mb-2" />
            <p className="text-sm text-[#E7ECE8] font-medium">Tudo em dia!</p>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Nenhuma pendência crítica, proposta aguardando ou follow-up atrasado no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overview.attentionItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.18)] rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-mono text-[11px] text-[#65706A] font-semibold">
                      {item.index}
                    </span>
                    {item.type === 'lead_hot' && (
                      <Badge variant="quente" className="text-[10px] py-0 px-2">
                        <Flame className="w-3 h-3 text-[#F1F9A1]" />
                        Quente
                      </Badge>
                    )}
                    {item.type === 'proposal_pending' && (
                      <Badge variant="morno" className="text-[10px] py-0 px-2">
                        Aguardando
                      </Badge>
                    )}
                    {item.type === 'followup_overdue' && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Atrasado
                      </span>
                    )}
                    {item.type === 'n8n_followup' && (
                      <Badge variant="accent" className="text-[10px] py-0 px-2">
                        <Zap className="w-3 h-3 text-[#F1F9A1]" />
                        IA / n8n
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs font-medium text-[#9BA6A0] leading-snug">
                    {item.title}
                  </div>

                  <div className="text-sm font-semibold text-[#E7ECE8] font-heading mt-1 mb-1">
                    {item.target}
                  </div>

                  <div className="text-xs text-[#65706A] font-mono leading-tight">
                    {item.detail}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[rgba(218,241,222,0.06)]">
                  <Link href={item.link}>
                    <Button
                      variant={item.type === 'lead_hot' ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full text-xs"
                    >
                      {item.actionLabel}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. NOVO BLOCO DUPLO: 🎯 PROSPECTAR HOJE & PRÓXIMA MELHOR AÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 🎯 PROSPECTAR HOJE (7 cols - Seção 11 da Spec) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-[#E7ECE8] font-heading flex items-center gap-2">
                <Target className="w-4 h-4 text-[#F1F9A1]" />
                🎯 Prospectar Hoje
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">
                {prospectsToProspectToday.length} prospects com alta aderência (ICP &gt; 80) e gargalos identificados para abordagem manual.
              </p>
            </div>
            <Link href="/prospects" className="text-xs text-[#8EB69B] hover:text-[#F1F9A1] transition-colors">
              Ver Todos os Prospects →
            </Link>
          </div>

          <div className="space-y-3">
            {prospectsToProspectToday.map((p) => (
              <div
                key={p.id}
                className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.18)] rounded-2xl p-4 flex flex-col justify-between transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#E7ECE8] font-heading">
                        {p.empresa}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10201E] text-[#F1F9A1] border border-[rgba(218,241,222,0.06)]">
                        ICP {p.icp_score}/100
                      </span>
                    </div>
                    <span className="text-xs text-[#8EB69B]">
                      {p.segment} • {p.nome}
                    </span>
                  </div>
                  <Badge variant="accent" className="text-[10px] py-0.5 px-2">
                    Oportunidade {p.opportunity_score}%
                  </Badge>
                </div>

                {/* Sinais */}
                <div className="p-2.5 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.04)] mb-3 space-y-1">
                  <div className="text-[11px] font-medium text-[#E7ECE8]">
                    Serviço Sugerido: <span className="text-[#F1F9A1]">{p.suggested_service}</span>
                  </div>
                  <div className="text-[11px] text-[#9BA6A0] truncate">
                    Sinais: {p.identified_signals.join(' • ')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[rgba(218,241,222,0.05)]">
                  <span className="text-[10px] font-mono text-[#65706A]">
                    {p.cidade}/{p.estado} • {p.source}
                  </span>
                  <Link href="/prospects">
                    <Button variant="secondary" size="sm" className="text-xs gap-1 py-1 h-7">
                      <span>Ver Prospect</span>
                      <ArrowRight className="w-3 h-3 text-[#8EB69B]" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PRÓXIMA MELHOR AÇÃO (5 cols - Seção 13 da Spec) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-[#E7ECE8] font-heading flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#8EB69B]" />
                Próximas Melhores Ações
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">
                Passos orientados a dados para maximizar conversão e fechamento.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {nextBestActions.map((nba) => (
              <div
                key={nba.id}
                className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.18)] rounded-2xl p-4 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8EB69B]">
                      {nba.entity_type === 'lead' ? 'Lead' : nba.entity_type === 'opportunity' ? 'Oportunidade' : 'Cliente 360'}
                    </span>
                    <Badge variant={nba.priority === 'alta' ? 'quente' : 'morno'} className="text-[9px] py-0 px-1.5">
                      Prioridade {nba.priority}
                    </Badge>
                  </div>

                  <div className="text-xs font-semibold text-[#E7ECE8] font-heading mb-1">
                    {nba.action_title}
                  </div>

                  <div className="text-xs text-[#8EB69B] mb-2 font-medium">
                    Alvo: {nba.entity_name}
                  </div>

                  <p className="text-xs text-[#9BA6A0] leading-relaxed mb-3">
                    <span className="text-[#65706A] font-mono">Motivo:</span> {nba.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[rgba(218,241,222,0.05)]">
                  <span className="text-[9px] font-mono text-[#65706A]">
                    Fonte: {nba.data_source}
                  </span>
                  <Link href={nba.action_link}>
                    <Button variant="primary" size="sm" className="text-xs gap-1 py-1 h-7">
                      <span>{nba.action_label}</span>
                      <ArrowUpRight className="w-3 h-3 text-[#07100F]" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. BLOCOS PRESERVADOS: Oportunidades no Pipeline & Sequências por Nicho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pipeline & Oportunidades Abertas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
              Oportunidades em Aberto
            </h3>
            <Link href="/pipeline" className="text-xs text-[#8EB69B] hover:text-[#F1F9A1] transition-colors">
              Ver Pipeline Kanban →
            </Link>
          </div>

          <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] rounded-2xl divide-y divide-[rgba(218,241,222,0.06)] overflow-hidden">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="p-4 hover:bg-[#10201E]/60 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#E7ECE8] font-heading truncate">
                      {opp.company_name}
                    </span>
                    <Badge temperature={opp.temperature} className="text-[10px] py-0 px-1.5">
                      Score {opp.score}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#9BA6A0] truncate">{opp.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#65706A]">
                    <span>{opp.services.join(' + ')}</span>
                    {opp.n8n_automated && (
                      <span className="text-[#8EB69B] font-mono">• Automação n8n ativa</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-[#E7ECE8] font-mono">
                    R$ {opp.estimated_value.toLocaleString('pt-BR')}
                  </div>
                  <span className="text-[11px] text-[#8EB69B]">
                    Probabilidade {opp.probability}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sequências de Prospecção por Nicho (5 cols - Seção 18.1) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
              Sequências por Nicho (n8n)
            </h3>
            <Link href="/prospeccao/mensagens" className="text-xs text-[#8EB69B] hover:text-[#F1F9A1] transition-colors">
              Banco de Mensagens →
            </Link>
          </div>

          <div className="space-y-3">
            {sequences.map((seq) => (
              <div
                key={seq.id}
                className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8EB69B]">
                      {seq.niche_name}
                    </span>
                    <h4 className="text-xs font-semibold text-[#E7ECE8] font-heading mt-0.5">
                      {seq.name}
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {seq.steps.length} etapas
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[rgba(218,241,222,0.06)] text-[11px] text-[#9BA6A0]">
                  <span className="text-[#E7ECE8]">Fluxo:</span>
                  <span className="truncate">Abertura → Follow-up 1 ({seq.steps[1]?.wait_days || 2}d) → Follow-up 2</span>
                </div>
              </div>
            ))}

            <div className="p-4 rounded-2xl bg-[#10201E]/50 border border-[rgba(218,241,222,0.06)] text-xs text-[#9BA6A0] flex items-center justify-between">
              <span>Taxa de resposta no Follow-up 1 é a mais alta (34%)</span>
              <Link href="/relatorios" className="text-[#8EB69B] hover:underline font-mono text-[11px]">
                Ver métricas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
