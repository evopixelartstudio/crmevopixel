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

export default function ClientesPage() {
  useCrmSync();
  const clients = crmService.getClients();
  const [searchTerm, setSearchTerm] = useState('');

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

        <div className="flex items-center gap-2.5">
          <Link href="/mensalidades">
            <Button variant="secondary" size="sm" className="text-xs">
              <span>Clientes Mensalistas (MRR)</span>
            </Button>
          </Link>
          <Button variant="primary" size="sm" className="gap-1.5 text-xs">
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
      {filteredClients.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#0C1A19]/50 border border-[rgba(218,241,222,0.06)] border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-[#8EB69B] mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-[#E7ECE8] font-heading">
            Nenhum cliente cadastrado
          </h4>
          <p className="text-xs text-[#9BA6A0] max-w-sm mx-auto mt-1 mb-5">
            Sua base de clientes está limpa e pronta para receber seus clientes reais.
          </p>
          <Button variant="primary" size="sm" className="gap-1.5 text-xs mx-auto">
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Cadastrar Primeiro Cliente</span>
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
