'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Building2,
  Layers,
  Sparkles,
  X,
  ArrowRight,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { crmService } from '@/lib/services/crm-service';
import { assistantTools, ToolExecutionResult } from '@/lib/services/assistant-tools';
import { searchCrmLeads } from '@/lib/services/assistant-lead-search';
import { aiProvider, AIProviderConfig } from '@/lib/ai/ai-provider';
import { Lead } from '@/types/database';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'BUSCA' | 'ASSISTENTE';

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeMode, setActiveMode] = useState<Mode>('BUSCA');
  const [result, setResult] = useState<ToolExecutionResult | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(aiProvider.getConfig());
  const [isCheckingAi, setIsCheckingAi] = useState(false);
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if (e.key === 'Tab' && isOpen && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'))
          .filter((element) => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    setIsCheckingAi(true);
    aiProvider.refreshStatus().then((config) => {
      if (current) setAiConfig({ ...config });
    }).catch(() => {
      if (current) setAiConfig({ ...aiProvider.getConfig() });
    }).finally(() => {
      if (current) setIsCheckingAi(false);
    });
    return () => { current = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const leads = crmService.getLeads();
  const clients = crmService.getClients();
  const prospects = crmService.getProspects();
  const opportunities = crmService.getOpportunities();
  const services = crmService.getServices();

  const filteredLeads = searchCrmLeads(leads, { query });
  const resultData = result?.data;
  const resultLeads: Lead[] = result?.tool === 'search_leads' && resultData && typeof resultData === 'object' && 'leads' in resultData && Array.isArray(resultData.leads)
    ? resultData.leads
    : result?.tool === 'get_leads_attention' && Array.isArray(resultData) ? resultData : [];
  const providerReady = aiConfig.activeProvider !== 'simulation' && aiConfig[aiConfig.activeProvider].configured;

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.company_name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredProspects = prospects.filter(
    (p) =>
      p.empresa.toLowerCase().includes(query.toLowerCase()) ||
      p.nome.toLowerCase().includes(query.toLowerCase()) ||
      p.segment.toLowerCase().includes(query.toLowerCase())
  );

  const filteredOpportunities = opportunities.filter(
    (o) =>
      o.company_name.toLowerCase().includes(query.toLowerCase()) ||
      o.title.toLowerCase().includes(query.toLowerCase())
  );

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
  );

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleExecuteActionInline = async () => {
    if (!query.trim() || isExecuting) return;
    const input = query.trim();
    setActiveMode('ASSISTENTE');
    setSubmittedQuery(input);
    setResult(null);
    setIsExecuting(true);
    try {
      const parsed = assistantTools.parseIntent(input);
      const response = await assistantTools.executeTool(parsed.toolName, { ...parsed.params, history }, 'palette-session', input);
      setResult(response);
      if (response.success) setHistory((previous) => [...previous, { role: 'user' as const, content: input }, { role: 'assistant' as const, content: response.message }].slice(-8));
    } catch (error) {
      setResult({ tool: 'assistant', permissionLevel: 'READ', success: false, source: [], message: error instanceof Error ? error.message : 'Não foi possível consultar o CRM. Tente novamente.' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-20 p-4">
      <div
        className="fixed inset-0 bg-[#050706]/85 backdrop-blur-[4px] transition-opacity"
        onClick={onClose}
      />

      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Busca e Assistente do CRM" className="relative w-full max-w-2xl max-h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-7rem)] flex flex-col bg-[#0C1A19] border border-[rgba(218,241,222,0.14)] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex shrink-0 items-center justify-between px-4 py-2 bg-[#050706]/80 border-b border-[rgba(218,241,222,0.06)] text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode('BUSCA')}
              aria-pressed={activeMode === 'BUSCA'}
              className={`px-2.5 py-0.5 rounded-md transition-colors ${
                activeMode === 'BUSCA'
                  ? 'bg-[#10201E] text-[#8EB69B] border border-[rgba(218,241,222,0.12)]'
                  : 'text-[#9BA6A0] hover:text-[#E7ECE8]'
              }`}
            >
              Busca
            </button>
            <button
              onClick={() => setActiveMode('ASSISTENTE')}
              aria-pressed={activeMode === 'ASSISTENTE'}
              className={`px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                activeMode === 'ASSISTENTE'
                  ? 'bg-[#163832] text-[#F1F9A1] border border-[#8EB69B]/30'
                  : 'text-[#9BA6A0] hover:text-[#E7ECE8]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Assistente</span>
            </button>
          </div>

          <span className="text-[#9BA6A0] hidden sm:inline">Esc para fechar</span>
        </div>

        {/* Campo de Busca / Comando */}
        <div className="flex shrink-0 items-center px-4 py-3.5 border-b border-[rgba(218,241,222,0.08)] bg-[#07100F]/70">
          {activeMode === 'ASSISTENTE' ? (
            <Sparkles className="w-4 h-4 text-[#F1F9A1] shrink-0 mr-3" />
          ) : (
            <Search className="w-4 h-4 text-[#8EB69B] shrink-0 mr-3" />
          )}

          <input
            type="text"
            placeholder={
              activeMode === 'ASSISTENTE'
                ? 'Ex: Encontre o lead pelo telefone (68) 99999-0000'
                : 'Buscar por nome, telefone, e-mail ou empresa...'
            }
            aria-label={activeMode === 'ASSISTENTE' ? 'Mensagem para o Assistente' : 'Buscar no CRM'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void handleExecuteActionInline();
              }
            }}
            autoFocus
            className="w-full min-w-0 bg-transparent text-[#E7ECE8] placeholder-[#9BA6A0] text-sm focus:outline-none font-sans"
          />
          <button
            onClick={() => void handleExecuteActionInline()}
            disabled={isExecuting || !query.trim()}
            aria-label="Enviar para o Assistente"
            className="ml-2 shrink-0 p-2 rounded-lg bg-[#163832] text-[#F1F9A1] hover:bg-[#235347] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F1F9A1]"
          >
            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Fechar busca e Assistente"
            className="text-[#9BA6A0] hover:text-[#E7ECE8] ml-2 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Resultados conforme o Modo */}
        <div className="min-h-0 max-h-[60dvh] overflow-y-auto p-3 space-y-4">

          {activeMode === 'ASSISTENTE' && (
            <div className="space-y-4 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9BA6A0]">
                <span>{isCheckingAi ? 'Verificando conexão com a IA...' : providerReady ? `${aiConfig.activeProvider === 'gemini' ? 'Gemini' : 'Claude'} conectado` : 'Consultas do CRM disponíveis. Configure a IA para análises.'}</span>
                <Link href="/configuracoes" onClick={onClose} className="text-[#F1F9A1] underline underline-offset-4 hover:text-white">Configurar IA</Link>
              </div>
              {!result && !isExecuting && (
                <div className="py-5 space-y-3">
                  <p className="text-sm text-[#E7ECE8]">O que você quer encontrar no CRM?</p>
                  <p className="text-xs text-[#9BA6A0] leading-relaxed">Peça um lead pelo telefone, nome ou e-mail, consulte as metas ou faça uma pergunta sobre os dados do CRM.</p>
                  <button onClick={() => setQuery('Encontre o lead pelo telefone ')} className="text-xs text-[#F1F9A1] underline underline-offset-4">Buscar um lead pelo telefone</button>
                </div>
              )}
              {(result || isExecuting) && (
                <div className="space-y-3" aria-live="polite" aria-busy={isExecuting}>
                  <p className="text-xs text-[#9BA6A0] break-words">{submittedQuery}</p>
                  {isExecuting ? (
                    <div role="status" className="flex items-center gap-2 py-4 text-sm text-[#DAF1DE]"><Loader2 className="w-4 h-4 animate-spin" />Consultando os dados do CRM...</div>
                  ) : result && (
                    <>
                      <div role={result.success ? 'status' : 'alert'} className={`flex items-start gap-2 text-sm leading-relaxed ${result.success ? 'text-[#E7ECE8]' : 'text-red-200'}`}>
                        {result.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#8EB69B]" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                        <p className="whitespace-pre-wrap break-words">{result.confirmationMessage || result.message}</p>
                      </div>
                      {resultLeads.length > 0 && (
                        <div className="divide-y divide-[rgba(218,241,222,0.08)]">
                          {resultLeads.map((lead) => (
                            <Link key={lead.id} href={`/leads/${lead.id}`} onClick={onClose} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-[#10201E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F1F9A1]">
                              <div className="min-w-0 space-y-1">
                                <p className="text-sm text-[#E7ECE8] font-medium break-words">{lead.company_name || lead.name}</p>
                                <p className="text-xs text-[#9BA6A0] break-words">{[lead.name, lead.whatsapp || lead.phone, lead.email].filter(Boolean).join(' · ')}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-[#F1F9A1] shrink-0" />
                            </Link>
                          ))}
                        </div>
                      )}
                      {result.source.length > 0 && <p className="text-[11px] text-[#9BA6A0]">Fonte: {result.source.join(' · ')}</p>}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODO BUSCA TRADICIONAL */}
          {activeMode === 'BUSCA' && (
            <>
              {/* Prospects */}
              {filteredProspects.length > 0 && (
                <div>
                  <div className="text-[10px] font-heading font-semibold text-[#65706A] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-[#F1F9A1]" />
                    Prospects ({filteredProspects.length})
                  </div>
                  <div className="space-y-1">
                    {filteredProspects.map((prospect) => (
                      <div
                        key={prospect.id}
                        onClick={() => navigateTo('/prospects')}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#10201E] cursor-pointer transition-colors border border-transparent hover:border-[rgba(218,241,222,0.06)]"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-[#E7ECE8] font-heading">
                            {prospect.empresa}
                          </span>
                          <span className="text-[11px] text-[#9BA6A0]">
                            {prospect.nome} • {prospect.cidade}/{prospect.estado}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#10201E] text-[#F1F9A1] border border-[rgba(218,241,222,0.06)] font-mono">
                          ICP {prospect.icp_score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads */}
              {filteredLeads.length > 0 && (
                <div>
                  <div className="text-[10px] font-heading font-semibold text-[#65706A] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-[#8EB69B]" />
                    Leads ({filteredLeads.length})
                  </div>
                  <div className="space-y-1">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => navigateTo(`/leads/${lead.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#10201E] cursor-pointer transition-colors border border-transparent hover:border-[rgba(218,241,222,0.06)]"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-[#E7ECE8] font-heading">
                            {lead.company_name}
                          </span>
                          <span className="text-[11px] text-[#9BA6A0]">
                            {lead.name} • Nicho: {lead.segment}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#10201E] text-[#8EB69B] border border-[rgba(218,241,222,0.06)]">
                          Score {lead.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clientes */}
              {filteredClients.length > 0 && (
                <div>
                  <div className="text-[10px] font-heading font-semibold text-[#65706A] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-[#8EB69B]" />
                    Clientes ({filteredClients.length})
                  </div>
                  <div className="space-y-1">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => navigateTo(`/clientes/${client.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#10201E] cursor-pointer transition-colors border border-transparent hover:border-[rgba(218,241,222,0.06)]"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-[#E7ECE8] font-heading">
                            {client.company_name}
                          </span>
                          <span className="text-[11px] text-[#9BA6A0]">{client.name}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#F1F9A1]">
                          LTV R$ {client.lifetime_value.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Oportunidades */}
              {filteredOpportunities.length > 0 && (
                <div>
                  <div className="text-[10px] font-heading font-semibold text-[#65706A] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-[#8EB69B]" />
                    Oportunidades ({filteredOpportunities.length})
                  </div>
                  <div className="space-y-1">
                    {filteredOpportunities.map((opp) => (
                      <div
                        key={opp.id}
                        onClick={() => navigateTo('/pipeline')}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#10201E] cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-[#E7ECE8]">
                            {opp.company_name} — {opp.title}
                          </span>
                          <span className="text-[11px] text-[#9BA6A0]">
                            Estágio: {opp.stage_slug.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[#F1F9A1]">
                          R$ {opp.estimated_value.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Serviços */}
              {filteredServices.length > 0 && (
                <div>
                  <div className="text-[10px] font-heading font-semibold text-[#65706A] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-[#8EB69B]" />
                    Catálogo de Serviços
                  </div>
                  <div className="space-y-1">
                    {filteredServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => navigateTo('/servicos')}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#10201E] cursor-pointer transition-colors"
                      >
                        <span className="text-xs text-[#E7ECE8]">{service.name}</span>
                        <span className="text-[11px] font-mono text-[#8EB69B]">
                          R$ {service.base_price.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredLeads.length === 0 &&
                filteredClients.length === 0 &&
                filteredProspects.length === 0 &&
                filteredOpportunities.length === 0 &&
                filteredServices.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#65706A]">
                    Nenhum resultado encontrado para &quot;{query}&quot;. Use a aba Assistente ou pressione Enter para consultar o CRM.
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
