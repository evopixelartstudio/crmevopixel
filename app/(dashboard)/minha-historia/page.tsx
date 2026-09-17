'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  History,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Building2,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Plus,
} from 'lucide-react';

export default function MinhaHistoriaPage() {
  useCrmSync();
  // Using state for data and historicalProjects to trigger re-renders
  const [data, setData] = useState(() => crmService.getMinhaHistoriaData());
  const [historicalProjects, setHistoricalProjects] = useState(() => crmService.getHistoricalProjects());
  const [metricMode, setMetricMode] = useState<'recebido' | 'contratado' | 'pendente'>('recebido');
  const [periodFilter, setPeriodFilter] = useState<'ano' | 'mes'>('ano');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hCompany, setHCompany] = useState('');
  const [hClient, setHClient] = useState('');
  const [hServices, setHServices] = useState('');
  const [hDate, setHDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hContracted, setHContracted] = useState('');
  const [hReceived, setHReceived] = useState('');

  const handleAddHistorical = () => {
    if (!hCompany || !hContracted || !hReceived) {
      alert('Preencha a Empresa, Valor Contratado e Recebido.');
      return;
    }
    crmService.addHistoricalProject({
      company_name: hCompany,
      client_name: hClient || 'N/A',
      services_summary: hServices || 'Serviços Gerais',
      project_date: hDate,
      amount_contracted: Number(hContracted),
      amount_received: Number(hReceived),
      amount_pending: Number(hContracted) - Number(hReceived),
      status: Number(hContracted) <= Number(hReceived) ? 'liquidado' : 'pendente'
    });
    setHistoricalProjects([...crmService.getHistoricalProjects()]);
    setData(crmService.getMinhaHistoriaData());
    setIsModalOpen(false);
    setHCompany('');
    setHClient('');
    setHServices('');
    setHContracted('');
    setHReceived('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Topo Editorial: Desde o Início */}
      <div className="relative p-8 md:p-10 rounded-3xl bg-[#0C1A19] border border-[rgba(218,241,222,0.1)] overflow-hidden shadow-2xl">
        {/* Glow sutil de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,_rgba(241,249,161,0.04),transparent_70%)] pointer-events-none" />

        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F1F9A1]" />
            Desde o Início da EvoPixel
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[#E7ECE8] font-heading tracking-tight">
              Meu Histórico
            </h1>
            <Button variant="primary" size="sm" className="gap-1.5 z-20 relative hidden sm:flex" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Adicionar Histórico</span>
            </Button>
          </div>
          <div className="sm:hidden mt-2 z-20 relative">
            <Button variant="primary" size="sm" className="gap-1.5 w-full" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Adicionar Histórico</span>
            </Button>
          </div>

          <div className="pt-2">
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold font-heading text-[#F1F9A1] tracking-tight">
              R$ {data.faturamentoAcumulado.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-[#8EB69B] mt-2 font-mono">
              Faturamento acumulado baseado em todos os projetos registrados na trajetória.
            </p>
          </div>
        </div>

        {/* Resumo de Contratado vs Pendente Histórico */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-[rgba(218,241,222,0.06)] relative z-10 text-xs">
          <div>
            <span className="text-[#9BA6A0]">Total Contratado</span>
            <div className="text-lg font-semibold text-[#E7ECE8] font-heading mt-0.5">
              R$ {data.contratadoAcumulado.toLocaleString('pt-BR')}
            </div>
          </div>
          <div>
            <span className="text-[#9BA6A0]">Total Liquidado</span>
            <div className="text-lg font-semibold text-[#8EB69B] font-heading mt-0.5">
              R$ {data.faturamentoAcumulado.toLocaleString('pt-BR')}
            </div>
          </div>
          <div>
            <span className="text-[#9BA6A0]">Pendente Atual</span>
            <div className="text-lg font-semibold text-[#F1F9A1] font-heading mt-0.5">
              R$ {data.pendenteAcumulado.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid de Marcos & Conquistas (Seção 31) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[10px] text-[#9BA6A0] uppercase font-mono">Projetos</span>
          <div className="text-xl font-semibold text-[#E7ECE8] font-heading mt-1">
            {data.projetosRealizados}
          </div>
          <span className="text-[10px] text-[#8EB69B]">concluídos</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[10px] text-[#9BA6A0] uppercase font-mono">Clientes</span>
          <div className="text-xl font-semibold text-[#E7ECE8] font-heading mt-1">
            {data.clientesAtendidos}
          </div>
          <span className="text-[10px] text-[#8EB69B]">atendidos</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[10px] text-[#9BA6A0] uppercase font-mono">Ticket Médio</span>
          <div className="text-xl font-semibold text-[#F1F9A1] font-heading mt-1">
            R$ {data.ticketMedio.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-[#8EB69B]">+18% recente</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[10px] text-[#9BA6A0] uppercase font-mono">Melhor Ano</span>
          <div className="text-sm font-semibold text-[#E7ECE8] font-heading mt-1 truncate">
            {data.melhorAno}
          </div>
          <span className="text-[10px] text-[#8EB69B]">recorde anual</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[10px] text-[#9BA6A0] uppercase font-mono">Melhor Mês</span>
          <div className="text-sm font-semibold text-[#E7ECE8] font-heading mt-1 truncate">
            {data.melhorMes}
          </div>
          <span className="text-[10px] text-[#8EB69B]">faturamento pico</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] col-span-2 md:col-span-1">
          <span className="text-[10px] text-[#9BA6A0] uppercase font-mono">Serviço Top</span>
          <div className="text-xs font-semibold text-[#E7ECE8] font-heading mt-1 truncate">
            {data.servicoMaisRentavel}
          </div>
          <span className="text-[10px] text-[#8EB69B]">maior volume</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] col-span-2 md:col-span-1">
          <span className="text-[10px] text-[#9BA6A0] uppercase font-mono">Cliente Top</span>
          <div className="text-xs font-semibold text-[#F1F9A1] font-heading mt-1 truncate">
            {data.clienteMaisValioso}
          </div>
          <span className="text-[10px] text-[#8EB69B]">maior LTV</span>
        </div>
      </div>

      {/* 3. Gráfico Grande: Evolução da EvoPixel (Seção 31) */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
          <div>
            <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
              Análise Histórica Longitudinal
            </span>
            <h3 className="text-xl font-semibold text-[#E7ECE8] font-heading mt-0.5">
              Evolução da EvoPixel ao Longo dos Anos
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Alternar Métrica */}
            <div className="inline-flex p-1 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.06)] text-xs">
              <button
                onClick={() => setMetricMode('recebido')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  metricMode === 'recebido'
                    ? 'bg-[#10201E] text-[#F1F9A1] font-medium'
                    : 'text-[#9BA6A0]'
                }`}
              >
                Recebido
              </button>
              <button
                onClick={() => setMetricMode('contratado')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  metricMode === 'contratado'
                    ? 'bg-[#10201E] text-[#E7ECE8] font-medium'
                    : 'text-[#9BA6A0]'
                }`}
              >
                Contratado
              </button>
              <button
                onClick={() => setMetricMode('pendente')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  metricMode === 'pendente'
                    ? 'bg-[#10201E] text-[#8EB69B] font-medium'
                    : 'text-[#9BA6A0]'
                }`}
              >
                Pendente
              </button>
            </div>
          </div>
        </div>

        {/* Visualizador de Barras Editoriais dos Anos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
          {data.yearlyEvolution.map((item) => {
            const val =
              metricMode === 'recebido'
                ? item.received
                : metricMode === 'contratado'
                ? item.contracted
                : item.pending;

            const heightPct = Math.max(20, Math.min(100, Math.round((val / 65000) * 100)));

            return (
              <div
                key={item.year}
                className="p-5 rounded-2xl bg-[#10201E]/60 border border-[rgba(218,241,222,0.06)] flex flex-col justify-between h-64 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#E7ECE8] font-heading">
                    {item.year}
                  </span>
                  <span className="text-[11px] font-mono text-[#65706A]">
                    {item.projects} projetos
                  </span>
                </div>

                <div className="flex-1 flex items-end justify-center py-2">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[60px] rounded-t-lg bg-gradient-to-t from-[#163832] to-[#8EB69B] hover:to-[#F1F9A1] transition-all relative group cursor-pointer"
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#050706] text-[10px] text-[#E7ECE8] rounded border border-[rgba(218,241,222,0.1)] whitespace-nowrap pointer-events-none">
                      R$ {val.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-[rgba(218,241,222,0.04)]">
                  <span className="text-xs font-mono font-semibold text-[#F1F9A1]">
                    R$ {val.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 4. Projetos Históricos Realizados (Seção 29 & 30) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
              Registro de Projetos Históricos Cadastrados
            </h3>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Projetos realizados antes ou durante o EVOCRM que compõem o faturamento acumulado oficial.
            </p>
          </div>
          <Link href="/financeiro">
            <Button variant="secondary" size="sm" className="text-xs">
              Ver Financeiro Completo
            </Button>
          </Link>
        </div>

        {historicalProjects.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#9BA6A0] bg-[#10201E]/30 rounded-xl border border-[rgba(218,241,222,0.04)]">
            Nenhum projeto histórico cadastrado no momento. Conforme seus projetos forem concluídos, eles comporão este registro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                  <th className="py-2.5 px-3">Cliente / Empresa</th>
                  <th className="py-2.5 px-3">Serviços Executados</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Contratado</th>
                  <th className="py-2.5 px-3">Recebido</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
                {historicalProjects.map((hp) => (
                  <tr key={hp.id} className="hover:bg-[#10201E]/40">
                    <td className="py-3 px-3 font-medium text-[#E7ECE8]">
                      {hp.company_name}
                      <div className="text-[11px] text-[#9BA6A0]">{hp.client_name}</div>
                    </td>
                    <td className="py-3 px-3 text-[#9BA6A0]">{hp.services_summary}</td>
                    <td className="py-3 px-3 font-mono text-[#65706A]">
                      {new Date(hp.project_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#E7ECE8]">
                      R$ {hp.amount_contracted.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#8EB69B]">
                      R$ {hp.amount_received.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#163832] text-[#8EB69B] font-mono">
                        {hp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Registro Histórico"
        subtitle="Cadastre um cliente antigo para compor seu faturamento acumulado."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Empresa Contratante *</label>
              <input
                type="text"
                value={hCompany}
                onChange={(e) => setHCompany(e.target.value)}
                placeholder="Ex: Clínica Alpha"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Nome do Cliente</label>
              <input
                type="text"
                value={hClient}
                onChange={(e) => setHClient(e.target.value)}
                placeholder="Ex: Dr. Roberto"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Serviços Realizados</label>
            <input
              type="text"
              value={hServices}
              onChange={(e) => setHServices(e.target.value)}
              placeholder="Ex: Identidade Visual + Website"
              className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Data (Mês/Ano) *</label>
              <input
                type="date"
                value={hDate}
                onChange={(e) => setHDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Contratado (R$) *</label>
              <input
                type="number"
                value={hContracted}
                onChange={(e) => setHContracted(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Recebido (R$) *</label>
              <input
                type="number"
                value={hReceived}
                onChange={(e) => setHReceived(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--evo-border)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddHistorical}>
              Adicionar ao Histórico
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
