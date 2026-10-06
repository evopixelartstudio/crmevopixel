'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { getSalesByNiche } from '@/lib/services/sales-by-niche';
import { SalesByNicheChart } from '@/components/dashboard/SalesByNicheChart';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Briefcase,
  CheckSquare,
  Kanban,
  ArrowUpRight,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Flame,
} from 'lucide-react';

type PeriodFilter = 'hoje' | '7d' | '30d' | '90d' | 'ano' | 'historico';

export default function DashboardPage() {
  useCrmSync();
  const [period, setPeriod] = useState<PeriodFilter>('historico');
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = crmService.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, []);

  const overview = crmService.getDashboardOverview(period);
  const financial = crmService.getFinancialSummary();
  const mrrSummary = crmService.getMonthlySubscriptionsSummary();
  const monthlyEvolution = crmService.getMonthlyEvolution();
  const leads = crmService.getLeads();
  const clients = crmService.getClients();
  const opportunities = crmService.getOpportunities();
  const projects = crmService.getProjects();
  const tasks = crmService.getTasks();
  const salesByNiche = getSalesByNiche(crmService.getHistoricalProjects(), projects, opportunities, leads, clients, period);

  const activeProjects = projects.filter((p) => p.status !== 'concluido' && p.status !== 'cancelado');
  const pendingTasks = tasks.filter((t) => t.status !== 'concluida');
  const hotLeadsCount = leads.filter(
    (l) => l.temperature === 'quente' && l.status !== 'convertido' && l.status !== 'desqualificado'
  ).length;
  const closedOppsCount = opportunities.filter((o) => o.stage_slug === 'fechado').length;
  const inProgressOppsCount = opportunities.filter((o) => o.stage_slug === 'projeto_em_andamento').length;

  const maxMonthValue = Math.max(...monthlyEvolution.map((m) => m.value), 1);

  const periods: { key: PeriodFilter; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'ano', label: 'Este Ano' },
    { key: 'historico', label: 'Todo Histórico' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <LayoutDashboard className="w-3.5 h-3.5" />
            Centro de Comando Operacional • EvoPixel
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Dashboard Executivo
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Visão consolidada em tempo real de faturamento, pipeline, projetos em andamento, tarefas e clientes.
          </p>
        </div>

        {/* Filtro de Período */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0C1A19] p-1.5 rounded-xl border border-[rgba(218,241,222,0.08)]">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading transition-all ${
                period === p.key
                  ? 'bg-[#10201E] text-[#F1F9A1] border border-[rgba(241,249,161,0.2)] font-medium'
                  : 'text-[#9BA6A0] hover:text-[#E7ECE8]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Linha 1: KPIs Financeiros e Comerciais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Recebido Total */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(142,182,155,0.22)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8EB69B]">
              Faturamento Recebido
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#10201E] flex items-center justify-center text-[#8EB69B]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-[#E7ECE8] mt-3 tracking-tight">
            R$ {overview.recebido.toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#9BA6A0] mt-2 pt-2 border-t border-[rgba(218,241,222,0.05)]">
            <span>Saldo Líquido:</span>
            <span className="font-mono text-[#8EB69B] font-semibold">
              R$ {financial.saldoLiquido.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Pipeline Ativo */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(241,249,161,0.2)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#F1F9A1]">
              Pipeline em Aberto
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#10201E] flex items-center justify-center text-[#F1F9A1]">
              <Kanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-[#F1F9A1] mt-3 tracking-tight">
            R$ {overview.pipelineAtual.toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#9BA6A0] mt-2 pt-2 border-t border-[rgba(218,241,222,0.05)]">
            <span>{inProgressOppsCount} em andamento</span>
            <span className="font-mono text-[#E7ECE8]">{closedOppsCount} fechados</span>
          </div>
        </div>

        {/* Recorrência MRR */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#9BA6A0]">
              Recorrência (MRR)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#10201E] flex items-center justify-center text-[#8EB69B]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-[#E7ECE8] mt-3 tracking-tight">
            R$ {mrrSummary.mrr.toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#9BA6A0] mt-2 pt-2 border-t border-[rgba(218,241,222,0.05)]">
            <span>{mrrSummary.totalActive} mensalistas ativos</span>
            <span className="font-mono text-[#8EB69B]">ARR R$ {mrrSummary.arr.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Gastos Mensais & A Receber */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-red-400">
              Gastos Mensais
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#10201E] flex items-center justify-center text-red-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-red-400 mt-3 tracking-tight">
            R$ {financial.gastosMensais.toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#9BA6A0] mt-2 pt-2 border-t border-[rgba(218,241,222,0.05)]">
            <span>A Receber (Clientes):</span>
            <span className="font-mono text-[#F1F9A1]">
              R$ {overview.aReceber.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Linha 2: Mini Cards de Operação (Atalhos Rápidos) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/leads"
          className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.2)] transition-all flex items-center justify-between group"
        >
          <div>
            <span className="text-[11px] text-[#9BA6A0] flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#8EB69B]" /> Leads Totais
            </span>
            <div className="text-xl font-semibold text-[#E7ECE8] font-heading mt-1">
              {leads.length}{' '}
              <span className="text-xs font-mono text-[#F1F9A1] font-normal">
                ({hotLeadsCount} quentes)
              </span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-[#65706A] group-hover:text-[#F1F9A1] transition-colors" />
        </Link>

        <Link
          href="/clientes"
          className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.2)] transition-all flex items-center justify-between group"
        >
          <div>
            <span className="text-[11px] text-[#9BA6A0] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#8EB69B]" /> Clientes Ativos
            </span>
            <div className="text-xl font-semibold text-[#E7ECE8] font-heading mt-1">
              {clients.length}
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-[#65706A] group-hover:text-[#F1F9A1] transition-colors" />
        </Link>

        <Link
          href="/projetos"
          className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.2)] transition-all flex items-center justify-between group"
        >
          <div>
            <span className="text-[11px] text-[#9BA6A0] flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-[#8EB69B]" /> Projetos Ativos
            </span>
            <div className="text-xl font-semibold text-[#E7ECE8] font-heading mt-1">
              {activeProjects.length}
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-[#65706A] group-hover:text-[#F1F9A1] transition-colors" />
        </Link>

        <Link
          href="/tarefas"
          className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.2)] transition-all flex items-center justify-between group"
        >
          <div>
            <span className="text-[11px] text-[#9BA6A0] flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-[#8EB69B]" /> Tarefas Pendentes
            </span>
            <div className="text-xl font-semibold text-[#E7ECE8] font-heading mt-1">
              {pendingTasks.length}
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-[#65706A] group-hover:text-[#F1F9A1] transition-colors" />
        </Link>
      </div>

      <SalesByNicheChart data={salesByNiche} />

      {/* Linha 3: Evolução Mensal & Radar de Atenção */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Evolução Mensal */}
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-3">
            <div>
              <h3 className="text-base font-semibold text-[#E7ECE8] font-heading flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#8EB69B]" />
                Evolução Mensal de Faturamento ({new Date().getFullYear()})
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">
                Receita realizada somando projetos fechados, lançamentos pagos e mensalistas (MRR).
              </p>
            </div>
            <Link href="/financeiro">
              <Button variant="secondary" size="sm" className="text-xs">
                Ver Financeiro
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-12 gap-2 items-end h-44 pt-6 px-1">
            {monthlyEvolution.map((m) => {
              const heightPct = m.value > 0 ? Math.max(12, Math.round((m.value / maxMonthValue) * 100)) : 6;
              return (
                <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[9px] font-mono text-[#9BA6A0] opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.value > 0 ? `R$${(m.value / 1000).toFixed(1)}k` : 'R$0'}
                  </span>
                  <div className="w-full h-32 flex items-end justify-center">
                    <div
                      className={`w-full max-w-[26px] rounded-t-lg transition-all duration-300 ${
                        m.isCurrent
                          ? 'bg-[#F1F9A1] shadow-[0_0_12px_rgba(241,249,161,0.25)]'
                          : m.value > 0
                          ? 'bg-[#8EB69B]/70 group-hover:bg-[#8EB69B]'
                          : 'bg-[#10201E]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${m.fullName}: R$ ${m.value.toLocaleString('pt-BR')}`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-mono ${
                      m.isCurrent ? 'text-[#F1F9A1] font-semibold' : 'text-[#65706A]'
                    }`}
                  >
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Radar de Atenção Imediata */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-3">
            <div>
              <h3 className="text-base font-semibold text-[#E7ECE8] font-heading flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#F1F9A1]" />
                Prioridades do Dia
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">
                Ações recomendadas com base nos seus dados.
              </p>
            </div>
          </div>

          {overview.attentionItems.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-[#8EB69B] mx-auto mb-2" />
              <p className="text-xs text-[#E7ECE8] font-medium">Tudo em dia!</p>
              <p className="text-[11px] text-[#9BA6A0] mt-0.5">
                Nenhuma pendência crítica encontrada no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {overview.attentionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  className="p-3 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] hover:border-[rgba(241,249,161,0.25)] transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3 h-3 text-[#F1F9A1] shrink-0" />
                      <span className="text-[11px] font-semibold text-[#E7ECE8] truncate">
                        {item.target}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9BA6A0] truncate mt-0.5">{item.title}</p>
                    <span className="text-[10px] font-mono text-[#8EB69B]">{item.detail}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#F1F9A1] shrink-0 group-hover:translate-x-0.5 transition-transform">
                    {item.actionLabel} →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Linha 4: Tarefas de Projetos em Andamento & Pipeline Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas Pendentes de Entrega */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-3">
            <div>
              <h3 className="text-base font-semibold text-[#E7ECE8] font-heading">
                Checklists de Projetos em Andamento
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">
                Marque as entregas concluídas diretamente por aqui.
              </p>
            </div>
            <Link href="/tarefas">
              <Button variant="secondary" size="sm" className="text-xs">
                Ver Todas ({pendingTasks.length})
              </Button>
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9BA6A0]">
              Nenhuma tarefa pendente. Ao mover um lead para &ldquo;Projeto em andamento&rdquo; no Pipeline, o checklist aparecerá aqui.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {pendingTasks.slice(0, 8).map((task) => (
                <div
                  key={task.id}
                  onClick={() => crmService.toggleTaskStatus(task.id)}
                  className="p-3 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] hover:border-[rgba(218,241,222,0.18)] flex items-center justify-between gap-3 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded border border-[rgba(218,241,222,0.25)] flex items-center justify-center shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-[#E7ECE8]">{task.title}</div>
                      <div className="text-[10px] text-[#8EB69B] font-mono">
                        Cliente / Projeto: {task.related_to || 'Operação EvoPixel'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#65706A]">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Últimos Clientes Cadastrados / Convertidos */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-3">
            <div>
              <h3 className="text-base font-semibold text-[#E7ECE8] font-heading">
                Clientes Recentes
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">
                Leads fechados no Pipeline entram automaticamente nesta lista.
              </p>
            </div>
            <Link href="/clientes">
              <Button variant="secondary" size="sm" className="text-xs">
                Ver Clientes ({clients.length})
              </Button>
            </Link>
          </div>

          {clients.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9BA6A0]">
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {clients.slice(0, 6).map((client) => (
                <Link
                  key={client.id}
                  href={`/clientes/${client.id}`}
                  className="p-3 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] hover:border-[rgba(218,241,222,0.18)] flex items-center justify-between gap-3 transition-all"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#E7ECE8]">{client.company_name}</div>
                    <div className="text-[11px] text-[#9BA6A0]">
                      {client.name} • <span className="text-[#8EB69B]">{client.segment}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-semibold text-[#F1F9A1]">
                      R$ {(client.total_received || client.total_contracted || 0).toLocaleString('pt-BR')}
                    </div>
                    <div className="text-[10px] text-[#65706A] font-mono">
                      {client.projects_count || 1} projeto(s)
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
