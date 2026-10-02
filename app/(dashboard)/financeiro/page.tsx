'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { FinancialTransaction, HistoricalProject, MonthlyExpense, PaymentMethod } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  DollarSign,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  Trash2,
  Pencil,
  Repeat,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  CreditCard,
  Receipt,
  Percent,
} from 'lucide-react';

const MONTH_NAMES = [
  { index: 0, short: 'Jan', full: 'Janeiro' },
  { index: 1, short: 'Fev', full: 'Fevereiro' },
  { index: 2, short: 'Mar', full: 'Março' },
  { index: 3, short: 'Abr', full: 'Abril' },
  { index: 4, short: 'Mai', full: 'Maio' },
  { index: 5, short: 'Jun', full: 'Junho' },
  { index: 6, short: 'Jul', full: 'Julho' },
  { index: 7, short: 'Ago', full: 'Agosto' },
  { index: 8, short: 'Set', full: 'Setembro' },
  { index: 9, short: 'Out', full: 'Outubro' },
  { index: 10, short: 'Nov', full: 'Novembro' },
  { index: 11, short: 'Dez', full: 'Dezembro' },
];

interface UnifiedIncomeItem {
  id: string;
  source: 'transaction' | 'history';
  title: string;
  client_name: string;
  category: string;
  amount_contracted: number;
  amount_received: number;
  amount_pending: number;
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 0-11
  monthKey: string; // YYYY-MM
  status: 'pago' | 'pendente' | 'parcialmente_pago' | 'atrasado' | 'cancelado';
  payment_method?: PaymentMethod;
  gross_amount?: number;
  fee_amount?: number;
  net_amount?: number;
  payment_date?: string;
}

export const PAYMENT_METHODS_CONFIG: {
  value: PaymentMethod;
  label: string;
  shortLabel: string;
  defaultFeePercent?: number;
  fixedFee?: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}[] = [
  {
    value: 'pix',
    label: 'Pix (Imediato • 0% taxa)',
    shortLabel: 'Pix',
    defaultFeePercent: 0,
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/25',
  },
  {
    value: 'mercado_pago_credito_vista',
    label: 'Mercado Pago — Crédito à Vista (~4,99%)',
    shortLabel: 'MP Cartão à Vista',
    defaultFeePercent: 4.99,
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/25',
  },
  {
    value: 'mercado_pago_parcelado',
    label: 'Mercado Pago — Crédito Parcelado (~9,99%)',
    shortLabel: 'MP Parcelado',
    defaultFeePercent: 9.99,
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-500/25',
  },
  {
    value: 'mercado_pago_boleto',
    label: 'Mercado Pago — Boleto Bancário (R$ 3,49)',
    shortLabel: 'MP Boleto',
    fixedFee: 3.49,
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/25',
  },
  {
    value: 'transferencia',
    label: 'Transferência Bancária / TED (0% taxa)',
    shortLabel: 'TED / DOC',
    defaultFeePercent: 0,
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/25',
  },
  {
    value: 'dinheiro',
    label: 'Dinheiro / Espécie (0% taxa)',
    shortLabel: 'Dinheiro',
    defaultFeePercent: 0,
    badgeBg: 'bg-slate-500/10',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-500/25',
  },
];

function calculateSuggestedFee(method: PaymentMethod, grossVal: number): string {
  if (method === 'pix' || method === 'transferencia' || method === 'dinheiro') {
    return '0.00';
  }
  if (method === 'mercado_pago_credito_vista') {
    return (grossVal * 0.0499).toFixed(2);
  }
  if (method === 'mercado_pago_parcelado') {
    return (grossVal * 0.0999).toFixed(2);
  }
  if (method === 'mercado_pago_boleto') {
    return '3.49';
  }
  return '0.00';
}

