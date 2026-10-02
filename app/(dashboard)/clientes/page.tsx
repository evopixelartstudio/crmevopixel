'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { Button } from '@/components/ui/Button';
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  Mail,
  Globe,
  ExternalLink,
  Instagram,
  MapPin,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { openWhatsApp, cleanPhoneNumber } from '@/lib/utils/whatsapp';
import { openInstagramProfile, openGoogleMapsProfile } from '@/lib/utils/social-links';
import { formatPhoneNumber } from '@/lib/utils';

function formatExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatDisplayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

export default function ClientesPage() {
  useCrmSync();
  const clients = crmService.getClients();
  const leads = crmService.getLeads();
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cSegment, setCSegment] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cWebsite, setCWebsite] = useState('');
  const [cInstagram, setCInstagram] = useState('');
  const [cGoogleBusiness, setCGoogleBusiness] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const findLinkedLead = (companyName?: string, clientName?: string) => {
    const normComp = (companyName || '').trim().toLowerCase();
    const normName = (clientName || '').trim().toLowerCase();
    return leads.find(
      (l) =>
        (normComp && (l.company_name || '').trim().toLowerCase() === normComp) ||
        (normName && (l.name || '').trim().toLowerCase() === normName)
    );
  };

  const handleAddClient = () => {
    if (!cCompany || !cName) {
      alert('Preencha ao menos o Nome e a Empresa.');
      return;
    }

    const payload = {
      name: cName,
      company_name: cCompany,
      segment: cSegment || 'Geral',
      projects_count: 0,
      lifetime_value: 0,
      total_pending: 0,
      total_contracted: 0,
      total_received: 0,
      status: 'ativo' as const,
      cross_sell_opportunities: [],
      phone: cPhone,
      email: cEmail,
      website_url: cWebsite.trim() || undefined,
      instagram: cInstagram.trim() || undefined,
      google_business: cGoogleBusiness.trim() || undefined,
    };

    if (editId) {
      const existingClient = clients.find((c) => c.id === editId);
      crmService.updateClient(editId, {
        ...payload,
        projects_count: existingClient?.projects_count || 0,
        lifetime_value: existingClient?.lifetime_value || 0,
        total_pending: existingClient?.total_pending || 0,
        total_contracted: existingClient?.total_contracted || 0,
        total_received: existingClient?.total_received || 0,
      });
    } else {
      crmService.addClient(payload);
    }

    closeModal();
  };

  const handleEdit = (client: any) => {
    const websites = crmService.getClientWebsites(client.company_name, client.website_url);
    const linkedLead = findLinkedLead(client.company_name, client.name);
    setEditId(client.id);
    setCName(client.name);
    setCCompany(client.company_name);
    setCSegment(client.segment);
    setCEmail(client.email || linkedLead?.email || '');
    setCPhone(client.phone || linkedLead?.whatsapp || linkedLead?.phone || '');
    setCWebsite(client.website_url || websites[0] || '');
    setCInstagram(client.instagram || linkedLead?.instagram || '');
    setCGoogleBusiness(client.google_business || linkedLead?.google_business || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      crmService.deleteClient(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setCName('');
    setCCompany('');
    setCSegment('');
    setCEmail('');
    setCPhone('');
    setCWebsite('');
    setCInstagram('');
    setCGoogleBusiness('');
  };

  const handleDirectWhatsApp = (phone?: string, companyName?: string, clientObj?: any) => {
    if (!phone || !cleanPhoneNumber(phone)) {
      if (
        confirm(
          `O cliente "${companyName}" ainda não possui telefone/WhatsApp cadastrado. Deseja cadastrar agora?`
        )
      ) {
        handleEdit(clientObj);
      }
      return;
    }
    openWhatsApp(phone);
  };

  const handleDirectInstagram = (instagram?: string, companyName?: string, clientObj?: any) => {
    openInstagramProfile(instagram, companyName, () => {
      if (
        confirm(
          `O cliente "${companyName}" ainda não possui Instagram cadastrado. Deseja cadastrar agora?`
        )
      ) {
        handleEdit(clientObj);
      }
    });
  };

  const handleDirectMaps = (
    googleBusiness?: string,
    companyName?: string,
    city?: string
  ) => {
    openGoogleMapsProfile(googleBusiness, companyName, city);
  };

  const filteredClients = clients.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.segment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.website_url && c.website_url.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5 text-[#F1F9A1]" />
            Gestão de Carteira &amp; Clientes
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Clientes da EvoPixel
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Lista consolidada de clientes, sites entregues, Lifetime Value, contato direto via WhatsApp, Instagram e Google Meu Negócio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 text-[#8EB69B] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por cliente, empresa, segmento, site, telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
        />
      </div>

      {/* Lista / Tabela de Clientes */}
      <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[rgba(218,241,222,0.06)] bg-[#07100F] text-[11px] font-mono text-[#65706A] uppercase tracking-wider">
                <th className="py-3 px-4">Cliente / Empresa</th>
                <th className="py-3 px-4">Segmento</th>
                <th className="py-3 px-4">Site / Link</th>
                <th className="py-3 px-4">Telefone / WhatsApp</th>
                <th className="py-3 px-4 text-right">Lifetime Value</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
              {filteredClients.map((client) => {
                const websites = crmService.getClientWebsites(client.company_name, client.website_url);
                const primaryWebsite = websites[0];
                const linkedLead = findLinkedLead(client.company_name, client.name);
                const clientPhone = client.phone || client.whatsapp || linkedLead?.whatsapp || linkedLead?.phone;
                const clientInstagram = client.instagram || linkedLead?.instagram;
                const clientGoogleBusiness = client.google_business || linkedLead?.google_business;

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-[#10201E]/40 transition-colors group"
                  >
                    {/* Empresa e Contato */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/clientes/${client.id}`}
                        className="font-medium text-[#E7ECE8] group-hover:text-[#F1F9A1] transition-colors flex items-center gap-1.5"
                      >
                        <span>{client.company_name}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="text-[11px] text-[#9BA6A0] mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{client.name}</span>
                        {client.email && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#65706A]">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Segmento */}
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono text-[#8EB69B] px-2 py-0.5 rounded bg-[#10201E] border border-[rgba(218,241,222,0.06)]">
                        {client.segment}
                      </span>
                    </td>

                    {/* Site / Link */}
                    <td className="py-3.5 px-4">
                      {primaryWebsite ? (
                        <div className="flex flex-col gap-1 items-start">
                          {websites.map((url, idx) => (
                            <a
                              key={idx}
                              href={formatExternalUrl(url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.1)] text-[#F1F9A1] font-mono text-[11px] transition-colors"
                              title={url}
                            >
                              <Globe className="w-3 h-3 text-[#8EB69B] shrink-0" />
                              <span className="max-w-[150px] truncate">{formatDisplayUrl(url)}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#65706A] italic text-[11px]">Sem site vinculado</span>
                      )}
                    </td>

                    {/* Telefone / WhatsApp */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {clientPhone ? (
                        <span className="text-[#8EB69B]">{clientPhone}</span>
                      ) : (
                        <span className="text-[#65706A] italic">Não informado</span>
                      )}
                    </td>

                    {/* LTV */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#F1F9A1]">
                      R$ {(client.lifetime_value || 0).toLocaleString('pt-BR')}
                    </td>

                    {/* Ações: WhatsApp, Instagram, Maps, Editar e Excluir */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleDirectWhatsApp(clientPhone, client.company_name, client)}
                          className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                            clientPhone
                              ? 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                              : 'bg-[#10201E]/60 hover:bg-[#10201E] border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-[#9BA6A0]'
                          }`}
                          title={clientPhone ? `Chamar ${client.company_name} no WhatsApp` : 'Adicionar WhatsApp'}
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {/* Botão Instagram */}
                        <button
                          type="button"
                          onClick={() => handleDirectInstagram(clientInstagram, client.company_name, client)}
                          className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                            clientInstagram
                              ? 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                              : 'bg-[#10201E]/60 hover:bg-[#10201E] border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-[#9BA6A0]'
                          }`}
                          title={
                            clientInstagram
                              ? `Abrir Instagram de ${client.company_name} (${clientInstagram})`
                              : 'Cadastrar ou abrir Instagram do cliente'
                          }
                        >
                          <Instagram className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Google Maps / Google Meu Negócio */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectMaps(
                              clientGoogleBusiness,
                              client.company_name,
                              linkedLead?.city
                            )
                          }
                          className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                            clientGoogleBusiness
                              ? 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.1)] text-[#8EB69B] hover:text-[#E7ECE8]'
                              : 'bg-[#10201E]/60 hover:bg-[#10201E] border-[rgba(218,241,222,0.06)] text-[#65706A] hover:text-[#9BA6A0]'
                          }`}
                          title={
                            clientGoogleBusiness
                              ? `Abrir Google Meu Negócio / Maps (${clientGoogleBusiness})`
                              : `Ver ${client.company_name} no Google Maps`
                          }
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Editar */}
                        <button
                          type="button"
                          onClick={() => handleEdit(client)}
                          className="p-1.5 rounded-xl bg-[#10201E] hover:bg-[#163832] text-[#8EB69B] hover:text-[#E7ECE8] transition-colors"
                          title="Editar cliente"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Excluir */}
                        <button
                          type="button"
                          onClick={() => handleDelete(client.id)}
                          className="p-1.5 rounded-xl bg-[#10201E] hover:bg-red-500/20 text-[#65706A] hover:text-red-400 transition-colors"
                          title="Excluir cliente"
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

        {filteredClients.length === 0 && (
          <div className="p-12 text-center text-xs text-[#9BA6A0]">
            Nenhum cliente encontrado com os critérios de busca.
          </div>
        )}
      </div>

      {/* Modal Cadastrar / Editar Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
        subtitle={
          editId
            ? 'Altere os dados básicos e links sociais do cliente'
            : 'Preencha os dados básicos do novo cliente'
        }
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">
                Nome do Cliente / Contato *
              </label>
              <input
                type="text"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                placeholder="Ex: Dra Dulce"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">
                Empresa / Razão Social *
              </label>
              <input
                type="text"
                value={cCompany}
                onChange={(e) => setCCompany(e.target.value)}
                placeholder="Ex: Dulce Guerra Advocacia"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">
                Segmento / Nicho
              </label>
              <select
                value={cSegment}
                onChange={(e) => setCSegment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs appearance-none"
              >
                <option value="" disabled>
                  Selecione um Nicho
                </option>
                <option value="Geral">Geral</option>
                {crmService.getNiches().map((niche) => (
                  <option key={niche.id} value={niche.name}>
                    {niche.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">
                Link do Site
              </label>
              <input
                type="url"
                value={cWebsite}
                onChange={(e) => setCWebsite(e.target.value)}
                placeholder="Ex: https://dulceguerraadvocacia.com.br"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">
                Instagram (@perfil ou link)
              </label>
              <input
                type="text"
                value={cInstagram}
                onChange={(e) => setCInstagram(e.target.value)}
                placeholder="Ex: @dulceguerraadvocacia"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">
                Google Meu Negócio / Link Maps
              </label>
              <input
                type="text"
                value={cGoogleBusiness}
                onChange={(e) => setCGoogleBusiness(e.target.value)}
                placeholder="Link do Maps ou nome da ficha"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                placeholder="contato@empresa.com"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--evo-muted)] mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={cPhone}
                onChange={(e) => setCPhone(formatPhoneNumber(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none focus:border-[#8EB69B] text-xs font-mono"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--evo-border)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={closeModal}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddClient}>
              {editId ? 'Salvar Alterações' : 'Salvar Cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}