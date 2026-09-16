'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Lead, Temperature } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  Search,
  Plus,
  Flame,
  ArrowUpRight,
  Sparkles,
  Trash2,
} from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(() => crmService.getLeads());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState<string>('todos');
  const [selectedNiche, setSelectedNiche] = useState<string>('todos');
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newSegment, setNewSegment] = useState('Contabilidade');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newCity, setNewCity] = useState('');

  const niches = crmService.getNiches();

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newName.trim()) {
      alert('Por favor, informe ao menos o Nome e a Empresa.');
      return;
    }

    const created = crmService.addLead({
      name: newName.trim(),
      company_name: newCompany.trim(),
      role: 'Decisor',
      segment: newSegment,
      city: newCity.trim() || 'São Paulo',
      state: 'SP',
      whatsapp: newWhatsapp.trim() || '5511999999999',
      score: 80,
      temperature: 'quente',
      status: 'novo',
      services: newSegment === 'Contabilidade'
        ? ['Follow-up Automático n8n', 'Site Institucional']
        : newSegment === 'Clínicas / Odonto / Estética'
        ? ['Landing Page de Alta Conversão', 'Automação WhatsApp & Atendimento']
        : ['Site Institucional', 'Google Meu Negócio & Otimização Local'],
      next_action: 'Iniciar abordagem personalizada',
    });

    setLeads([...crmService.getLeads()]);
    setNewName('');
    setNewCompany('');
    setNewWhatsapp('');
    setNewCity('');
    setIsNewLeadModalOpen(false);
  };

  const handleDeleteLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente remover este lead?')) {
      crmService.deleteLead(id);
      setLeads([...crmService.getLeads()]);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTemp =
      selectedTemperature === 'todos' || lead.temperature === selectedTemperature;

    const matchesNiche =
      selectedNiche === 'todos' || lead.segment === selectedNiche;

    return matchesSearch && matchesTemp && matchesNiche;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" />
            Base de Contatos & Qualificação
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Leads Comerciais
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Acompanhe o score, nicho classificado, serviços identificados e a sequência de abordagem vinculada.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/prospeccao">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8EB69B]" />
              <span>Prospecção IA</span>
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsNewLeadModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Adicionar Lead</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros & Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8EB69B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por nome, empresa ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] focus:border-[rgba(218,241,222,0.2)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Filtro de Temperatura */}
          <select
            value={selectedTemperature}
            onChange={(e) => setSelectedTemperature(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
          >
            <option value="todos">Todas as Temperaturas</option>
            <option value="quente">🔥 Quente</option>
            <option value="morno">● Morno</option>
            <option value="frio">○ Frio</option>
            <option value="desqualificado">− Não qualificado</option>
          </select>

          {/* Filtro de Nicho / Segmento */}
          <select
            value={selectedNiche}
            onChange={(e) => setSelectedNiche(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
          >
            <option value="todos">Todos os Nichos</option>
            {niches.map((n) => (
              <option key={n.id} value={n.name}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Leads (Seção 15) */}
      <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(218,241,222,0.06)] bg-[#07100F]/60 text-[11px] font-heading font-medium text-[#65706A] uppercase tracking-wider">
                <th className="py-3.5 px-4">Nome & Empresa</th>
                <th className="py-3.5 px-4">Segmento / Nicho</th>
                <th className="py-3.5 px-4">Temperatura</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4">Serviços Identificados</th>
                <th className="py-3.5 px-4">Próxima Ação</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(218,241,222,0.04)] text-xs">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-[#10201E]/50 transition-colors group"
                >
                  {/* Nome & Empresa */}
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-[#E7ECE8] group-hover:text-[#F1F9A1] transition-colors flex items-center gap-1.5"
                    >
                      <span>{lead.company_name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <div className="text-[11px] text-[#9BA6A0] mt-0.5">
                      {lead.name} • {lead.city}/{lead.state}
                    </div>
                  </td>

                  {/* Segmento / Nicho */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8EB69B]">
                      {lead.segment}
                    </span>
                    {lead.sequence_progress && (
                      <div className="text-[10px] text-[#65706A] truncate max-w-[140px]">
                        Seq: {lead.sequence_progress.status}
                      </div>
                    )}
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

                  {/* Serviços Identificados */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {lead.services.map((srv, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-[#10201E] text-[#9BA6A0] border border-[rgba(218,241,222,0.06)] truncate max-w-[160px]"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Próxima Ação */}
                  <td className="py-3.5 px-4 text-[11px] text-[#9BA6A0] max-w-xs">
                    <div className="truncate">{lead.next_action || 'Nenhuma ação pendente'}</div>
                  </td>

                  {/* Botão Ação & Exclusão */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5">
                          Ver Perfil
                        </Button>
                      </Link>
                      <button
                        onClick={(e) => handleDeleteLead(lead.id, e)}
                        className="p-1 rounded text-[#65706A] hover:text-red-400 transition-colors"
                        title="Remover lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="p-8 text-center text-xs text-[#9BA6A0]">
            Nenhum lead localizado com os filtros selecionados.
          </div>
        )}
      </div>

      {/* Modal Adicionar Lead */}
      <Modal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        title="Cadastrar Novo Lead"
        subtitle="Preencha os dados do lead para classificação e vinculação à sequência de nicho."
      >
        <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Nome do Contato *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Carlos Eduardo"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Nome da Empresa *</label>
            <input
              type="text"
              required
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Ex: Alpha Contabilidade"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Segmento / Nicho</label>
              <select
                value={newSegment}
                onChange={(e) => setNewSegment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                {niches.map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">WhatsApp</label>
              <input
                type="text"
                value={newWhatsapp}
                onChange={(e) => setNewWhatsapp(e.target.value)}
                placeholder="(11) 98888-7777"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Cidade</label>
            <input
              type="text"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Ex: São Paulo"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsNewLeadModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Salvar Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
