'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Proposal, ProposalItem } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  FileText,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Send,
  Printer,
  FileCheck,
  Check,
  Building2,
  Trash2,
  Percent,
} from 'lucide-react';

export default function PropostasPage() {
  const [proposals, setProposals] = useState<Proposal[]>(() => crmService.getProposals());
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const activeProposal = proposals.find((p) => p.id === selectedProposalId) || proposals[0];

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContractSuccessModalOpen, setIsContractSuccessModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [generatedContractCode, setGeneratedContractCode] = useState<string>('');

  // Form State for New Proposal
  const availableServices = crmService.getServices();
  const availableClients = crmService.getClients();
  const availableLeads = crmService.getLeads();

  const [companyName, setCompanyName] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedServices, setSelectedServices] = useState<{
    id: string;
    name: string;
    description: string;
    price: number;
    discount: number;
  }[]>([]);
  const [commercialDiscount, setCommercialDiscount] = useState<number>(0);
  const [installmentsDesc, setInstallmentsDesc] = useState('50% de entrada + 50% na aprovação final');
  const [validUntilDays, setValidUntilDays] = useState<number>(10);

  // Toggle service selection in new proposal modal
  const toggleService = (srv: typeof availableServices[0]) => {
    const exists = selectedServices.some((s) => s.id === srv.id);
    if (exists) {
      setSelectedServices(selectedServices.filter((s) => s.id !== srv.id));
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          id: srv.id,
          name: srv.name,
          description: srv.description,
          price: srv.base_price,
          discount: 0,
        },
      ]);
    }
  };

  const calculateSubtotal = () => {
    return selectedServices.reduce((acc, curr) => acc + curr.price, 0);
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    return Math.max(0, sub - (commercialDiscount || 0));
  };

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || selectedServices.length === 0) {
      alert('Por favor, informe a empresa e selecione ao menos 1 serviço.');
      return;
    }

    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    const today = new Date();
    const validDate = new Date();
    validDate.setDate(today.getDate() + validUntilDays);

    const code = `PROP-2026-${String(proposals.length + 43).padStart(3, '0')}`;

    const newPropItems: ProposalItem[] = selectedServices.map((s, idx) => ({
      id: `pi-${Date.now()}-${idx}`,
      service_name: s.name,
      description: s.description,
      price: s.price,
      discount: s.discount,
      total: s.price - s.discount,
    }));

    const newProposal = crmService.addProposal({
      code,
      company_name: companyName,
      client_name: clientName || companyName,
      items: newPropItems,
      subtotal,
      discount: commercialDiscount,
      total,
      installments_count: 2,
      installments_description: installmentsDesc,
      status: 'enviada',
      created_at: today.toISOString().split('T')[0],
      valid_until: validDate.toISOString().split('T')[0],
    });

    const updated = crmService.getProposals();
    setProposals([...updated]);
    setSelectedProposalId(newProposal.id);
    setIsCreateModalOpen(false);

    // Reset Form
    setCompanyName('');
    setClientName('');
    setSelectedServices([]);
    setCommercialDiscount(0);
  };

  // Aprovar e Gerar Contrato
  const handleApproveAndGenerateContract = () => {
    if (!activeProposal) return;
    const contract = crmService.createContractFromProposal(activeProposal.id);
    if (contract) {
      setGeneratedContractCode(contract.code);
      setProposals([...crmService.getProposals()]);
      setIsContractSuccessModalOpen(true);
    }
  };

  // Exportar PDF
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--evo-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <FileText className="w-3.5 h-3.5" />
            Comercial • Propostas Multisserviço
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[var(--evo-text)] font-heading">
            Propostas Comerciais
          </h1>
          <p className="text-xs text-[var(--evo-muted)] mt-1">
            Gere propostas personalizadas combinando múltiplos serviços com cálculo de desconto e parcelamento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Gerar Proposta</span>
          </Button>
        </div>
      </div>

      {/* Visualizador Split: Lista de propostas à esquerda / Preview editorial à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-heading font-medium text-[var(--evo-muted)] uppercase tracking-wider px-1">
            Propostas Emitidas ({proposals.length})
          </span>
          {proposals.map((prop) => {
            const isSelected = prop.id === activeProposal?.id;
            return (
              <div
                key={prop.id}
                onClick={() => setSelectedProposalId(prop.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#10201E] border-[#8EB69B] shadow-sm'
                    : 'bg-[var(--evo-card)] border-[var(--evo-border)] hover:border-[var(--evo-border-hover)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#8EB69B] font-semibold">{prop.code}</span>
                    <h4 className="text-xs font-semibold text-[var(--evo-text)] font-heading mt-0.5">
                      {prop.company_name}
                    </h4>
                    <span className="text-[11px] text-[var(--evo-muted)]">{prop.client_name}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#8EB69B]">
                    R$ {prop.total.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--evo-border)] text-[10px] text-[var(--evo-disabled)]">
                  <span>Válida até: {prop.valid_until}</span>
                  <Badge
                    variant={
                      prop.status === 'aceita'
                        ? 'quente'
                        : prop.status === 'enviada'
                        ? 'morno'
                        : 'frio'
                    }
                    className="text-[10px]"
                  >
                    {prop.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Visualizador Editorial da Proposta Selecionada (7 cols) */}
        {activeProposal && (
          <div className="lg:col-span-7 bg-[var(--evo-card)] border border-[var(--evo-border)] rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-[var(--evo-border)] pb-5">
              <div>
                <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider font-semibold">
                  Proposta Formal • EvoPixel
                </span>
                <h3 className="text-xl font-semibold text-[var(--evo-text)] font-heading mt-1">
                  {activeProposal.code}
                </h3>
                <p className="text-xs text-[var(--evo-muted)] mt-0.5">
                  Preparada para: <strong className="text-[var(--evo-text)]">{activeProposal.company_name}</strong> ({activeProposal.client_name})
                </p>
              </div>

              <Badge
                variant={
                  activeProposal.status === 'aceita'
                    ? 'quente'
                    : activeProposal.status === 'enviada'
                    ? 'morno'
                    : 'frio'
                }
                className="text-xs"
              >
                {activeProposal.status.toUpperCase()}
              </Badge>
            </div>

            {/* Tabela de Itens / Serviços Selecionados */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase text-[var(--evo-muted)] font-semibold">
                Escopo & Serviços Inclusos
              </span>
              <div className="space-y-2">
                {activeProposal.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[var(--evo-text)]">
                        {item.service_name}
                      </div>
                      <p className="text-[11px] text-[var(--evo-muted)] leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-semibold text-[var(--evo-text)]">
                        R$ {item.price.toLocaleString('pt-BR')}
                      </div>
                      {item.discount > 0 && (
                        <div className="text-[10px] font-mono text-[#8EB69B]">
                          - R$ {item.discount.toLocaleString('pt-BR')} desc.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo Financeiro & Parcelamento */}
            <div className="p-5 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] space-y-3 text-xs">
              <div className="flex justify-between text-[var(--evo-muted)]">
                <span>Subtotal dos Serviços</span>
                <span className="font-mono text-[var(--evo-text)]">R$ {activeProposal.subtotal.toLocaleString('pt-BR')}</span>
              </div>
              {activeProposal.discount > 0 && (
                <div className="flex justify-between text-[#8EB69B]">
                  <span>Desconto Comercial Concedido</span>
                  <span className="font-mono">- R$ {activeProposal.discount.toLocaleString('pt-BR')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-[var(--evo-text)] pt-2 border-t border-[var(--evo-border)]">
                <span>Valor Total do Investimento</span>
                <span className="font-mono text-base font-bold text-[#8EB69B]">R$ {activeProposal.total.toLocaleString('pt-BR')}</span>
              </div>
              <div className="text-[11px] text-[var(--evo-muted)] pt-1">
                Condições: <strong className="text-[var(--evo-text)]">{activeProposal.installments_description}</strong>
              </div>
            </div>

            {/* Ações da Proposta */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => setIsPdfModalOpen(true)}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Exportar PDF</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleApproveAndGenerateContract}
                disabled={activeProposal.status === 'aceita'}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{activeProposal.status === 'aceita' ? 'Contrato Já Gerado' : 'Aprovar e Gerar Contrato'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: GERAR NOVA PROPOSTA COMERCIAL
          ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Gerar Nova Proposta Comercial"
        subtitle="Combine serviços do catálogo com descontos e gere o documento formal para o cliente."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProposal} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--evo-muted)] mb-1 font-medium">
                Empresa / Razão Social *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Clínica Alpha Saúde"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[var(--evo-muted)] mb-1 font-medium">
                Nome do Decisor / Contato
              </label>
              <input
                type="text"
                placeholder="Ex: Dra. Mariana Costa"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none"
              />
            </div>
          </div>

          {/* Seleção de Serviços */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[var(--evo-text)] font-heading">
                Selecione os Serviços Inclusos no Escopo *
              </label>
              <span className="text-[10px] text-[#8EB69B] font-mono">
                {selectedServices.length} selecionado(s)
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border border-[var(--evo-border)] rounded-xl p-2 bg-[var(--evo-surface)]">
              {availableServices.map((srv) => {
                const isChecked = selectedServices.some((s) => s.id === srv.id);
                return (
                  <div
                    key={srv.id}
                    onClick={() => toggleService(srv)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-[#10201E] border-[#8EB69B]'
                        : 'bg-[var(--evo-card)] border-[var(--evo-border)] hover:border-[var(--evo-border-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                          isChecked
                            ? 'bg-[#164E3D] border-[#8EB69B] text-white'
                            : 'border-[var(--evo-border)] bg-[var(--evo-surface)]'
                        }`}
                      >
                        {isChecked && '✓'}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--evo-text)] text-xs">
                          {srv.name}
                        </div>
                        <div className="text-[10px] text-[var(--evo-muted)] line-clamp-1">
                          {srv.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-semibold text-xs text-[var(--evo-text)] shrink-0 pl-2">
                      R$ {srv.base_price.toLocaleString('pt-BR')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Condições Financeiras */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--evo-border)]">
            <div>
              <label className="block text-[var(--evo-muted)] mb-1 font-medium">
                Desconto Comercial (R$)
              </label>
              <input
                type="number"
                min="0"
                value={commercialDiscount || ''}
                onChange={(e) => setCommercialDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[var(--evo-muted)] mb-1 font-medium">
                Validade da Proposta (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={validUntilDays}
                onChange={(e) => setValidUntilDays(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[var(--evo-muted)] mb-1 font-medium">
                Condições de Pagamento
              </label>
              <input
                type="text"
                value={installmentsDesc}
                onChange={(e) => setInstallmentsDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none"
              />
            </div>
          </div>

          {/* Resumo do Total */}
          <div className="p-3.5 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] flex items-center justify-between">
            <div className="text-xs">
              <span className="text-[var(--evo-muted)]">Subtotal: R$ {calculateSubtotal().toLocaleString('pt-BR')}</span>
              {commercialDiscount > 0 && (
                <span className="text-[#8EB69B] ml-2">(- R$ {commercialDiscount.toLocaleString('pt-BR')})</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--evo-muted)] mr-2">Total da Proposta:</span>
              <span className="text-base font-mono font-bold text-[#8EB69B]">
                R$ {calculateTotal().toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--evo-border)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Salvar & Emitir Proposta</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: SUCESSO - CONTRATO GERADO
          ========================================================================= */}
      <Modal
        isOpen={isContractSuccessModalOpen}
        onClose={() => setIsContractSuccessModalOpen(false)}
        title="Proposta Aprovada & Contrato Gerado!"
        subtitle="A proposta comercial foi aprovada e um novo contrato foi gerado para formalização."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-[#10201E] border border-[#8EB69B]/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#164E3D] flex items-center justify-center text-white shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-semibold text-sm text-[var(--evo-text)]">
                Contrato {generatedContractCode}
              </div>
              <p className="text-[11px] text-[var(--evo-muted)] mt-0.5">
                Pronto para envio e assinatura digital via Clicksign.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsContractSuccessModalOpen(false)}
            >
              Fechar
            </Button>
            <Link href="/contratos">
              <Button variant="primary" size="sm" className="gap-1.5">
                <span>Abrir Gestão de Contratos</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: VISUALIZADOR & EXPORTAÇÃO PDF DA PROPOSTA
          ========================================================================= */}
      <Modal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Visualização e Impressão de Proposta Comercial"
        subtitle="Documento diagramado para apresentação formal e exportação em PDF."
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Folha Timbrada / Proposta Comercial */}
          <div
            id="printable-proposal"
            className="p-8 bg-white text-[#06140E] rounded-xl border border-gray-200 shadow-sm space-y-6 font-sans"
          >
            {/* Topo Folha Timbrada */}
            <div className="flex items-start justify-between border-b-2 border-[#164E3D] pb-6">
              <div>
                <div className="text-2xl font-bold font-heading text-[#06140E] flex items-center gap-1.5">
                  EVO<span className="text-[#164E3D]">CRM</span>
                </div>
                <div className="text-xs text-gray-500 font-mono tracking-wider uppercase">
                  EvoPixel Tecnologias Digitais • Proposta Comercial
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded bg-[#164E3D] text-white font-mono text-xs font-bold">
                  {activeProposal?.code}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  Data: {activeProposal?.created_at}
                </div>
                <div className="text-xs text-gray-500">
                  Válida até: {activeProposal?.valid_until}
                </div>
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50 text-xs">
              <div>
                <span className="text-gray-500 uppercase font-mono text-[10px]">Cliente / Empresa</span>
                <div className="font-bold text-sm text-gray-900">{activeProposal?.company_name}</div>
                <div className="text-gray-600">A/C: {activeProposal?.client_name}</div>
              </div>
              <div className="text-right">
                <span className="text-gray-500 uppercase font-mono text-[10px]">Status da Proposta</span>
                <div className="font-bold text-sm text-[#164E3D] uppercase">{activeProposal?.status}</div>
                <div className="text-gray-600">Condição: {activeProposal?.installments_description}</div>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Escopo dos Serviços Contratados
              </h4>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100 text-gray-700">
                    <th className="py-2.5 px-3 font-semibold">Serviço / Descrição</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Valor Unitário</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProposal?.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{item.service_name}</div>
                        <div className="text-gray-500 text-[11px] mt-0.5">{item.description}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-gray-900">
                        R$ {item.price.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totalizador */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">R$ {activeProposal?.subtotal.toLocaleString('pt-BR')}</span>
                </div>
                {activeProposal?.discount ? (
                  <div className="flex justify-between text-[#164E3D] font-semibold">
                    <span>Desconto Comercial:</span>
                    <span className="font-mono">- R$ {activeProposal?.discount.toLocaleString('pt-BR')}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t-2 border-gray-300">
                  <span>Valor Total:</span>
                  <span className="font-mono text-base text-[#164E3D]">
                    R$ {activeProposal?.total.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Rodapé Legal */}
            <div className="pt-6 border-t border-gray-200 text-[10px] text-gray-400 text-center leading-relaxed">
              EvoPixel Tecnologias Digitais • Soluções em Alta Performance Comercial e Operacional • Este documento é confidencial e possui validade jurídica para contratação dos serviços acima descritos.
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--evo-muted)]">
              Dica: Na janela de impressão, selecione &ldquo;Salvar como PDF&rdquo; no destino.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPdfModalOpen(false)}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={handlePrintPdf}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
