'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowUpRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { dbService } from '@/lib/supabase/db-service';
import { formatGoogleMapsUrl, formatInstagramUrl } from '@/lib/utils/social-links';
import { cleanPhoneNumber, openWhatsApp } from '@/lib/utils/whatsapp';
import type { Lead } from '@/types/database';

type LeadState = { status: 'loading' | 'error' | 'not-found' } | { status: 'ready'; lead: Lead };

const statusLabels: Record<Lead['status'], string> = {
  novo: 'Novo', em_abordagem: 'Em abordagem', em_contato: 'Em contato', em_conversa: 'Em conversa',
  qualificado: 'Qualificado', desqualificado: 'Desqualificado', convertido: 'Convertido',
};

function formatDate(value?: string): string {
  if (!value) return 'Não informada';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleDateString('pt-BR');
}

function externalWebsite(value?: string): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

const contactLinkClass = 'break-all text-[#F1F9A1] underline decoration-[#F1F9A1]/30 underline-offset-4 hover:decoration-[#F1F9A1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F1F9A1]';

export default function LeadProfilePage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<LeadState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    async function loadLead() {
      try {
        const leads = await dbService.getLeads();
        if (!active) return;
        if (leads === null) { setState({ status: 'error' }); return; }
        const lead = leads.find(record => record.id === params.id);
        setState(lead ? { status: 'ready', lead } : { status: 'not-found' });
      } catch {
        if (active) setState({ status: 'error' });
      }
    }
    void loadLead();
    return () => { active = false; };
  }, [params.id, requestVersion]);

  const backLink = (
    <Link href="/leads" className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm text-[#9BA6A0] transition-colors hover:text-[#E7ECE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F1F9A1]">
      <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Voltar para Leads
    </Link>
  );

  if (state.status !== 'ready') {
    return (
      <div className="space-y-6">
        {backLink}
        <Card className="max-w-3xl py-8" role={state.status === 'error' ? 'alert' : 'status'}>
          {state.status === 'loading' ? (
            <p className="flex items-center gap-2 text-sm text-[#9BA6A0]">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Carregando cadastro do lead…
            </p>
          ) : state.status === 'error' ? (
            <div className="space-y-3">
              <h1 className="font-heading text-xl font-semibold text-[#E7ECE8]">Não foi possível carregar o lead</h1>
              <p className="text-sm text-[#9BA6A0]">Confira sua conexão e tente novamente.</p>
              <Button onClick={() => setRequestVersion(version => version + 1)}>Tentar novamente</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <h1 className="font-heading text-xl font-semibold text-[#E7ECE8]">Lead não encontrado</h1>
              <p className="text-sm text-[#9BA6A0]">Este cadastro não está disponível. Volte para a lista e faça uma nova busca.</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const { lead } = state;
  const whatsapp = lead.whatsapp || lead.phone;
  const instagramUrl = formatInstagramUrl(lead.instagram);
  const mapsUrl = formatGoogleMapsUrl(lead.google_business, lead.company_name, lead.city);
  const websiteUrl = externalWebsite(lead.website);
  const location = [lead.city, lead.state].filter(Boolean).join(' / ');
  const notes = lead.notes?.replace(/<!--METADATA:[\s\S]*?-->/g, '').trim();

  return (
    <div className="space-y-6 pb-6">
      {backLink}
      <header className="flex flex-col justify-between gap-5 border-b border-[rgba(218,241,222,0.08)] pb-6 sm:flex-row sm:items-center">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words font-heading text-2xl font-semibold tracking-tight text-[#E7ECE8] sm:text-3xl">{lead.name || lead.company_name || 'Lead sem nome'}</h1>
          <p className="break-words text-base text-[#9BA6A0]">{lead.company_name || 'Empresa não informada'}</p>
        </div>
        {whatsapp && cleanPhoneNumber(whatsapp) && (
          <Button variant="primary" className="shrink-0 self-start sm:self-auto" onClick={() => openWhatsApp(whatsapp)}>
            <WhatsAppIcon className="h-4 w-4" aria-hidden="true" /> Conversar no WhatsApp
          </Button>
        )}
      </header>

      <Card className="max-w-5xl">
        <h2 className="mb-5 font-heading text-base font-medium tracking-tight text-[#E7ECE8]">Dados do cadastro</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Nome</dt><dd className="break-words text-[#E7ECE8]">{lead.name || 'Não informado'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Empresa</dt><dd className="break-words text-[#E7ECE8]">{lead.company_name || 'Não informada'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Nicho</dt><dd className="break-words text-[#E7ECE8]">{lead.segment || 'Não informado'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Cidade / UF</dt><dd className="break-words text-[#E7ECE8]">{location || 'Não informada'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Telefone</dt><dd className="text-[#E7ECE8]">{lead.phone ? <a className={contactLinkClass} href={`tel:${cleanPhoneNumber(lead.phone)}`}>{lead.phone}</a> : 'Não informado'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">WhatsApp</dt><dd className="break-all text-[#E7ECE8]">{lead.whatsapp || 'Não informado'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">E-mail</dt><dd className="text-[#E7ECE8]">{lead.email ? <a className={contactLinkClass} href={`mailto:${encodeURIComponent(lead.email)}`}>{lead.email}</a> : 'Não informado'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Status</dt><dd className="text-[#E7ECE8]">{statusLabels[lead.status] || lead.status || 'Não informado'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Temperatura</dt><dd className="capitalize text-[#E7ECE8]">{lead.temperature || 'Não informada'}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Instagram</dt><dd>{instagramUrl ? <a className={contactLinkClass} href={instagramUrl} target="_blank" rel="noopener noreferrer">Abrir Instagram <ArrowUpRight className="inline h-3.5 w-3.5" aria-hidden="true" /></a> : <span className="text-[#E7ECE8]">Não informado</span>}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Google Maps</dt><dd>{mapsUrl ? <a className={contactLinkClass} href={mapsUrl} target="_blank" rel="noopener noreferrer">{lead.google_business ? 'Abrir localização' : 'Buscar empresa no Maps'} <ArrowUpRight className="inline h-3.5 w-3.5" aria-hidden="true" /></a> : <span className="text-[#E7ECE8]">Não informado</span>}</dd></div>
          <div className="min-w-0"><dt className="mb-1 text-[#9BA6A0]">Site</dt><dd>{websiteUrl ? <a className={contactLinkClass} href={websiteUrl} target="_blank" rel="noopener noreferrer">{lead.website} <ArrowUpRight className="inline h-3.5 w-3.5" aria-hidden="true" /></a> : <span className="text-[#E7ECE8]">Não informado</span>}</dd></div>
        </dl>
      </Card>

      <section className="max-w-5xl space-y-6 border-t border-[rgba(218,241,222,0.08)] pt-6 text-sm">
        <div>
          <h2 className="mb-2 font-heading text-base font-medium text-[#E7ECE8]">Próxima ação</h2>
          <p className="max-w-prose whitespace-pre-wrap break-words leading-relaxed text-[#E7ECE8]">{lead.next_action || 'Nenhuma próxima ação cadastrada.'}</p>
          {lead.next_action_at && <p className="mt-2 text-[#9BA6A0]">Data: {formatDate(lead.next_action_at)}</p>}
        </div>
        <div>
          <h2 className="mb-2 font-heading text-base font-medium text-[#E7ECE8]">Observações</h2>
          <p className="max-w-prose whitespace-pre-wrap break-words leading-relaxed text-[#9BA6A0]">{notes || 'Nenhuma observação cadastrada.'}</p>
        </div>
      </section>
    </div>
  );
}
