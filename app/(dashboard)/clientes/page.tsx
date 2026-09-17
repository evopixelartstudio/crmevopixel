'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Building2,
  Search,
  Plus,
  ArrowUpRight,
  Sparkles,
  Phone,
  Mail,
  Layers,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function ClientesPage() {
  const clients = crmService.getClients();
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cSegment, setCSegment] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');

  const handleAddClient = () => {
    if (!cCompany || !cName) {
      alert('Preencha ao menos o Nome e a Empresa.');
      return;
    }
    crmService.addClient({
      name: cName,
      company_name: cCompany,
      segment: cSegment || 'Geral',
      projects_count: 0,
      lifetime_value: 0,
      total_pending: 0,
      cross_sell_opportunities: [],
      phone: cPhone,
      email: cEmail,
    });
    setClients([...crmService.getClients()]);
    setIsModalOpen(false);
    setCName('');
    setCCompany('');
    setCSegment('');
    setCEmail('');
    setCPhone('');
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.segment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            Gestão de Carteira & Client 360
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Clientes da EvoPixel
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Visão consolidada de Lifetime Value, projetos entregues e oportunidades de expansão/cross-sell.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 text-[#8EB69B] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por cliente, empresa ou segmento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none"
        />
      </div>

      {/* Grid de Clientes 360 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.18)] transition-all group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                  {client.segment}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#10201E] text-[#8EB69B] font-mono">
                  {client.projects_count} projetos
                </span>
              </div>

              <h3 className="text-base font-semibold text-[#E7ECE8] font-heading group-hover:text-[#F1F9A1] transition-colors">
                {client.company_name}
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">{client.name}</p>

              {/* LTV & Indicadores Financeiros */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[rgba(218,241,222,0.06)] text-xs">
                <div>
                  <span className="text-[#65706A] text-[11px]">Lifetime Value</span>
                  <div className="text-sm font-semibold font-mono text-[#F1F9A1] mt-0.5">
                    R$ {client.lifetime_value.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div>
                  <span className="text-[#65706A] text-[11px]">Pendente</span>
                  <div className="text-sm font-semibold font-mono text-[#E7ECE8] mt-0.5">
                    R$ {client.total_pending.toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Oportunidades de Cross-sell (Seção 27) */}
              {client.cross_sell_opportunities && client.cross_sell_opportunities.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[rgba(218,241,222,0.04)]">
                  <div className="text-[10px] font-mono text-[#8EB69B] uppercase mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#8EB69B]" />
                    Oportunidade de Expansão
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {client.cross_sell_opportunities.map((opp, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#10201E] text-[#9BA6A0] border border-[rgba(218,241,222,0.06)]"
                      >
                        {opp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[rgba(218,241,222,0.06)] flex items-center justify-between">
              <span className="text-[10px] text-[#65706A]">
                Último projeto: {client.last_project_at || 'Em andamento'}
              </span>
              <Link href={`/clientes/${client.id}`}>
                <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5">
                  Ver 360°
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Cliente"
        subtitle="Preencha os dados básicos do novo cliente"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Nome do Cliente *</label>
            <input
              type="text"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Empresa *</label>
            <input
              type="text"
              value={cCompany}
              onChange={(e) => setCCompany(e.target.value)}
              placeholder="Ex: Clínica Vida"
              className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Segmento / Nicho</label>
            <input
              type="text"
              value={cSegment}
              onChange={(e) => setCSegment(e.target.value)}
              placeholder="Ex: Odontologia"
              className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">E-mail</label>
              <input
                type="email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                placeholder="contato@empresa.com"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">Telefone/WhatsApp</label>
              <input
                type="text"
                value={cPhone}
                onChange={(e) => setCPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--evo-border)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddClient}>
              Salvar Cliente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
