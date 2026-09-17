'use client';

import React, { useState } from 'react';
import { crmService } from '@/lib/services/crm-service';
import { MonthlyClient } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  CalendarCheck,
  Search,
  Plus,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function MensalidadesPage() {
  const [monthlyClients, setMonthlyClients] = useState<MonthlyClient[]>(() =>
    crmService.getMonthlyClients()
  );

  React.useEffect(() => {
    return crmService.subscribe(() => {
      setMonthlyClients([...crmService.getMonthlyClients()]);
    });
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');

  // Modal de cadastro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    client_name: '',
    segment: 'Tecnologia / B2B',
    plan_name: 'Suporte & Manutenção Web',
    monthly_value: '850',
    billing_day: '10',
    payment_method: 'pix' as MonthlyClient['payment_method'],
    notes: '',
  });

  const summary = crmService.getMonthlySubscriptionsSummary();

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) return;

    const newClient = crmService.addMonthlyClient({
      company_name: formData.company_name.trim(),
      client_name: formData.client_name.trim() || formData.company_name.trim(),
      segment: formData.segment,
      plan_name: formData.plan_name,
      monthly_value: parseFloat(formData.monthly_value) || 0,
      billing_day: parseInt(formData.billing_day, 10) || 10,
      payment_method: formData.payment_method,
      status: 'ativo',
      current_month_status: 'pendente',
      start_date: new Date().toISOString(),
      notes: formData.notes,
    });

    setMonthlyClients([...crmService.getMonthlyClients()]);
    setIsAddModalOpen(false);
    setFormData({
      company_name: '',
      client_name: '',
      segment: 'Tecnologia / B2B',
      plan_name: 'Suporte & Manutenção Web',
      monthly_value: '850',
      billing_day: '10',
      payment_method: 'pix',
      notes: '',
    });
  };

  const handleTogglePayment = (id: string, currentStatus: 'pago' | 'pendente' | 'atrasado') => {
    const nextStatus = currentStatus === 'pago' ? 'pendente' : 'pago';
    crmService.toggleMonthlyPaymentStatus(id, nextStatus);
    setMonthlyClients([...crmService.getMonthlyClients()]);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este cliente mensalista?')) {
      crmService.deleteMonthlyClient(id);
      setMonthlyClients([...crmService.getMonthlyClients()]);
    }
  };

  const filteredClients = monthlyClients.filter((c) => {
    const matchesSearch =
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.plan_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' ? true : c.current_month_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <CalendarCheck className="w-3.5 h-3.5" />
            Recorrência & Previsibilidade Comercial
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Clientes Mensalistas
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Gestão de mensalidades ativas, receita recorrente mensal (MRR), planos contínuos e controle de liquidação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Novo Mensalista</span>
          </Button>
        </div>
      </div>

      {/* 2. Grid de Métricas de MRR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[11px] font-mono text-[#9BA6A0] uppercase">MRR (Receita Mensal)</span>
          <div className="text-2xl lg:text-3xl font-semibold font-mono text-[#F1F9A1] mt-1">
            R$ {summary.mrr.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-[#8EB69B] mt-1 block">Faturamento previsível</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[11px] font-mono text-[#9BA6A0] uppercase">ARR (Projetado / Ano)</span>
          <div className="text-2xl lg:text-3xl font-semibold font-mono text-[#E7ECE8] mt-1">
            R$ {summary.arr.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-[#65706A] mt-1 block">Base anualizada</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[11px] font-mono text-[#9BA6A0] uppercase">Mensalistas Ativos</span>
          <div className="text-2xl lg:text-3xl font-semibold font-mono text-[#E7ECE8] mt-1">
            {summary.totalActive}
          </div>
          <span className="text-[10px] text-[#8EB69B] mt-1 block">Contratos vigentes</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
          <span className="text-[11px] font-mono text-[#9BA6A0] uppercase">Recebido no Mês</span>
          <div className="text-2xl lg:text-3xl font-semibold font-mono text-[#8EB69B] mt-1">
            R$ {summary.paidThisMonth.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-[#F1F9A1] mt-1 block">
            R$ {summary.pendingThisMonth.toLocaleString('pt-BR')} a receber
          </span>
        </div>
      </div>

      {/* 3. Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8EB69B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por empresa, responsável ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]/40"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#0C1A19] p-1 rounded-xl border border-[rgba(218,241,222,0.08)] text-xs">
          {(['todos', 'pago', 'pendente', 'atrasado'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono capitalize transition-all ${
                statusFilter === st
                  ? 'bg-[#163832] text-[#F1F9A1] font-semibold border border-[#8EB69B]/30'
                  : 'text-[#9BA6A0] hover:text-[#E7ECE8]'
              }`}
            >
              {st === 'todos' ? 'Todos' : st === 'pago' ? 'Pagos' : st === 'pendente' ? 'Pendentes' : 'Atrasados'}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Listagem de Clientes Mensalistas */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
              Carteira de Assinaturas & Contratos Recorrentes
            </h3>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Clique em &quot;Marcar Pago&quot; para confirmar a liquidação da mensalidade no ciclo atual.
            </p>
          </div>
          <span className="text-xs font-mono text-[#8EB69B]">
            {filteredClients.length} {filteredClients.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {filteredClients.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-[#8EB69B] mx-auto mb-3">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-[#E7ECE8] font-heading">
              Nenhum cliente mensalista encontrado
            </h4>
            <p className="text-xs text-[#9BA6A0] max-w-md mx-auto mt-1 mb-5">
              Cadastre contratos recorrentes de manutenção, hospedagem, evolução de software ou automação contínua para acompanhar seu MRR.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 text-xs mx-auto"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Cadastrar Primeiro Mensalista</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                  <th className="py-3 px-3">Cliente / Empresa</th>
                  <th className="py-3 px-3">Plano Recorrente</th>
                  <th className="py-3 px-3">Valor Mensal</th>
                  <th className="py-3 px-3">Vencimento</th>
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3">Status do Mês</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-[#10201E]/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-[#E7ECE8]">{client.company_name}</div>
                      <div className="text-[11px] text-[#9BA6A0] flex items-center gap-1.5 mt-0.5">
                        <span>{client.client_name}</span>
                        {client.segment && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#10201E] text-[#8EB69B] border border-[rgba(218,241,222,0.06)] font-mono">
                            {client.segment}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="text-[#E7ECE8] font-medium">{client.plan_name}</span>
                      {client.notes && (
                        <div className="text-[10px] text-[#65706A] truncate max-w-xs">{client.notes}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-[#F1F9A1]">
                      R$ {client.monthly_value.toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[#E7ECE8]">
                      Todo dia {client.billing_day}
                    </td>

                    <td className="py-3.5 px-3 uppercase font-mono text-[10px] text-[#9BA6A0]">
                      {client.payment_method}
                    </td>

                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => handleTogglePayment(client.id, client.current_month_status)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                          client.current_month_status === 'pago'
                            ? 'bg-[#8EB69B]/15 text-[#8EB69B] border border-[#8EB69B]/30 hover:bg-[#8EB69B]/25'
                            : client.current_month_status === 'atrasado'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                            : 'bg-[#F1F9A1]/15 text-[#F1F9A1] border border-[#F1F9A1]/30 hover:bg-[#F1F9A1]/25'
                        }`}
                        title="Clique para alternar o status de pagamento"
                      >
                        {client.current_month_status === 'pago' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : client.current_month_status === 'atrasado' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span className="capitalize">{client.current_month_status}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePayment(client.id, client.current_month_status)}
                          className="text-[11px] h-7 px-2 text-[#8EB69B] hover:text-[#F1F9A1]"
                        >
                          {client.current_month_status === 'pago' ? 'Desmarcar' : 'Marcar Pago'}
                        </Button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-1.5 rounded-lg text-[#65706A] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remover mensalista"
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

      {/* 5. Modal de Cadastro de Mensalista */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cadastrar Novo Cliente Mensalista"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="block text-xs text-[#9BA6A0] mb-1">Nome da Empresa / Cliente</label>
            <input
              type="text"
              required
              placeholder="Ex: Clínica Alpha, Silva Advogados..."
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Contato / Responsável</label>
              <input
                type="text"
                placeholder="Ex: Dr. Roberto"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Segmento / Nicho</label>
              <input
                type="text"
                placeholder="Ex: Medicina, Advocacia, B2B"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Plano ou Serviço Contratado</label>
              <input
                type="text"
                required
                placeholder="Ex: Suporte & Evolução Web"
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Valor da Mensalidade (R$)</label>
              <input
                type="number"
                required
                min="0"
                step="50"
                value={formData.monthly_value}
                onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Dia do Vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={formData.billing_day}
                onChange={(e) => setFormData({ ...formData, billing_day: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Método de Pagamento</label>
              <select
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({ ...formData, payment_method: e.target.value as MonthlyClient['payment_method'] })
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="pix">PIX</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#9BA6A0] mb-1">Observações / Escopo</label>
            <textarea
              rows={2}
              placeholder="Ex: Inclui 2h de ajustes mensais e hospedagem VPS dedicada."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" className="gap-1">
              <Plus className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Salvar Mensalista</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

