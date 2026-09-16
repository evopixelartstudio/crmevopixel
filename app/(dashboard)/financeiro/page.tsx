'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  ArrowUpRight,
  Download,
} from 'lucide-react';

export default function FinanceiroPage() {
  const transactions = crmService.getFinancialTransactions();
  const summary = crmService.getFinancialSummary();

  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const filteredTransactions = transactions.filter((t) => {
    if (filterStatus === 'todos') return true;
    return t.status === filterStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Gestão Financeira • Separação Rigorosa
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Financeiro & Faturamento
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Diferenciação clara entre valor contratado, valor efetivamente recebido e parcelas a liquidar.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/minha-historia">
            <Button variant="secondary" size="sm">
              <span>Histórico Completo</span>
            </Button>
          </Link>
          <Button variant="primary" size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Novo Lançamento</span>
          </Button>
        </div>
      </div>

      {/* Grid Principal de 3 Métricas: Contratado vs Recebido vs Pendente (Seção 32) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Contratado */}
        <div className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-xs font-mono uppercase tracking-wider text-[#9BA6A0]">
            Valor Contratado
          </span>
          <div className="text-3xl font-semibold font-heading text-[#E7ECE8] mt-2 tracking-tight">
            R$ {summary.contratado.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Soma dos contratos e propostas aprovadas vigentes.
          </p>
        </div>

        {/* Recebido (Destaque Positivo) */}
        <div className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(142,182,155,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8EB69B]">
              Valor Recebido
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#8EB69B]/10 text-[#8EB69B] font-mono">
              Liquidado
            </span>
          </div>
          <div className="text-3xl font-semibold font-heading text-[#8EB69B] mt-2 tracking-tight">
            R$ {summary.recebido.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Recursos em caixa provenientes de pagamentos confirmados.
          </p>
        </div>

        {/* Pendente (Atenção / Cobrança) */}
        <div className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(241,249,161,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#F1F9A1]">
              Valor Pendente
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F1F9A1]/10 text-[#F1F9A1] font-mono">
              A Receber
            </span>
          </div>
          <div className="text-3xl font-semibold font-heading text-[#F1F9A1] mt-2 tracking-tight">
            R$ {summary.pendente.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Parcelas a vencer e faturamentos com vencimento no mês.
          </p>
        </div>
      </div>

      {/* Tabela de Transações & Lançamentos */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
              Lançamentos & Contas
            </h3>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Histórico detalhado por cliente, vencimento e status de liquidação.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="parcialmente_pago">Parcialmente Pago</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                <th className="py-3 px-3">Título / Cliente</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Vencimento</th>
                <th className="py-3 px-3">Contratado</th>
                <th className="py-3 px-3">Recebido</th>
                <th className="py-3 px-3">Pendente</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
              {filteredTransactions.map((item) => (
                <tr key={item.id} className="hover:bg-[#10201E]/40 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-medium text-[#E7ECE8]">{item.title}</span>
                    <div className="text-[11px] text-[#9BA6A0]">{item.client_name}</div>
                  </td>
                  <td className="py-3 px-3 text-[#9BA6A0]">{item.category}</td>
                  <td className="py-3 px-3 font-mono text-[#65706A]">
                    {new Date(item.due_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#E7ECE8]">
                    R$ {item.amount_contracted.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#8EB69B]">
                    R$ {item.amount_received.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#F1F9A1]">
                    R$ {item.amount_pending.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono ${
                        item.status === 'pago'
                          ? 'bg-[#8EB69B]/10 text-[#8EB69B] border border-[#8EB69B]/20'
                          : item.status === 'pendente'
                          ? 'bg-[#F1F9A1]/10 text-[#F1F9A1] border border-[#F1F9A1]/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
