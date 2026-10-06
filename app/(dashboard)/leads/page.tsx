'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import * as xlsx from 'xlsx';
import { crmService } from '@/lib/services/crm-service';
import { parseSpreadsheetLeads } from '@/lib/services/spreadsheet-leads';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { Lead, Temperature } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  Search,
  Plus,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  MessageSquare,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  CloudDownload,
  Instagram,
  Mail,
  MapPin,
  Globe,
  Kanban,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { openWhatsApp, cleanPhoneNumber } from '@/lib/utils/whatsapp';
import { openInstagramProfile, openGoogleMapsProfile } from '@/lib/utils/social-links';
import { formatPhoneNumber } from '@/lib/utils';
import { GenerateMessageModal, TargetEntity } from '@/components/modals/GenerateMessageModal';
import { qualifyLeadWithAI } from '@/lib/ai/qualification';
import { aiProvider } from '@/lib/ai/ai-provider';

export default function LeadsPage() {
  useCrmSync();
  const leads = crmService.getLeads();
  const opportunities = crmService.getOpportunities();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState<string>('todos');
  const [selectedNiche, setSelectedNiche] = useState<string>('todos');
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  // Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<{ total: number; count: number } | null>(null);

  // Apify capture states
  const [isApifyModalOpen, setIsApifyModalOpen] = useState(false);
  const [apifyNiche, setApifyNiche] = useState('Contabilidade');
  const [apifyCity, setApifyCity] = useState('São Paulo, SP');
  const [apifyToken, setApifyToken] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionLog, setExtractionLog] = useState('');

  // Multi-selection states
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modal de Mensagem WhatsApp (Anexo 1)
  const [messageTarget, setMessageTarget] = useState<TargetEntity | null>(null);

  // Form states - Novo Lead
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newSegment, setNewSegment] = useState('Contabilidade');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newInstagram, setNewInstagram] = useState('');
  const [newGoogleBusiness, setNewGoogleBusiness] = useState('');

  const niches = crmService.getNiches();

  // Importação e qualificação via Planilha (CSV / XLSX)
  const handleSpreadsheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = xlsx.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) throw new Error('A planilha não contém uma aba para importar.');
        const jsonData = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
        const leadsParaSalvar = parseSpreadsheetLeads(jsonData);
        if (leadsParaSalvar.length === 0) {
          throw new Error('A planilha não contém linhas preenchidas para importar. Nenhum campo é obrigatório.');
        }

        await crmService.addLeads(leadsParaSalvar);
        setImportStats({ total: jsonData.length, count: leadsParaSalvar.length });
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Não foi possível ler a planilha. Tente novamente.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      setIsImporting(false);
      alert('Não foi possível ler o arquivo selecionado. Tente selecioná-lo novamente.');
    };
    reader.readAsArrayBuffer(file);
  };

  // Captação via Apify + Qualificação por IA
  const handleApifyCapture = async () => {
    if (!apifyNiche || !apifyCity) return;
    setIsExtracting(true);
    setExtractionLog('Iniciando captação...');

    try {
      let extractedLeads: any[] = [];

      // 1. Mapear Bairros com IA
      setExtractionLog(`Mapeando os principais bairros comerciais de ${apifyCity} via IA...`);
      const bairrosRes = await aiProvider.generateCompletion(
        `Você é um assistente de inteligência de mercado local. Liste os 5 maiores, mais populosos e principais bairros comerciais da cidade de "${apifyCity}". Retorne APENAS os nomes separados por vírgula, sem nenhum outro texto, ponto final ou numeração. Exemplo: Centro, Jardins, Pinheiros, Itaim Bibi, Moema`,
        {}
      );

      const bairros = (bairrosRes.text || 'Centro, Bairro Comercial')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean)
        .slice(0, 5);

      const searchStrings = bairros.map((b) => `${apifyNiche} em ${b}, ${apifyCity}`);
      setExtractionLog(`Bairros mapeados! Buscando leads em: ${bairros.join(', ')}...`);

      if (apifyToken) {
        const res = await fetch(
          `https://api.apify.com/v2/acts/compass~google-maps-extractor/run-sync-get-dataset-items?token=${apifyToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchStringsArray: searchStrings,
              maxCrawledPlacesPerSearch: 10,
              language: 'pt',
              countryCode: 'br',
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          let parsedErr = errText;
          try {
            parsedErr = JSON.parse(errText).error?.message || errText;
          } catch (e) {}
          throw new Error(`Apify (${res.status}): ${parsedErr}`);
        }

        const data = await res.json();

        extractedLeads = data.map((item: any) => ({
          nome: item.title || 'Empresa Local',
          empresa: item.title || `${apifyNiche} - ${item.city || apifyCity}`,
          telefone: item.phone || item.phoneUnformatted || '',
          email: item.email || item.emails?.[0] || '',
          cidade: item.city || item.addressParsed?.city || apifyCity,
          segment: item.categories?.[0] || apifyNiche,
          site: item.website || '',
          google_business: item.placeUrl || item.url || item.title || '',
          instagram: item.instagram || '',
        }));
      } else {
        setExtractionLog('Nenhum Token Apify fornecido. Usando Simulação com busca local...');
        await new Promise((r) => setTimeout(r, 1200));
        setExtractionLog('Extraindo dados de contato (Nome, Telefone, Email, Google Meu Negócio)...');
        await new Promise((r) => setTimeout(r, 1200));

        bairros.forEach((bairro, idx) => {
          for (let i = 0; i < 4; i++) {
            const rawPhone = `(${idx + 11}) 9` + Math.floor(10000000 + Math.random() * 90000000);
            extractedLeads.push({
              nome: `Dr(a). Contato ${bairro} ${i + 1}`,
              empresa: `${apifyNiche} ${bairro} ${i + 1}`,
              telefone: rawPhone,
              email: i % 2 === 0 ? `contato@${bairro.toLowerCase().replace(/\s/g, '')}.com.br` : '',
              cidade: apifyCity,
              segment: apifyNiche,
              google_business: `${apifyNiche} - ${bairro} (Verificado)`,
              instagram: `@${apifyNiche.toLowerCase().replace(/\s/g, '')}_${bairro.toLowerCase().replace(/\s/g, '')}`,
            });
          }
        });
      }

      setExtractionLog(`Foram extraídos ${extractedLeads.length} contatos. IA gerando scores, qualificação e abordagem...`);

      let count = 0;
      extractedLeads.forEach((leadItem) => {
        const qualified = qualifyLeadWithAI({
          name: leadItem.nome,
          company_name: leadItem.empresa,
          phone: leadItem.telefone,
          whatsapp: leadItem.telefone,
          segment: leadItem.segment || apifyNiche,
          city: leadItem.cidade || apifyCity,
          email: leadItem.email,
          instagram: leadItem.instagram,
          google_business: leadItem.google_business,
          role: 'Decisor Comercial',
        });
        crmService.addLead(qualified);
        count++;
      });

      setExtractionLog(`Sucesso! ${count} leads qualificados com nota, score e mensagem prontos para WhatsApp!`);
      setTimeout(() => {
        setIsExtracting(false);
        setIsApifyModalOpen(false);
        setExtractionLog('');
      }, 2000);
    } catch (error: any) {
      setExtractionLog(`Erro: ${error?.message || 'Falha na extração ou classificação IA.'}`);
      setIsExtracting(false);
    }
  };

  // Criação manual de lead
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();

    const qualified = qualifyLeadWithAI({
      name: newName.trim() || newCompany.trim() || 'Contato não informado',
      company_name: newCompany.trim() || 'Empresa não informada',
      segment: newSegment,
      city: newCity.trim(),
      whatsapp: newWhatsapp.trim(),
      phone: newWhatsapp.trim(),
      email: newEmail.trim(),
      instagram: newInstagram.trim(),
      google_business: newGoogleBusiness.trim(),
    });

    crmService.addLead(qualified);

    // Limpar campos
    setNewName('');
    setNewCompany('');
    setNewWhatsapp('');
    setNewCity('');
    setNewEmail('');
    setNewInstagram('');
    setNewGoogleBusiness('');
    setIsNewLeadModalOpen(false);
  };

  const handleDeleteLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    crmService.deleteLead(id);
    setSelectedLeadIds((prev) => prev.filter((item) => item !== id));
  };

  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    crmService.deleteLeads(selectedLeadIds);
    setSelectedLeadIds([]);
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Colocar no Pipeline na etapa Primeiro Contato (e retirar da lista de Leads)
  const addToPipeline = (lead: Lead, reason = 'Primeiro Contato') => {
    const opps = crmService.getOpportunities();
    const existing = opps.find(
      (o) =>
        o.lead_id === lead.id
    );
    if (existing) {
      if (lead.status !== 'em_contato' && lead.status !== 'convertido') {
        crmService.updateLeadStatus(lead.id, 'em_contato');
      }
      return existing;
    }

    return crmService.addOpportunity({
      lead_id: lead.id,
      lead_name: lead.name,
      company_name: lead.company_name,
      stage_slug: 'primeiro_contato',
      title: `Oportunidade - ${lead.company_name}`,
      estimated_value: 3500,
      probability: 30,
      score: lead.score || 75,
      temperature: lead.temperature || 'quente',
      priority: 'alta',
      services: lead.services && lead.services.length > 0 ? lead.services : ['Presença Digital & Atendimento WhatsApp'],
      last_interaction: reason,
      stage_entered_at: new Date().toISOString(),
    });
  };

  const handleDirectWhatsApp = (lead: Lead) => {
    const phone = cleanPhoneNumber(lead.whatsapp) || cleanPhoneNumber(lead.phone);
    if (!phone) {
      alert(`O lead "${lead.company_name}" não possui número de WhatsApp válido cadastrado.`);
      return;
    }
    // Ao iniciar o primeiro contato via WhatsApp, move automaticamente para o Pipeline e sai da lista de Leads
    addToPipeline(lead, 'Primeiro Contato via WhatsApp');
    openWhatsApp(phone);
  };

  const handleAddToPipeline = (lead: Lead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addToPipeline(lead, 'Marcado como Primeiro Contato');
    setSelectedLeadIds((prev) => prev.filter((id) => id !== lead.id));
  };

  const handleBulkAddToPipeline = () => {
    if (selectedLeadIds.length === 0) return;
    selectedLeadIds.forEach((id) => {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        addToPipeline(lead, 'Primeiro Contato (Seleção em Lote)');
      }
    });
    setSelectedLeadIds([]);
  };

  const handleMessageSent = (target: TargetEntity) => {
    if (target.id) {
      const lead = leads.find((l) => l.id === target.id);
      if (lead) {
        addToPipeline(lead, 'Primeiro Contato com mensagem personalizada');
      }
    }
  };

  const handleOpenMessageModal = (lead: Lead) => {
    setMessageTarget({
      id: lead.id,
      name: lead.name,
      company_name: lead.company_name,
      phone: lead.whatsapp,
      whatsapp: lead.whatsapp,
      segment: lead.segment,
      city: lead.city,
      state: lead.state,
      services: lead.services,
      role: lead.role,
    });
  };

  const filteredLeads = leads.filter((lead) => {
    // Leads marcados como Primeiro Contato / já enviados ao Pipeline saem da lista de Leads
    const isAlreadyInPipeline =
      lead.status === 'em_contato' ||
      lead.status === 'convertido' ||
      (lead.status !== 'novo' && opportunities.some(
        (o) =>
          o.lead_id === lead.id
      ));
    if (isAlreadyInPipeline) return false;

    const matchesSearch =
      (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.segment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.city && lead.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.whatsapp && lead.whatsapp.includes(searchTerm)) ||
      (lead.instagram && lead.instagram.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTemp =
      selectedTemperature === 'todos' || lead.temperature === selectedTemperature;

    const matchesNiche =
      selectedNiche === 'todos' || (lead.segment || '').toLowerCase() === selectedNiche.toLowerCase();

    return matchesSearch && matchesTemp && matchesNiche;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5 text-[#F1F9A1]" />
            Gestão Comercial
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Leads & Captação Ativa
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Qualificação com IA, captação via Apify, importação de planilhas, abordagem no WhatsApp e gestão de contatos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão Captar via Apify + IA (Anexo da imagem 3) */}
          <button
            onClick={() => setIsApifyModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-emerald-500/20 hover:from-blue-500/30 hover:to-emerald-500/30 border border-blue-400/30 text-blue-300 hover:text-white text-xs font-heading font-medium flex items-center gap-2 transition-all active:scale-95 shadow-sm"
            title="Extrair contatos locais via Google Maps com Apify e classificar por IA"
          >
            <CloudDownload className="w-4 h-4 text-blue-400" />
            <span>Captar via Apify + IA</span>
          </button>

          {/* Botão Importar Planilha */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.12)] text-[#8EB69B] hover:text-[#F1F9A1] text-xs font-heading font-medium flex items-center gap-1.5 transition-all active:scale-95"
            title="Importar lista de leads (CSV ou XLSX) com qualificação IA automática"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Planilha</span>
          </button>

          {/* Botão Novo Lead */}
          <Button
            onClick={() => setIsNewLeadModalOpen(true)}
            variant="primary"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Novo Lead</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8EB69B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por lead, empresa, nicho, cidade, whatsapp, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedLeadIds.length > 0 && (
            <>
              <button
                onClick={handleBulkAddToPipeline}
                className="px-3 py-1.5 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.15)] text-[#F1F9A1] text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 animate-in fade-in"
                title="Colocar leads selecionados no Pipeline na etapa Primeiro Contato"
              >
                <Kanban className="w-3.5 h-3.5 text-[#F1F9A1]" />
                <span>Colocar no Pipeline ({selectedLeadIds.length})</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 animate-in fade-in"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Selecionados ({selectedLeadIds.length})</span>
              </button>
            </>
          )}

          <select
            value={selectedTemperature}
            onChange={(e) => setSelectedTemperature(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-xs text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B] appearance-none cursor-pointer"
          >
            <option value="todos">Todas Temperaturas</option>
            <option value="quente">🔥 Quente</option>
            <option value="morno">● Morno</option>
            <option value="frio">○ Frio</option>
          </select>

          <select
            value={selectedNiche}
            onChange={(e) => setSelectedNiche(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-xs text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B] appearance-none cursor-pointer max-w-[200px]"
          >
            <option value="todos">Todos os Nichos</option>
            {niches.map((n) => (
              <option key={n.id} value={n.name}>
                {n.name}
              </option>
            ))}
            <option value="Marmorarias / Marmoristas">Marmorarias / Marmoristas</option>
            <option value="Geral">Outro / Geral</option>
          </select>
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[rgba(218,241,222,0.06)] bg-[#07100F] text-[11px] font-mono text-[#65706A] uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    onClick={handleSelectAll}
                    className="text-[#9BA6A0] hover:text-[#E7ECE8] transition-colors"
                    title={
                      selectedLeadIds.length === filteredLeads.length
                        ? 'Desmarcar todos'
                        : 'Selecionar todos'
                    }
                  >
                    {selectedLeadIds.length > 0 &&
                    selectedLeadIds.length === filteredLeads.length ? (
                      <CheckSquare className="w-4 h-4 text-[#8EB69B]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#65706A]" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Segmento</th>
                <th className="py-3 px-4">Temperatura</th>
                <th className="py-3 px-4 text-center">Score IA</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
              {filteredLeads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                const pipelineOpp = opportunities.find((o) => o.lead_id === lead.id);
                const isInPipeline = !!pipelineOpp;

                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-[#10201E]/40 transition-colors group ${
                      isSelected ? 'bg-[#10201E]/70' : ''
                    }`}
                  >
                    {/* Checkbox de Seleção */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleSelectLead(lead.id)}
                        className="text-[#9BA6A0] hover:text-[#E7ECE8] transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#8EB69B]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#65706A]" />
                        )}
                      </button>
                    </td>

                    {/* Empresa (Apenas nome da empresa) */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-[#E7ECE8]">
                        {lead.company_name}
                      </span>
                    </td>

                    {/* Segmento */}
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono text-[#8EB69B] px-2 py-0.5 rounded bg-[#10201E] border border-[rgba(218,241,222,0.06)]">
                        {lead.segment}
                      </span>
                    </td>

                    {/* Temperatura */}
                    <td className="py-3.5 px-4">
                      <Badge temperature={lead.temperature}>
                        {lead.temperature === 'quente' && '🔥 Quente'}
                        {lead.temperature === 'morno' && '● Morno'}
                        {lead.temperature === 'frio' && '○ Frio'}
                        {lead.temperature === 'desqualificado' && '− Não qualificado'}
                      </Badge>
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                          lead.score >= 80
                            ? 'text-[#F1F9A1] bg-[#F1F9A1]/10'
                            : lead.score >= 60
                            ? 'text-[#8EB69B] bg-[#8EB69B]/10'
                            : 'text-[#9BA6A0] bg-[#10201E]'
                        }`}
                      >
                        {lead.score}
                      </span>
                    </td>

                    {/* Ações: WhatsApp, Instagram, Maps, Colocar no Pipeline, Gerar Mensagem & Excluir */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão Chamar no WhatsApp (Só a logo + adiciona ao Pipeline no 1º contato) */}
                        <button
                          type="button"
                          onClick={() => handleDirectWhatsApp(lead)}
                          className="p-1.5 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.12)] text-[#8EB69B] hover:text-[#E7ECE8] transition-all active:scale-95 flex items-center justify-center"
                          title={`Chamar ${lead.company_name} no WhatsApp (Inicia Primeiro Contato e insere no Pipeline)`}
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {/* Botão Instagram */}
                        <button
                          type="button"
                          onClick={() => openInstagramProfile(lead.instagram, lead.company_name)}
                          className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                            lead.instagram
                              ? 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.12)] text-[#8EB69B] hover:text-[#E7ECE8]'
                              : 'bg-[#10201E]/60 hover:bg-[#10201E] border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-[#9BA6A0]'
                          }`}
                          title={
                            lead.instagram
                              ? `Abrir Instagram de ${lead.company_name} (${lead.instagram})`
                              : 'Instagram não informado'
                          }
                        >
                          <Instagram className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Google Meu Negócio / Maps */}
                        <button
                          type="button"
                          onClick={() =>
                            openGoogleMapsProfile(
                              lead.google_business,
                              lead.company_name,
                              lead.city
                            )
                          }
                          className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                            lead.google_business
                              ? 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.12)] text-[#8EB69B] hover:text-[#E7ECE8]'
                              : 'bg-[#10201E]/60 hover:bg-[#10201E] border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-[#9BA6A0]'
                          }`}
                          title={
                            lead.google_business
                              ? `Abrir Google Meu Negócio / Maps (${lead.google_business})`
                              : `Ver ${lead.company_name} no Google Maps`
                          }
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Colocar no Pipeline */}
                        <button
                          type="button"
                          onClick={(e) => handleAddToPipeline(lead, e)}
                          className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                            isInPipeline
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                              : 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.12)] text-[#8EB69B] hover:text-[#F1F9A1]'
                          }`}
                          title={
                            isInPipeline
                              ? `Lead no Pipeline: etapa "${pipelineOpp?.stage_slug.replace('_', ' ')}"`
                              : 'Colocar no Pipeline na etapa "Primeiro Contato"'
                          }
                        >
                          <Kanban className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Gerar Mensagem (Anexo 1) */}
                        <button
                          type="button"
                          onClick={() => handleOpenMessageModal(lead)}
                          className="p-1.5 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.12)] text-[#8EB69B] hover:text-[#F1F9A1] transition-all active:scale-95 flex items-center justify-center"
                          title="Gerar Mensagem para WhatsApp"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#F1F9A1]" />
                        </button>

                        {/* Botão Excluir */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLead(lead.id, e)}
                          className="p-1.5 rounded-xl bg-[#10201E] hover:bg-red-500/20 text-[#65706A] hover:text-red-400 transition-colors"
                          title="Excluir lead"
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

        {filteredLeads.length === 0 && (
          <div className="p-12 text-center text-xs text-[#9BA6A0]">
            Nenhum lead encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {/* Modal Cadastrar Novo Lead (com Instagram, E-mail e Google Meu Negócio) */}
      <Modal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        title="Cadastrar Novo Lead"
        subtitle="Preencha os dados do lead para classificação e vinculação à sequência de nicho."
        maxWidth="md"
      >
        <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Nome do Contato</label>
            <input
              type="text"
              placeholder="Ex: Dr. Roberto Silva"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
            />
          </div>

          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Empresa / Razão Social</label>
            <input
              type="text"
              placeholder="Ex: Silva Odontologia Integrada"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Segmento / Nicho</label>
              <select
                value={newSegment}
                onChange={(e) => setNewSegment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B] appearance-none"
              >
                {niches.map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.name}
                  </option>
                ))}
                <option value="Marmorarias / Marmoristas">Marmorarias / Marmoristas</option>
                <option value="Geral">Outro / Geral</option>
              </select>
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Cidade</label>
              <input
                type="text"
                placeholder="Ex: São Paulo"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">WhatsApp / Telefone</label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={newWhatsapp}
                onChange={(e) => setNewWhatsapp(formatPhoneNumber(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B] font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">E-mail (opcional)</label>
              <input
                type="email"
                placeholder="contato@empresa.com.br"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Instagram (opcional)</label>
              <input
                type="text"
                placeholder="@empresa ou link"
                value={newInstagram}
                onChange={(e) => setNewInstagram(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>

            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Google Meu Negócio (opcional)</label>
              <input
                type="text"
                placeholder="Nome ou link no Google Maps"
                value={newGoogleBusiness}
                onChange={(e) => setNewGoogleBusiness(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsNewLeadModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Criar Lead
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Captar via Apify + IA */}
      <Modal
        isOpen={isApifyModalOpen}
        onClose={() => !isExtracting && setIsApifyModalOpen(false)}
        title="Captação de Leads via Apify + IA"
        subtitle="Extraia empresas e decisores locais do Google Maps e qualifique-os instantaneamente com notas de score e temperatura via IA."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[#9BA6A0] mb-1">Nicho Alvo</label>
              <select
                value={apifyNiche}
                onChange={(e) => setApifyNiche(e.target.value)}
                disabled={isExtracting}
                className="w-full bg-[#0C1A19] border border-[rgba(218,241,222,0.12)] rounded-xl px-3 py-2 text-xs text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B] appearance-none"
              >
                <option value="Contabilidade">Contabilidade</option>
                <option value="Clínicas / Odonto">Clínicas / Odonto</option>
                <option value="Advocacia">Advocacia</option>
                <option value="Marmorarias / Marmoristas">Marmorarias / Marmoristas</option>
                <option value="Engenharia & Arquitetura">Engenharia & Arquitetura</option>
                <option value="Imobiliárias">Imobiliárias</option>
                <option value="Geral">Geral</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[#9BA6A0] mb-1">Cidade / Região</label>
              <input
                type="text"
                value={apifyCity}
                onChange={(e) => setApifyCity(e.target.value)}
                disabled={isExtracting}
                placeholder="Ex: São Paulo, SP"
                className="w-full bg-[#0C1A19] border border-[rgba(218,241,222,0.12)] rounded-xl px-3 py-2 text-xs text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[#9BA6A0] mb-1">
              Apify API Token (Opcional)
            </label>
            <input
              type="password"
              value={apifyToken}
              onChange={(e) => setApifyToken(e.target.value)}
              disabled={isExtracting}
              placeholder="apify_api_... (deixe vazio para extração simulada)"
              className="w-full bg-[#0C1A19] border border-[rgba(218,241,222,0.12)] rounded-xl px-3 py-2 text-xs text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
            />
            <p className="text-[11px] text-[#65706A] mt-1">
              Caso vazio, o sistema simula a extração de contatos reais do Google Meu Negócio nos bairros comerciais da cidade.
            </p>
          </div>

          {extractionLog && (
            <div className="bg-[#10201E] border border-[rgba(218,241,222,0.08)] rounded-xl p-3 text-xs text-[#8EB69B] font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-[#F1F9A1] animate-pulse mr-2"></span>
              {extractionLog}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsApifyModalOpen(false)}
              disabled={isExtracting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApifyCapture}
              disabled={isExtracting || !apifyNiche || !apifyCity}
              className="gap-2"
            >
              {isExtracting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#07100F] border-t-transparent rounded-full animate-spin"></span>
                  <span>Extraindo & Qualificando...</span>
                </>
              ) : (
                <>
                  <CloudDownload className="w-3.5 h-3.5" />
                  <span>Iniciar Captação</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Importar Planilha com Qualificação IA */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportStats(null);
        }}
        title="Importação & Qualificação com IA"
        subtitle="Importe contatos via planilha CSV ou Excel (XLSX). A IA qualifica score, temperatura, nicho e serviços automaticamente."
      >
        <div className="space-y-4 text-xs">
          {!importStats ? (
            <div className="space-y-3">
              <label className="relative p-8 border-2 border-dashed border-[rgba(218,241,222,0.12)] hover:border-[rgba(218,241,222,0.3)] rounded-2xl flex flex-col items-center justify-center text-center bg-[#10201E]/40 cursor-pointer overflow-hidden transition-all group">
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleSpreadsheetUpload}
                  disabled={isImporting}
                />
                <FileSpreadsheet className="w-9 h-9 text-[#8EB69B] group-hover:text-[#F1F9A1] transition-colors mb-3" />
                <span className="text-xs font-medium text-[#E7ECE8] mb-1">
                  {isImporting
                    ? 'Processando e qualificando via IA...'
                    : 'Clique ou arraste sua planilha CSV / XLSX aqui'}
                </span>
                <span className="text-[11px] text-[#65706A]">
                  Reconhece colunas: Nome, Empresa, Telefone / WhatsApp, Cidade, Nicho, Email, Instagram e Google Meu Negócio
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsImportModalOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8EB69B]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importStats.count} leads importados e qualificados com sucesso!</span>
                </div>
                <p className="text-[11px] text-[#9BA6A0]">
                  Foram lidas {importStats.total} linhas da planilha. A Inteligência Artificial avaliou os contatos, calculou scores de 0 a 100, determinou a temperatura (Quente/Morno/Frio) e mapeou as ofertas recomendadas.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportStats(null);
                  }}
                >
                  Concluir e Ver Leads
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Gerar Mensagem WhatsApp (Anexo 1) */}
      <GenerateMessageModal
        isOpen={Boolean(messageTarget)}
        onClose={() => setMessageTarget(null)}
        target={messageTarget}
        onSent={handleMessageSent}
      />
    </div>
  );
}