function parseDateSafe(dateStr?: string): { year: number; month: number; monthKey: string; formatted: string } {
  const now = new Date();
  if (!dateStr) {
    const y = now.getFullYear();
    const m = now.getMonth();
    return {
      year: y,
      month: m,
      monthKey: `${y}-${String(m + 1).padStart(2, '0')}`,
      formatted: now.toLocaleDateString('pt-BR'),
    };
  }
  // Evita problemas de fuso horário em strings YYYY-MM-DD
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]) || now.getFullYear();
    const m = (Number(parts[1]) || 1) - 1;
    const d = Number(parts[2]) || 1;
    return {
      year: y,
      month: Math.min(11, Math.max(0, m)),
      monthKey: `${y}-${String(m + 1).padStart(2, '0')}`,
      formatted: `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`,
    };
  }
  const dObj = new Date(dateStr);
  if (isNaN(dObj.getTime())) {
    const y = now.getFullYear();
    const m = now.getMonth();
    return {
      year: y,
      month: m,
      monthKey: `${y}-${String(m + 1).padStart(2, '0')}`,
      formatted: dateStr,
    };
  }
  const y = dObj.getFullYear();
  const m = dObj.getMonth();
  return {
    year: y,
    month: m,
    monthKey: `${y}-${String(m + 1).padStart(2, '0')}`,
    formatted: dObj.toLocaleDateString('pt-BR'),
  };
}

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => [
    ...crmService.getFinancialTransactions(),
  ]);
  const [historicalProjects, setHistoricalProjects] = useState<HistoricalProject[]>(() => [
    ...crmService.getHistoricalProjects(),
  ]);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>(() => [
    ...crmService.getMonthlyExpenses(),
  ]);

  // Filtros de Período e Status
  const currentYearStr = String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [selectedMonth, setSelectedMonth] = useState<number | 'todos'>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Modal State - Receita / Lançamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fClient, setFClient] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fStatus, setFStatus] = useState<'pago' | 'pendente'>('pago');
  const [fDueDate, setFDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fPaymentMethod, setFPaymentMethod] = useState<PaymentMethod>('pix');
  const [fFeeAmount, setFFeeAmount] = useState('0.00');
  const [fAutoCreateExpense, setFAutoCreateExpense] = useState(true);

  // Modal State - Baixa de Pagamento (Gateway)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlingItem, setSettlingItem] = useState<UnifiedIncomeItem | null>(null);
  const [sPaymentMethod, setSPaymentMethod] = useState<PaymentMethod>('pix');
  const [sGrossAmount, setSGrossAmount] = useState('');
  const [sFeeAmount, setSFeeAmount] = useState('0.00');
  const [sPaymentDate, setSPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sAutoCreateExpense, setSAutoCreateExpense] = useState(true);

  // Modal State - Gasto Mensal (Saída)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eCategory, setECategory] = useState('Ferramentas & SaaS');
  const [eAmount, setEAmount] = useState('');
  const [eDueDay, setEDueDay] = useState('10');
  const [eDueDate, setEDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eRecurring, setERecurring] = useState(true);
  const [eStatus, setEStatus] = useState<'pago' | 'pendente'>('pendente');
  const [eNotes, setENotes] = useState('');

  const refreshData = () => {
    setTransactions([...crmService.getFinancialTransactions()]);
    setHistoricalProjects([...crmService.getHistoricalProjects()]);
    setExpenses([...crmService.getMonthlyExpenses()]);
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = crmService.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  // Unificar Entradas (Transações Financeiras + Histórico de Projetos sem duplicar)
  const unifiedIncomes = useMemo<UnifiedIncomeItem[]>(() => {
    const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
    const list: UnifiedIncomeItem[] = [];

    // 1. Projetos do Histórico
    historicalProjects.forEach((hp) => {
      const parsed = parseDateSafe(hp.project_date);
      const isPaid =
        hp.status === 'concluido' ||
        hp.status === 'liquidado' ||
        (hp.amount_received > 0 && hp.amount_pending === 0);
      let paymentMethod: PaymentMethod | undefined;
      let gross = Number(hp.amount_contracted) || 0;
      let fee = 0;
      let net = isPaid ? Number(hp.amount_received) || gross : 0;
      let paymentDate = hp.project_date;

      if (hp.notes && hp.notes.includes('[GATEWAY:')) {
        const match = hp.notes.match(/\[GATEWAY:([^|]+)\|GROSS:([^|]+)\|FEE:([^|]+)\|NET:([^|]+)\|DATE:([^\]]+)\]/);
        if (match) {
          paymentMethod = match[1] as PaymentMethod;
          gross = Number(match[2]) || gross;
          fee = Number(match[3]) || fee;
          net = Number(match[4]) || net;
          paymentDate = match[5] || paymentDate;
        }
      }

      list.push({
        id: hp.id,
        source: 'history',
        title: hp.services_summary || `Projeto - ${hp.company_name}`,
        client_name: hp.company_name || hp.client_name || 'Cliente',
        category: hp.segment || 'Projeto Fechado',
        amount_contracted: Number(hp.amount_contracted) || 0,
        amount_received: Number(hp.amount_received) || 0,
        amount_pending: Number(hp.amount_pending) || 0,
        date: hp.project_date,
        year: parsed.year,
        month: parsed.month,
        monthKey: parsed.monthKey,
        status: isPaid ? 'pago' : hp.amount_received > 0 ? 'parcialmente_pago' : 'pendente',
        payment_method: paymentMethod,
        gross_amount: gross,
        fee_amount: fee,
        net_amount: net,
        payment_date: paymentDate,
      });
    });

    // 2. Transações Financeiras (ignorando duplicatas exatas do histórico)
    transactions.forEach((t) => {
      const isDup = historicalProjects.some(
        (hp) =>
          norm(hp.company_name) === norm(t.client_name) &&
          Number(hp.amount_contracted) === Number(t.amount_contracted) &&
          hp.project_date === t.due_date
      );
      if (!isDup) {
        const parsed = parseDateSafe(t.due_date);
        const isPaid = t.status === 'pago';
        const gross = t.gross_amount !== undefined ? Number(t.gross_amount) : Number(t.amount_contracted) || 0;
        const fee = t.fee_amount !== undefined ? Number(t.fee_amount) : 0;
        const net = t.net_amount !== undefined
          ? Number(t.net_amount)
          : isPaid
          ? (Number(t.amount_received) || gross - fee)
          : 0;

        list.push({
          id: t.id,
          source: 'transaction',
          title: t.title,
          client_name: t.client_name,
          category: t.category || 'Projeto',
          amount_contracted: Number(t.amount_contracted) || 0,
          amount_received: isPaid ? Number(t.amount_received || t.amount_contracted) || 0 : Number(t.amount_received) || 0,
          amount_pending: isPaid ? 0 : Number(t.amount_pending || t.amount_contracted) || 0,
          date: t.due_date,
          year: parsed.year,
          month: parsed.month,
          monthKey: parsed.monthKey,
          status: t.status,
          payment_method: t.payment_method,
          gross_amount: gross,
          fee_amount: fee,
          net_amount: net,
          payment_date: t.payment_date || t.due_date,
        });
      }
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, historicalProjects]);

  // Anos disponíveis para filtro
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>([currentYearStr]);
    unifiedIncomes.forEach((item) => yearsSet.add(String(item.year)));
    expenses.forEach((exp) => {
      if (exp.due_date) {
        yearsSet.add(String(parseDateSafe(exp.due_date).year));
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [unifiedIncomes, expenses, currentYearStr]);

  // Verifica se uma saída (gasto) pertence a determinado (ano, mês)
  const expenseAppliesToMonth = (exp: MonthlyExpense, year: number, month: number) => {
    if (exp.recurring) return true;
    if (!exp.due_date) {
      const now = new Date();
      return year === now.getFullYear() && month === now.getMonth();
    }
    const parsed = parseDateSafe(exp.due_date);
    return parsed.year === year && parsed.month === month;
  };

  // Resumo Mensal (Entradas vs Saídas por Mês)
  const monthlyBreakdown = useMemo(() => {
    const monthKeysSet = new Set<string>();
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthKeysSet.add(currentKey);

    unifiedIncomes.forEach((inc) => {
      if (selectedYear === 'todos' || String(inc.year) === selectedYear) {
        monthKeysSet.add(inc.monthKey);
      }
    });

    expenses.forEach((exp) => {
      if (exp.due_date) {
        const parsed = parseDateSafe(exp.due_date);
        if (selectedYear === 'todos' || String(parsed.year) === selectedYear) {
          monthKeysSet.add(parsed.monthKey);
        }
      }
    });

    // Se um ano específico foi selecionado, garantir que os meses com movimentação ou o mês atual daquele ano apareçam
    if (selectedYear !== 'todos') {
      MONTH_NAMES.forEach((m) => {
        const key = `${selectedYear}-${String(m.index + 1).padStart(2, '0')}`;
        const hasInc = unifiedIncomes.some((i) => i.monthKey === key);
        const hasExp = expenses.some(
          (e) => !e.recurring && e.due_date && parseDateSafe(e.due_date).monthKey === key
        );
        if (hasInc || hasExp || (selectedYear === currentYearStr && m.index <= now.getMonth())) {
          monthKeysSet.add(key);
        }
      });
    }

    const sortedKeys = Array.from(monthKeysSet)
      .filter((k) => (selectedYear === 'todos' ? true : k.startsWith(`${selectedYear}-`)))
      .sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((mKey) => {
      const [yStr, mStr] = mKey.split('-');
      const yearNum = Number(yStr);
      const monthIdx = Number(mStr) - 1;
      const monthInfo = MONTH_NAMES[monthIdx] || MONTH_NAMES[0];

      const monthIncomes = unifiedIncomes.filter(
        (inc) => inc.year === yearNum && inc.month === monthIdx
      );
      const entradasContratadas = monthIncomes.reduce((acc, i) => acc + i.amount_contracted, 0);
      const entradasRecebidas = monthIncomes.reduce((acc, i) => acc + i.amount_received, 0);
      const entradasPendentes = monthIncomes.reduce((acc, i) => acc + i.amount_pending, 0);

      const monthExpenses = expenses.filter((exp) =>
        expenseAppliesToMonth(exp, yearNum, monthIdx)
      );
      const saidasTotal = monthExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const saidasPagas = monthExpenses
        .filter((e) => e.status === 'pago')
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const saidasPendentes = monthExpenses
        .filter((e) => e.status !== 'pago')
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      const saldoMes = entradasRecebidas - saidasTotal;

      return {
        monthKey: mKey,
        year: yearNum,
        month: monthIdx,
        label: `${monthInfo.full} ${yearNum}`,
        shortLabel: `${monthInfo.short}/${String(yearNum).slice(-2)}`,
        incomesCount: monthIncomes.length,
        expensesCount: monthExpenses.length,
        entradasContratadas,
        entradasRecebidas,
        entradasPendentes,
        saidasTotal,
        saidasPagas,
        saidasPendentes,
        saldoMes,
      };
    });
  }, [unifiedIncomes, expenses, selectedYear, currentYearStr]);

  // Entradas filtradas pelo Mês/Ano/Status selecionados
  const filteredIncomes = useMemo(() => {
    return unifiedIncomes.filter((item) => {
      if (selectedYear !== 'todos' && String(item.year) !== selectedYear) return false;
      if (selectedMonth !== 'todos' && item.month !== selectedMonth) return false;
      if (filterStatus !== 'todos' && item.status !== filterStatus) return false;
      return true;
    });
  }, [unifiedIncomes, selectedYear, selectedMonth, filterStatus]);

  // Saídas filtradas pelo Mês/Ano selecionados
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (exp.recurring) return true;
      if (!exp.due_date) return true;
      const parsed = parseDateSafe(exp.due_date);
      if (selectedYear !== 'todos' && String(parsed.year) !== selectedYear) return false;
      if (selectedMonth !== 'todos' && parsed.month !== selectedMonth) return false;
      return true;
    });
  }, [expenses, selectedYear, selectedMonth]);

  // KPIs dinâmicos do topo (respeitam o mês/ano selecionado)
  const kpiMetrics = useMemo(() => {
    const periodIncomes = unifiedIncomes.filter((item) => {
      if (selectedYear !== 'todos' && String(item.year) !== selectedYear) return false;
      if (selectedMonth !== 'todos' && item.month !== selectedMonth) return false;
      return true;
    });

    const contratado = periodIncomes.reduce((acc, i) => acc + i.amount_contracted, 0);
    const recebido = periodIncomes.reduce((acc, i) => acc + i.amount_received, 0);
    const pendente = periodIncomes.reduce((acc, i) => acc + i.amount_pending, 0);

    const gastosMensais = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const gastosPagos = filteredExpenses
      .filter((e) => e.status === 'pago')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const gastosPendentes = filteredExpenses
      .filter((e) => e.status !== 'pago')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const saldoLiquido = recebido - gastosMensais;

    return {
      contratado,
      recebido,
      pendente,
      gastosMensais,
      gastosPagos,
      gastosPendentes,
      saldoLiquido,
    };
  }, [unifiedIncomes, filteredExpenses, selectedYear, selectedMonth]);

  const handleAddTx = () => {
    if (!fTitle.trim() || !fAmount || !fClient.trim()) {
      alert('Preencha o Título, o Cliente e o Valor.');
      return;
    }
    const val = Number(fAmount) || 0;
    const isPaid = fStatus === 'pago';
    const feeVal = isPaid ? Number(fFeeAmount) || 0 : 0;
    const netVal = isPaid ? Math.max(0, val - feeVal) : 0;

    crmService.addFinancialTransaction(
      {
        title: fTitle.trim(),
        client_name: fClient.trim(),
        category: fCategory.trim() || 'Projeto',
        amount_contracted: val,
        amount_received: isPaid ? val : 0,
        amount_pending: isPaid ? 0 : val,
        due_date: fDueDate || new Date().toISOString().split('T')[0],
        payment_date: isPaid ? (fDueDate || new Date().toISOString().split('T')[0]) : undefined,
        status: fStatus,
        payment_method: isPaid ? fPaymentMethod : undefined,
        gross_amount: val,
        fee_amount: feeVal,
        net_amount: isPaid ? netVal : undefined,
      },
      { auto_create_expense: isPaid && fAutoCreateExpense }
    );
    refreshData();
    setIsModalOpen(false);
    setFTitle('');
    setFClient('');
    setFCategory('');
    setFAmount('');
    setFStatus('pago');
    setFPaymentMethod('pix');
    setFFeeAmount('0.00');
    setFAutoCreateExpense(true);
  };

  const handleFMethodChange = (newMethod: PaymentMethod) => {
    setFPaymentMethod(newMethod);
    const grossVal = Number(fAmount) || 0;
    setFFeeAmount(calculateSuggestedFee(newMethod, grossVal));
  };

  const handleFAmountChange = (newAmount: string) => {
    setFAmount(newAmount);
    const grossVal = Number(newAmount) || 0;
    setFFeeAmount(calculateSuggestedFee(fPaymentMethod, grossVal));
  };

  const handleFPresetFee = (percentOrFixed: number | string) => {
    const grossVal = Number(fAmount) || 0;
    if (typeof percentOrFixed === 'number') {
      setFFeeAmount((grossVal * (percentOrFixed / 100)).toFixed(2));
    } else {
      setFFeeAmount(percentOrFixed);
    }
  };

  const fComputedGross = Number(fAmount) || 0;
  const fComputedFee = Number(fFeeAmount) || 0;
  const fComputedNet = Math.max(0, fComputedGross - fComputedFee);
  const fCurrentPercentDisplay = useMemo(() => {
    if (fComputedGross <= 0 || fComputedFee <= 0) return '0%';
    const pct = (fComputedFee / fComputedGross) * 100;
    return `${pct.toFixed(2)}%`;
  }, [fComputedGross, fComputedFee]);

  const handleOpenSettlementModal = (item: UnifiedIncomeItem) => {
    setSettlingItem(item);
    const gross = item.gross_amount || item.amount_contracted || 0;
    setSGrossAmount(String(gross));
    const method = item.payment_method || 'pix';
    setSPaymentMethod(method);
    const fee = item.fee_amount !== undefined && item.fee_amount > 0
      ? String(item.fee_amount)
      : calculateSuggestedFee(method, gross);
    setSFeeAmount(fee);
    setSPaymentDate(item.payment_date || item.date || new Date().toISOString().split('T')[0]);
    setSAutoCreateExpense(true);
    setIsSettlementModalOpen(true);
  };

  const handleSettlementMethodChange = (newMethod: PaymentMethod) => {
    setSPaymentMethod(newMethod);
    const grossVal = Number(sGrossAmount) || 0;
    setSFeeAmount(calculateSuggestedFee(newMethod, grossVal));
  };

  const handleSettlementGrossChange = (newGross: string) => {
    setSGrossAmount(newGross);
    const grossVal = Number(newGross) || 0;
    setSFeeAmount(calculateSuggestedFee(sPaymentMethod, grossVal));
  };

  const handleSettlementPresetFee = (percentOrFixed: number | string) => {
    const grossVal = Number(sGrossAmount) || 0;
    if (typeof percentOrFixed === 'number') {
      setSFeeAmount((grossVal * (percentOrFixed / 100)).toFixed(2));
    } else {
      setSFeeAmount(percentOrFixed);
    }
  };

  const handleConfirmSettlement = () => {
    if (!settlingItem) return;
    const gross = Number(sGrossAmount) || 0;
    const fee = Number(sFeeAmount) || 0;
    const net = Math.max(0, gross - fee);

    if (settlingItem.source === 'transaction') {
      crmService.settleFinancialTransaction(settlingItem.id, {
        payment_method: sPaymentMethod,
        gross_amount: gross,
        fee_amount: fee,
        net_amount: net,
        payment_date: sPaymentDate,
        auto_create_expense: sAutoCreateExpense,
      });
    } else {
      crmService.settleHistoricalProject(settlingItem.id, {
        payment_method: sPaymentMethod,
        gross_amount: gross,
        fee_amount: fee,
        net_amount: net,
        payment_date: sPaymentDate,
        auto_create_expense: sAutoCreateExpense,
      });
    }

    refreshData();
    setIsSettlementModalOpen(false);
    setSettlingItem(null);
  };

  const sComputedGross = Number(sGrossAmount) || 0;
  const sComputedFee = Number(sFeeAmount) || 0;
  const sComputedNet = Math.max(0, sComputedGross - sComputedFee);
  const sCurrentPercentDisplay = useMemo(() => {
    if (sComputedGross <= 0 || sComputedFee <= 0) return '0%';
    const pct = (sComputedFee / sComputedGross) * 100;
    return `${pct.toFixed(2)}%`;
  }, [sComputedGross, sComputedFee]);

  const handleOpenCreateExpense = () => {
    setEditingExpenseId(null);
    setETitle('');
    setECategory('Ferramentas & SaaS');
    setEAmount('');
    setEDueDay('10');
    setEDueDate(new Date().toISOString().split('T')[0]);
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
    setEDueDate(exp.due_date || new Date().toISOString().split('T')[0]);
    setERecurring(exp.recurring);
    setEStatus(exp.status === 'pago' ? 'pago' : 'pendente');
    setENotes(exp.notes || '');
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = () => {
    if (!eTitle.trim() || !eAmount) {
      alert('Preencha a descrição e o valor do gasto.');
      return;
    }

    const payload = {
      title: eTitle.trim(),
      category: eCategory,
      amount: Number(eAmount) || 0,
      due_day: Math.min(31, Math.max(1, Number(eDueDay) || 10)),
      due_date: eDueDate || new Date().toISOString().split('T')[0],
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

  const handleToggleIncomeStatus = (item: UnifiedIncomeItem) => {
    if (item.source === 'transaction') {
      crmService.toggleFinancialTransactionStatus(item.id);
    } else {
      const hp = historicalProjects.find((p) => p.id === item.id);
      if (hp) {
        const currentlyPaid = item.status === 'pago';
        crmService.updateHistoricalProject(hp.id, {
          status: currentlyPaid ? 'pendente' : 'concluido',
          amount_received: currentlyPaid ? 0 : hp.amount_contracted,
          amount_pending: currentlyPaid ? hp.amount_contracted : 0,
        });
      }
    }
    refreshData();
  };

  const handleDeleteIncome = (item: UnifiedIncomeItem) => {
    if (item.source === 'transaction') {
      crmService.deleteFinancialTransaction(item.id);
    } else {
      crmService.deleteHistoricalProject(item.id);
    }
    refreshData();
  };

  const activePeriodLabel = useMemo(() => {
    if (selectedMonth === 'todos' && selectedYear === 'todos') return 'Acumulado Geral (Todos os Meses)';
    if (selectedMonth === 'todos') return `Ano de ${selectedYear}`;
    const mName = MONTH_NAMES[selectedMonth]?.full || '';
    return selectedYear === 'todos' ? `${mName} (Todos os Anos)` : `${mName} de ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Gestão Financeira • Entradas &amp; Saídas por Mês
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Financeiro &amp; Faturamento
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Acompanhe todas as entradas de projetos, saídas operacionais e o saldo líquido mês a mês.
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
            <span>+ Nova Saída (Gasto)</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>+ Nova Entrada (Receita)</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtro por Mês e Ano */}
      <div className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#8EB69B] mr-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Período:</span>
          </div>

          {/* Seletor de Ano */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-xs font-mono text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
          >
            <option value="todos">Todos os Anos</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                Ano {yr}
              </option>
            ))}
          </select>

          {/* Pílulas de Meses */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedMonth('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedMonth === 'todos'
                  ? 'bg-[#8EB69B] text-[#07100F] font-semibold'
                  : 'bg-[#10201E] text-[#9BA6A0] hover:text-[#E7ECE8]'
              }`}
            >
              Todos os Meses
            </button>
            {MONTH_NAMES.map((m) => (
              <button
                key={m.index}
                type="button"
                onClick={() => setSelectedMonth(m.index)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                  selectedMonth === m.index
                    ? 'bg-[#8EB69B] text-[#07100F] font-semibold'
                    : 'bg-[#10201E] text-[#9BA6A0] hover:text-[#E7ECE8]'
                }`}
              >
                {m.short}
              </button>
            ))}
          </div>
        </div>

        {(selectedMonth !== 'todos' || selectedYear !== 'todos') && (
          <button
            type="button"
            onClick={() => {
              setSelectedMonth('todos');
              setSelectedYear('todos');
            }}
            className="text-xs font-mono text-[#8EB69B] hover:underline self-start lg:self-auto"
          >
            Limpar filtro de período
          </button>
        )}
      </div>

      {/* Grid Principal de 4 Métricas: Entradas Recebidas, Saídas, Saldo Líquido e Pendente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Entradas Recebidas */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(142,182,155,0.25)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8EB69B] flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Entradas (Recebido)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8EB69B]/10 text-[#8EB69B] font-mono">
              + Receita
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-[#8EB69B] mt-2 tracking-tight">
            + R$ {kpiMetrics.recebido.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Contratado no período: <strong className="text-[#E7ECE8] font-mono">R$ {kpiMetrics.contratado.toLocaleString('pt-BR')}</strong>
          </p>
        </div>

        {/* Saídas / Gastos */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-red-900/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-red-400 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Saídas (Gastos)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono">
              - Despesas
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-red-400 mt-2 tracking-tight">
            - R$ {kpiMetrics.gastosMensais.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Pago: R$ {kpiMetrics.gastosPagos.toLocaleString('pt-BR')} • Pendente: R$ {kpiMetrics.gastosPendentes.toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Saldo Líquido (Entradas - Saídas) */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#E7ECE8]">
              Saldo Líquido (Lucro)
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                kpiMetrics.saldoLiquido >= 0
                  ? 'bg-[#8EB69B]/10 text-[#8EB69B]'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              Entradas - Saídas
            </span>
          </div>
          <div
            className={`text-2xl lg:text-3xl font-semibold font-heading mt-2 tracking-tight ${
              kpiMetrics.saldoLiquido >= 0 ? 'text-[#E7ECE8]' : 'text-red-400'
            }`}
          >
            R$ {kpiMetrics.saldoLiquido.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1 truncate" title={activePeriodLabel}>
            {activePeriodLabel}
          </p>
        </div>

        {/* A Receber / Pendente */}
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(241,249,161,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#F1F9A1]">
              Valor Pendente
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F9A1]/10 text-[#F1F9A1] font-mono">
              A Receber
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-semibold font-heading text-[#F1F9A1] mt-2 tracking-tight">
            R$ {kpiMetrics.pendente.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Parcelas e faturamentos em aberto.
          </p>
        </div>
      </div>

      {/* Tabela Consolidada: Entradas e Saídas por Mês */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#8EB69B]" />
              <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
                Balanço Mensal — Entradas e Saídas por Mês
              </h3>
            </div>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Clique em qualquer mês abaixo para filtrar os lançamentos detalhados de entradas e saídas daquele mês.
            </p>
          </div>
          {selectedMonth !== 'todos' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedMonth('todos');
                setSelectedYear('todos');
              }}
            >
              Ver Todos os Meses
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                <th className="py-3 px-3">Mês / Ano</th>
                <th className="py-3 px-3">Movimentações</th>
                <th className="py-3 px-3 text-[#8EB69B]">Entradas (Recebido)</th>
                <th className="py-3 px-3 text-[#F1F9A1]">A Receber</th>
                <th className="py-3 px-3 text-red-400">Saídas (Gastos)</th>
                <th className="py-3 px-3 text-right">Saldo do Mês</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
              {monthlyBreakdown.map((row) => {
                const isSelected =
                  selectedMonth === row.month &&
                  (selectedYear === 'todos' || selectedYear === String(row.year));

                return (
                  <tr
                    key={row.monthKey}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMonth('todos');
                      } else {
                        setSelectedYear(String(row.year));
                        setSelectedMonth(row.month);
                      }
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#8EB69B]/10 border-l-2 border-l-[#8EB69B]'
                        : 'hover:bg-[#10201E]/50'
                    }`}
                  >
                    <td className="py-3.5 px-3 font-medium text-[#E7ECE8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8EB69B]" />
                      <span>{row.label}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8EB69B] text-[#07100F] font-mono font-semibold">
                          Filtrado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-[#9BA6A0] font-mono">
                      {row.incomesCount} entrada(s) • {row.expensesCount} saída(s)
                    </td>
                    <td className="py-3.5 px-3 font-mono font-semibold text-[#8EB69B]">
                      + R$ {row.entradasRecebidas.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#F1F9A1]">
                      R$ {row.entradasPendentes.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-semibold text-red-400">
                      - R$ {row.saidasTotal.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-semibold">
                      <span
                        className={`px-2.5 py-1 rounded-lg ${
                          row.saldoMes >= 0
                            ? 'bg-[#8EB69B]/10 text-[#8EB69B]'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {row.saldoMes >= 0 ? '+' : ''} R$ {row.saldoMes.toLocaleString('pt-BR')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Seção de Saídas: Gastos Mensais / Custos Operacionais */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-red-400" />
              <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
                Saídas — Gastos Mensais &amp; Despesas ({activePeriodLabel})
              </h3>
            </div>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Assinaturas, servidores, ferramentas de IA, tráfego e despesas operacionais.
            </p>
          </div>

          <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleOpenCreateExpense}>
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Gasto</span>
          </Button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-red-400 mx-auto mb-2.5">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-[#E7ECE8] font-heading">
              Nenhuma saída registrada neste período
            </h4>
            <p className="text-xs text-[#9BA6A0] max-w-sm mx-auto mt-1 mb-4">
              Cadastre seus custos fixos ou variáveis (ex: Hospedagem, Cursor/IA, Domínios, Internet) para acompanhar o lucro líquido de cada mês.
            </p>
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs mx-auto" onClick={handleOpenCreateExpense}>
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Gasto</span>
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
                  <th className="py-3 px-3">Valor</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#10201E]/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-medium text-[#E7ECE8]">{exp.title}</span>
                      {exp.notes && <div className="text-[11px] text-[#65706A]">{exp.notes}</div>}
                    </td>
                    <td className="py-3 px-3 text-[#9BA6A0]">{exp.category}</td>
                    <td className="py-3 px-3 font-mono text-[#9BA6A0]">
                      <div className="flex items-center gap-1.5">
                        {exp.recurring && <Repeat className="w-3 h-3 text-[#8EB69B]" />}
                        <span>
                          {exp.recurring
                            ? `Fixo Mensal • Todo dia ${exp.due_day}`
                            : `Único • ${exp.due_date ? parseDateSafe(exp.due_date).formatted : `Dia ${exp.due_day}`}`}
                        </span>
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

      {/* Tabela de Entradas: Receitas & Projetos Fechados */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#8EB69B]" />
              <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
                Entradas — Receitas &amp; Projetos Fechados ({activePeriodLabel})
              </h3>
            </div>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Todos os lançamentos de receitas e projetos fechados no Pipeline detalhados por data e mês.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#65706A]" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Pago / Liquidado</option>
              <option value="pendente">Pendente</option>
              <option value="parcialmente_pago">Parcialmente Pago</option>
            </select>
          </div>
        </div>

        {filteredIncomes.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-[#8EB69B] mx-auto mb-3">
              <DollarSign className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-[#E7ECE8] font-heading">
              Nenhuma entrada encontrada neste período
            </h4>
            <p className="text-xs text-[#9BA6A0] max-w-sm mx-auto mt-1 mb-5">
              Quando você mover um lead para &ldquo;Fechado&rdquo; no Pipeline ou registrar um lançamento, o valor aparecerá aqui automaticamente.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 text-xs mx-auto"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Adicionar Entrada</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                  <th className="py-3 px-3">Projeto / Cliente</th>
                  <th className="py-3 px-3">Forma de Pagamento</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Mês / Data</th>
                  <th className="py-3 px-3">Valor Bruto</th>
                  <th className="py-3 px-3 text-[#8EB69B]">Valor Líquido</th>
                  <th className="py-3 px-3 text-[#F1F9A1]">Pendente</th>
                  <th className="py-3 px-3 text-right">Status / Baixa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
                {filteredIncomes.map((item) => {
                  const parsed = parseDateSafe(item.date);
                  const mShort = MONTH_NAMES[parsed.month]?.short || '';
                  const methodCfg = item.payment_method
                    ? PAYMENT_METHODS_CONFIG.find((m) => m.value === item.payment_method)
                    : null;
                  const isPaid = item.status === 'pago';
                  const grossVal = item.gross_amount !== undefined ? item.gross_amount : item.amount_contracted;
                  const feeVal = item.fee_amount || 0;
                  const netVal = item.net_amount !== undefined ? item.net_amount : (isPaid ? item.amount_received : 0);

                  return (
                    <tr key={`${item.source}-${item.id}`} className="hover:bg-[#10201E]/40 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-medium text-[#E7ECE8] block">{item.title}</span>
                        <div className="text-[11px] text-[#9BA6A0]">{item.client_name}</div>
                      </td>
                      <td className="py-3 px-3">
                        {methodCfg ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border ${methodCfg.badgeBg} ${methodCfg.badgeText} ${methodCfg.badgeBorder}`}
                            title={`Taxa Gateway: ${feeVal > 0 ? `R$ ${feeVal.toFixed(2)}` : '0%'}`}
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>{methodCfg.shortLabel}</span>
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#10201E] text-[#9BA6A0] border border-[rgba(218,241,222,0.06)]">
                            <span>Direto / Outro</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[#65706A]">A definir</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#9BA6A0]">{item.category}</td>
                      <td className="py-3 px-3 font-mono text-[#9BA6A0]">
                        <span className="px-2 py-0.5 rounded bg-[#10201E] text-[#8EB69B] mr-1.5">
                          {mShort}/{parsed.year}
                        </span>
                        <span className="text-[#65706A]">{parsed.formatted}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#E7ECE8]">
                        R$ {grossVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold">
                        {isPaid ? (
                          <div>
                            <span className="text-[#8EB69B]">
                              + R$ {netVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {feeVal > 0 && (
                              <div className="text-[10px] font-mono text-red-400 font-normal">
                                Taxa: - R$ {feeVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#65706A] font-normal">R$ 0,00</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#F1F9A1]">
                        R$ {item.amount_pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPaid ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#8EB69B]/10 text-[#8EB69B] border border-[#8EB69B]/20 inline-flex items-center gap-1"
                                title="Pagamento liquidado"
                              >
                                <CheckCircle2 className="w-3 h-3 text-[#8EB69B]" />
                                <span>Liquidado</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenSettlementModal(item)}
                                className="p-1 rounded-lg text-[#65706A] hover:text-[#8EB69B] hover:bg-[#10201E] transition-all"
                                title="Ver / Ajustar baixa ou taxa"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              className="gap-1 py-1 px-2.5 text-xs font-semibold"
                              onClick={() => handleOpenSettlementModal(item)}
                              title="Dar baixa no pagamento e apurar taxas de gateway"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#07100F]" />
                              <span>Dar Baixa</span>
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteIncome(item)}
                            className="p-1 rounded-lg text-[#65706A] hover:text-red-400 transition-all"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Novo Lançamento de Receita (Entrada) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Entrada Financeira"
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
                onChange={(e) => handleFAmountChange(e.target.value)}
                placeholder="Ex: 3500"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Data de Competência</label>
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

          {fStatus === 'pago' && (
            <div className="p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] space-y-3">
              <div className="flex items-center gap-1.5 text-[#8EB69B] font-mono text-[11px] font-semibold">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Taxas de Gateway &amp; Liquidação</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--evo-muted)] mb-1">
                  Método de Recebimento
                </label>
                <select
                  value={fPaymentMethod}
                  onChange={(e) => handleFMethodChange(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
                >
                  {PAYMENT_METHODS_CONFIG.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-[var(--evo-muted)]">
                      Taxa Retida (R$)
                    </label>
                    <span className="text-[10px] font-mono text-[#8EB69B]">
                      {fCurrentPercentDisplay}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fFeeAmount}
                    onChange={(e) => setFFeeAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <div className="text-[10px] text-[#65706A] mb-1 font-mono">Atalhos de Taxa:</div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleFPresetFee(0)}
                      className="px-2 py-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[10px] font-mono text-[#E7ECE8] hover:border-[#8EB69B]"
                    >
                      0% Pix
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFPresetFee(4.99)}
                      className="px-2 py-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[10px] font-mono text-[#E7ECE8] hover:border-[#8EB69B]"
                    >
                      4.99% Vista
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFPresetFee(9.99)}
                      className="px-2 py-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[10px] font-mono text-[#E7ECE8] hover:border-[#8EB69B]"
                    >
                      9.99% Parc.
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFPresetFee('3.49')}
                      className="px-2 py-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[10px] font-mono text-[#E7ECE8] hover:border-[#8EB69B]"
                    >
                      R$ 3,49
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07100F]/70 border border-[#8EB69B]/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#65706A] uppercase">Valor Líquido Real</div>
                  <div className="text-xs font-mono font-bold text-[#8EB69B]">
                    R$ {fComputedNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-[#9BA6A0]">
                  Bruto: R$ {fComputedGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {fComputedFee > 0 && (
                    <span className="text-red-400 block">
                      Taxa: - R$ {fComputedFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={fAutoCreateExpense}
                  onChange={(e) => setFAutoCreateExpense(e.target.checked)}
                  className="mt-0.5 rounded border-[rgba(218,241,222,0.2)] bg-[#07100F] text-[#8EB69B] focus:ring-[#8EB69B]"
                />
                <span className="text-[11px] text-[#9BA6A0] leading-tight">
                  Lançar automaticamente o valor da taxa (R$ {fComputedFee.toFixed(2)}) como{' '}
                  <strong className="text-[#E7ECE8]">Despesa de Gateway</strong> para manter o saldo líquido real.
                </span>
              </label>
            </div>
          )}
          <div className="pt-4 border-t border-[var(--evo-border)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddTx}>
              Registrar Entrada
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cadastrar / Editar Gasto Mensal (Saída) */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpenseId ? 'Editar Saída / Gasto' : 'Nova Saída / Gasto Mensal'}
        subtitle="Registre custos fixos mensais ou despesas pontuais de um mês específico."
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
                <option value="Taxas Bancárias / Gateway (Mercado Pago)">Taxas Bancárias / Gateway (Mercado Pago)</option>
                <option value="Impostos & Contabilidade">Impostos &amp; Contabilidade</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Valor (R$) *</label>
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
              <label className="block text-[#9BA6A0] mb-1 font-medium">Recorrência</label>
              <select
                value={eRecurring ? 'fixo' : 'unico'}
                onChange={(e) => setERecurring(e.target.value === 'fixo')}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="fixo">Fixo Todo Mês</option>
                <option value="unico">Único no Mês</option>
              </select>
            </div>
            {eRecurring ? (
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
            ) : (
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">Data do Gasto</label>
                <input
                  type="date"
                  value={eDueDate}
                  onChange={(e) => setEDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Status</label>
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
              {editingExpenseId ? 'Salvar Alterações' : 'Registrar Saída'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Baixa de Pagamento & Gateway */}
      <Modal
        isOpen={isSettlementModalOpen}
        onClose={() => {
          setIsSettlementModalOpen(false);
          setSettlingItem(null);
        }}
        title="Baixa de Pagamento & Gateway"
        subtitle="Confirme o recebimento deste projeto, apure as taxas do gateway e consolide o valor líquido."
        maxWidth="lg"
      >
        {settlingItem && (
          <div className="space-y-4 text-xs">
            {/* Lead / Projeto Info Card */}
            <div className="p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#8EB69B]/10 text-[#8EB69B] border border-[#8EB69B]/20">
                    {settlingItem.source === 'transaction' ? 'Lançamento' : 'Projeto CRM'}
                  </span>
                  <span className="text-[11px] font-mono text-[#65706A]">
                    Competência: {settlingItem.date ? parseDateSafe(settlingItem.date).formatted : 'N/A'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#E7ECE8] mt-1 font-heading">
                  {settlingItem.title}
                </div>
                <div className="text-xs text-[#9BA6A0]">{settlingItem.client_name}</div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-mono text-[#65706A] uppercase">Valor Contratado</div>
                <div className="text-base font-mono font-bold text-[#E7ECE8]">
                  R$ {settlingItem.amount_contracted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Método de Pagamento */}
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Método de Pagamento Utilizado *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAYMENT_METHODS_CONFIG.map((m) => {
                  const isSelected = sPaymentMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => handleSettlementMethodChange(m.value)}
                      className={`text-left p-2.5 rounded-xl border transition-all flex items-start justify-between ${
                        isSelected
                          ? `${m.badgeBg} border-[#8EB69B] text-[#E7ECE8]`
                          : 'bg-[#10201E] border-[rgba(218,241,222,0.08)] text-[#9BA6A0] hover:border-[rgba(218,241,222,0.2)]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-[#E7ECE8] flex items-center gap-1.5">
                          <CreditCard className={`w-3.5 h-3.5 ${isSelected ? 'text-[#8EB69B]' : 'text-[#65706A]'}`} />
                          <span>{m.shortLabel}</span>
                        </div>
                        <div className="text-[10px] text-[#65706A] mt-0.5">
                          {m.defaultFeePercent !== undefined
                            ? m.defaultFeePercent === 0
                              ? 'Isento de taxa (0%)'
                              : `Taxa sugerida: ~${m.defaultFeePercent}%`
                            : `Taxa fixa: R$ ${m.fixedFee?.toFixed(2)}`}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#8EB69B] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Valor Bruto e Data de Pagamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">
                  Valor Bruto Contratado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sGrossAmount}
                  onChange={(e) => handleSettlementGrossChange(e.target.value)}
                  placeholder="Ex: 1199.00"
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono focus:outline-none focus:border-[#8EB69B]"
                />
                <span className="text-[10px] text-[#65706A] mt-1 block">
                  Valor acordado no contrato que entra no faturamento bruto.
                </span>
              </div>

              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">
                  Data Efetiva do Recebimento *
                </label>
                <input
                  type="date"
                  value={sPaymentDate}
                  onChange={(e) => setSPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono focus:outline-none focus:border-[#8EB69B]"
                />
                <span className="text-[10px] text-[#65706A] mt-1 block">
                  Data em que o valor foi liquidado ou caiu na conta.
                </span>
              </div>
            </div>

            {/* Taxa do Gateway */}
            <div className="p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[#9BA6A0] font-medium flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#8EB69B]" />
                  <span>Taxa Descontada pelo Gateway (R$)</span>
                </label>
                <span className="text-xs font-mono text-[#8EB69B] px-2 py-0.5 rounded bg-[#8EB69B]/10 border border-[#8EB69B]/20">
                  {sCurrentPercentDisplay} do valor bruto
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sFeeAmount}
                    onChange={(e) => setSFeeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] font-mono focus:outline-none focus:border-[#8EB69B]"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSettlementPresetFee(0)}
                    className="px-2 py-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[10px] font-mono text-[#E7ECE8] hover:border-[#8EB69B] transition-all"
                  >
                    0% (Pix)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettlementPresetFee(4.99)}
                    className="px-2 py-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[10px] font-mono text-[#E7ECE8] hover:border-[#8EB69B] transition-all"
                  >
                    4.99% (MP Vista)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettlementPresetFee(9.99)}
                    className="px-2 py-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[10px] font-mono text-[#E7ECE8] hover:border-[#8EB69B] transition-all"
                  >
                    9.99% (MP Parc.)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettlementPresetFee('3.49')}
                    className="px-2 py-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[10px] font-mono text-[#E7ECE8] hover:border-[#8EB69B] transition-all"
                  >
                    R$ 3,49 (Boleto)
                  </button>
                </div>
              </div>
            </div>

            {/* Destaque do Valor Líquido Real que entra na Conta */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0C1A19] to-[#10201E] border border-[#8EB69B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono text-[#8EB69B] uppercase font-semibold flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[#8EB69B]" />
                  <span>Valor Líquido Real a Receber</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-[#E7ECE8] mt-1">
                  R$ {sComputedNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="text-right text-[11px] font-mono space-y-0.5 border-t sm:border-t-0 sm:border-l border-[rgba(218,241,222,0.08)] pt-2 sm:pt-0 sm:pl-4">
                <div className="text-[#9BA6A0]">
                  Bruto: R$ {sComputedGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-red-400">
                  Taxa retida: - R$ {sComputedFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({sCurrentPercentDisplay})
                </div>
              </div>
            </div>

            {/* Checkbox: Automação de Saída / Despesa da Taxa */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#10201E]/60 border border-[rgba(218,241,222,0.06)] cursor-pointer">
              <input
                type="checkbox"
                checked={sAutoCreateExpense}
                onChange={(e) => setSAutoCreateExpense(e.target.checked)}
                className="mt-0.5 rounded border-[rgba(218,241,222,0.2)] bg-[#07100F] text-[#8EB69B] focus:ring-[#8EB69B]"
              />
              <div className="text-[11px] text-[#9BA6A0] leading-snug">
                <span className="text-[#E7ECE8] font-medium block">
                  Gerar automaticamente despesa operacional na categoria &ldquo;Taxas Bancárias / Gateway (Mercado Pago)&rdquo;
                </span>
                <span>
                  O valor bruto (R$ {sComputedGross.toFixed(2)}) é computado no Faturamento, a taxa (R$ {sComputedFee.toFixed(2)}) entra em Saídas e seu Saldo Líquido reflete o lucro real em caixa.
                </span>
              </div>
            </label>

            {/* Botões de Ação */}
            <div className="pt-4 border-t border-[rgba(218,241,222,0.06)] flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsSettlementModalOpen(false);
                  setSettlingItem(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={handleConfirmSettlement}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#07100F]" />
                <span>Confirmar Liquidação / Baixa</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
