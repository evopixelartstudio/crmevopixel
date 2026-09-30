'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import {
  ChevronLeft,
  Sparkles,
  ArrowUpRight,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { openWhatsApp, cleanPhoneNumber } from '@/lib/utils/whatsapp';
import { GenerateMessageModal } from '@/components/modals/GenerateMessageModal';

function formatExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatDisplayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

export default function ClienteDetailPage() {
  useCrmSync();
  const params = useParams();
  const clientId = params.id as string;
  const client = crmService.getClientById(clientId);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

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

  const normCompany = client.company_name.trim().toLowerCase();
  const projects = crmService
    .getProjects()
    .filter((p) => p.company_name.trim().toLowerCase() === normCompany);
  const historicalProjects = crmService
    .getHistoricalProjects()
    .filter((p) => p.company_name.trim().toLowerCase() === normCompany);
  const monthlySubscriptions = crmService
    .getMonthlyClients()
    .filter(
      (m) =>
        m.client_id === client.id ||
        m.company_name.trim().toLowerCase() === normCompany
    );
  const websites = crmService.getClientWebsites(client.company_name, client.website_url);

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
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
              {client.segment} • Cliente Ativo
            </span>
            <h1 className="text-2xl font-semibold text-[#E7ECE8] font-heading">
              {client.company_name}
            </h1>
            <p className="text-xs text-[#9BA6A0]">
              Contato: {client.name} {client.email && `• ${client.email}`}{' '}
              {client.phone && `• ${client.phone}`}
            </p>
            {websites.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {websites.map((url, idx) => (
                  <a
                    key={idx}
                    href={formatExternalUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.12)] text-[#F1F9A1] font-mono text-xs transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#8EB69B]" />
                    <span>{formatDisplayUrl(url)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chamar no WhatsApp */}
            <button
              onClick={() => {
                if (!client.phone || !cleanPhoneNumber(client.phone)) {
                  alert(`O cliente "${client.company_name}" não possui WhatsApp válido cadastrado.`);
                  return;
                }
                openWhatsApp(client.phone);
              }}
              className="p-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] transition-all active:scale-95 shadow-sm flex items-center justify-center"
              title="Abrir WhatsApp Web / App"
            >
              <WhatsAppIcon className="w-4 h-4 fill-current" />
            </button>

            {/* Gerar Mensagem */}
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.12)] text-[#8EB69B] hover:text-[#F1F9A1] text-xs font-heading font-medium flex items-center gap-1.5 transition-all active:scale-95"
              title="Gerar Mensagem para WhatsApp"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F1F9A1]" />
              <span>Gerar Mensagem</span>
            </button>

            <Link href="/pipeline">
              <Button variant="primary" size="sm" className="gap-1.5">
                <span>Ver no Pipeline</span>
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
            <CardTitle>Projetos & Sites Entregues</CardTitle>
            <div className="space-y-3">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#E7ECE8] font-heading">
                      {proj.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#163832] text-[#8EB69B] font-mono">
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9BA6A0]">
                    <span>
                      Prazo: {proj.deadline} • Progresso: {proj.progress_percentage}%
                    </span>
                    {proj.website_url && (
                      <a
                        href={formatExternalUrl(proj.website_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#F1F9A1] hover:underline font-mono text-[11px]"
                      >
                        <Globe className="w-3 h-3 text-[#8EB69B]" />
                        <span>{formatDisplayUrl(proj.website_url)}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
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
                  className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#E7ECE8] font-heading">
                      {proj.services_summary || 'Projeto Histórico'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#163832] text-[#8EB69B] font-mono">
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9BA6A0]">
                    <span>
                      Data: {new Date(proj.project_date).toLocaleDateString('pt-BR')} • Recebido: R${' '}
                      {proj.amount_received.toLocaleString('pt-BR')}
                    </span>
                    {proj.website_url && (
                      <a
                        href={formatExternalUrl(proj.website_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#F1F9A1] hover:underline font-mono text-[11px]"
                      >
                        <Globe className="w-3 h-3 text-[#8EB69B]" />
                        <span>{formatDisplayUrl(proj.website_url)}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
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

              {projects.length === 0 && historicalProjects.length === 0 && (
                <div className="p-6 text-center text-xs text-[#65706A] bg-[#10201E]/40 rounded-xl border border-[rgba(218,241,222,0.04)]">
                  Nenhum projeto vinculado a este cliente ainda.
                </div>
              )}
            </div>
          </Card>

          {monthlySubscriptions.length > 0 && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle>Planos Mensalistas Vinculados (MRR)</CardTitle>
                <Link href="/mensalidades" className="text-xs font-mono text-[#8EB69B] hover:text-[#F1F9A1]">
                  Gerenciar Mensalidades →
                </Link>
              </div>
              <div className="space-y-3">
                {monthlySubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#E7ECE8] font-heading">
                        {sub.plan_name}
                      </div>
                      <div className="text-[11px] text-[#9BA6A0] mt-0.5">
                        Vencimento todo dia {sub.billing_day} • {sub.payment_method.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-[#F1F9A1]">
                        R$ {sub.monthly_value.toLocaleString('pt-BR')}/mês
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#163832] text-[#8EB69B] capitalize">
                        {sub.current_month_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
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

      {/* Modal Gerador de Mensagens */}
      <GenerateMessageModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        target={{
          id: client.id,
          name: client.name,
          company_name: client.company_name,
          phone: client.phone,
          whatsapp: client.phone,
          segment: client.segment,
        }}
      />
    </div>
  );
}
