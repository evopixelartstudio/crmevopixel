'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  UserX,
  RotateCcw,
  Archive,
  TrendingDown,
  Clock,
  Filter,
  X,
  CheckCircle2,
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
  loss_reason?: string | null;
  loss_notes?: string | null;
  closed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  leads?: Partial<Lead> | Partial<Lead>[] | null;
}

const LOST_STORAGE_KEY = 'evocrm_lost_metadata';

function getLostMetadataMap(): Record<
  string,
  { loss_reason?: string | null; loss_notes?: string | null; closed_at?: string | null }
> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getLostMetadata(id: string) {
  const map = getLostMetadataMap();
  return map[id] || null;
}

function saveLostMetadata(
  id: string,
  data: { loss_reason?: string | null; loss_notes?: string | null; closed_at?: string | null }
) {
  if (typeof window === 'undefined') return;
  try {
    const map = getLostMetadataMap();
    map[id] = { ...map[id], ...data };
    localStorage.setItem(LOST_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

function removeLostMetadata(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const map = getLostMetadataMap();
    delete map[id];
    localStorage.setItem(LOST_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Erro ao remover do localStorage:', e);
  }
}

// Lista oficial dos 6 motivos de perda especificados pelo usuário
const LOSS_REASONS = [
  'Preço / Fora do orçamento',
  'Fechou com concorrente',
  'Sem resposta / Sumiu (Ghosting)',
  'Adiou o projeto / Momento ruim',
  'Desqualificado / Sem fit de serviço',
  'Outro',
] as const;

function formatClosedDate(dateStr?: string | null) {
  if (!dateStr) return 'Data não informada';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Alternador de Visualização: Funil Ativo vs Oportunidades Perdidas
  const [showLostView, setShowLostView] = useState<boolean>(false);

  // Modo de exibição do funil ativo (Kanban vs Lista)
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [isOverDiscardZone, setIsOverDiscardZone] = useState<boolean>(false);

  // Filtros na listagem de Oportunidades Perdidas
  const [lostSearchTerm, setLostSearchTerm] = useState('');
  const [lostReasonFilter, setLostReasonFilter] = useState<string>('todos');

  // Modal: Nova Oportunidade
  const [isNewOppModalOpen, setIsNewOppModalOpen] = useState(false);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLeadId, setNewLeadId] = useState<string>('');
  const [newStageId, setNewStageId] = useState<string>('');
  const [newValue, setNewValue] = useState('');
  const [newProbability, setNewProbability] = useState('50');
  const [newStatus, setNewStatus] = useState<'aberto' | 'ganho' | 'perdido'>('aberto');

  // Modal: Edição e Exclusão
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingOppId, setDeletingOppId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editLeadId, setEditLeadId] = useState<string>('');
  const [editStageId, setEditStageId] = useState<string>('');
  const [editValue, setEditValue] = useState('');
  const [editProbability, setEditProbability] = useState('50');
  const [editStatus, setEditStatus] = useState('aberto');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editGoogleBusiness, setEditGoogleBusiness] = useState('');

  // Modal com Design Dark Minimalista (#0D1117): Marcar como Perdido
  const [lostModalOpp, setLostModalOpp] = useState<Opportunity | null>(null);
  const [selectedLossReason, setSelectedLossReason] = useState<string>('');
  const [lossNotes, setLossNotes] = useState<string>('');
  const [isSavingLoss, setIsSavingLoss] = useState<boolean>(false);

  // Identificação precisa de Oportunidades Abertas vs Perdidas
  const isOpenOpportunity = useCallback((opp: Opportunity) => {
    const st = (opp.status || 'aberto').toLowerCase();
    return st === 'aberto' || st === 'aberta' || (!['perdido', 'perdida', 'ganho', 'ganha'].includes(st));
  }, []);

  const isLostOpportunity = useCallback((opp: Opportunity) => {
    const st = (opp.status || '').toLowerCase();
    return st === 'perdido' || st === 'perdida';
  }, []);

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

      // Local metadata fallback para loss_reason, loss_notes e closed_at
      const localMeta = getLostMetadata(row.id);
      const lossReason = row.loss_reason || localMeta?.loss_reason || null;
      const lossNotesVal = row.loss_notes || localMeta?.loss_notes || null;
      const closedAt = row.closed_at || localMeta?.closed_at || null;

      return {
        id: row.id,
        lead_id: row.lead_id ?? (leadObj?.id || null),
        stage_id: row.stage_id,
        company_id: row.company_id ?? null,
        title: row.title || companyName,
        estimated_value: Number(row.estimated_value) || 0,
        probability: Number(row.probability) || 0,
        status: row.status || 'aberto',
        loss_reason: lossReason,
        loss_notes: lossNotesVal,
        closed_at: closedAt,
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

      const [stagesRes, leadsRes] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('id, name, slug, display_order, color')
          .order('display_order', { ascending: true }),
        supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (stagesRes.error) {
        throw new Error(`Erro ao buscar etapas (pipeline_stages): ${stagesRes.error.message}`);
      }

      // Busca oportunidades com suporte a loss_reason, loss_notes e closed_at
      let oppsRes = await supabase
        .from('opportunities')
        .select(
          'id, lead_id, stage_id, company_id, title, estimated_value, probability, status, loss_reason, loss_notes, closed_at, leads(*)'
        );

      if (oppsRes.error) {
        console.warn('Fallback ao consultar opportunities com menos colunas:', oppsRes.error.message);
        oppsRes = await supabase
          .from('opportunities')
          .select(
            'id, lead_id, stage_id, company_id, title, estimated_value, probability, status, leads(*)'
          );
      }

      if (oppsRes.error) {
        throw new Error(`Erro ao buscar oportunidades: ${oppsRes.error.message}`);
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

  // Listagens separadas: apenas 'aberto' nas colunas ativas do Kanban
  const activeOpportunities = useMemo(() => {
    return opportunities.filter(isOpenOpportunity);
  }, [opportunities, isOpenOpportunity]);

  const lostOpportunities = useMemo(() => {
    return opportunities.filter(isLostOpportunity);
  }, [opportunities, isLostOpportunity]);

  // Atualizar etapa (Drag & Drop ou Select)
  const handleStageChange = async (oppId: string, targetStageId: string) => {
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) return;

    const currentOpp = opportunities.find((o) => o.id === oppId);
    if (!currentOpp || currentOpp.stage_id === targetStageId) return;

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

  // Abrir Modal de Descarte / Marcar como Perdido
  const handleOpenLostModal = (opp: Opportunity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLostModalOpp(opp);
    setSelectedLossReason('');
    setLossNotes('');
  };

  // Confirmar Perda: salva status = 'perdido', loss_reason, loss_notes e closed_at
  const handleConfirmLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalOpp) return;
    if (!selectedLossReason) {
      alert('Selecione o motivo da perda.');
      return;
    }

    setIsSavingLoss(true);
    try {
      const closedAt = new Date().toISOString();
      const supabase = getSupabase();

      // Salva no banco de dados com atualização de status, motivo, notas e data de encerramento
      const { error } = await supabase
        .from('opportunities')
        .update({
          status: 'perdido',
          loss_reason: selectedLossReason,
          loss_notes: lossNotes.trim() || null,
          closed_at: closedAt,
        })
        .eq('id', lostModalOpp.id);

      if (error) {
        console.warn('Fallback ao atualizar oportunidade como perdida:', error.message);
        await supabase
          .from('opportunities')
          .update({ status: 'perdido' })
          .eq('id', lostModalOpp.id);
      }

      // Persistência local segura
      saveLostMetadata(lostModalOpp.id, {
        loss_reason: selectedLossReason,
        loss_notes: lossNotes.trim() || null,
        closed_at: closedAt,
      });

      // Remove imediatamente da listagem ativa das colunas do Kanban
      const updatedOpp: Opportunity = {
        ...lostModalOpp,
        status: 'perdido',
        loss_reason: selectedLossReason,
        loss_notes: lossNotes.trim() || null,
        closed_at: closedAt,
      };

      const nextOpps = opportunities.map((o) =>
        o.id === lostModalOpp.id ? updatedOpp : o
      );
      setOpportunities(nextOpps);
      crmService.setOpportunitiesFromSupabase(nextOpps);

      setLostModalOpp(null);
      setSelectedLossReason('');
      setLossNotes('');
    } catch (err: any) {
      console.error('Erro ao marcar oportunidade como perdida:', err);
      alert(`Erro ao registrar perda: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingLoss(false);
    }
  };

  // Reativar Lead de Volta para o Kanban
  const handleReactivateToKanban = async (opp: Opportunity) => {
    const defaultStageId = stages[0]?.id;
    if (!defaultStageId) {
      alert('Nenhuma etapa disponível no Kanban.');
      return;
    }

    try {
      const supabase = getSupabase();
      const firstStage = stages[0];

      const { error } = await supabase
        .from('opportunities')
        .update({
          status: 'aberto',
          stage_id: defaultStageId,
          loss_reason: null,
          loss_notes: null,
          closed_at: null,
        })
        .eq('id', opp.id);

      if (error) {
        console.warn('Fallback ao reativar oportunidade:', error.message);
        await supabase
          .from('opportunities')
          .update({
            status: 'aberto',
            stage_id: defaultStageId,
          })
          .eq('id', opp.id);
      }

      removeLostMetadata(opp.id);

      const updatedOpp: Opportunity = {
        ...opp,
        status: 'aberto',
        stage_id: defaultStageId,
        stage_slug: firstStage?.slug || '',
        loss_reason: null,
        loss_notes: null,
        closed_at: null,
      };

      const nextOpps = opportunities.map((o) => (o.id === opp.id ? updatedOpp : o));
      setOpportunities(nextOpps);
      crmService.setOpportunitiesFromSupabase(nextOpps);

      if (firstStage) {
        crmService.triggerStageSideEffects(updatedOpp, firstStage.slug);
      }
    } catch (err: any) {
      console.error('Erro ao reativar oportunidade:', err);
      alert(`Erro ao reativar oportunidade: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  // Criar Nova Oportunidade
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
        status: 'aberto',
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
      setNewStatus('aberto');
      setIsNewOppModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao inserir oportunidade no Supabase:', err);
      alert(`Erro ao salvar oportunidade: ${err?.message || 'Erro desconhecido'}`);
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
    setEditStatus(opp.status || 'aberto');
    setEditWhatsapp(leadData?.whatsapp || leadData?.phone || '');
    setEditInstagram(leadData?.instagram || '');
    setEditGoogleBusiness(leadData?.google_business || '');
  };

  // Salvar edição
  const handleSaveEditOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      alert('Preencha o título da oportunidade.');
      return;
    }
    if (!editingOpp) return;

    setIsSavingEdit(true);
    try {
      const supabase = getSupabase();
      const targetLeadId = editLeadId ? editLeadId : null;

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
        status: editStatus || 'aberto',
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

  // Excluir oportunidade
  const handleDeleteOpp = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const previousOpps = [...opportunities];
    const nextOpps = opportunities.filter((o) => o.id !== id);
    setOpportunities(nextOpps);
    crmService.setOpportunitiesFromSupabase(nextOpps);
    setDeletingOppId(null);
    removeLostMetadata(id);

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

  // Ações de contato rápido
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

  // Cálculos de valor
  const totalPipelineValue = useMemo(() => {
    return activeOpportunities.reduce(
      (acc, o) => acc + (Number(o.estimated_value) || 0),
      0
    );
  }, [activeOpportunities]);

  const totalLostValue = useMemo(() => {
    return lostOpportunities.reduce(
      (acc, o) => acc + (Number(o.estimated_value) || 0),
      0
    );
  }, [lostOpportunities]);

  // Lista filtrada para oportunidades perdidas
  const filteredLostOpps = useMemo(() => {
    return lostOpportunities.filter((opp) => {
      const matchesReason =
        lostReasonFilter === 'todos' ||
        (opp.loss_reason || '').toLowerCase().includes(lostReasonFilter.toLowerCase());

      const q = lostSearchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (opp.title || '').toLowerCase().includes(q) ||
        (opp.company_name || '').toLowerCase().includes(q) ||
        (opp.lead_name || '').toLowerCase().includes(q) ||
        (opp.loss_reason || '').toLowerCase().includes(q) ||
        (opp.loss_notes || '').toLowerCase().includes(q);

      return matchesReason && matchesSearch;
    });
  }, [lostOpportunities, lostReasonFilter, lostSearchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Kanban className="w-3.5 h-3.5" />
            Funil Comercial • Pipeline de Oportunidades
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Pipeline de Vendas
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Leads em negociação sincronizados diretamente com o Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchPipelineData}
            className="p-2 rounded-xl bg-[#0D1117] border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] transition-all"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#58A6FF]' : ''}`} />
          </button>

          {/* Botão em destaque no topo: "Ver Oportunidades Perdidas" */}
          <button
            type="button"
            onClick={() => setShowLostView(!showLostView)}
            className={`px-3.5 py-2 rounded-xl text-xs font-heading font-medium flex items-center gap-2 border transition-all ${
              showLostView
                ? 'bg-red-500/20 text-red-200 border-red-500/40 shadow-sm'
                : 'bg-[#0D1117] text-[#C9D1D9] border-[#30363D] hover:bg-[#161B22] hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4 text-red-400" />
            <span>Ver Oportunidades Perdidas</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#161B22] text-red-300 border border-red-500/20">
              {lostOpportunities.length}
            </span>
          </button>

          {!showLostView && (
            <>
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
            </>
          )}

          {showLostView && (
            <div className="px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs">
              <span className="text-red-300">Valor em Perda:</span>
              <span className="font-semibold text-red-200 font-mono">
                R$ {totalLostValue.toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mensagem de erro de conexão */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button variant="secondary" size="sm" onClick={fetchPipelineData}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Carregamento Inicial */}
      {loading && stages.length === 0 ? (
        <div className="p-14 rounded-2xl bg-[#0D1117] border border-[#30363D] text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#58A6FF] animate-spin mx-auto" />
          <p className="text-xs text-[#8B949E] font-mono">
            Carregando oportunidades do Supabase...
          </p>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 1. VISÃO DO FUNIL ATIVO (KANBAN COM FILTRO EXCLUSIVO STATUS = 'ABERTO')     */}
      {/* ========================================================================= */}
      {!showLostView && (
        <>
          {/* Zona de Descarte Visual para Arrastar Cards */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isOverDiscardZone) setIsOverDiscardZone(true);
            }}
            onDragLeave={() => setIsOverDiscardZone(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsOverDiscardZone(false);
              const oppId = e.dataTransfer.getData('text/plain');
              if (oppId) {
                const opp = opportunities.find((o) => o.id === oppId);
                if (opp) handleOpenLostModal(opp);
              }
            }}
            className={`w-full p-3.5 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isOverDiscardZone
                ? 'bg-red-500/20 border-red-500 scale-[1.01] shadow-lg shadow-red-500/10'
                : 'bg-[#0D1117]/60 border-[#30363D] hover:border-red-500/40 hover:bg-red-500/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl transition-all ${
                  isOverDiscardZone
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-red-300 font-heading">
                  Zona de Descarte / Oportunidade Perdida
                </div>
                <div className="text-[11px] text-[#8B949E] mt-0.5">
                  Arraste um card até aqui ou use o botão <strong>"Marcar como Perdido"</strong> no card para arquivar
                </div>
              </div>
            </div>

            <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#161B22] border border-[#30363D] text-red-300 self-end sm:self-center">
              Solte para Descartar
            </span>
          </div>

          {/* MODO KANBAN: Leads Perdidos Removidos da Listagem Ativa das Colunas */}
          {viewMode === 'kanban' && stages.length > 0 && (
            <div className="flex flex-col space-y-5 pb-6 pt-1">
              {stages.map((stage, stageIndex) => {
                // Filtra estritamente por status = 'aberto' (leads perdidos removidos)
                const stageOpps = activeOpportunities.filter(
                  (o) => o.stage_id === stage.id
                );
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

                    {/* Cards Lado a Lado no Kanban */}
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
                                className="w-[280px] sm:w-[295px] shrink-0 p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.22)] cursor-grab active:cursor-grabbing transition-all group shadow-sm flex flex-col justify-between space-y-2.5"
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

                                  {/* Lead vinculado */}
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

                                  {/* Canais Rápidos: WhatsApp, Instagram e Maps */}
                                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[rgba(218,241,222,0.04)]">
                                    <button
                                      type="button"
                                      onClick={(e) => handleOppWhatsApp(opp, e)}
                                      className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
                                        hasPhone
                                          ? 'bg-[#07100F]/70 hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                          : 'bg-[#07100F]/40 border-[rgba(218,241,222,0.05)] text-[#65706A]'
                                      }`}
                                      title="WhatsApp"
                                    >
                                      <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => handleOppInstagram(opp, e)}
                                      className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
                                        hasInstagram
                                          ? 'bg-[#07100F]/70 hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                          : 'bg-[#07100F]/40 border-[rgba(218,241,222,0.05)] text-[#65706A]'
                                      }`}
                                      title="Instagram"
                                    >
                                      <Instagram className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => handleOppMaps(opp, e)}
                                      className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
                                        hasMaps
                                          ? 'bg-[#07100F]/70 hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                                          : 'bg-[#07100F]/40 border-[rgba(218,241,222,0.05)] text-[#65706A]'
                                      }`}
                                      title="Google Maps"
                                    >
                                      <MapPin className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* BOTÃO EXPLÍCITO DENTRO DE CADA CARD DO KANBAN: "Marcar como Perdido" */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenLostModal(opp, e)}
                                    className="w-full mt-2.5 py-1.5 px-2 rounded-lg bg-[#0D1117] hover:bg-red-500/15 border border-[#30363D] hover:border-red-500/40 text-[11px] text-[#8B949E] hover:text-red-300 flex items-center justify-center gap-1.5 transition-all group/btn"
                                    title="Marcar oportunidade como perdida"
                                  >
                                    <UserX className="w-3.5 h-3.5 text-[#8B949E] group-hover/btn:text-red-400" />
                                    <span>Marcar como Perdido</span>
                                  </button>

                                  {/* Confirmação de exclusão */}
                                  {deletingOppId === opp.id && (
                                    <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-2">
                                      <span className="text-[10px] text-red-300 font-medium">
                                        Excluir permanentemente?
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
                                          className="px-2 py-0.5 rounded bg-[#07100F] text-[#9BA6A0] text-[10px]"
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
                          Nenhum card ativo nesta etapa.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. VISÃO DE OPORTUNIDADES PERDIDAS (TABELA / LISTA COM OPÇÃO DE REATIVAR)  */}
      {/* ========================================================================= */}
      {showLostView && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header da Seção de Oportunidades Perdidas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1117] p-4 rounded-2xl border border-[#30363D]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#E6EDF3] font-heading">
                  Arquivo de Oportunidades Perdidas
                </h2>
                <p className="text-xs text-[#8B949E]">
                  Visualize os motivos de perda registrados e reative o lead para o Kanban a qualquer momento.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLostView(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] transition-all"
              >
                Voltar ao Funil Ativo
              </button>
            </div>
          </div>

          {/* Filtros e Busca de Oportunidades Perdidas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1117] p-3.5 rounded-2xl border border-[#30363D]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#8B949E] flex items-center gap-1.5 font-medium">
                <Filter className="w-3.5 h-3.5 text-[#58A6FF]" />
                Filtrar por Motivo:
              </span>
              <select
                value={lostReasonFilter}
                onChange={(e) => setLostReasonFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-[#161B22] border border-[#30363D] text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF] cursor-pointer"
              >
                <option value="todos">Todos os Motivos</option>
                {LOSS_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar oportunidade, motivo ou nota..."
                value={lostSearchTerm}
                onChange={(e) => setLostSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#161B22] border border-[#30363D] text-[#E6EDF3] placeholder-[#484F58] focus:outline-none focus:border-[#58A6FF]"
              />
            </div>
          </div>

          {/* TABELA / LISTA DE OPORTUNIDADES PERDIDAS */}
          <div className="bg-[#0D1117] border border-[#30363D] rounded-2xl overflow-hidden shadow-sm">
            {filteredLostOpps.length === 0 ? (
              <div className="p-14 text-center space-y-2">
                <Archive className="w-8 h-8 text-[#484F58] mx-auto opacity-70" />
                <p className="text-xs text-[#E6EDF3] font-medium">
                  Nenhuma oportunidade perdida encontrada.
                </p>
                <p className="text-[11px] text-[#8B949E]">
                  {lostOpportunities.length === 0
                    ? 'Nenhum lead foi arquivado como perdido ainda.'
                    : 'Nenhum registro coincide com os termos de filtro informados.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#30363D] bg-[#161B22] text-[11px] font-mono text-[#8B949E] uppercase tracking-wider">
                      <th className="py-3.5 px-4">Lead / Oportunidade</th>
                      <th className="py-3.5 px-4">Motivo da Perda</th>
                      <th className="py-3.5 px-4">Anotações Detalhadas</th>
                      <th className="py-3.5 px-4">Data do Encerramento</th>
                      <th className="py-3.5 px-4">Valor Estimado</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363D]/60 text-[#C9D1D9]">
                    {filteredLostOpps.map((opp) => {
                      const leadData = opp.leads;

                      return (
                        <tr
                          key={opp.id}
                          className="hover:bg-[#161B22]/50 transition-colors group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#E6EDF3] font-heading text-sm">
                              {opp.title}
                            </div>
                            <div className="text-[11px] text-[#8B949E] mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-[#58A6FF]" />
                              <span>{leadData?.company_name || leadData?.name || opp.company_name}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-300">
                              <UserX className="w-3 h-3 shrink-0" />
                              <span>{opp.loss_reason || 'Não informado'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-xs text-[#8B949E] line-clamp-2">
                              {opp.loss_notes || <span className="italic text-[#484F58]">Sem anotações</span>}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#8B949E] font-mono">
                              <Clock className="w-3.5 h-3.5 text-[#58A6FF]" />
                              <span>{formatClosedDate(opp.closed_at)}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-[#F1F9A1]">
                            R$ {(Number(opp.estimated_value) || 0).toLocaleString('pt-BR')}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {/* OPÇÃO DE REATIVAR O LEAD DE VOLTA PARA O KANBAN */}
                            <button
                              type="button"
                              onClick={() => handleReactivateToKanban(opp)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] hover:border-[#58A6FF] text-[#E6EDF3] hover:text-[#58A6FF] text-xs font-medium transition-all shadow-sm"
                              title="Reativar oportunidade de volta para o Kanban ativo"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reativar para Kanban</span>
                            </button>
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

      {/* ========================================================================= */}
      {/* 3. MODAL COM DESIGN DARK MINIMALISTA (FUNDO #0D1117 / BORDAS SUTIS)       */}
      {/* ========================================================================= */}
      {lostModalOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0D1117] border border-[#30363D] rounded-2xl p-6 shadow-2xl space-y-5 text-[#C9D1D9]">
            {/* Cabeçalho do Modal Minimalista */}
            <div className="flex items-start justify-between gap-3 border-b border-[#30363D] pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase tracking-wider mb-1">
                  <UserX className="w-3.5 h-3.5" />
                  Marcar como Perdido
                </div>
                <h3 className="text-lg font-semibold text-[#E6EDF3] font-heading">
                  Encerrar Oportunidade
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSavingLoss) setLostModalOpp(null);
                }}
                className="p-1 rounded-lg text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informações da Oportunidade Selecionada */}
            <div className="p-3.5 rounded-xl bg-[#161B22] border border-[#30363D] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-mono text-[#8B949E] uppercase block">
                  Lead Selecionado
                </span>
                <span className="font-semibold text-[#E6EDF3] block mt-0.5">
                  {lostModalOpp.title}
                </span>
                <span className="text-[#8B949E] text-[11px]">
                  {lostModalOpp.company_name || lostModalOpp.lead_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[#8B949E] block">Valor</span>
                <span className="font-mono font-semibold text-[#F1F9A1]">
                  R$ {(Number(lostModalOpp.estimated_value) || 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Formulário com Dropdown/Select e Anotações Detalhadas */}
            <form onSubmit={handleConfirmLost} className="space-y-4 text-xs">
              {/* Dropdown / Select com os 6 motivos oficiais */}
              <div>
                <label className="block text-xs font-medium text-[#E6EDF3] mb-1.5">
                  Motivo da perda *
                </label>
                <select
                  required
                  value={selectedLossReason}
                  onChange={(e) => setSelectedLossReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161B22] border border-[#30363D] text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF] text-xs cursor-pointer"
                >
                  <option value="" disabled className="text-[#8B949E]">
                    Selecione o motivo da perda...
                  </option>
                  {LOSS_REASONS.map((reason) => (
                    <option key={reason} value={reason} className="bg-[#161B22] text-[#E6EDF3]">
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo de texto opcional para anotações detalhadas */}
              <div>
                <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                  Anotações detalhadas (opcional)
                </label>
                <textarea
                  rows={3}
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                  placeholder="Adicione observações ou detalhes sobre a perda para futuras análises ou repescagem..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161B22] border border-[#30363D] text-[#E6EDF3] placeholder-[#484F58] focus:outline-none focus:border-[#58A6FF] text-xs resize-none"
                />
              </div>

              {/* Botões "Cancelar" e "Confirmar Perda" */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setLostModalOpp(null)}
                  disabled={isSavingLoss}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedLossReason || isSavingLoss}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#DA3633] hover:bg-[#F85149] disabled:opacity-50 text-white transition-all shadow-sm flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>{isSavingLoss ? 'Confirmando...' : 'Confirmar Perda'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: + NOVA OPORTUNIDADE                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewOppModalOpen}
        onClose={() => setIsNewOppModalOpen(false)}
        title="Nova Oportunidade"
        subtitle="Salva diretamente em public.opportunities com status aberto."
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* ========================================================================= */}
      {/* MODAL: EDITAR OPORTUNIDADE                                                */}
      {/* ========================================================================= */}
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
                <option value="aberto">Aberto</option>
                <option value="ganho">Ganho</option>
                <option value="perdido">Perdido</option>
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
