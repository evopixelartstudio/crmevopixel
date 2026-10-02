'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { parseLeadFromSupabase, dbService } from '@/lib/supabase/db-service';
import { crmService } from '@/lib/services/crm-service';
import { Lead, Opportunity, PipelineStage, Temperature } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { openWhatsApp, cleanPhoneNumber } from '@/lib/utils/whatsapp';
import { openInstagramProfile, openGoogleMapsProfile } from '@/lib/utils/social-links';
import {
  Kanban,
  List,
  Plus,
  ArrowRight,
  ArrowLeft,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Building2,
  User,
  Instagram,
  MapPin,
} from 'lucide-react';

interface SupabaseOpportunityRow {
  id: string;
  lead_id: string | null;
  stage_id: string;
  company_id: string | null;
  title: string;
  estimated_value: number;
  probability: number;
  status: string;
  created_at?: string;
  updated_at?: string;
  leads?: Partial<Lead> | Partial<Lead>[] | null;
}

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Modal: Nova Oportunidade
  const [isNewOppModalOpen, setIsNewOppModalOpen] = useState(false);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLeadId, setNewLeadId] = useState<string>('');
  const [newStageId, setNewStageId] = useState<string>('');
  const [newValue, setNewValue] = useState('');
  const [newProbability, setNewProbability] = useState('50');
  const [newStatus, setNewStatus] = useState('aberta');

  // Modal: Edição e Exclusão
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingOppId, setDeletingOppId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editLeadId, setEditLeadId] = useState<string>('');
  const [editStageId, setEditStageId] = useState<string>('');
  const [editValue, setEditValue] = useState('');
  const [editProbability, setEditProbability] = useState('50');
  const [editStatus, setEditStatus] = useState('aberta');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editGoogleBusiness, setEditGoogleBusiness] = useState('');

  const mapRowToOpportunity = useCallback(
    (
      row: SupabaseOpportunityRow,
      stageMap: Map<string, PipelineStage>,
      allLeads: Lead[] = []
    ): Opportunity => {
      const rawLeadObj = Array.isArray(row.leads) ? row.leads[0] : row.leads;
      let leadObj: Partial<Lead> | null = rawLeadObj
        ? parseLeadFromSupabase(rawLeadObj)
        : null;

      // Fallback para encontrar o lead pelo título/nome caso lead_id esteja NULL
      if (!leadObj && allLeads.length > 0 && row.title) {
        const normTitle = row.title
          .replace(/^oportunidade\s*-\s*/i, '')
          .trim()
          .toLowerCase();
        const matched = allLeads.find(
          (l) =>
            (l.company_name || '').trim().toLowerCase() === normTitle ||
            (l.name || '').trim().toLowerCase() === normTitle
        );
        if (matched) {
          leadObj = matched;
        }
      }

      const stage = stageMap.get(row.stage_id);

      const companyName =
        leadObj?.company_name ||
        leadObj?.name ||
        row.title ||
        'Sem empresa vinculada';
      const leadName = leadObj?.name || 'Sem contato vinculado';
      const temp: Temperature = (leadObj?.temperature as Temperature) || 'quente';
      const score = typeof leadObj?.score === 'number' ? leadObj.score : 80;
      const services = Array.isArray(leadObj?.services) ? leadObj.services : [];

      return {
        id: row.id,
        lead_id: row.lead_id ?? (leadObj?.id || null),
        stage_id: row.stage_id,
        company_id: row.company_id ?? null,
        title: row.title || companyName,
        estimated_value: Number(row.estimated_value) || 0,
        probability: Number(row.probability) || 0,
        status: row.status || 'aberta',
        stage_slug: stage?.slug || '',
        lead_name: leadName,
        company_name: companyName,
        score,
        temperature: temp,
        priority: 'alta',
        services,
        created_at: row.created_at,
        updated_at: row.updated_at,
        leads: leadObj || null,
      };
    },
    []
  );

  const fetchPipelineData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('evocrm_opps');
      }

      const supabase = getSupabase();

      const [stagesRes, oppsRes, leadsRes] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('id, name, slug, display_order, color')
          .order('display_order', { ascending: true }),
        supabase
          .from('opportunities')
          .select(
            'id, lead_id, stage_id, company_id, title, estimated_value, probability, status, leads(*)'
          ),
        supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (stagesRes.error) {
        throw new Error(`Erro ao buscar etapas (pipeline_stages): ${stagesRes.error.message}`);
      }
      if (oppsRes.error) {
        throw new Error(`Erro ao buscar oportunidades (opportunities): ${oppsRes.error.message}`);
      }

      const loadedStages = (stagesRes.data || []) as PipelineStage[];
      setStages(loadedStages);
      setNewStageId((prev) => prev || (loadedStages[0]?.id ?? ''));

      const parsedLeads: Lead[] =
        !leadsRes.error && leadsRes.data
          ? leadsRes.data.map((r: any) => parseLeadFromSupabase(r))
          : [];
      setLeadsList(parsedLeads);

      const stageMap = new Map<string, PipelineStage>(
        loadedStages.map((s) => [s.id, s])
      );

      const loadedOpps = ((oppsRes.data || []) as SupabaseOpportunityRow[]).map((row) =>
        mapRowToOpportunity(row, stageMap, parsedLeads)
      );

      setOpportunities(loadedOpps);
      crmService.setOpportunitiesFromSupabase(loadedOpps);
    } catch (err: any) {
      console.error('Erro ao carregar Pipeline do Supabase:', err);
      setErrorMsg(err?.message || 'Erro ao conectar com o Supabase.');
    } finally {
      setLoading(false);
    }
  }, [mapRowToOpportunity]);

  useEffect(() => {
    fetchPipelineData();

    const supabase = getSupabase();
    const channel = supabase
      .channel('pipeline-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        () => {
          fetchPipelineData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_stages' },
        () => {
          fetchPipelineData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPipelineData]);

  // Atualizar etapa (Drag & Drop ou Select) executando UPDATE apenas no stage_id em public.opportunities
  const handleStageChange = async (oppId: string, targetStageId: string) => {
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) return;

    const currentOpp = opportunities.find((o) => o.id === oppId);
    if (!currentOpp || currentOpp.stage_id === targetStageId) return;

    // Atualização otimista na UI
    const previousOpps = [...opportunities];
    const updatedOpp: Opportunity = {
      ...currentOpp,
      stage_id: targetStage.id,
      stage_slug: targetStage.slug,
    };

    const nextOpps = opportunities.map((o) => (o.id === oppId ? updatedOpp : o));
    setOpportunities(nextOpps);
    crmService.setOpportunitiesFromSupabase(nextOpps);

    const supabase = getSupabase();
    const { error } = await supabase
      .from('opportunities')
      .update({ stage_id: targetStage.id })
      .eq('id', oppId);

    if (error) {
      console.error('Erro ao atualizar stage_id em public.opportunities:', error);
      alert(`Não foi possível mover o card: ${error.message}`);
      setOpportunities(previousOpps);
      crmService.setOpportunitiesFromSupabase(previousOpps);
      return;
    }

    crmService.triggerStageSideEffects(updatedOpp, targetStage.slug);
  };

  const moveStageDirection = (opp: Opportunity, direction: 'prev' | 'next') => {
    const currentIndex = stages.findIndex((s) => s.id === opp.stage_id);
    if (currentIndex === -1) return;
    const newIndex =
      direction === 'next'
        ? Math.min(stages.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
    const targetStage = stages[newIndex];
    if (targetStage && targetStage.id !== opp.stage_id) {
      handleStageChange(opp.id, targetStage.id);
    }
  };

  // Criar Nova Oportunidade diretamente com INSERT em public.opportunities
  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Preencha o título da oportunidade.');
      return;
    }

    const stageIdToUse = newStageId || stages[0]?.id;
    if (!stageIdToUse) {
      alert('Nenhuma etapa encontrada em public.pipeline_stages.');
      return;
    }

    setIsSavingNew(true);
    try {
      const supabase = getSupabase();
      const payload = {
        lead_id: newLeadId ? newLeadId : null,
        stage_id: stageIdToUse,
        company_id: null,
        title: newTitle.trim(),
        estimated_value: Number(newValue) || 0,
        probability: Math.min(100, Math.max(0, Number(newProbability) || 0)),
        status: newStatus || 'aberta',
      };

      const { data, error } = await supabase
        .from('opportunities')
        .insert([payload])
        .select(
          'id, lead_id, stage_id, company_id, title, estimated_value, probability, status, leads(*)'
        )
        .single();

      if (error) {
        throw error;
      }

      const stageMap = new Map<string, PipelineStage>(stages.map((s) => [s.id, s]));
      const createdOpp = mapRowToOpportunity(data as SupabaseOpportunityRow, stageMap, leadsList);

      const nextOpps = [createdOpp, ...opportunities];
      setOpportunities(nextOpps);
      crmService.setOpportunitiesFromSupabase(nextOpps);

      const chosenStage = stageMap.get(stageIdToUse);
      if (chosenStage) {
        crmService.triggerStageSideEffects(createdOpp, chosenStage.slug);
      }

      setNewTitle('');
      setNewLeadId('');
      setNewValue('');
      setNewProbability('50');
      setNewStatus('aberta');
      setIsNewOppModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao inserir oportunidade no Supabase:', err);
      alert(`Erro ao salvar oportunidade no Supabase: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingNew(false);
    }
  };

  // Abrir modal de edição
  const handleOpenEditModal = (opp: Opportunity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const leadData = opp.leads;
    setEditingOpp(opp);
    setEditTitle(opp.title || '');
    setEditLeadId(opp.lead_id || '');
    setEditStageId(opp.stage_id || stages[0]?.id || '');
    setEditValue(String(opp.estimated_value ?? 0));
    setEditProbability(String(opp.probability ?? 50));
    setEditStatus(opp.status || 'aberta');
    setEditWhatsapp(leadData?.whatsapp || leadData?.phone || '');
    setEditInstagram(leadData?.instagram || '');
    setEditGoogleBusiness(leadData?.google_business || '');
  };

  // Salvar edição diretamente em public.opportunities (e atualizar canais do lead se houver)
  const handleSaveEditOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpp) return;
    if (!editTitle.trim()) {
      alert('Preencha o título da oportunidade.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const supabase = getSupabase();
      const targetLeadId = editLeadId ? editLeadId : null;

      // Se houver lead vinculado, atualizar também WhatsApp / Instagram / Google Meu Negócio
      if (targetLeadId) {
        await dbService.updateLead(targetLeadId, {
          whatsapp: editWhatsapp.trim() || undefined,
          phone: editWhatsapp.trim() || undefined,
          instagram: editInstagram.trim() || undefined,
          google_business: editGoogleBusiness.trim() || undefined,
        });
      }

      const payload = {
        title: editTitle.trim(),
        lead_id: targetLeadId,
        stage_id: editStageId || editingOpp.stage_id,
        estimated_value: Number(editValue) || 0,
        probability: Math.min(100, Math.max(0, Number(editProbability) || 0)),
        status: editStatus || 'aberta',
      };

      const { data, error } = await supabase
        .from('opportunities')
        .update(payload)
        .eq('id', editingOpp.id)
        .select(
          'id, lead_id, stage_id, company_id, title, estimated_value, probability, status, leads(*)'
        )
        .single();

      if (error) {
        throw error;
      }

      const stageMap = new Map<string, PipelineStage>(stages.map((s) => [s.id, s]));
      const updatedOpp = mapRowToOpportunity(data as SupabaseOpportunityRow, stageMap, leadsList);

      const nextOpps = opportunities.map((o) => (o.id === editingOpp.id ? updatedOpp : o));
      setOpportunities(nextOpps);
      crmService.setOpportunitiesFromSupabase(nextOpps);

      if (editingOpp.stage_id !== updatedOpp.stage_id) {
        const chosenStage = stageMap.get(updatedOpp.stage_id || '');
        if (chosenStage) {
          crmService.triggerStageSideEffects(updatedOpp, chosenStage.slug);
        }
      }

      setEditingOpp(null);
    } catch (err: any) {
      console.error('Erro ao atualizar oportunidade no Supabase:', err);
      alert(`Erro ao atualizar oportunidade: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Excluir oportunidade diretamente de public.opportunities
  const handleDeleteOpp = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const previousOpps = [...opportunities];
    const nextOpps = opportunities.filter((o) => o.id !== id);
    setOpportunities(nextOpps);
    crmService.setOpportunitiesFromSupabase(nextOpps);
    setDeletingOppId(null);

    const supabase = getSupabase();
    const { error } = await supabase.from('opportunities').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir oportunidade:', error);
      alert(`Erro ao excluir oportunidade: ${error.message}`);
      setOpportunities(previousOpps);
      crmService.setOpportunitiesFromSupabase(previousOpps);
      return;
    }

    if (editingOpp?.id === id) {
      setEditingOpp(null);
    }
  };

  // Ações rápidas nos cards: WhatsApp, Instagram e Maps
  const handleOppWhatsApp = (opp: Opportunity, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = opp.leads?.whatsapp || opp.leads?.phone;
    if (!phone || !cleanPhoneNumber(phone)) {
      if (
        confirm(
          `A oportunidade "${opp.title}" ainda não possui WhatsApp cadastrado. Deseja cadastrar agora?`
        )
      ) {
        handleOpenEditModal(opp);
      }
      return;
    }
    openWhatsApp(phone);
  };

  const handleOppInstagram = (opp: Opportunity, e: React.MouseEvent) => {
    e.stopPropagation();
    openInstagramProfile(opp.leads?.instagram, opp.company_name || opp.title, () => {
      if (
        confirm(
          `A oportunidade "${opp.title}" ainda não possui Instagram cadastrado. Deseja cadastrar agora?`
        )
      ) {
        handleOpenEditModal(opp);
      }
    });
  };

  const handleOppMaps = (opp: Opportunity, e: React.MouseEvent) => {
    e.stopPropagation();
    openGoogleMapsProfile(
      opp.leads?.google_business,
      opp.leads?.company_name || opp.company_name || opp.title,
      opp.leads?.city
    );
  };

  const totalPipelineValue = opportunities
    .filter((o) => {
      const slug = (o.stage_slug || '').toLowerCase();
      return !slug.includes('perdido') && !slug.includes('fechado');
    })
    .reduce((acc, o) => acc + (o.estimated_value || 0), 0);

  const filteredListOpps = opportunities.filter((opp) => {
    const matchesStage =
      selectedStageFilter === 'todos' || opp.stage_id === selectedStageFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (opp.title || '').toLowerCase().includes(q) ||
      (opp.company_name || '').toLowerCase().includes(q) ||
      (opp.lead_name || '').toLowerCase().includes(q);
    return matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Kanban className="w-3.5 h-3.5" />
            Funil Comercial • Dados em Tempo Real (Supabase)
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Pipeline de Vendas
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Sincronizado diretamente com <code className="text-[#8EB69B]">public.pipeline_stages</code> e{' '}
            <code className="text-[#8EB69B]">public.opportunities</code> no Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchPipelineData}
            className="p-2 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#9BA6A0] hover:text-[#E7ECE8] transition-all"
            title="Recarregar dados do Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#8EB69B]' : ''}`} />
          </button>

          {/* Alternador Kanban / Lista */}
          <div className="inline-flex p-1 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-[#10201E] text-[#F1F9A1] font-medium border border-[rgba(241,249,161,0.2)]'
                  : 'text-[#9BA6A0] hover:text-[#E7ECE8]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'lista'
                  ? 'bg-[#10201E] text-[#F1F9A1] font-medium border border-[rgba(241,249,161,0.2)]'
                  : 'text-[#9BA6A0] hover:text-[#E7ECE8]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

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
            onClick={() => {
              if (!newStageId && stages.length > 0) {
                setNewStageId(stages[0].id);
              }
              setIsNewOppModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>+ Nova Oportunidade</span>
          </Button>
        </div>
      </div>

      {/* Mensagem de erro se houver falha de conexão */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button variant="secondary" size="sm" onClick={fetchPipelineData}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Estado de Carregamento Inicial */}
      {loading && stages.length === 0 ? (
        <div className="p-14 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#8EB69B] animate-spin mx-auto" />
          <p className="text-xs text-[#9BA6A0] font-mono">
            Carregando etapas e oportunidades diretamente do Supabase...
          </p>
        </div>
      ) : null}

      {/* MODO KANBAN EM LISTA VERTICAL DE ETAPAS (Caixas uma em cima da outra, com cards lado a lado) */}
      {viewMode === 'kanban' && stages.length > 0 && (
        <div className="flex flex-col space-y-5 pb-6 pt-1">
          {stages.map((stage, stageIndex) => {
            const stageOpps = opportunities.filter((o) => o.stage_id === stage.id);
            const stageTotal = stageOpps.reduce(
              (acc, o) => acc + (Number(o.estimated_value) || 0),
              0
            );
            const isDragTarget = dragOverStageId === stage.id;

            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverStageId !== stage.id) {
                    setDragOverStageId(stage.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverStageId === stage.id) {
                    setDragOverStageId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStageId(null);
                  const oppId = e.dataTransfer.getData('text/plain');
                  if (oppId) {
                    handleStageChange(oppId, stage.id);
                  }
                }}
                className={`w-full flex flex-col rounded-2xl bg-[#0C1A19]/80 border transition-all overflow-hidden ${
                  isDragTarget
                    ? 'border-[#F1F9A1] bg-[#10201E]/60'
                    : 'border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)]'
                }`}
              >
                {/* Header da Etapa */}
                <div
                  className="px-4 py-3 border-b border-[rgba(218,241,222,0.06)] bg-[#07100F]/60 flex items-center justify-between"
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: stage.color || '#8EB69B',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color || '#8EB69B' }}
                    />
                    <span className="text-xs font-semibold text-[#E7ECE8] font-heading">
                      {stage.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10201E] text-[#9BA6A0]">
                      {stageOpps.length}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#8EB69B]">
                    R$ {stageTotal.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Lista Horizontal de Cards Lado a Lado com Barra de Rolagem Lateral */}
                <div className="p-4">
                  {stageOpps.length > 0 ? (
                    <div className="flex items-stretch gap-3.5 overflow-x-auto pb-2">
                      {stageOpps.map((opp) => {
                        const leadData = opp.leads;
                        const hasLead = Boolean(leadData);
                        const hasPhone = Boolean(leadData?.whatsapp || leadData?.phone);
                        const hasInstagram = Boolean(leadData?.instagram);
                        const hasMaps = Boolean(leadData?.google_business);

                        return (
                          <div
                            key={opp.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', opp.id);
                            }}
                            className="w-[270px] sm:w-[285px] shrink-0 p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.22)] cursor-grab active:cursor-grabbing transition-all group shadow-sm flex flex-col justify-between space-y-2.5"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-1">
                                <span className="text-xs font-semibold text-[#E7ECE8] font-heading leading-snug">
                                  {opp.title}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditModal(opp, e)}
                                    className="p-1 rounded hover:bg-[#07100F] text-[#9BA6A0] hover:text-[#F1F9A1] transition-colors"
                                    title="Editar oportunidade"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingOppId(deletingOppId === opp.id ? null : opp.id);
                                    }}
                                    className="p-1 rounded hover:bg-[#07100F] text-[#9BA6A0] hover:text-red-400 transition-colors"
                                    title="Excluir oportunidade"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Dados vinculados do Lead (LEFT JOIN seguro mesmo com company_id/lead_id NULL) */}
                              <div className="space-y-0.5 mt-1">
                                {hasLead ? (
                                  <>
                                    <div className="flex items-center gap-1 text-[11px] text-[#8EB69B]">
                                      <Building2 className="w-3 h-3 shrink-0" />
                                      <span className="truncate">
                                        {leadData?.company_name || leadData?.name}
                                      </span>
                                    </div>
                                    {leadData?.name && (
                                      <div className="flex items-center gap-1 text-[10px] text-[#9BA6A0]">
                                        <User className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{leadData.name}</span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-[10px] text-[#65706A] italic">
                                    Sem lead vinculado
                                  </div>
                                )}
                              </div>

                              {/* 3 Botões Rápidos no Card com Coloração Discreta: WhatsApp, Instagram e Google Maps */}
                              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[rgba(218,241,222,0.04)]">
                                {/* Botão WhatsApp */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOppWhatsApp(opp, e)}
                                  className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
                                    hasPhone
                                      ? 'bg-[#07100F]/70 hover:bg-[#163832] border-[rgba(218,241,222,0.1)] hover:border-[rgba(218,241,222,0.22)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                      : 'bg-[#07100F]/40 hover:bg-[#07100F]/80 border-[rgba(218,241,222,0.05)] text-[#65706A] hover:text-[#9BA6A0]'
                                  }`}
                                  title={
                                    hasPhone
                                      ? `Chamar no WhatsApp (${leadData?.whatsapp || leadData?.phone})`
                                      : 'Cadastrar ou chamar no WhatsApp'
                                  }
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                                </button>

                                {/* Botão Instagram */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOppInstagram(opp, e)}
                                  className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
                                    hasInstagram
                                      ? 'bg-[#07100F]/70 hover:bg-[#163832] border-[rgba(218,241,222,0.1)] hover:border-[rgba(218,241,222,0.22)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                      : 'bg-[#07100F]/40 hover:bg-[#07100F]/80 border-[rgba(218,241,222,0.05)] text-[#65706A] hover:text-[#9BA6A0]'
                                  }`}
                                  title={
                                    hasInstagram
                                      ? `Abrir Instagram (${leadData?.instagram})`
                                      : 'Cadastrar ou abrir Instagram'
                                  }
                                >
                                  <Instagram className="w-3.5 h-3.5" />
                                </button>

                                {/* Botão Google Maps / Google Meu Negócio */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOppMaps(opp, e)}
                                  className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
                                    hasMaps
                                      ? 'bg-[#07100F]/70 hover:bg-[#163832] border-[rgba(218,241,222,0.1)] hover:border-[rgba(218,241,222,0.22)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                      : 'bg-[#07100F]/40 hover:bg-[#07100F]/80 border-[rgba(218,241,222,0.05)] text-[#65706A] hover:text-[#9BA6A0]'
                                  }`}
                                  title={
                                    hasMaps
                                      ? `Abrir Google Meu Negócio / Maps (${leadData?.google_business})`
                                      : `Buscar ${opp.title} no Google Maps`
                                  }
                                >
                                  <MapPin className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Confirmação rápida de exclusão */}
                              {deletingOppId === opp.id && (
                                <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-red-300 font-medium">
                                    Excluir do Supabase?
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteOpp(opp.id, e)}
                                      className="px-2 py-0.5 rounded bg-red-500 text-[#07100F] text-[10px] font-semibold hover:bg-red-400"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingOppId(null);
                                      }}
                                      className="px-2 py-0.5 rounded bg-[#07100F] text-[#9BA6A0] text-[10px] hover:text-[#E7ECE8]"
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-[rgba(218,241,222,0.05)] flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-[#65706A] block">Valor Estimado</span>
                                <span className="text-xs font-semibold text-[#F1F9A1] font-mono">
                                  R$ {(Number(opp.estimated_value) || 0).toLocaleString('pt-BR')}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-[#9BA6A0] mr-1">
                                  {opp.probability ?? 0}%
                                </span>
                                {stageIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => moveStageDirection(opp, 'prev')}
                                    className="p-1 rounded hover:bg-[#07100F] text-[#9BA6A0] hover:text-[#E7ECE8]"
                                    title="Etapa anterior"
                                  >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {stageIndex < stages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => moveStageDirection(opp, 'next')}
                                    className="p-1 rounded hover:bg-[#07100F] text-[#9BA6A0] hover:text-[#F1F9A1]"
                                    title="Próxima etapa"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-20 rounded-xl border border-dashed border-[rgba(218,241,222,0.06)] flex items-center justify-center text-[11px] text-[#65706A] text-center px-3">
                      Arraste um card para {stage.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODO LISTA (Usa exatamente os mesmos dados reais do Supabase) */}
      {viewMode === 'lista' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedStageFilter('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-all flex items-center gap-1.5 border ${
                  selectedStageFilter === 'todos'
                    ? 'bg-[#10201E] text-[#F1F9A1] border-[rgba(241,249,161,0.25)] font-medium'
                    : 'bg-[#0C1A19] text-[#9BA6A0] border-[rgba(218,241,222,0.06)] hover:text-[#E7ECE8]'
                }`}
              >
                <span>Todas</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#07100F] text-[#8EB69B]">
                  {opportunities.length}
                </span>
              </button>

              {stages.map((stage) => {
                const count = opportunities.filter((o) => o.stage_id === stage.id).length;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStageFilter(stage.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-all flex items-center gap-1.5 border ${
                      selectedStageFilter === stage.id
                        ? 'bg-[#10201E] text-[#F1F9A1] border-[rgba(241,249,161,0.25)] font-medium'
                        : 'bg-[#0C1A19] text-[#9BA6A0] border-[rgba(218,241,222,0.06)] hover:text-[#E7ECE8]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color || '#8EB69B' }}
                    />
                    <span>{stage.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#07100F] text-[#9BA6A0]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-64">
              <Search className="w-3.5 h-3.5 text-[#8EB69B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar oportunidade ou lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
              />
            </div>
          </div>

          <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] rounded-2xl overflow-hidden shadow-sm">
            {filteredListOpps.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#9BA6A0]">
                Nenhuma oportunidade encontrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[rgba(218,241,222,0.06)] bg-[#07100F] text-[11px] font-mono text-[#65706A] uppercase tracking-wider">
                      <th className="py-3.5 px-4">Título da Oportunidade</th>
                      <th className="py-3.5 px-4">Lead Vinculado</th>
                      <th className="py-3.5 px-4">Etapa (stage_id)</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Valor Estimado</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(218,241,222,0.05)]">
                    {filteredListOpps.map((opp) => {
                      const leadData = opp.leads;
                      const hasPhone = Boolean(leadData?.whatsapp || leadData?.phone);
                      const hasInstagram = Boolean(leadData?.instagram);
                      const hasMaps = Boolean(leadData?.google_business);

                      return (
                        <tr
                          key={opp.id}
                          className="hover:bg-[#10201E]/50 transition-colors group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#E7ECE8] font-heading text-sm">
                              {opp.title}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {leadData ? (
                              <div>
                                <div className="text-[#E7ECE8] font-medium">
                                  {leadData.company_name || leadData.name}
                                </div>
                                <div className="text-[11px] text-[#9BA6A0]">
                                  {leadData.name}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[#65706A] italic">Sem lead vinculado</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={opp.stage_id || ''}
                              onChange={(e) => handleStageChange(opp.id, e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.12)] focus:outline-none cursor-pointer"
                            >
                              {stages.map((st) => (
                                <option
                                  key={st.id}
                                  value={st.id}
                                  className="bg-[#0C1A19] text-[#E7ECE8]"
                                >
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#10201E] text-[#8EB69B] border border-[rgba(218,241,222,0.08)]">
                              {opp.status || 'aberta'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-sm font-semibold font-mono text-[#F1F9A1]">
                              R$ {(Number(opp.estimated_value) || 0).toLocaleString('pt-BR')}
                            </div>
                            <div className="text-[10px] font-mono text-[#65706A]">
                              {opp.probability ?? 0}% probabilidade
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão WhatsApp */}
                              <button
                                type="button"
                                onClick={(e) => handleOppWhatsApp(opp, e)}
                                className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                                  hasPhone
                                    ? 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                    : 'bg-[#10201E]/60 hover:bg-[#10201E] border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-[#9BA6A0]'
                                }`}
                                title={
                                  hasPhone
                                    ? `Chamar no WhatsApp (${leadData?.whatsapp || leadData?.phone})`
                                    : 'Cadastrar ou chamar no WhatsApp'
                                }
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                              </button>

                              {/* Botão Instagram */}
                              <button
                                type="button"
                                onClick={(e) => handleOppInstagram(opp, e)}
                                className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                                  hasInstagram
                                    ? 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                    : 'bg-[#10201E]/60 hover:bg-[#10201E] border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-[#9BA6A0]'
                                }`}
                                title={
                                  hasInstagram
                                    ? `Abrir Instagram (${leadData?.instagram})`
                                    : 'Cadastrar ou abrir Instagram'
                                }
                              >
                                <Instagram className="w-3.5 h-3.5" />
                              </button>

                              {/* Botão Google Maps / Google Meu Negócio */}
                              <button
                                type="button"
                                onClick={(e) => handleOppMaps(opp, e)}
                                className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                                  hasMaps
                                    ? 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                    : 'bg-[#10201E]/60 hover:bg-[#10201E] border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-[#9BA6A0]'
                                }`}
                                title={
                                  hasMaps
                                    ? `Abrir Google Meu Negócio / Maps (${leadData?.google_business})`
                                    : `Buscar ${opp.title} no Google Maps`
                                }
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleOpenEditModal(opp, e)}
                                className="p-1.5 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#F1F9A1] transition-all"
                                title="Editar oportunidade"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {deletingOppId === opp.id ? (
                                <div className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 rounded-xl px-2 py-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteOpp(opp.id, e)}
                                    className="text-[11px] font-semibold text-red-400 hover:text-red-300 px-1"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingOppId(null);
                                    }}
                                    className="text-[11px] text-[#9BA6A0] hover:text-[#E7ECE8] px-1"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingOppId(opp.id);
                                  }}
                                  className="p-1.5 rounded-xl bg-[#10201E] hover:bg-red-500/20 border border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-red-400 transition-colors"
                                  title="Excluir oportunidade"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: + Nova Oportunidade (INSERT direto em public.opportunities) */}
      <Modal
        isOpen={isNewOppModalOpen}
        onClose={() => setIsNewOppModalOpen(false)}
        title="Nova Oportunidade"
        subtitle="Salva diretamente em public.opportunities no Supabase."
      >
        <form onSubmit={handleCreateOpp} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">
              Título da Oportunidade *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Website Institucional + Automação WhatsApp"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Lead Vinculado (Opcional)
              </label>
              <select
                value={newLeadId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setNewLeadId(selectedId);
                  if (selectedId && !newTitle.trim()) {
                    const found = leadsList.find((l) => l.id === selectedId);
                    if (found) {
                      setNewTitle(`Oportunidade - ${found.company_name || found.name}`);
                    }
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="">Sem lead vinculado (NULL)</option>
                {leadsList.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.company_name || lead.name} {lead.name ? `(${lead.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Etapa do Pipeline *
              </label>
              <select
                value={newStageId}
                onChange={(e) => setNewStageId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                placeholder="3500"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Probabilidade (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={newProbability}
                onChange={(e) => setNewProbability(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="aberta">Aberta</option>
                <option value="em_andamento">Em andamento</option>
                <option value="ganha">Ganha</option>
                <option value="perdida">Perdida</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsNewOppModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSavingNew}>
              {isSavingNew ? 'Salvando no Supabase...' : 'Criar Oportunidade'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Oportunidade */}
      <Modal
        isOpen={Boolean(editingOpp)}
        onClose={() => setEditingOpp(null)}
        title="Editar Oportunidade"
        subtitle="Atualiza diretamente o registro em public.opportunities."
      >
        <form onSubmit={handleSaveEditOpp} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">
              Título da Oportunidade *
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Lead Vinculado
              </label>
              <select
                value={editLeadId}
                onChange={(e) => {
                  const id = e.target.value;
                  setEditLeadId(id);
                  const found = leadsList.find((l) => l.id === id);
                  if (found) {
                    setEditWhatsapp(found.whatsapp || found.phone || '');
                    setEditInstagram(found.instagram || '');
                    setEditGoogleBusiness(found.google_business || '');
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="">Sem lead vinculado (NULL)</option>
                {leadsList.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.company_name || lead.name} {lead.name ? `(${lead.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Etapa do Pipeline
              </label>
              <select
                value={editStageId}
                onChange={(e) => setEditStageId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Probabilidade (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={editProbability}
                onChange={(e) => setEditProbability(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="aberta">Aberta</option>
                <option value="em_andamento">Em andamento</option>
                <option value="ganha">Ganha</option>
                <option value="perdida">Perdida</option>
              </select>
            </div>
          </div>

          {editLeadId && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[rgba(218,241,222,0.05)]">
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">
                  WhatsApp do Lead
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">
                  Instagram do Lead
                </label>
                <input
                  type="text"
                  placeholder="@perfil"
                  value={editInstagram}
                  onChange={(e) => setEditInstagram(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">
                  Google Meu Negócio / Maps
                </label>
                <input
                  type="text"
                  placeholder="Link ou nome no Maps"
                  value={editGoogleBusiness}
                  onChange={(e) => setEditGoogleBusiness(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[rgba(218,241,222,0.06)]">
            {editingOpp && (
              <button
                type="button"
                onClick={(e) => handleDeleteOpp(editingOpp.id, e)}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-xs flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Oportunidade</span>
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingOpp(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSavingEdit}>
                {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
