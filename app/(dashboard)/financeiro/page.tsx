'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { FinancialTransaction, MonthlyExpense } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  DollarSign,
  Plus,
  TrendingDown,
  Wallet,
  CheckCircle2,
  Trash2,
  Pencil,
  Repeat,
} from 'lucide-react';

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => [
    ...crmService.getFinancialTransactions(),
  ]);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>(() => [
    ...crmService.getMonthlyExpenses(),
  ]);
  const [summary, setSummary] = useState(() => crmService.getFinancialSummary());

  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Modal State - Receita / Lançamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fClient, setFClient] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fStatus, setFStatus] = useState<'pago' | 'pendente'>('pago');
  const [fDueDate, setFDueDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal State - Gasto Mensal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eCategory, setECategory] = useState('Ferramentas & SaaS');
  const [eAmount, setEAmount] = useState('');
  const [eDueDay, setEDueDay] = useState('10');
  const [eRecurring, setERecurring] = useState(true);
  const [eStatus, setEStatus] = useState<'pago' | 'pendente'>('pendente');
  const [eNotes, setENotes] = useState('');

  const refreshData = () => {
    setTransactions([...crmService.getFinancialTransactions()]);
    setExpenses([...crmService.getMonthlyExpenses()]);
    setSummary(crmService.getFinancialSummary());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = crmService.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  const handleAddTx = () => {
    if (!fTitle.trim() || !fAmount || !fClient.trim()) {
      alert('Preencha o Título, o Cliente e o Valor.');
      return;
    }
    const val = Number(fAmount) || 0;
    crmService.addFinancialTransaction({
      title: fTitle.trim(),
      client_name: fClient.trim(),
      category: fCategory.trim() || 'Projeto',
      amount_contracted: val,
      amount_received: fStatus === 'pago' ? val : 0,
      amount_pending: fStatus === 'pago' ? 0 : val,
      due_date: fDueDate || new Date().toISOString().split('T')[0],
      status: fStatus,
    });
    refreshData();
    setIsModalOpen(false);
    setFTitle('');
    setFClient('');
    setFCategory('');
    setFAmount('');
    setFStatus('pago');
  };

  const handleOpenCreateExpense = () => {
    setEditingExpenseId(null);
    setETitle('');
    setECategory('Ferramentas & SaaS');
    setEAmount('');
    setEDueDay('10');
    setERecurring(true);
    setEStatus('pendente');
    setENotes('');
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: MonthlyExpense) => {
    setEditingExpenseId(exp.id);
    setETitle(exp.title);
    setECategory(exp.category);
    setEAmount(String(exp.amount));
    setEDueDay(String(exp.due_day || 10));
    setERecurring(exp.recurring);
    setEStatus(exp.status === 'pago' ? 'pago' : 'pendente');
    setENotes(exp.notes || '');
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = () => {
    if (!eTitle.trim() || !eAmount) {
      alert('Preencha a descrição e o valor do gasto mensal.');
      return;
    }

    const payload = {
      title: eTitle.trim(),
      category: eCategory,
      amount: Number(eAmount) || 0,
      due_day: Math.min(31, Math.max(1, Number(eDueDay) || 10)),
      recurring: eRecurring,
      status: eStatus,
      notes: eNotes.trim() || undefined,
    };

    if (editingExpenseId) {
      crmService.updateMonthlyExpense(editingExpenseId, payload);
    } else {
      crmService.addMonthlyExpense(payload);
    }

    refreshData();
    setIsExpenseModalOpen(false);
  };

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
            Gestão Financeira • Receitas &amp; Gastos Mensais
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Financeiro &amp; Faturamento
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Controle de projetos fechados, valores recebidos, pendências e gastos mensais operacionais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/minha-historia">
            <Button variant="secondary" size="sm">
              <span>Meu Histórico</span>
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 border border-red-900/30 text-red-300 hover:bg-red-950/30"
            onClick={handleOpenCreateExpense}
          >
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span>+ Gasto Mensal</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Novo Lançamento</span>
          </Button>
        </div>
      </div>

      {/* Grid Principal de 4 Métricas: Contratado, Recebido, Pendente e Gastos Mensais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Contratado */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-xs font-mono uppercase tracking-wider text-[#9BA6A0]">
            Valor Contratado
          </span>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-[#E7ECE8] mt-2 tracking-tight">
            R$ {summary.contratado.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Soma de projetos fechados e contratos.
          </p>
        </div>

        {/* Recebido */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(142,182,155,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8EB69B]">
              Valor Recebido
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#8EB69B]/10 text-[#8EB69B] font-mono">
              Liquidado
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-[#8EB69B] mt-2 tracking-tight">
            R$ {summary.recebido.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Saldo Líquido: <strong className="text-[#E7ECE8] font-mono">R$ {summary.saldoLiquido.toLocaleString('pt-BR')}</strong>
          </p>
        </div>

        {/* Pendente */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(241,249,161,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#F1F9A1]">
              Valor Pendente
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F1F9A1]/10 text-[#F1F9A1] font-mono">
              A Receber
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-[#F1F9A1] mt-2 tracking-tight">
            R$ {summary.pendente.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Parcelas e faturamentos a receber.
          </p>
        </div>

        {/* Gastos Mensais */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-red-900/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-red-400">
              Gastos Mensais
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 font-mono">
              Despesas
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-red-400 mt-2 tracking-tight">
            R$ {summary.gastosMensais.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Pago: R$ {summary.gastosPagos.toLocaleString('pt-BR')} • Pendente: R$ {summary.gastosPendentes.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Seção de Gastos Mensais / Custos Operacionais */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-red-400" />
              <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
                Gastos Mensais &amp; Custos Fixos
              </h3>
            </div>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Assinaturas, servidores, ferramentas de IA, tráfego e despesas operacionais mensais.
            </p>
          </div>

          <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleOpenCreateExpense}>
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Gasto Mensal</span>
          </Button>
        </div>

        {expenses.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-red-400 mx-auto mb-2.5">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-[#E7ECE8] font-heading">
              Nenhum gasto mensal cadastrado
            </h4>
            <p className="text-xs text-[#9BA6A0] max-w-sm mx-auto mt-1 mb-4">
              Cadastre seus custos fixos ou variáveis (ex: Hospedagem, Cursor/IA, Domínios, Internet) para acompanhar o lucro líquido real.
            </p>
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs mx-auto" onClick={handleOpenCreateExpense}>
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Primeiro Gasto</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                  <th className="py-3 px-3">Descrição do Gasto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Tipo / Vencimento</th>
                  <th className="py-3 px-3">Valor Mensal</th>
                  <th className="py-3 px-3">Status no Mês</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#10201E]/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-medium text-[#E7ECE8]">{exp.title}</span>
                      {exp.notes && <div className="text-[11px] text-[#65706A]">{exp.notes}</div>}
                    </td>
                    <td className="py-3 px-3 text-[#9BA6A0]">{exp.category}</td>
                    <td className="py-3 px-3 font-mono text-[#9BA6A0]">
                      <div className="flex items-center gap-1.5">
                        {exp.recurring && <Repeat className="w-3 h-3 text-[#8EB69B]" />}
                        <span>{exp.recurring ? `Fixo • Dia ${exp.due_day}` : `Avulso • Dia ${exp.due_day}`}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-red-400">
                      - R$ {Number(exp.amount).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          crmService.toggleMonthlyExpenseStatus(exp.id);
                          refreshData();
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono cursor-pointer transition-all ${
                          exp.status === 'pago'
                            ? 'bg-[#8EB69B]/10 text-[#8EB69B] border border-[#8EB69B]/20'
                            : 'bg-[#F1F9A1]/10 text-[#F1F9A1] border border-[#F1F9A1]/20'
                        }`}
                        title="Clique para alternar entre Pago e Pendente"
                      >
                        {exp.status === 'pago' ? '✓ Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditExpense(exp)}
                          className="p-1.5 rounded-lg text-[#65706A] hover:text-[#E7ECE8] hover:bg-[#10201E] transition-all"
                          title="Editar gasto"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            crmService.deleteMonthlyExpense(exp.id);
                            refreshData();
                          }}
                          className="p-1.5 rounded-lg text-[#65706A] hover:text-red-400 hover:bg-red-950/20 transition-all"
                          title="Excluir gasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Tabela de Transações & Lançamentos de Projetos */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
              Receitas &amp; Projetos Fechados
            </h3>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Projetos fechados no Pipeline entram automaticamente aqui e em Meu Histórico.
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

        {filteredTransactions.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-[#8EB69B] mx-auto mb-3">
              <DollarSign className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-[#E7ECE8] font-heading">
              Nenhum lançamento financeiro
            </h4>
            <p className="text-xs text-[#9BA6A0] max-w-sm mx-auto mt-1 mb-5">
              Quando você mover um lead para &ldquo;Fechado&rdquo; no Pipeline, o valor do projeto aparecerá aqui automaticamente.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 text-xs mx-auto"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Adicionar Primeiro Lançamento</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                  <th className="py-3 px-3">Título / Cliente</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Contratado</th>
                  <th className="py-3 px-3">Recebido</th>
                  <th className="py-3 px-3">Pendente</th>
                  <th className="py-3 px-3 text-right">Status / Ações</th>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            crmService.toggleFinancialTransactionStatus(item.id);
                            refreshData();
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono cursor-pointer transition-all ${
                            item.status === 'pago'
                              ? 'bg-[#8EB69B]/10 text-[#8EB69B] border border-[#8EB69B]/20'
                              : item.status === 'pendente'
                              ? 'bg-[#F1F9A1]/10 text-[#F1F9A1] border border-[#F1F9A1]/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                          title="Clique para alternar entre Pago e Pendente"
                        >
                          {item.status.replace('_', ' ')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            crmService.deleteFinancialTransaction(item.id);
                            refreshData();
                          }}
                          className="p-1 rounded-lg text-[#65706A] hover:text-red-400 transition-all"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Novo Lançamento de Receita */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Lançamento Financeiro"
        subtitle="Adicione uma nova receita ou projeto fechado no sistema."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Título do Lançamento *</label>
            <input
              type="text"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              placeholder="Ex: Desenvolvimento Site Institucional"
              className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Nome do Cliente / Empresa *</label>
            <input
              type="text"
              value={fClient}
              onChange={(e) => setFClient(e.target.value)}
              placeholder="Ex: Clínica Vida"
              className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Valor (R$) *</label>
              <input
                type="number"
                value={fAmount}
                onChange={(e) => setFAmount(e.target.value)}
                placeholder="Ex: 3500"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Data</label>
              <input
                type="date"
                value={fDueDate}
                onChange={(e) => setFDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Categoria</label>
              <input
                type="text"
                value={fCategory}
                onChange={(e) => setFCategory(e.target.value)}
                placeholder="Ex: Desenvolvimento Web"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Status Inicial</label>
              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value as 'pago' | 'pendente')}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              >
                <option value="pago">Pago (Liquidado)</option>
                <option value="pendente">Pendente (A Receber)</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--evo-border)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddTx}>
              Registrar Lançamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cadastrar / Editar Gasto Mensal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpenseId ? 'Editar Gasto Mensal' : 'Novo Gasto Mensal'}
        subtitle="Registre custos fixos ou variáveis da operação EvoPixel."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Descrição do Gasto *</label>
            <input
              type="text"
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              placeholder="Ex: VPS / Hospedagem, Cursor Pro, API OpenAI, Contabilidade..."
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Categoria</label>
              <select
                value={eCategory}
                onChange={(e) => setECategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="Ferramentas & SaaS">Ferramentas &amp; SaaS</option>
                <option value="Infraestrutura & Servidores">Infraestrutura &amp; Servidores</option>
                <option value="IA & APIs">IA &amp; APIs</option>
                <option value="Marketing & Tráfego">Marketing &amp; Tráfego</option>
                <option value="Impostos & Contabilidade">Impostos &amp; Contabilidade</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Valor Mensal (R$) *</label>
              <input
                type="number"
                value={eAmount}
                onChange={(e) => setEAmount(e.target.value)}
                placeholder="Ex: 250"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Dia Vencimento</label>
              <input
                type="number"
                min={1}
                max={31}
                value={eDueDay}
                onChange={(e) => setEDueDay(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Recorrência</label>
              <select
                value={eRecurring ? 'fixo' : 'unico'}
                onChange={(e) => setERecurring(e.target.value === 'fixo')}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="fixo">Fixo Mensal</option>
                <option value="unico">Gasto Único</option>
              </select>
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Status no Mês</label>
              <select
                value={eStatus}
                onChange={(e) => setEStatus(e.target.value as 'pago' | 'pendente')}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Observações (opcional)</label>
            <input
              type="text"
              value={eNotes}
              onChange={(e) => setENotes(e.target.value)}
              placeholder="Ex: Renovação automática no cartão..."
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-[rgba(218,241,222,0.06)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsExpenseModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveExpense}>
              {editingExpenseId ? 'Salvar Alterações' : 'Adicionar Gasto'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
