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
} from 'lucide-react';

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
    </div>
  );
}
