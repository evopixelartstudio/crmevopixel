'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  FileCheck,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function ContratosPage() {
  const [contracts, setContracts] = useState(() => crmService.getContracts());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cCompany, setCCompany] = useState('');
  const [cClient, setCClient] = useState('');
  const [cServices, setCServices] = useState('');
  const [cAmount, setCAmount] = useState('');
  const [cDate, setCDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleAddContract = () => {
    if (!cCompany || !cAmount) {
      alert('Preencha a Empresa e o Valor Total.');
      return;
    }
    crmService.addContract({
      code: `CONT-2026-${String(contracts.length + 1).padStart(3, '0')}`,
      company_name: cCompany,
      client_name: cClient || cCompany,
      services_summary: cServices || 'Prestação de Serviços Web',
      total_amount: Number(cAmount),
      status: 'aguardando_assinatura',
      start_date: cDate,
      signature_provider: 'Clicksign'
    });
    setContracts([...crmService.getContracts()]);
    setIsModalOpen(false);
    setCCompany('');
    setCClient('');
    setCServices('');
    setCAmount('');
    setCDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <FileCheck className="w-3.5 h-3.5" />
            Formalização & Assinatura Digital
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Gestão de Contratos
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Contratos gerados automaticamente a partir de propostas aceitas. Preparado para Clicksign / DocuSign.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 text-[#07100F]" />
          <span>Novo Contrato</span>
        </Button>
      </div>

      {/* Grid de Contratos */}
      {contracts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#0C1A19]/50 border border-[rgba(218,241,222,0.06)] border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-[#8EB69B] mx-auto mb-3">
            <FileCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-[#E7ECE8] font-heading">
            Nenhum contrato formalizado
          </h4>
          <p className="text-xs text-[#9BA6A0] max-w-sm mx-auto mt-1 mb-5">
            Conforme as propostas forem aceitas ou você registrar novos contratos, eles serão exibidos aqui.
          </p>
          <Button variant="primary" size="sm" className="gap-1.5 text-xs mx-auto" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Criar Primeiro Contrato</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.18)] transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#8EB69B]">{contract.code}</span>
                    <h3 className="text-base font-semibold text-[#E7ECE8] font-heading mt-0.5">
                      {contract.company_name}
                    </h3>
                    <span className="text-xs text-[#9BA6A0]">{contract.client_name}</span>
                  </div>

                  <Badge
                    variant={contract.status === 'assinado' ? 'success' : 'accent'}
                    className="text-[10px]"
                  >
                    {contract.status === 'assinado' ? 'Assinado' : 'Aguardando Assinatura'}
                  </Badge>
                </div>

                <p className="text-xs text-[#9BA6A0] mt-3 leading-relaxed">
                  Escopo: <strong className="text-[#E7ECE8]">{contract.services_summary}</strong>
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[rgba(218,241,222,0.06)] text-xs">
                  <div>
                    <span className="text-[#65706A] text-[11px]">Valor Total</span>
                    <div className="text-sm font-mono font-semibold text-[#F1F9A1] mt-0.5">
                      R$ {contract.total_amount.toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#65706A] text-[11px]">Provedor de Assinatura</span>
                    <div className="text-xs font-mono text-[#8EB69B] mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{contract.signature_provider || 'Eletrônica'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[rgba(218,241,222,0.06)] flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#65706A]">
                  Início: {new Date(contract.start_date).toLocaleDateString('pt-BR')}
                </span>
                <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5">
                  Ver Documento
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar Novo Contrato */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar Novo Contrato"
        subtitle="Gere um novo contrato manual ou envie para assinatura eletrônica."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1">Empresa</label>
            <input
              type="text"
              value={cCompany}
              onChange={(e) => setCCompany(e.target.value)}
              placeholder="Ex: Martins Imóveis"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1">Cliente / Contato</label>
            <input
              type="text"
              value={cClient}
              onChange={(e) => setCClient(e.target.value)}
              placeholder="Ex: Rodrigo Martins"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1">Escopo de Serviços</label>
            <input
              type="text"
              value={cServices}
              onChange={(e) => setCServices(e.target.value)}
              placeholder="Ex: Site Institucional + SEO"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9BA6A0] mb-1">Valor Total (R$)</label>
              <input
                type="number"
                value={cAmount}
                onChange={(e) => setCAmount(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Data de Início</label>
              <input
                type="date"
                value={cDate}
                onChange={(e) => setCDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddContract}>
              Criar Contrato
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
