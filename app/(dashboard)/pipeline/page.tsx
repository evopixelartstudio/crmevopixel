'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Opportunity } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Kanban,
  Plus,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Flame,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

const STAGES = [
  { slug: 'novo_lead', name: 'Novo Lead' },
  { slug: 'qualificacao', name: 'Qualificação' },
  { slug: 'primeiro_contato', name: 'Primeiro Contato' },
  { slug: 'diagnostico', name: 'Diagnóstico' },
  { slug: 'proposta', name: 'Proposta' },
  { slug: 'negociacao', name: 'Negociação' },
  { slug: 'fechado', name: 'Fechado' },
  { slug: 'perdido', name: 'Perdido' },
];

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() =>
    crmService.getOpportunities()
  );
  const [isNewOppModalOpen, setIsNewOppModalOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newStage, setNewStage] = useState('novo_lead');

  const setStage = (oppId: string, stageSlug: string) => {
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id === oppId) {
          const updated = { ...opp, stage_slug: stageSlug };
          crmService.updateOpportunityStage(oppId, stageSlug);
          return updated;
        }
        return opp;
      })
    );
  };

  const moveStage = (oppId: string, direction: 'prev' | 'next') => {
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp) return;
    const currentIndex = STAGES.findIndex((s) => s.slug === opp.stage_slug);
    const newIndex =
      direction === 'next'
        ? Math.min(STAGES.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
    setStage(oppId, STAGES[newIndex].slug);
  };

  const handleCreateOpp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newTitle.trim()) {
      alert('Preencha ao menos o Título e a Empresa.');
      return;
    }

    const created = crmService.addOpportunity({
      lead_id: `lead-${Date.now()}`,
      lead_name: newContact.trim() || 'Contato Principal',
      company_name: newCompany.trim(),
      stage_slug: newStage,
      title: newTitle.trim(),
      estimated_value: Number(newValue) || 3500,
      probability: newStage === 'fechado' ? 100 : newStage === 'proposta' ? 70 : 40,
      score: 85,
      temperature: 'quente',
      priority: 'alta',
      services: ['Site Institucional', 'Automação WhatsApp & Atendimento'],
      last_interaction: 'Criado agora',
    });

    setOpportunities([...crmService.getOpportunities()]);
    setNewTitle('');
    setNewCompany('');
    setNewContact('');
    setNewValue('');
    setIsNewOppModalOpen(false);
  };

  const totalPipelineValue = opportunities
    .filter((o) => o.stage_slug !== 'perdido' && o.stage_slug !== 'fechado')
    .reduce((acc, o) => acc + o.estimated_value, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Kanban className="w-3.5 h-3.5" />
            Funil Comercial Operacional
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Pipeline de Vendas
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            8 etapas estratégicas com suporte a drag-and-drop e movimentação assistida conectada ao n8n.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] flex items-center gap-2 text-xs">
            <span className="text-[#9BA6A0]">Valor Ativo:</span>
            <span className="font-semibold text-[#F1F9A1] font-mono">
              R$ {totalPipelineValue.toLocaleString('pt-BR')}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsNewOppModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Nova Oportunidade</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board com Drag & Drop */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
        {STAGES.map((stage, stageIndex) => {
          const stageOpps = opportunities.filter((o) => o.stage_slug === stage.slug);
          const stageTotal = stageOpps.reduce((acc, o) => acc + o.estimated_value, 0);

          return (
            <div
              key={stage.slug}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const oppId = e.dataTransfer.getData('text/plain');
                if (oppId) setStage(oppId, stage.slug);
              }}
              className="w-72 shrink-0 flex flex-col rounded-2xl bg-[#0C1A19]/70 border border-[rgba(218,241,222,0.07)] hover:border-[rgba(218,241,222,0.18)] transition-all overflow-hidden"
            >
              {/* Header da Coluna */}
              <div className="p-3.5 border-b border-[rgba(218,241,222,0.06)] bg-[#07100F]/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#E7ECE8] font-heading">
                    {stage.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#10201E] text-[#9BA6A0]">
                    {stageOpps.length}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#8EB69B]">
                  R$ {stageTotal.toLocaleString('pt-BR')}
                </span>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[68vh] min-h-[140px]">
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', opp.id);
                    }}
                    className="p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.22)] cursor-grab active:cursor-grabbing transition-all group shadow-sm flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-[#E7ECE8] font-heading leading-snug">
                          {opp.company_name}
                        </span>
                        <Badge temperature={opp.temperature} className="text-[9px] py-0 px-1">
                          {opp.score}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-[#9BA6A0] leading-snug truncate">
                        {opp.title}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(218,241,222,0.04)]">
                        <span className="text-xs font-semibold font-mono text-[#F1F9A1]">
                          R$ {opp.estimated_value.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-[#65706A]">
                          {opp.probability}% prob.
                        </span>
                      </div>
                    </div>

                    {opp.services && opp.services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {opp.services.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-[#07100F] text-[#9BA6A0] border border-[rgba(218,241,222,0.04)] truncate max-w-[130px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {opp.n8n_automated && (
                      <div className="flex items-center gap-1 text-[10px] text-[#8EB69B] font-mono">
                        <Zap className="w-3 h-3 text-[#8EB69B]" />
                        <span>Automação n8n ativa</span>
                      </div>
                    )}

                    {/* Controles de Transição de Etapa */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        onClick={() => moveStage(opp.id, 'prev')}
                        disabled={stageIndex === 0}
                        className="p-1 rounded text-[#65706A] hover:text-[#E7ECE8] disabled:opacity-20 hover:bg-[#07100F] transition-all"
                        title="Etapa anterior"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        href={`/leads/${opp.lead_id}`}
                        className="text-[10px] text-[#8EB69B] hover:text-[#F1F9A1] transition-colors"
                      >
                        Abrir lead
                      </Link>

                      <button
                        onClick={() => moveStage(opp.id, 'next')}
                        disabled={stageIndex === STAGES.length - 1}
                        className="p-1 rounded text-[#65706A] hover:text-[#E7ECE8] disabled:opacity-20 hover:bg-[#07100F] transition-all"
                        title="Próxima etapa"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {stageOpps.length === 0 && (
                  <div className="h-24 flex items-center justify-center text-[11px] text-[#65706A] border border-dashed border-[rgba(218,241,222,0.04)] rounded-xl">
                    Arraste cards para cá
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nova Oportunidade */}
      <Modal
        isOpen={isNewOppModalOpen}
        onClose={() => setIsNewOppModalOpen(false)}
        title="Criar Nova Oportunidade"
        subtitle="Adicione uma oportunidade com valor estimado e atribua a um estágio do funil."
      >
        <form onSubmit={handleCreateOpp} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Título da Oportunidade *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Site Institucional + Bot WhatsApp"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Nome da Empresa *</label>
              <input
                type="text"
                required
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Ex: Clínica Alpha"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Contato</label>
              <input
                type="text"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="Ex: Dra. Mariana"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Valor Estimado (R$)</label>
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Ex: 4800"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Estágio Inicial</label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                {STAGES.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsNewOppModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Criar Oportunidade
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
