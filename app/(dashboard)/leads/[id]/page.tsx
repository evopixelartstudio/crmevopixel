'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import {
  ChevronLeft,
  Flame,
  MessageSquare,
  Clock,
  Target,
  FileText,
  Sparkles,
  Zap,
  Pause,
  Play,
  FastForward,
  CheckCircle2,
  Calendar,
  Send,
  Building2,
  Phone,
  Mail,
  Globe,
  Info,
  Layers,
  Compass,
  ArrowUpRight,
} from 'lucide-react';

export default function LeadProfilePage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const lead = crmService.getLeadById(leadId);

  const [activeTab, setActiveTab] = useState<'sequencia' | 'visao' | 'ia' | 'conversas'>('sequencia');
  const [sequenceStatus, setSequenceStatus] = useState(lead?.sequence_progress?.status || 'aguardando_envio');
  const [isApproachModalOpen, setIsApproachModalOpen] = useState(false);
  const [approachMessage, setApproachMessage] = useState('');

  if (!lead) {
    return (
      <div className="p-12 text-center text-xs text-[#9BA6A0]">
        Lead não encontrado.{' '}
        <Link href="/leads" className="text-[#8EB69B] underline">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  const [logs, setLogs] = useState<any[]>(() => crmService.getMessageLogs(lead.id));

  const handleAdvanceSequence = () => {
    crmService.advanceLeadSequence(lead.id);
    setSequenceStatus('enviado');
    setLogs([...crmService.getMessageLogs(lead.id)]);
    alert('Próxima etapa da sequência disparada para o n8n com sucesso!');
  };

  const handlePauseSequence = () => {
    crmService.pauseLeadSequence(lead.id, 'Pausado manualmente pelo usuário');
    setSequenceStatus('pausado');
  };

  const openApproachModal = () => {
    const defaultText = `Olá ${lead.name}, tudo bem? Notei que a ${lead.company_name} tem excelente reputação em ${lead.city}, mas o canal de atendimento no WhatsApp ainda não possui qualificação automática dos clientes...`;
    setApproachMessage(defaultText);
    setIsApproachModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs text-[#9BA6A0] hover:text-[#E7ECE8] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar para Leads</span>
        </Link>

        <span className="text-[11px] font-mono text-[#65706A]">ID: {lead.id}</span>
      </div>

      {/* Header do Lead (Seção 16) */}
      <div className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#E7ECE8] font-heading">
                {lead.company_name}
              </h1>
              <Badge temperature={lead.temperature}>
                {lead.temperature === 'quente' && '🔥 Quente'}
                {lead.temperature === 'morno' && '● Morno'}
                {lead.temperature === 'frio' && '○ Frio'}
              </Badge>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#10201E] text-[#8EB69B] border border-[rgba(218,241,222,0.06)]">
                Score IA: {lead.score}/100
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#9BA6A0]">
              <span className="font-medium text-[#E7ECE8]">{lead.name} ({lead.role})</span>
              <span>•</span>
              <span className="font-mono text-[#8EB69B]">Nicho: {lead.segment}</span>
              <span>•</span>
              <span>{lead.city}, {lead.state}</span>
              {lead.whatsapp && (
                <>
                  <span>•</span>
                  <span>WhatsApp: {lead.whatsapp}</span>
                </>
              )}
            </div>
          </div>

          {/* Ações Principais (Seção 16) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5"
              onClick={openApproachModal}
            >
              <Send className="w-3.5 h-3.5 text-[#07100F]" />
              <span>Iniciar Abordagem</span>
            </Button>
            <Link href="/follow-ups">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8EB69B]" />
                <span>Follow-up</span>
              </Button>
            </Link>
            <Link href="/propostas">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#8EB69B]" />
                <span>Criar Proposta</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Próxima Melhor Ação (Seção 13) */}
      <div className="bg-[#0C1A19] border border-[#8EB69B]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#163832] border border-[#8EB69B]/40 flex items-center justify-center shrink-0 mt-0.5">
            <Compass className="w-4 h-4 text-[#F1F9A1]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider font-semibold">
                PRÓXIMA MELHOR AÇÃO RECOMENDADA
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#10201E] text-[#F1F9A1] border border-[rgba(218,241,222,0.06)]">
                IA Analítica
              </span>
            </div>
            <div className="text-sm font-semibold text-[#E7ECE8] font-heading mt-0.5">
              {lead.temperature === 'quente'
                ? 'Enviar proposta comercial formalizada com foco em ROI'
                : 'Disparar abordagem consultiva com diagnóstico do site'}
            </div>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              <span className="text-[#65706A] font-mono">Motivo:</span> Lead com Score {lead.score}/100 e demanda detectada em {lead.services.join(', ')}.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Link href="/propostas">
            <Button variant="primary" size="sm" className="text-xs gap-1.5">
              <span>Gerar Proposta</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#07100F]" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Navegação em Painéis */}
      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        items={[
          { id: 'sequencia', label: 'Sequência de Prospecção (n8n)' },
          { id: 'visao', label: 'Visão Geral & Informações' },
          { id: 'ia', label: 'Inteligência IA & ICP' },
          { id: 'conversas', label: 'Conversas & Timeline', count: logs.length },
        ]}
      />

      {/* Conteúdo das Abas */}
      {activeTab === 'sequencia' && (
        <div className="space-y-6">
          {/* Painel da Sequência de Prospecção de Nicho (Seção 18.1 & 18.2) */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-4 mb-6">
              <div>
                <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                  Automação Operacional via n8n
                </span>
                <h3 className="text-base font-medium text-[#E7ECE8] font-heading mt-0.5">
                  Sequência do Nicho: {lead.segment}
                </h3>
                <p className="text-xs text-[#9BA6A0] mt-1">
                  Disparos e réguas de reengajamento cadastradas no Banco de Mensagens executadas via Evolution API.
                </p>
              </div>

              {/* Controles Manuais da Automação */}
              <div className="flex items-center gap-2">
                {sequenceStatus === 'pausado' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs text-[#8EB69B]"
                    onClick={() => setSequenceStatus('aguardando_resposta')}
                  >
                    <Play className="w-3.5 h-3.5 text-[#8EB69B]" />
                    <span>Reativar Sequência</span>
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handlePauseSequence}
                  >
                    <Pause className="w-3.5 h-3.5 text-[#9BA6A0]" />
                    <span>Pausar</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-[#F1F9A1] hover:border-[#F1F9A1]/30"
                  onClick={handleAdvanceSequence}
                >
                  <FastForward className="w-3.5 h-3.5 text-[#F1F9A1]" />
                  <span>Disparar Próxima Etapa</span>
                </Button>
              </div>
            </div>

            {/* Linha do Tempo da Sequência */}
            <div className="space-y-4">
              {/* Etapa 1: Abertura */}
              <div className="p-4 rounded-xl bg-[#10201E]/60 border border-[rgba(218,241,222,0.06)] flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#163832] border border-[#8EB69B]/30 flex items-center justify-center shrink-0 text-[#8EB69B]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#E7ECE8]">
                      Etapa 1 — Abertura Consultiva
                    </span>
                    <span className="text-[11px] font-mono text-[#8EB69B]">
                      Enviada há 2 dias • Lida
                    </span>
                  </div>
                  <p className="text-xs text-[#9BA6A0] mt-1.5 italic bg-[#07100F]/40 p-2.5 rounded-lg border border-[rgba(218,241,222,0.04)]">
                    &ldquo;Olá {lead.name}, tudo bem? Notei que a {lead.company_name} tem forte atuação em {lead.city}, mas ao pesquisar encontramos um gargalo na velocidade de retorno do WhatsApp...&rdquo;
                  </p>
                </div>
              </div>

              {/* Etapa 2: Follow-up 1 */}
              <div className="p-4 rounded-xl bg-[#0C1A19] border border-[rgba(241,249,161,0.2)] flex items-start gap-4 shadow-[0_0_20px_rgba(241,249,161,0.04)]">
                <div className="w-8 h-8 rounded-full bg-[#F1F9A1]/15 border border-[#F1F9A1]/40 flex items-center justify-center shrink-0 text-[#F1F9A1]">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F1F9A1]">
                        Etapa 2 — Follow-up 1 (Próximo disparo)
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F1F9A1]/10 text-[#F1F9A1]">
                        Agendado
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#9BA6A0]">
                      Disparo automático hoje às 16:30 via n8n
                    </span>
                  </div>
                  <p className="text-xs text-[#E7ECE8] mt-1.5 italic bg-[#07100F]/50 p-2.5 rounded-lg border border-[rgba(218,241,222,0.06)]">
                    &ldquo;{lead.name}, passando rápido: semana passada estruturamos um fluxo que reduziu 65% das dúvidas repetitivas para outro escritório do mesmo segmento. Faz sentido mostrar em 3 minutos?&rdquo;
                  </p>
                </div>
              </div>

              {/* Etapa 3: Follow-up 2 */}
              <div className="p-4 rounded-xl bg-[#07100F]/40 border border-[rgba(218,241,222,0.04)] flex items-start gap-4 opacity-60">
                <div className="w-8 h-8 rounded-full bg-[#10201E] border border-[rgba(218,241,222,0.06)] flex items-center justify-center shrink-0 text-[#65706A]">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#9BA6A0]">
                      Etapa 3 — Follow-up 2 (Diagnóstico Direto)
                    </span>
                    <span className="text-[11px] font-mono text-[#65706A]">
                      Aguardará 3 dias após a etapa 2
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'visao' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <CardTitle>Dados Cadastrais & Empresa</CardTitle>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[rgba(218,241,222,0.04)]">
                <span className="text-[#9BA6A0]">Empresa</span>
                <span className="text-[#E7ECE8] font-medium">{lead.company_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[rgba(218,241,222,0.04)]">
                <span className="text-[#9BA6A0]">Contato Principal</span>
                <span className="text-[#E7ECE8] font-medium">{lead.name} ({lead.role})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[rgba(218,241,222,0.04)]">
                <span className="text-[#9BA6A0]">Segmento / Nicho</span>
                <span className="text-[#8EB69B] font-mono">{lead.segment}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[rgba(218,241,222,0.04)]">
                <span className="text-[#9BA6A0]">Localização</span>
                <span className="text-[#E7ECE8]">{lead.city} - {lead.state}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[rgba(218,241,222,0.04)]">
                <span className="text-[#9BA6A0]">Website</span>
                <span className="text-[#8EB69B]">{lead.website || 'Não informado'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <CardTitle>Oportunidades & Serviços Recomendados</CardTitle>
            <div className="space-y-3">
              {lead.services.map((service, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-[#E7ECE8]">{service}</span>
                  <span className="text-[11px] font-mono text-[#8EB69B]">Alta Oportunidade</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'ia' && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-[rgba(218,241,222,0.06)] pb-4">
            <span className="text-[10px] font-mono text-[#F1F9A1] uppercase tracking-wider">
              Evo Intelligence — Análise Estratégica
            </span>
            <h3 className="text-lg font-medium text-[#E7ECE8] font-heading mt-1">
              Diferenciação Estrita: Dado vs Inferência vs Recomendação
            </h3>
          </div>

          {/* DADO (Fato verificado) */}
          <div className="p-4 rounded-xl bg-[#07100F] border-l-2 border-[#8EB69B] border-y border-r border-[rgba(218,241,222,0.06)]">
            <div className="text-[11px] font-mono text-[#8EB69B] uppercase font-semibold mb-2">
              [DADO] — Fatos Verificados
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-[#E7ECE8]">
              {lead.ai_analysis?.data_points.map((dp, i) => (
                <li key={i}>{dp}</li>
              ))}
            </ul>
          </div>

          {/* INFERÊNCIA (Dedução analítica) */}
          <div className="p-4 rounded-xl bg-[#07100F] border-l-2 border-[#9BA6A0] border-y border-r border-[rgba(218,241,222,0.06)]">
            <div className="text-[11px] font-mono text-[#9BA6A0] uppercase font-semibold mb-2">
              [INFERÊNCIA] — Deduções e Hipóteses
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-[#9BA6A0]">
              {lead.ai_analysis?.inferences.map((inf, i) => (
                <li key={i}>{inf}</li>
              ))}
            </ul>
          </div>

          {/* RECOMENDAÇÃO (Ação prática sugerida) */}
          <div className="p-4 rounded-xl bg-[#07100F] border-l-2 border-[#F1F9A1] border-y border-r border-[rgba(218,241,222,0.06)]">
            <div className="text-[11px] font-mono text-[#F1F9A1] uppercase font-semibold mb-2">
              [RECOMENDAÇÃO] — Plano de Ação Comercial
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-[#E7ECE8]">
              {lead.ai_analysis?.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {activeTab === 'conversas' && (
        <Card className="p-6 space-y-4">
          <CardTitle>Histórico de Mensagens & Webhooks</CardTitle>
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-[#10201E]/70 border border-[rgba(218,241,222,0.06)] text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#8EB69B]">{log.channel}</span>
                  <span className="text-[#65706A] font-mono">
                    {new Date(log.sent_at).toLocaleString('pt-BR')} • {log.status}
                  </span>
                </div>
                <p className="text-[#E7ECE8] leading-relaxed">{log.sent_text}</p>
                <div className="text-[10px] text-[#65706A] font-mono pt-1">
                  Origem: {log.source} ({log.direction})
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Motor de Abordagem (Seção 21) */}
      <Modal
        isOpen={isApproachModalOpen}
        onClose={() => setIsApproachModalOpen(false)}
        title="Motor de Abordagem Inteligente"
        subtitle="Mensagem consultiva e direta formulada para este lead, com suporte à sequência do nicho."
      >
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#9BA6A0] font-medium">Texto da Abordagem</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] text-[#8EB69B] hover:text-[#F1F9A1]"
                onClick={() => {
                  setApproachMessage(
                    `Olá ${lead.name}, acompanhei o posicionamento da ${lead.company_name} em ${lead.city}. Desenvolvemos soluções com ganho imediato de eficiência para o segmento de ${lead.segment}. Gostaria de um diagnóstico rápido?`
                  );
                }}
              >
                Usar sequência do nicho
              </Button>
            </div>
            <textarea
              rows={5}
              value={approachMessage}
              onChange={(e) => setApproachMessage(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none font-sans leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-[11px]"
              onClick={() =>
                setApproachMessage((prev) => prev.slice(0, Math.floor(prev.length * 0.75)))
              }
            >
              Mais curta
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-[11px]"
              onClick={() =>
                setApproachMessage((prev) => prev.replace('Desenvolvemos', 'Criamos'))
              }
            >
              Mais casual
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-[11px]"
              onClick={() => {
                navigator.clipboard?.writeText(approachMessage);
                alert('Mensagem copiada para a área de transferência!');
              }}
            >
              Copiar
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsApproachModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                crmService.addMessageLog({
                  lead_id: lead.id,
                  step_name: 'Abordagem Manual Personalizada',
                  channel: 'WhatsApp (Evolution API)',
                  sent_text: approachMessage,
                  direction: 'enviada',
                  sent_at: new Date().toISOString(),
                  source: 'manual',
                  status: 'entregue',
                });
                setLogs([...crmService.getMessageLogs(lead.id)]);
                lead.status = 'em_abordagem';
                alert('Abordagem enviada para o canal via n8n!');
                setIsApproachModalOpen(false);
              }}
            >
              Disparar pelo WhatsApp
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
