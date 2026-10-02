'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Project, HistoricalProject } from '@/types/database';
import {
  Briefcase,
  Plus,
  CheckCircle2,
  History,
  Globe,
  ExternalLink,
  Pencil,
  Trash2,
  Building2,
  FolderOpen,
  FileText,
  Key,
  Palette,
  Type,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

function extractHexColors(str?: string): string[] {
  if (!str) return [];
  const matches = str.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function maskCredentials(text?: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => {
      if (/password|senha|pass|secret|token/i.test(line) && line.includes(':')) {
        const idx = line.indexOf(':');
        return `${line.slice(0, idx + 1)} ••••••••••••`;
      }
      return line;
    })
    .join('\n');
}

function formatExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatDisplayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

export default function ProjetosPage() {
  useCrmSync();
  const projects = crmService.getProjects();
  const historicalProjects = crmService.getHistoricalProjects();
  const clients = crmService.getClients();

  const [activeTab, setActiveTab] = useState<'ativos' | 'historicos'>('ativos');

  // Modal Projeto Histórico (Criar / Editar)
  const [isNewHistoryModalOpen, setIsNewHistoryModalOpen] = useState(false);
  const [editHistoryId, setEditHistoryId] = useState<string | null>(null);
  const [hCompany, setHCompany] = useState('');
  const [hClient, setHClient] = useState('');
  const [hServices, setHServices] = useState('');
  const [hWebsite, setHWebsite] = useState('');
  const [hAmountContracted, setHAmountContracted] = useState('');
  const [hAmountReceived, setHAmountReceived] = useState('');
  const [hDate, setHDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal Projeto em Execução (Criar / Editar)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [pCompany, setPCompany] = useState('');
  const [pClient, setPClient] = useState('');
  const [pSegment, setPSegment] = useState('');
  const [pName, setPName] = useState('');
  const [pServices, setPServices] = useState('');
  const [pWebsite, setPWebsite] = useState('');
  const [pAmountContracted, setPAmountContracted] = useState('');
  const [pDeadline, setPDeadline] = useState('');
  const [pStatus, setPStatus] = useState<Project['status']>('em_desenvolvimento');

  // Campos de Dados Técnicos & Briefing no Modal
  const [pBriefingUrl, setPBriefingUrl] = useState('');
  const [pDriveFolderUrl, setPDriveFolderUrl] = useState('');
  const [pClientAccessNotes, setPClientAccessNotes] = useState('');
  const [pColorPalette, setPColorPalette] = useState('');
  const [pTypographyFonts, setPTypographyFonts] = useState('');

  // Gaveta Retrátil de Dados Técnicos nos Cards
  const [expandedTechnicalIds, setExpandedTechnicalIds] = useState<Record<string, boolean>>({});
  const [revealedAccessIds, setRevealedAccessIds] = useState<Record<string, boolean>>({});

  // Edição Rápida Inline dentro da Gaveta
  const [editingTechProjectId, setEditingTechProjectId] = useState<string | null>(null);
  const [techBriefingUrl, setTechBriefingUrl] = useState('');
  const [techDriveUrl, setTechDriveUrl] = useState('');
  const [techAccessNotes, setTechAccessNotes] = useState('');
  const [techColorPalette, setTechColorPalette] = useState('');
  const [techFonts, setTechFonts] = useState('');

  // Toast de feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const toggleTechnicalDrawer = (id: string) => {
    setExpandedTechnicalIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleRevealAccess = (id: string) => {
    setRevealedAccessIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const startEditingTech = (proj: Project) => {
    setEditingTechProjectId(proj.id);
    setTechBriefingUrl(proj.briefing_url || '');
    setTechDriveUrl(proj.drive_folder_url || '');
    setTechAccessNotes(proj.client_access_notes || '');
    setTechColorPalette(proj.color_palette || '');
    setTechFonts(proj.typography_fonts || '');
    setExpandedTechnicalIds((prev) => ({ ...prev, [proj.id]: true }));
  };

  const cancelEditingTech = () => {
    setEditingTechProjectId(null);
  };

  const handleSaveTechInline = (projId: string) => {
    crmService.updateProject(projId, {
      briefing_url: techBriefingUrl.trim() || undefined,
      drive_folder_url: techDriveUrl.trim() || undefined,
      client_access_notes: techAccessNotes.trim() || undefined,
      color_palette: techColorPalette.trim() || undefined,
      typography_fonts: techFonts.trim() || undefined,
    });
    setEditingTechProjectId(null);
    showToast('Dados técnicos atualizados com sucesso!');
  };

  const handleCopyText = async (text: string, label: string) => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(`${label} copiado para a área de transferência!`);
    } catch {
      showToast(`${label} copiado!`);
    }
  };

  // Modal Concluir Projeto
  const [completingProject, setCompletingProject] = useState<Project | null>(null);
  const [completeWebsiteUrl, setCompleteWebsiteUrl] = useState('');

  const handleToggleChecklist = (projectId: string, srvIndex: number, checkIndex: number) => {
    crmService.toggleProjectChecklist(projectId, srvIndex, checkIndex);
  };

  // Abrir modal para criar Histórico
  const openNewHistoryModal = () => {
    setEditHistoryId(null);
    setHCompany('');
    setHClient('');
    setHServices('');
    setHWebsite('');
    setHAmountContracted('');
    setHAmountReceived('');
    setHDate(new Date().toISOString().split('T')[0]);
    setIsNewHistoryModalOpen(true);
  };

  // Abrir modal para editar Histórico
  const openEditHistoryModal = (hp: HistoricalProject) => {
    setEditHistoryId(hp.id);
    setHCompany(hp.company_name);
    setHClient(hp.client_name || '');
    setHServices(hp.services_summary || '');
    setHWebsite(hp.website_url || '');
    setHAmountContracted(String(hp.amount_contracted || 0));
    setHAmountReceived(String(hp.amount_received ?? hp.amount_contracted ?? 0));
    setHDate(hp.project_date ? hp.project_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setIsNewHistoryModalOpen(true);
  };

  const handleSaveHistorical = () => {
    if (!hCompany || !hAmountContracted || !hDate) {
      alert('Preencha ao menos a Empresa, Valor Contratado e Data.');
      return;
    }

    const contracted = Number(hAmountContracted) || 0;
    const received = hAmountReceived !== '' ? Number(hAmountReceived) : contracted;
    const pending = Math.max(0, contracted - received);
    const status = pending === 0 ? 'liquidado' : 'pendente';

    const payload = {
      company_name: hCompany.trim(),
      client_name: (hClient || hCompany).trim(),
      services_summary: (hServices || 'Website Institucional').trim(),
      website_url: hWebsite.trim() || undefined,
      amount_contracted: contracted,
      amount_received: received,
      amount_pending: pending,
      project_date: hDate,
      status: status as HistoricalProject['status'],
    };

    if (editHistoryId) {
      crmService.updateHistoricalProject(editHistoryId, payload);
    } else {
      crmService.addHistoricalProject(payload);
    }

    setIsNewHistoryModalOpen(false);
    setEditHistoryId(null);
  };

  const handleDeleteHistorical = (id: string) => {
    if (confirm('Deseja excluir este projeto histórico?')) {
      crmService.deleteHistoricalProject(id);
    }
  };

  // Abrir modal para Novo Projeto
  const openNewProjectModal = () => {
    setEditProjectId(null);
    setPCompany('');
    setPClient('');
    setPSegment('');
    setPName('');
    setPServices('');
    setPWebsite('');
    setPAmountContracted('');
    setPDeadline(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPStatus('em_desenvolvimento');
    setPBriefingUrl('');
    setPDriveFolderUrl('');
    setPClientAccessNotes('');
    setPColorPalette('');
    setPTypographyFonts('');
    setIsNewProjectModalOpen(true);
  };

  // Abrir modal para Editar Projeto Ativo
  const openEditProjectModal = (proj: Project) => {
    setEditProjectId(proj.id);
    setPCompany(proj.company_name);
    setPClient(proj.client_name || '');
    setPSegment(proj.segment || '');
    setPName(proj.name || '');
    setPServices(proj.services.map((s) => s.service_name).join(', '));
    setPWebsite(proj.website_url || '');
    setPAmountContracted(proj.amount_contracted ? String(proj.amount_contracted) : '');
    setPDeadline(proj.deadline || '');
    setPStatus(proj.status);
    setPBriefingUrl(proj.briefing_url || '');
    setPDriveFolderUrl(proj.drive_folder_url || '');
    setPClientAccessNotes(proj.client_access_notes || '');
    setPColorPalette(proj.color_palette || '');
    setPTypographyFonts(proj.typography_fonts || '');
    setIsNewProjectModalOpen(true);
  };

  const handleSaveProject = () => {
    if (!pCompany || (!pServices && !pName)) {
      alert('Preencha ao menos a Empresa e os Serviços Contratados.');
      return;
    }

    const serviceNames = (pServices || pName)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const defaultChecklist = [
      { item: 'Briefing e arquitetura da informação', completed: false },
      { item: 'Design UI/UX e aprovação visual', completed: false },
      { item: 'Desenvolvimento técnico e integrações', completed: false },
      { item: 'Testes, otimização e publicação final', completed: false },
    ];

    if (editProjectId) {
      const existing = projects.find((p) => p.id === editProjectId);
      const updatedServices =
        existing && existing.services.length > 0
          ? existing.services
          : serviceNames.map((sName) => ({
              service_name: sName,
              checklist: defaultChecklist.map((c) => ({ ...c })),
            }));

      crmService.updateProject(editProjectId, {
        company_name: pCompany.trim(),
        client_name: (pClient || pCompany).trim(),
        segment: pSegment || 'Geral',
        name: (pName || pServices).trim(),
        services: updatedServices,
        website_url: pWebsite.trim() || undefined,
        amount_contracted: pAmountContracted ? Number(pAmountContracted) : undefined,
        amount_received: pAmountContracted ? Number(pAmountContracted) : undefined,
        deadline: pDeadline || 'A definir',
        status: pStatus,
        progress_percentage: pStatus === 'concluido' ? 100 : existing?.progress_percentage ?? 0,
        briefing_url: pBriefingUrl.trim() || undefined,
        drive_folder_url: pDriveFolderUrl.trim() || undefined,
        client_access_notes: pClientAccessNotes.trim() || undefined,
        color_palette: pColorPalette.trim() || undefined,
        typography_fonts: pTypographyFonts.trim() || undefined,
      });
    } else {
      const servicesList = (serviceNames.length > 0 ? serviceNames : ['Site Institucional']).map(
        (sName) => ({
          service_name: sName,
          checklist: defaultChecklist.map((c) => ({
            ...c,
            completed: pStatus === 'concluido',
          })),
        })
      );

      crmService.addProject({
        company_name: pCompany.trim(),
        client_name: (pClient || pCompany).trim(),
        segment: pSegment || 'Geral',
        name: (pName || serviceNames.join(' + ')).trim(),
        status: pStatus,
        services: servicesList,
        start_date: new Date().toISOString().split('T')[0],
        deadline: pDeadline || 'A definir',
        progress_percentage: pStatus === 'concluido' ? 100 : 0,
        website_url: pWebsite.trim() || undefined,
        amount_contracted: pAmountContracted ? Number(pAmountContracted) : 0,
        amount_received: pAmountContracted ? Number(pAmountContracted) : 0,
        briefing_url: pBriefingUrl.trim() || undefined,
        drive_folder_url: pDriveFolderUrl.trim() || undefined,
        client_access_notes: pClientAccessNotes.trim() || undefined,
        color_palette: pColorPalette.trim() || undefined,
        typography_fonts: pTypographyFonts.trim() || undefined,
      });
    }

    setIsNewProjectModalOpen(false);
    setEditProjectId(null);
  };

  const openCompleteModal = (proj: Project) => {
    setCompletingProject(proj);
    setCompleteWebsiteUrl(proj.website_url || '');
  };

  const handleConfirmCompleteProject = () => {
    if (!completingProject) return;
    crmService.completeProject(completingProject.id, completeWebsiteUrl);
    setCompletingProject(null);
    setCompleteWebsiteUrl('');
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      crmService.deleteProject(id);
    }
  };

  const findClientByCompany = (companyName: string) => {
    const norm = (companyName || '').trim().toLowerCase();
    return clients.find((c) => c.company_name.trim().toLowerCase() === norm);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Briefcase className="w-3.5 h-3.5" />
            Operações & Entregas Técnicas
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Gestão de Projetos
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Acompanhe prazos, links dos sites entregues e sincronização automática com o cadastro do cliente ao concluir.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={openNewHistoryModal}
          >
            <History className="w-3.5 h-3.5 text-[#8EB69B]" />
            <span>Adicionar Histórico</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5" onClick={openNewProjectModal}>
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Novo Projeto</span>
          </Button>
        </div>
      </div>

      {/* Abas: Projetos Ativos vs Históricos */}
      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        items={[
          { id: 'ativos', label: 'Projetos em Execução', count: projects.length },
          { id: 'historicos', label: 'Projetos Históricos', count: historicalProjects.length },
        ]}
      />

      {/* Aba Ativos */}
      {activeTab === 'ativos' && (
        <>
          {projects.length === 0 ? (
            <Card className="p-12 text-center space-y-3">
              <div className="text-sm font-medium text-[#E7ECE8] font-heading">
                Nenhum projeto em execução no momento
              </div>
              <p className="text-xs text-[#9BA6A0] max-w-md mx-auto">
                Crie um novo projeto para acompanhar o checklist de entrega, anexar o link do site e enviá-lo automaticamente ao cadastro do cliente quando concluído.
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={openNewProjectModal} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#07100F]" />
                  <span>Criar Novo Projeto</span>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((proj) => {
                const matchedClient = findClientByCompany(proj.company_name);
                const isCompleted = proj.status === 'concluido';

                return (
                  <div
                    key={proj.id}
                    className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)] transition-all space-y-5 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                              {proj.company_name}
                            </span>
                            {matchedClient && (
                              <Link
                                href={`/clientes/${matchedClient.id}`}
                                className="text-[10px] font-mono text-[#F1F9A1] hover:underline inline-flex items-center gap-1"
                                title="Ver ficha do cliente"
                              >
                                <Building2 className="w-3 h-3" />
                                <span>Ficha do Cliente</span>
                              </Link>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-[#E7ECE8] font-heading mt-0.5">
                            {proj.name}
                          </h3>
                          <span className="text-xs text-[#9BA6A0]">{proj.client_name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono ${
                              isCompleted
                                ? 'bg-[#F1F9A1]/15 text-[#F1F9A1] border border-[#F1F9A1]/30'
                                : 'bg-[#163832] text-[#8EB69B]'
                            }`}
                          >
                            {proj.status.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => openEditProjectModal(proj)}
                            className="p-1.5 rounded-lg bg-[#10201E] hover:bg-[#163832] text-[#8EB69B] hover:text-[#E7ECE8] transition-colors"
                            title="Editar projeto / Link do site"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            className="p-1.5 rounded-lg bg-[#10201E] hover:bg-red-500/20 text-[#65706A] hover:text-red-400 transition-colors"
                            title="Excluir projeto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Link do Site */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[#10201E]/90 border border-[rgba(218,241,222,0.06)] text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-3.5 h-3.5 text-[#8EB69B] shrink-0" />
                          {proj.website_url ? (
                            <a
                              href={formatExternalUrl(proj.website_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#F1F9A1] hover:underline font-mono truncate flex items-center gap-1.5"
                            >
                              <span className="truncate">{formatDisplayUrl(proj.website_url)}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[#65706A] italic">
                              Nenhum link de site vinculado
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditProjectModal(proj)}
                          className="text-[11px] font-mono text-[#8EB69B] hover:text-[#F1F9A1] shrink-0 ml-2"
                        >
                          {proj.website_url ? 'Alterar link' : '+ Adicionar link'}
                        </button>
                      </div>

                      {/* Progresso */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-[#9BA6A0]">
                          <span>Progresso Geral</span>
                          <span className="font-mono text-[#F1F9A1]">
                            {proj.progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-[#07100F] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#8EB69B] h-full rounded-full transition-all"
                            style={{ width: `${proj.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Checklists por Serviço */}
                      <div className="space-y-3 pt-1">
                        {proj.services.map((srv, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] space-y-2"
                          >
                            <div className="text-xs font-semibold text-[#E7ECE8] flex items-center justify-between">
                              <span>{srv.service_name}</span>
                              <span className="text-[10px] text-[#65706A] font-mono">Checklist</span>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              {srv.checklist.map((item, cIdx) => (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => handleToggleChecklist(proj.id, idx, cIdx)}
                                  className="flex items-center gap-2 text-xs text-[#9BA6A0] hover:text-[#E7ECE8] text-left transition-colors w-full p-1 rounded hover:bg-[#07100F]/40 cursor-pointer"
                                >
                                  <CheckCircle2
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      item.completed ? 'text-[#8EB69B]' : 'text-[#65706A]'
                                    }`}
                                  />
                                  <span
                                    className={item.completed ? 'line-through text-[#65706A]' : ''}
                                  >
                                    {item.item}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Gaveta Retrátil: Dados Técnicos & Briefing */}
                      {(() => {
                        const isExpanded = Boolean(expandedTechnicalIds[proj.id]);
                        const isEditingThis = editingTechProjectId === proj.id;
                        const isRevealed = Boolean(revealedAccessIds[proj.id]);
                        const hasBriefing = Boolean(proj.briefing_url?.trim());
                        const hasDrive = Boolean(proj.drive_folder_url?.trim());
                        const hasAccess = Boolean(proj.client_access_notes?.trim());
                        const hasColors = Boolean(proj.color_palette?.trim());
                        const hasFonts = Boolean(proj.typography_fonts?.trim());
                        const totalFilled = [hasBriefing, hasDrive, hasAccess, hasColors, hasFonts].filter(Boolean).length;
                        const hexColors = extractHexColors(proj.color_palette);

                        return (
                          <div className="rounded-xl border border-[rgba(218,241,222,0.08)] bg-[#10201E]/70 overflow-hidden transition-all">
                            {/* Barra / Gatilho de Abertura da Gaveta */}
                            <button
                              type="button"
                              onClick={() => toggleTechnicalDrawer(proj.id)}
                              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#10201E] transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1 rounded bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#8EB69B]">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-semibold text-[#E7ECE8] font-heading truncate">
                                  Dados Técnicos & Briefing
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                    totalFilled > 0
                                      ? 'bg-[#163832] text-[#8EB69B] border-[#8EB69B]/30'
                                      : 'bg-[#07100F] text-[#65706A] border-[rgba(218,241,222,0.06)]'
                                  }`}
                                >
                                  {totalFilled > 0 ? `${totalFilled}/5 preenchidos` : 'Pendente'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-mono text-[#9BA6A0] group-hover:text-[#F1F9A1] transition-colors hidden sm:inline">
                                  {isExpanded ? 'Recolher' : 'Ver Dados'}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-[#9BA6A0] transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-[#F1F9A1]' : ''
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Conteúdo Retrátil da Gaveta */}
                            {isExpanded && (
                              <div className="p-3.5 border-t border-[rgba(218,241,222,0.06)] bg-[#07100F]/90 space-y-3.5 animate-in slide-in-from-top-1 duration-200">
                                {isEditingThis ? (
                                  /* MODO EDIÇÃO INLINE NA GAVETA */
                                  <div className="space-y-3 text-xs">
                                    <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-2">
                                      <span className="text-xs font-semibold text-[#F1F9A1] font-heading flex items-center gap-1.5">
                                        <Pencil className="w-3 h-3" />
                                        Editar Dados Técnicos & Briefing
                                      </span>
                                      <button
                                        type="button"
                                        onClick={cancelEditingTech}
                                        className="text-[#9BA6A0] hover:text-white transition-colors"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* Campo 1: Link para Briefing */}
                                    <div>
                                      <label className="block text-[11px] text-[#8EB69B] mb-1 font-medium flex items-center gap-1">
                                        <FileText className="w-3 h-3 text-[#8EB69B]" />
                                        Link para Briefing (Notion, Google Docs, Typeform...)
                                      </label>
                                      <input
                                        type="url"
                                        value={techBriefingUrl}
                                        onChange={(e) => setTechBriefingUrl(e.target.value)}
                                        placeholder="https://notion.so/... ou https://docs.google.com/..."
                                        className="w-full px-3 py-1.5 rounded-lg bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono text-xs focus:outline-none focus:border-[#8EB69B]"
                                      />
                                    </div>

                                    {/* Campo 2: Pasta de Arquivos */}
                                    <div>
                                      <label className="block text-[11px] text-[#58A6FF] mb-1 font-medium flex items-center gap-1">
                                        <FolderOpen className="w-3 h-3 text-[#58A6FF]" />
                                        Pasta de Arquivos (Google Drive / Imagens)
                                      </label>
                                      <input
                                        type="url"
                                        value={techDriveUrl}
                                        onChange={(e) => setTechDriveUrl(e.target.value)}
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        className="w-full px-3 py-1.5 rounded-lg bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono text-xs focus:outline-none focus:border-[#58A6FF]"
                                      />
                                    </div>

                                    {/* Campo 3: Acessos do Cliente */}
                                    <div>
                                      <label className="block text-[11px] text-[#F1F9A1] mb-1 font-medium flex items-center gap-1">
                                        <Key className="w-3 h-3 text-[#F1F9A1]" />
                                        Acessos do Cliente (DNS, Login WordPress ou Hostinger)
                                      </label>
                                      <textarea
                                        rows={4}
                                        value={techAccessNotes}
                                        onChange={(e) => setTechAccessNotes(e.target.value)}
                                        placeholder="Exemplo:&#10;DNS / Cloudflare: user@cliente.com&#10;Hostinger: painel.hostinger.com | user | pass&#10;WordPress: wp-admin | admin | ••••••••"
                                        className="w-full px-3 py-2 rounded-lg bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono text-xs focus:outline-none focus:border-[#F1F9A1] resize-none"
                                      />
                                    </div>

                                    {/* Campo 4: Paleta e Fontes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      <div>
                                        <label className="block text-[11px] text-[#8EB69B] mb-1 font-medium flex items-center gap-1">
                                          <Palette className="w-3 h-3 text-[#8EB69B]" />
                                          Paleta de Cores (Hexadecimais)
                                        </label>
                                        <input
                                          type="text"
                                          value={techColorPalette}
                                          onChange={(e) => setTechColorPalette(e.target.value)}
                                          placeholder="#07100F, #8EB69B, #F1F9A1"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono text-xs focus:outline-none focus:border-[#8EB69B]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] text-[#8EB69B] mb-1 font-medium flex items-center gap-1">
                                          <Type className="w-3 h-3 text-[#8EB69B]" />
                                          Fontes do Projeto
                                        </label>
                                        <input
                                          type="text"
                                          value={techFonts}
                                          onChange={(e) => setTechFonts(e.target.value)}
                                          placeholder="Ex: Syne, Plus Jakarta Sans"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] text-xs focus:outline-none focus:border-[#8EB69B]"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-[rgba(218,241,222,0.06)]">
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-7 text-xs px-2.5"
                                        onClick={cancelEditingTech}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        className="h-7 text-xs px-3"
                                        onClick={() => handleSaveTechInline(proj.id)}
                                      >
                                        Salvar Dados
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* MODO VISUALIZAÇÃO INTERATIVA */
                                  <div className="space-y-3 text-xs">
                                    {/* 1. Link para Briefing */}
                                    <div className="p-2.5 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.06)] space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-[#8EB69B] flex items-center gap-1.5">
                                          <FileText className="w-3.5 h-3.5 text-[#8EB69B]" />
                                          Link para Briefing
                                        </span>
                                        {hasBriefing && (
                                          <button
                                            type="button"
                                            onClick={() => handleCopyText(proj.briefing_url!, 'Link do Briefing')}
                                            className="text-[10px] font-mono text-[#9BA6A0] hover:text-[#F1F9A1] flex items-center gap-1 transition-colors"
                                          >
                                            <Copy className="w-3 h-3" />
                                            <span>Copiar link</span>
                                          </button>
                                        )}
                                      </div>

                                      {hasBriefing ? (
                                        <a
                                          href={formatExternalUrl(proj.briefing_url!)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 rounded-lg bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.08)] hover:border-[#8EB69B]/40 text-[#E7ECE8] hover:text-[#F1F9A1] font-mono text-xs flex items-center justify-between gap-2 transition-all group/link"
                                        >
                                          <span className="truncate">{formatDisplayUrl(proj.briefing_url!)}</span>
                                          <ExternalLink className="w-3.5 h-3.5 text-[#8EB69B] group-hover/link:text-[#F1F9A1] shrink-0" />
                                        </a>
                                      ) : (
                                        <div className="flex items-center justify-between text-[11px] text-[#65706A] italic py-0.5">
                                          <span>Nenhum briefing vinculado</span>
                                          <button
                                            type="button"
                                            onClick={() => startEditingTech(proj)}
                                            className="text-[#8EB69B] hover:text-[#F1F9A1] not-italic font-sans font-medium"
                                          >
                                            + Adicionar
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* 2. Pasta de Arquivos (Google Drive / Imagens) */}
                                    <div className="p-2.5 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.06)] space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-[#58A6FF] flex items-center gap-1.5">
                                          <FolderOpen className="w-3.5 h-3.5 text-[#58A6FF]" />
                                          Pasta de Arquivos (Google Drive / Imagens)
                                        </span>
                                        {hasDrive && (
                                          <button
                                            type="button"
                                            onClick={() => handleCopyText(proj.drive_folder_url!, 'Link do Drive')}
                                            className="text-[10px] font-mono text-[#9BA6A0] hover:text-[#F1F9A1] flex items-center gap-1 transition-colors"
                                          >
                                            <Copy className="w-3 h-3" />
                                            <span>Copiar link</span>
                                          </button>
                                        )}
                                      </div>

                                      {hasDrive ? (
                                        <a
                                          href={formatExternalUrl(proj.drive_folder_url!)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 rounded-lg bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.08)] hover:border-[#58A6FF]/40 text-[#E7ECE8] hover:text-[#58A6FF] font-mono text-xs flex items-center justify-between gap-2 transition-all group/drive"
                                        >
                                          <span className="truncate">{formatDisplayUrl(proj.drive_folder_url!)}</span>
                                          <ExternalLink className="w-3.5 h-3.5 text-[#58A6FF] shrink-0" />
                                        </a>
                                      ) : (
                                        <div className="flex items-center justify-between text-[11px] text-[#65706A] italic py-0.5">
                                          <span>Nenhuma pasta vinculada</span>
                                          <button
                                            type="button"
                                            onClick={() => startEditingTech(proj)}
                                            className="text-[#58A6FF] hover:underline not-italic font-sans font-medium"
                                          >
                                            + Vincular Drive
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* 3. Acessos do Cliente (DNS, Login WordPress ou Hostinger) */}
                                    <div className="p-2.5 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.06)] space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-[#F1F9A1] flex items-center gap-1.5">
                                          <Key className="w-3.5 h-3.5 text-[#F1F9A1]" />
                                          Acessos do Cliente (DNS, WordPress, Hostinger)
                                        </span>
                                        {hasAccess && (
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => toggleRevealAccess(proj.id)}
                                              className="text-[10px] font-mono text-[#9BA6A0] hover:text-[#E7ECE8] flex items-center gap-1 transition-colors"
                                              title={isRevealed ? 'Ocultar senhas' : 'Ver senhas'}
                                            >
                                              {isRevealed ? (
                                                <>
                                                  <EyeOff className="w-3 h-3 text-[#F1F9A1]" />
                                                  <span>Ocultar</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Eye className="w-3 h-3" />
                                                  <span>Revelar</span>
                                                </>
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleCopyText(proj.client_access_notes!, 'Acessos')}
                                              className="text-[10px] font-mono text-[#9BA6A0] hover:text-[#F1F9A1] flex items-center gap-1 transition-colors"
                                            >
                                              <Copy className="w-3 h-3" />
                                              <span>Copiar</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {hasAccess ? (
                                        <div className="p-2.5 rounded-lg bg-[#07100F] border border-[rgba(218,241,222,0.08)] font-mono text-[11px] text-[#E7ECE8] whitespace-pre-wrap leading-relaxed select-all">
                                          {isRevealed ? proj.client_access_notes : maskCredentials(proj.client_access_notes)}
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between text-[11px] text-[#65706A] italic py-0.5">
                                          <span>Nenhum acesso registrado</span>
                                          <button
                                            type="button"
                                            onClick={() => startEditingTech(proj)}
                                            className="text-[#F1F9A1] hover:underline not-italic font-sans font-medium"
                                          >
                                            + Cadastrar Acessos
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* 4. Paleta de Cores & Fontes do Projeto */}
                                    <div className="p-2.5 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.06)] space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-[#8EB69B] flex items-center gap-1.5">
                                          <Palette className="w-3.5 h-3.5 text-[#8EB69B]" />
                                          Paleta de Cores & Fontes do Projeto
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => startEditingTech(proj)}
                                          className="text-[10px] font-mono text-[#8EB69B] hover:text-[#F1F9A1] flex items-center gap-1 transition-colors"
                                        >
                                          <Pencil className="w-3 h-3" />
                                          <span>Editar</span>
                                        </button>
                                      </div>

                                      <div className="space-y-2">
                                        {/* Swatches de Cores */}
                                        {hasColors ? (
                                          <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              {hexColors.map((hex) => (
                                                <button
                                                  key={hex}
                                                  type="button"
                                                  onClick={() => handleCopyText(hex, `Cor ${hex}`)}
                                                  className="px-2 py-1 rounded-md bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.12)] flex items-center gap-1.5 transition-all text-[11px] font-mono group/swatch"
                                                  title={`Clique para copiar ${hex}`}
                                                >
                                                  <span
                                                    className="w-3 h-3 rounded-full border border-black/40 shrink-0 shadow-sm"
                                                    style={{ backgroundColor: hex }}
                                                  />
                                                  <span className="text-[#E7ECE8] group-hover/swatch:text-[#F1F9A1]">{hex}</span>
                                                </button>
                                              ))}
                                            </div>
                                            {hexColors.length === 0 && (
                                              <div className="text-[11px] font-mono text-[#E7ECE8] bg-[#10201E] p-1.5 rounded-md border border-[rgba(218,241,222,0.06)]">
                                                {proj.color_palette}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-[11px] text-[#65706A] italic">
                                            Nenhuma paleta de cores configurada
                                          </div>
                                        )}

                                        {/* Fontes / Tipografia */}
                                        {hasFonts ? (
                                          <div className="flex items-center gap-1.5 pt-1 border-t border-[rgba(218,241,222,0.04)]">
                                            <Type className="w-3 h-3 text-[#9BA6A0] shrink-0" />
                                            <span className="text-[11px] text-[#E7ECE8] font-medium">
                                              {proj.typography_fonts}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="text-[11px] text-[#65706A] italic pt-1 border-t border-[rgba(218,241,222,0.04)]">
                                            Nenhuma tipografia registrada
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Botão de Rodapé para Edição Rápida */}
                                    <div className="flex justify-end pt-1">
                                      <button
                                        type="button"
                                        onClick={() => startEditingTech(proj)}
                                        className="px-2.5 py-1 rounded-lg bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8] text-[11px] font-medium flex items-center gap-1.5 transition-all"
                                      >
                                        <Pencil className="w-3 h-3 text-[#8EB69B]" />
                                        <span>Editar Dados Técnicos</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-3 border-t border-[rgba(218,241,222,0.06)] flex items-center justify-between text-xs text-[#9BA6A0]">
                      <span>Prazo Final: {proj.deadline}</span>
                      {!isCompleted ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-7 text-xs px-3 gap-1.5"
                          onClick={() => openCompleteModal(proj)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#07100F]" />
                          <span>Concluir Projeto</span>
                        </Button>
                      ) : matchedClient ? (
                        <Link href={`/clientes/${matchedClient.id}`}>
                          <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5">
                            Ver no Cliente
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-[11px] font-mono text-[#8EB69B]">
                          Sincronizado com Clientes
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Aba Históricos */}
      {activeTab === 'historicos' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-4">
            <div>
              <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
                Projetos Anteriores ao EVOCRM
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">
                Projetos concluídos que compõem o faturamento acumulado e alimentam automaticamente o cadastro dos clientes.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="text-xs"
              onClick={openNewHistoryModal}
            >
              + Adicionar Histórico
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                  <th className="py-2.5 px-3">Empresa / Cliente</th>
                  <th className="py-2.5 px-3">Serviços Executados</th>
                  <th className="py-2.5 px-3">Site / Link</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Valor Contratado</th>
                  <th className="py-2.5 px-3">Valor Recebido</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
                {historicalProjects.map((hp) => {
                  const matchedClient = findClientByCompany(hp.company_name);
                  const siteUrl = hp.website_url || matchedClient?.website_url;

                  return (
                    <tr key={hp.id} className="hover:bg-[#10201E]/40">
                      <td className="py-3 px-3">
                        {matchedClient ? (
                          <Link
                            href={`/clientes/${matchedClient.id}`}
                            className="font-medium text-[#E7ECE8] hover:text-[#F1F9A1] transition-colors"
                          >
                            {hp.company_name}
                          </Link>
                        ) : (
                          <span className="font-medium text-[#E7ECE8]">{hp.company_name}</span>
                        )}
                        <div className="text-[11px] text-[#9BA6A0]">{hp.client_name}</div>
                      </td>
                      <td className="py-3 px-3 text-[#9BA6A0]">{hp.services_summary}</td>
                      <td className="py-3 px-3">
                        {siteUrl ? (
                          <a
                            href={formatExternalUrl(siteUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.1)] text-[#F1F9A1] font-mono text-[11px] transition-colors"
                            title={siteUrl}
                          >
                            <Globe className="w-3 h-3 text-[#8EB69B]" />
                            <span className="max-w-[160px] truncate">
                              {formatDisplayUrl(siteUrl)}
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditHistoryModal(hp)}
                            className="text-[11px] font-mono text-[#65706A] hover:text-[#8EB69B] transition-colors"
                          >
                            + Adicionar site
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#65706A]">
                        {new Date(hp.project_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#E7ECE8]">
                        R$ {hp.amount_contracted.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#8EB69B]">
                        R$ {hp.amount_received.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#163832] text-[#8EB69B] font-mono">
                          {hp.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditHistoryModal(hp)}
                            className="p-1.5 rounded-lg bg-[#10201E] hover:bg-[#163832] text-[#8EB69B] hover:text-[#E7ECE8] transition-colors"
                            title="Editar projeto histórico / Link do site"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHistorical(hp.id)}
                            className="p-1.5 rounded-lg bg-[#10201E] hover:bg-red-500/20 text-[#65706A] hover:text-red-400 transition-colors"
                            title="Excluir registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Adicionar / Editar Projeto Histórico */}
      <Modal
        isOpen={isNewHistoryModalOpen}
        onClose={() => setIsNewHistoryModalOpen(false)}
        title={editHistoryId ? 'Editar Projeto Histórico' : 'Cadastrar Projeto Histórico'}
        subtitle="Projetos concluídos entram automaticamente no cadastro do cliente junto com o link do site."
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9BA6A0] mb-1">Empresa *</label>
              <input
                type="text"
                value={hCompany}
                onChange={(e) => setHCompany(e.target.value)}
                placeholder="Ex: Dulce Guerra Advocacia"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Cliente / Contato</label>
              <input
                type="text"
                value={hClient}
                onChange={(e) => setHClient(e.target.value)}
                placeholder="Ex: Dra Dulce"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1">Serviços Executados</label>
            <input
              type="text"
              value={hServices}
              onChange={(e) => setHServices(e.target.value)}
              placeholder="Ex: Landing Page + Automação WhatsApp"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1">
              Link do Site (caso seja site / landing page)
            </label>
            <input
              type="url"
              value={hWebsite}
              onChange={(e) => setHWebsite(e.target.value)}
              placeholder="Ex: https://dulceguerraadvocacia.com.br"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#9BA6A0] mb-1">Valor Contratado (R$) *</label>
              <input
                type="number"
                value={hAmountContracted}
                onChange={(e) => setHAmountContracted(e.target.value)}
                placeholder="Ex: 2500"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Valor Recebido (R$)</label>
              <input
                type="number"
                value={hAmountReceived}
                onChange={(e) => setHAmountReceived(e.target.value)}
                placeholder="Ex: 2500"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Data do Projeto *</label>
              <input
                type="date"
                value={hDate}
                onChange={(e) => setHDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewHistoryModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveHistorical}>
              {editHistoryId ? 'Salvar Alterações' : 'Salvar no Histórico'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Criar / Editar Projeto em Execução */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title={editProjectId ? 'Editar Projeto' : 'Criar Novo Projeto'}
        subtitle="Ao ser marcado como concluído, o projeto e o link do site entram automaticamente no cadastro do cliente."
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9BA6A0] mb-1">Empresa *</label>
              <input
                type="text"
                value={pCompany}
                onChange={(e) => setPCompany(e.target.value)}
                placeholder="Ex: Martins Imóveis"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Cliente / Contato</label>
              <input
                type="text"
                value={pClient}
                onChange={(e) => setPClient(e.target.value)}
                placeholder="Ex: Rodrigo Martins"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9BA6A0] mb-1">Serviços Contratados *</label>
              <input
                type="text"
                value={pServices}
                onChange={(e) => setPServices(e.target.value)}
                placeholder="Ex: Site Institucional, SEO"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Segmento / Nicho</label>
              <select
                value={pSegment}
                onChange={(e) => setPSegment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="">Geral</option>
                {crmService.getNiches().map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1">
              Link do Site (caso seja site / landing page)
            </label>
            <input
              type="url"
              value={pWebsite}
              onChange={(e) => setPWebsite(e.target.value)}
              placeholder="Ex: https://martinsimoveis.com.br"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#9BA6A0] mb-1">Valor Contratado (R$)</label>
              <input
                type="number"
                value={pAmountContracted}
                onChange={(e) => setPAmountContracted(e.target.value)}
                placeholder="Ex: 3200"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Prazo Final</label>
              <input
                type="date"
                value={pDeadline}
                onChange={(e) => setPDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Status</label>
              <select
                value={pStatus}
                onChange={(e) => setPStatus(e.target.value as Project['status'])}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="aguardando_inicio">Aguardando Início</option>
                <option value="briefing">Briefing</option>
                <option value="em_desenvolvimento">Em Desenvolvimento</option>
                <option value="revisao">Revisão</option>
                <option value="ajustes">Ajustes</option>
                <option value="aguardando_cliente">Aguardando Cliente</option>
                <option value="concluido">Concluído (Envia p/ Cliente)</option>
              </select>
            </div>
          </div>

          {/* Seção Dados Técnicos & Briefing no Modal */}
          <div className="pt-3 border-t border-[rgba(218,241,222,0.08)] space-y-3">
            <div className="text-xs font-semibold text-[#8EB69B] font-heading flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Dados Técnicos & Briefing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">Link para Briefing</label>
                <input
                  type="url"
                  value={pBriefingUrl}
                  onChange={(e) => setPBriefingUrl(e.target.value)}
                  placeholder="https://notion.so/... ou Docs"
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">Pasta de Arquivos (Google Drive)</label>
                <input
                  type="url"
                  value={pDriveFolderUrl}
                  onChange={(e) => setPDriveFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">
                Acessos do Cliente (DNS, Login WordPress ou Hostinger)
              </label>
              <textarea
                rows={3}
                value={pClientAccessNotes}
                onChange={(e) => setPClientAccessNotes(e.target.value)}
                placeholder="Ex:&#10;DNS: Registro.br&#10;WordPress: wp-admin | admin | ••••••••"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">Paleta de Cores (Hexadecimais)</label>
                <input
                  type="text"
                  value={pColorPalette}
                  onChange={(e) => setPColorPalette(e.target.value)}
                  placeholder="#07100F, #8EB69B, #F1F9A1"
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#9BA6A0] mb-1 font-medium">Fontes do Projeto</label>
                <input
                  type="text"
                  value={pTypographyFonts}
                  onChange={(e) => setPTypographyFonts(e.target.value)}
                  placeholder="Ex: Syne, Plus Jakarta Sans"
                  className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewProjectModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveProject}>
              {editProjectId ? 'Salvar Projeto' : 'Criar Projeto'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Concluir Projeto e Enviar para o Cadastro do Cliente */}
      <Modal
        isOpen={Boolean(completingProject)}
        onClose={() => setCompletingProject(null)}
        title="Concluir Projeto"
        subtitle={
          completingProject
            ? `Ao concluir "${completingProject.name}", ele será vinculado ao cadastro de ${completingProject.company_name} na aba Clientes.`
            : ''
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1">
              Link do Site Entregue (caso seja site / landing page)
            </label>
            <input
              type="url"
              value={completeWebsiteUrl}
              onChange={(e) => setCompleteWebsiteUrl(e.target.value)}
              placeholder="Ex: https://site-do-cliente.com.br"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] font-mono focus:outline-none"
            />
            <p className="text-[11px] text-[#65706A] mt-1.5">
              Se preenchido, o link ficará disponível tanto aqui em Projetos quanto na ficha do cliente.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCompletingProject(null)}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmCompleteProject}>
              Confirmar Conclusão
            </Button>
          </div>
        </div>
      </Modal>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0D1117] border border-[#8EB69B]/40 text-[#E7ECE8] shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#F1F9A1] shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg text-[#8B949E] hover:text-white transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
