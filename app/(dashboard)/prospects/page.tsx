'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Target,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Instagram,
  Globe,
  Phone,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Prospect, ProspectStatus } from '@/types/database';

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>(crmService.getProspects());
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [convertedToast, setConvertedToast] = useState<string | null>(null);

  const filteredProspects = prospects.filter((p) => {
    const matchesSearch =
      p.empresa.toLowerCase().includes(search.toLowerCase()) ||
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.cidade.toLowerCase().includes(search.toLowerCase()) ||
      p.segment.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleConvert = (prospectId: string, empresa: string) => {
    const newLead = crmService.convertProspectToLead(prospectId);
    if (newLead) {
      setProspects([...crmService.getProspects()]);
      setConvertedToast(`"${empresa}" qualificado e convertido com sucesso em Lead Comercial.`);
      setTimeout(() => setConvertedToast(null), 4000);
    }
  };

  const getStatusBadge = (status: ProspectStatus) => {
    switch (status) {
      case 'priority':
        return <Badge variant="accent">Prioritário</Badge>;
      case 'analyzed':
        return <Badge variant="morno">Analisado</Badge>;
      case 'converted_to_lead':
        return <Badge variant="quente">Convertido em Lead</Badge>;
      case 'contacted':
        return <Badge variant="morno">Abordado</Badge>;
      case 'new':
        return <Badge variant="frio">Novo</Badge>;
      default:
        return <Badge variant="frio">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast de Conversão */}
      {convertedToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#10201E] border border-[#8EB69B]/40 text-[#E7ECE8] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#F1F9A1]" />
          <div className="text-xs">
            <span className="font-semibold text-[#F1F9A1]">Lead Criado: </span>
            {convertedToast}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Target className="w-3.5 h-3.5 text-[#F1F9A1]" />
            <span>Fase 01 — Prospecção Pura</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#E7ECE8] font-heading">
            Prospects
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1 max-w-2xl">
            Empresas e pessoas identificadas como potencial alvo comercial. O prospect ainda não demonstrou interesse explícito; após qualificação ou resposta, ele é convertido em Lead.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/prospeccao/mensagens">
            <Button variant="secondary" size="sm" className="gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#8EB69B]" />
              <span>Banco de Mensagens</span>
            </Button>
          </Link>
          <Link href="/leads">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-[#8EB69B]">
              <span>Ver Leads Comerciais</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Métricas do Funil de Prospecção */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] p-4 rounded-xl">
          <span className="text-[11px] text-[#9BA6A0] font-heading uppercase">Total Mapeado</span>
          <div className="text-2xl font-semibold text-[#E7ECE8] font-heading mt-1">
            {prospects.length} alvos
          </div>
          <span className="text-[10px] text-[#8EB69B]">Base qualificada</span>
        </div>
        <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] p-4 rounded-xl">
          <span className="text-[11px] text-[#9BA6A0] font-heading uppercase">Alta Prioridade (ICP &gt; 80)</span>
          <div className="text-2xl font-semibold text-[#F1F9A1] font-heading mt-1">
            {prospects.filter((p) => p.icp_score >= 80).length} empresas
          </div>
          <span className="text-[10px] text-[#F1F9A1]">Recomendados para hoje</span>
        </div>
        <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] p-4 rounded-xl">
          <span className="text-[11px] text-[#9BA6A0] font-heading uppercase">Convertidos em Leads</span>
          <div className="text-2xl font-semibold text-[#8EB69B] font-heading mt-1">
            {prospects.filter((p) => p.status === 'converted_to_lead').length}
          </div>
          <span className="text-[10px] text-[#8EB69B]">Em ciclo comercial</span>
        </div>
        <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] p-4 rounded-xl">
          <span className="text-[11px] text-[#9BA6A0] font-heading uppercase">ICP Médio</span>
          <div className="text-2xl font-semibold text-[#E7ECE8] font-heading mt-1">
            83.2 / 100
          </div>
          <span className="text-[10px] text-[#9BA6A0]">Aderência com a EvoPixel</span>
        </div>
      </div>

      {/* Barra de Filtros & Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8EB69B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por empresa, nome ou nicho..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#07100F] border border-[rgba(218,241,222,0.08)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#E7ECE8] placeholder-[#65706A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'priority', 'analyzed', 'new', 'converted_to_lead'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`text-[11px] px-3 py-1 rounded-lg border font-heading capitalize transition-colors ${
                selectedStatus === st
                  ? 'bg-[#163832] text-[#F1F9A1] border-[#8EB69B]/30'
                  : 'bg-[#07100F] text-[#9BA6A0] border-[rgba(218,241,222,0.06)] hover:text-[#E7ECE8]'
              }`}
            >
              {st === 'all' ? 'Todos' : st === 'converted_to_lead' ? 'Convertidos' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Editorial de Prospects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProspects.map((prospect) => (
          <div
            key={prospect.id}
            className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.18)] rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm"
          >
            <div>
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#E7ECE8] font-heading">
                      {prospect.empresa}
                    </span>
                    {getStatusBadge(prospect.status)}
                  </div>
                  <div className="text-xs text-[#8EB69B] mt-0.5">
                    {prospect.nome} • {prospect.cidade}/{prospect.estado}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-[#F1F9A1]">
                    ICP {prospect.icp_score}/100
                  </div>
                  <div className="text-[10px] text-[#65706A]">
                    Oportunidade {prospect.opportunity_score}%
                  </div>
                </div>
              </div>

              {/* Serviço Sugerido & Sinais */}
              <div className="p-3 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.05)] space-y-2 mb-4">
                <div className="text-[11px] font-heading font-medium text-[#E7ECE8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F1F9A1]" />
                  <span>Serviço Sugerido: {prospect.suggested_service}</span>
                </div>
                <div className="space-y-1">
                  {prospect.identified_signals.map((sig, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-[#9BA6A0]">
                      <span className="text-[#8EB69B] mt-0.5">•</span>
                      <span>{sig}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Links e Presença Digital */}
              <div className="flex items-center gap-3 text-xs text-[#65706A] font-mono">
                {prospect.site && (
                  <a
                    href={prospect.site}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-[#8EB69B] transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Site</span>
                  </a>
                )}
                {prospect.instagram && (
                  <span className="flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5" />
                    <span>{prospect.instagram}</span>
                  </span>
                )}
                {prospect.telefone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{prospect.telefone}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="mt-5 pt-3 border-t border-[rgba(218,241,222,0.06)] flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono text-[#65706A]">
                Origem: {prospect.source}
              </span>

              {prospect.status === 'converted_to_lead' ? (
                <Link href={prospect.converted_lead_id ? `/leads/${prospect.converted_lead_id}` : '/leads'}>
                  <Button variant="secondary" size="sm" className="text-xs gap-1.5 text-[#8EB69B]">
                    <span>Ver Lead</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleConvert(prospect.id, prospect.empresa)}
                  className="text-xs gap-1.5"
                >
                  <span>Qualificar como Lead</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#07100F]" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
