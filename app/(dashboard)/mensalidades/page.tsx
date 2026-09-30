'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { MonthlyClient } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  CalendarCheck,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  Building2,
  ArrowUpRight,
  Link2,
} from 'lucide-react';

export default function MensalidadesPage() {
  useCrmSync();
  const monthlyClients = crmService.getMonthlyClients();
  const registeredClients = crmService.getClients();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');

  // Modal de vinculação / edição de mensalista
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    plan_name: 'Suporte & Manutenção Web',
    monthly_value: '450',
    billing_day: '10',
    payment_method: 'pix' as MonthlyClient['payment_method'],
    notes: '',
  });

  const summary = crmService.getMonthlySubscriptionsSummary();

  const selectedClientObj = registeredClients.find((c) => c.id === selectedClientId);

  const filteredRegisteredClients = registeredClients.filter(
    (c) =>
      c.company_name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      c.segment.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const openNewModal = () => {
    setEditId(null);
    setSelectedClientId(registeredClients[0]?.id || '');
    setClientSearchQuery('');
    setFormData({
      plan_name: 'Suporte & Manutenção Web',
      monthly_value: '450',
      billing_day: '10',
      payment_method: 'pix',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (mc: MonthlyClient) => {
    setEditId(mc.id);
    const matched =
      registeredClients.find((c) => c.id === mc.client_id) ||
      registeredClients.find(
        (c) => c.company_name.trim().toLowerCase() === mc.company_name.trim().toLowerCase()
      );
    setSelectedClientId(matched?.id || '');
    setClientSearchQuery('');
    setFormData({
      plan_name: mc.plan_name,
      monthly_value: String(mc.monthly_value || 0),
      billing_day: String(mc.billing_day || 10),
      payment_method: mc.payment_method || 'pix',
      notes: mc.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveMonthlyClient = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientObj && !editId) {
      alert('Selecione um cliente já cadastrado para vincular à mensalidade.');
      return;
    }

    const existingMonthly = editId ? monthlyClients.find((m) => m.id === editId) : undefined;
    const companyName = selectedClientObj?.company_name || existingMonthly?.company_name || '';
    const clientName = selectedClientObj?.name || existingMonthly?.client_name || companyName;
    const segment = selectedClientObj?.segment || existingMonthly?.segment || 'Geral';

    if (!companyName) {
      alert('Selecione um cliente válido.');
      return;
    }

    if (editId) {
      crmService.updateMonthlyClient(editId, {
        client_id: selectedClientObj?.id || existingMonthly?.client_id,
        company_name: companyName,
        client_name: clientName,
        segment,
        plan_name: formData.plan_name.trim() || 'Suporte & Manutenção Web',
        monthly_value: parseFloat(formData.monthly_value) || 0,
        billing_day: parseInt(formData.billing_day, 10) || 10,
        payment_method: formData.payment_method,
        notes: formData.notes,
      });
    } else {
      crmService.addMonthlyClient({
        client_id: selectedClientObj!.id,
        company_name: companyName,
        client_name: clientName,
        segment,
        plan_name: formData.plan_name.trim() || 'Suporte & Manutenção Web',
        monthly_value: parseFloat(formData.monthly_value) || 0,
        billing_day: parseInt(formData.billing_day, 10) || 10,
        payment_method: formData.payment_method,
        status: 'ativo',
        current_month_status: 'pendente',
        start_date: new Date().toISOString().split('T')[0],
        notes: formData.notes,
      });
    }

    setIsAddModalOpen(false);
    setEditId(null);
  };

  const handleTogglePayment = (id: string, currentStatus: 'pago' | 'pendente' | 'atrasado') => {
    const nextStatus = currentStatus === 'pago' ? 'pendente' : 'pago';
    crmService.toggleMonthlyPaymentStatus(id, nextStatus);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja desvincular este cliente mensalista?')) {
      crmService.deleteMonthlyClient(id);
    }
  };

  const findLinkedClient = (mc: MonthlyClient) => {
    return (
      registeredClients.find((c) => c.id === mc.client_id) ||
      registeredClients.find(
        (c) => c.company_name.trim().toLowerCase() === mc.company_name.trim().toLowerCase()
      )
    );
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
            Vincule clientes já cadastrados a planos recorrentes (MRR) e acompanhe os vencimentos mensais.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={openNewModal}
          >
            <Link2 className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Vincular Cliente Mensalista</span>
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
              Nenhum cliente mensalista vinculado
            </h4>
            <p className="text-xs text-[#9BA6A0] max-w-md mx-auto mt-1 mb-5">
              Vincule um cliente já cadastrado na aba Clientes a um plano recorrente de manutenção, hospedagem ou automação para acompanhar seu MRR.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 text-xs mx-auto"
              onClick={openNewModal}
            >
              <Link2 className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Vincular Primeiro Mensalista</span>
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
                {filteredClients.map((client) => {
                  const linkedClient = findLinkedClient(client);

                  return (
                    <tr key={client.id} className="hover:bg-[#10201E]/40 transition-colors group">
                      <td className="py-3.5 px-3">
                        {linkedClient ? (
                          <Link
                            href={`/clientes/${linkedClient.id}`}
                            className="font-semibold text-[#E7ECE8] group-hover:text-[#F1F9A1] transition-colors inline-flex items-center gap-1"
                          >
                            <span>{client.company_name}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <div className="font-semibold text-[#E7ECE8]">{client.company_name}</div>
                        )}
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
                            onClick={() => openEditModal(client)}
                            className="p-1.5 rounded-lg text-[#8EB69B] hover:text-[#E7ECE8] hover:bg-[#10201E] transition-colors"
                            title="Editar plano mensal"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. Modal de Vinculação de Cliente Cadastrado como Mensalista */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editId ? 'Editar Assinatura Mensal' : 'Vincular Cliente a Plano Mensalista'}
        subtitle="Selecione um cliente já cadastrado na EvoPixel e defina as condições do plano recorrente."
      >
        <form onSubmit={handleSaveMonthlyClient} className="space-y-4">
          {registeredClients.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-xs text-[#9BA6A0] space-y-2">
              <p className="text-[#E7ECE8] font-medium">
                Nenhum cliente cadastrado encontrado.
              </p>
              <p>
                Cadastre o cliente na aba Clientes ou conclua um projeto para poder vinculá-lo a uma mensalidade.
              </p>
              <div className="pt-1">
                <Link href="/clientes">
                  <Button type="button" variant="secondary" size="sm">
                    Ir para Clientes
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs text-[#9BA6A0]">
                Selecionar Cliente Cadastrado *
              </label>

              {/* Filtro rápido de cliente caso tenha muitos */}
              {registeredClients.length > 5 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8EB69B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Filtrar cliente por empresa ou contato..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
                  />
                </div>
              )}

              <select
                required={!editId}
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.12)] text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
              >
                <option value="" disabled>
                  Selecione um cliente da sua carteira...
                </option>
                {filteredRegisteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} — {c.name} ({c.segment})
                  </option>
                ))}
              </select>

              {/* Resumo automático do cliente selecionado */}
              {selectedClientObj && (
                <div className="p-3 rounded-xl bg-[#07100F]/90 border border-[rgba(218,241,222,0.08)] flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-[#E7ECE8]">
                      <Building2 className="w-3.5 h-3.5 text-[#F1F9A1]" />
                      <span>{selectedClientObj.company_name}</span>
                    </div>
                    <div className="text-[11px] text-[#9BA6A0]">
                      Contato: {selectedClientObj.name} • Nicho: {selectedClientObj.segment}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#163832] text-[#8EB69B]">
                    Cliente Vinculado
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Plano ou Serviço Recorrente *</label>
              <input
                type="text"
                required
                list="recurring-plans-list"
                placeholder="Ex: Suporte & Manutenção Web"
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
              />
              <datalist id="recurring-plans-list">
                <option value="Suporte & Manutenção Web" />
                <option value="Hospedagem & Evolução Contínua" />
                <option value="Gestão de Agente IA & WhatsApp" />
                <option value="SEO Orgânico & Conteúdo" />
                <option value="Google Meu Negócio & Otimização Local" />
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Valor da Mensalidade (R$) *</label>
              <input
                type="number"
                required
                min="0"
                step="10"
                value={formData.monthly_value}
                onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] font-mono focus:outline-none focus:border-[#8EB69B]"
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
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] font-mono focus:outline-none focus:border-[#8EB69B]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9BA6A0] mb-1">Método de Pagamento</label>
              <select
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({ ...formData, payment_method: e.target.value as MonthlyClient['payment_method'] })
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
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
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
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
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="gap-1.5"
              disabled={!editId && registeredClients.length === 0}
            >
              <Link2 className="w-3.5 h-3.5 text-[#07100F]" />
              <span>{editId ? 'Salvar Alterações' : 'Vincular Mensalista'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
