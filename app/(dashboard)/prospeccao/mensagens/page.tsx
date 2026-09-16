'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { MessageSequence, MessageSequenceStep, Niche } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import {
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Send,
  CheckCircle2,
  ChevronRight,
  Plus,
  Play,
  Edit3,
  Copy,
  Zap,
  Sliders,
} from 'lucide-react';

export default function BancoMensagensPage() {
  const niches = crmService.getNiches();
  const sequences = crmService.getSequences();

  const [selectedNicheId, setSelectedNicheId] = useState<string>(niches[0]?.id || 'niche-1');
  const activeSequence = sequences.find((s) => s.niche_id === selectedNicheId);

  // Estado para edição de etapa via Drawer
  const [editingStep, setEditingStep] = useState<MessageSequenceStep | null>(null);
  const [stepMessageText, setStepMessageText] = useState('');
  const [stepWaitDays, setStepWaitDays] = useState(2);

  // Estado para teste / simulação de envio
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testLeadName, setTestLeadName] = useState('Dr. Marcelo Antunes');
  const [testCompanyName, setTestCompanyName] = useState('Antunes & Filhos');
  const [testCity, setTestCity] = useState('Campinas');

  const openEditDrawer = (step: MessageSequenceStep) => {
    setEditingStep(step);
    setStepMessageText(step.message_text);
    setStepWaitDays(step.wait_days);
  };

  const handleSaveStep = () => {
    if (activeSequence && editingStep) {
      crmService.updateSequenceStepText(
        activeSequence.id,
        editingStep.id,
        stepMessageText,
        stepWaitDays
      );
      setEditingStep(null);
      alert('Etapa atualizada com sucesso!');
    }
  };

  const getSimulatedMessage = (template: string) => {
    return template
      .replace('{nome}', testLeadName)
      .replace('{empresa}', testCompanyName)
      .replace('{cidade}', testCity)
      .replace('{observação}', 'procura otimizar atendimento');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Prospecção IA • Módulo 18.1
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Banco de Mensagens por Nicho
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Sequências pré-prontas (Abertura → Follow-up 1 → Follow-up 2) reutilizáveis para cada segmento cadastrado.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsTestModalOpen(true)}
          >
            <Play className="w-3.5 h-3.5 text-[#8EB69B]" />
            <span>Testar Sequência</span>
          </Button>

          <Link href="/prospeccao">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <span>Painel de Prospecção</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Split-View: Nichos à esquerda / Linha do Tempo à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Lista de Nichos (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-heading font-medium text-[#9BA6A0] uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Nichos Cadastrados</span>
            <span className="text-[11px] font-mono text-[#8EB69B]">{niches.length} ativos</span>
          </div>

          <div className="space-y-2">
            {niches.map((niche) => {
              const isSelected = niche.id === selectedNicheId;
              return (
                <div
                  key={niche.id}
                  onClick={() => setSelectedNicheId(niche.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#10201E] border-[rgba(241,249,161,0.25)] shadow-[0_0_20px_rgba(241,249,161,0.04)]'
                      : 'bg-[#0C1A19] border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold font-heading ${
                        isSelected ? 'text-[#F1F9A1]' : 'text-[#E7ECE8]'
                      }`}
                    >
                      {niche.name}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-[#F1F9A1] translate-x-0.5' : 'text-[#65706A]'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-[#9BA6A0] mt-1 line-clamp-2">
                    {niche.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[rgba(218,241,222,0.04)] text-[10px] text-[#65706A]">
                    <span className="font-mono text-[#8EB69B]">WhatsApp Automático</span>
                    <span>•</span>
                    <span>Régua de 3 a 4 etapas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Linha do Tempo da Sequência Ativa (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-4 mb-6">
              <div>
                <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                  Sequência Selecionada
                </span>
                <h3 className="text-lg font-semibold text-[#E7ECE8] font-heading mt-0.5">
                  {activeSequence?.name || 'Nenhuma sequência cadastrada'}
                </h3>
              </div>
              <Badge variant="accent" className="text-xs">
                {activeSequence?.steps.length || 0} Etapas Ativas
              </Badge>
            </div>

            {/* Linha do Tempo das Etapas */}
            <div className="space-y-4">
              {activeSequence?.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-5 rounded-xl bg-[#10201E]/80 border border-[rgba(218,241,222,0.06)] hover:border-[rgba(218,241,222,0.16)] transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#163832] border border-[#8EB69B]/30 flex items-center justify-center text-xs font-mono text-[#8EB69B]">
                        {step.step_order}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[#E7ECE8] font-heading">
                          {step.name}
                        </h4>
                        <span className="text-[10px] text-[#65706A] font-mono">
                          Canal: {step.channel.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {step.wait_days > 0 && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#07100F] text-[#9BA6A0] border border-[rgba(218,241,222,0.06)]">
                          Aguarda {step.wait_days} dias sem resposta
                        </span>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs px-2.5 gap-1"
                        onClick={() => openEditDrawer(step)}
                      >
                        <Edit3 className="w-3 h-3 text-[#8EB69B]" />
                        <span>Editar</span>
                      </Button>
                    </div>
                  </div>

                  {/* Texto da Mensagem */}
                  <div className="p-3.5 rounded-lg bg-[#07100F]/60 border border-[rgba(218,241,222,0.04)] text-xs text-[#E7ECE8] leading-relaxed">
                    {step.message_text}
                  </div>

                  {/* Variáveis detectadas */}
                  <div className="flex items-center gap-2 text-[10px] text-[#65706A]">
                    <span>Variáveis:</span>
                    {['{nome}', '{empresa}', '{cidade}'].map((v) => (
                      <span
                        key={v}
                        className="px-1.5 py-0.2 rounded bg-[#10201E] text-[#8EB69B] font-mono"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Aviso sobre Integração n8n (Seção 51) */}
            <div className="mt-6 p-4 rounded-xl bg-[#07100F]/70 border border-[rgba(218,241,222,0.06)] flex items-start gap-3">
              <Zap className="w-4 h-4 text-[#8EB69B] shrink-0 mt-0.5" />
              <div className="text-xs text-[#9BA6A0] leading-relaxed">
                <strong className="text-[#E7ECE8]">Funcionamento sem dependência rígida:</strong> As
                sequências podem ser editadas e organizadas livremente. Ao vincular o webhook do n8n, o EVOCRM disparará os eventos{' '}
                <code className="text-[#8EB69B] font-mono">prospecting.sequence.started</code> e{' '}
                <code className="text-[#8EB69B] font-mono">prospecting.followup.due</code>.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Lateral para Edição de Etapa */}
      <Drawer
        isOpen={!!editingStep}
        onClose={() => setEditingStep(null)}
        title={`Editar: ${editingStep?.name || ''}`}
        subtitle="Modifique o texto da mensagem, variáveis e tempo de espera."
      >
        {editingStep && (
          <div className="space-y-5 text-xs">
            <div>
              <label className="block text-[#9BA6A0] mb-1.5 font-medium">
                Texto da Mensagem
              </label>
              <textarea
                rows={8}
                value={stepMessageText}
                onChange={(e) => setStepMessageText(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none font-sans leading-relaxed text-xs"
              />
              <span className="text-[10px] text-[#65706A] mt-1 block">
                Disponíveis: &#123;nome&#125;, &#123;empresa&#125;, &#123;cidade&#125;, &#123;observação&#125;
              </span>
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1.5 font-medium">
                Prazo de Espera antes da próxima etapa (dias)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={stepWaitDays}
                onChange={(e) => setStepWaitDays(Number(e.target.value))}
                className="w-32 px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
              <span className="text-[10px] text-[#65706A] mt-1 block">
                Disparado automaticamente pelo n8n caso o lead não responda.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t border-[rgba(218,241,222,0.06)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingStep(null)}
              >
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveStep}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal Testar Sequência (Simulação sem envio real) */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Simulação da Sequência (Sem Disparo)"
        subtitle="Visualize como as mensagens serão montadas com os dados reais do lead antes da automação."
      >
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-[#9BA6A0]">Nome</label>
              <input
                type="text"
                value={testLeadName}
                onChange={(e) => setTestLeadName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.08)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#9BA6A0]">Empresa</label>
              <input
                type="text"
                value={testCompanyName}
                onChange={(e) => setTestCompanyName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.08)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#9BA6A0]">Cidade</label>
              <input
                type="text"
                value={testCity}
                onChange={(e) => setTestCity(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.08)]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {activeSequence?.steps.map((step) => (
              <div
                key={step.id}
                className="p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)]"
              >
                <div className="text-[10px] font-mono text-[#8EB69B] mb-1">
                  {step.name}
                </div>
                <p className="text-[#E7ECE8] leading-relaxed">
                  {getSimulatedMessage(step.message_text)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTestModalOpen(false)}
            >
              Fechar Simulação
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
