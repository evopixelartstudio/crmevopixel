'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronLeft,
  Building2,
  Phone,
  Mail,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

export default function ClienteDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const client = crmService.getClientById(clientId);

  if (!client) {
    return (
      <div className="p-12 text-center text-xs text-[#9BA6A0]">
        Cliente não encontrado.{' '}
        <Link href="/clientes" className="text-[#8EB69B] underline">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  const projects = crmService.getProjects().filter((p) => p.company_name === client.company_name);
  const historicalProjects = crmService.getHistoricalProjects().filter((p) => p.company_name === client.company_name);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-xs text-[#9BA6A0] hover:text-[#E7ECE8] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Voltar para Clientes</span>
      </Link>

      {/* Header do Cliente */}
      <div className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
              {client.segment} • Cliente Ativo
            </span>
            <h1 className="text-2xl font-semibold text-[#E7ECE8] font-heading mt-1">
              {client.company_name}
            </h1>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Contato: {client.name} {client.email && `• ${client.email}`} {client.phone && `• ${client.phone}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/propostas">
              <Button variant="primary" size="sm" className="gap-1.5">
                <span>Criar Proposta</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#07100F]" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Métricas do Cliente */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[rgba(218,241,222,0.06)] text-xs">
          <div>
            <span className="text-[#9BA6A0]">Lifetime Value (LTV)</span>
            <div className="text-xl font-semibold text-[#F1F9A1] font-mono mt-1">
              R$ {client.lifetime_value.toLocaleString('pt-BR')}
            </div>
          </div>
          <div>
            <span className="text-[#9BA6A0]">Total Recebido</span>
            <div className="text-xl font-semibold text-[#8EB69B] font-mono mt-1">
              R$ {client.total_received.toLocaleString('pt-BR')}
            </div>
          </div>
          <div>
            <span className="text-[#9BA6A0]">Pendente Atual</span>
            <div className="text-xl font-semibold text-[#E7ECE8] font-mono mt-1">
              R$ {client.total_pending.toLocaleString('pt-BR')}
            </div>
          </div>
          <div>
            <span className="text-[#9BA6A0]">Projetos Realizados</span>
            <div className="text-xl font-semibold text-[#E7ECE8] font-heading mt-1">
              {client.projects_count}
            </div>
          </div>
        </div>
      </div>

      {/* Projetos & Oportunidades de Expansão */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-6 space-y-4">
            <CardTitle>Projetos em Andamento & Entregas</CardTitle>
            <div className="space-y-3">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#E7ECE8] font-heading">
                      {proj.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#163832] text-[#8EB69B] font-mono">
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-[#9BA6A0]">
                    Prazo: {proj.deadline} • Progresso: {proj.progress_percentage}%
                  </div>
                  {/* Barra de progresso */}
                  <div className="w-full bg-[#07100F] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#8EB69B] h-full rounded-full"
                      style={{ width: `${proj.progress_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {historicalProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#E7ECE8] font-heading">
                      {proj.services_summary || 'Projeto Histórico'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#163832] text-[#8EB69B] font-mono">
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-[#9BA6A0]">
                    Data: {new Date(proj.project_date).toLocaleDateString('pt-BR')} • Recebido: R$ {proj.amount_received.toLocaleString('pt-BR')}
                  </div>
                  {/* Barra de progresso para histórico */}
                  <div className="w-full bg-[#07100F] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#8EB69B] h-full rounded-full"
                      style={{ width: `100%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#F1F9A1]">
              <Sparkles className="w-4 h-4" />
              <span>Oportunidades de Cross-sell</span>
            </div>
            <p className="text-xs text-[#9BA6A0] leading-relaxed">
              Baseado no histórico deste cliente, a IA recomenda a oferta dos seguintes serviços complementares:
            </p>
            <div className="space-y-2 pt-2">
              {client.cross_sell_opportunities?.map((opp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] text-xs text-[#E7ECE8] flex items-center justify-between"
                >
                  <span>{opp}</span>
                  <span className="text-[10px] text-[#8EB69B] font-mono">Alta sinergia</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
