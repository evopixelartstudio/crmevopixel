import { Lead, Prospect, Temperature } from '@/types/database';
import { cleanPhoneNumber, formatWhatsAppNumber } from '@/lib/utils/whatsapp';
import { formatPhoneNumber } from '@/lib/utils';

export interface QualifyInput {
  name?: string;
  company_name?: string;
  phone?: string;
  whatsapp?: string;
  segment?: string;
  city?: string;
  state?: string;
  email?: string;
  role?: string;
  instagram?: string;
  google_business?: string;
}

export function detectNiche(text: string): string {
  const lower = (text || '').toLowerCase();
  if (lower.includes('odonto') || lower.includes('dent') || lower.includes('clinic') || lower.includes('estetic') || lower.includes('saud') || lower.includes('medic')) {
    return 'Clínicas / Odonto / Estética';
  }
  if (lower.includes('contab') || lower.includes('bpo') || lower.includes('fiscal') || lower.includes('tribut')) {
    return 'Contabilidade';
  }
  if (lower.includes('advoc') || lower.includes('jurid') || lower.includes('direit') || lower.includes('oab')) {
    return 'Advocacia / Jurídico';
  }
  if (lower.includes('marmor') || lower.includes('granit') || lower.includes('pedra') || lower.includes('rocha')) {
    return 'Marmorarias / Marmoristas';
  }
  if (lower.includes('engenhar') || lower.includes('construt') || lower.includes('arquit') || lower.includes('obra')) {
    return 'Engenharia & Arquitetura';
  }
  if (lower.includes('imobil') || lower.includes('corret') || lower.includes('imove')) {
    return 'Imobiliárias';
  }
  return text && text.trim() ? text.trim() : 'Geral';
}

export function getRecommendedServices(segment: string): string[] {
  const lower = (segment || '').toLowerCase();
  if (lower.includes('clínica') || lower.includes('clinica') || lower.includes('odonto') || lower.includes('estética')) {
    return ['Landing Page de Alta Conversão', 'Automação WhatsApp & Agendamento'];
  }
  if (lower.includes('contabil') || lower.includes('contabilidade') || lower.includes('bpo')) {
    return ['Follow-up Automático n8n', 'Site Institucional & SEO'];
  }
  if (lower.includes('advoc') || lower.includes('jurídic') || lower.includes('juridic')) {
    return ['Site Institucional de Autoridade', 'Google Meu Negócio & Reputação'];
  }
  if (lower.includes('marmor')) {
    return ['Catálogo Digital de Materiais', 'Captação Google Ads & WhatsApp'];
  }
  if (lower.includes('engenhar') || lower.includes('arquit')) {
    return ['Portfólio Institucional Premium', 'Campanhas de Geração de Demanda'];
  }
  return ['Site Institucional Responsivo', 'Automação WhatsApp n8n'];
}

export function qualifyLeadWithAI(input: QualifyInput): Omit<Lead, 'id'> {
  const segment = detectNiche(input.segment || input.company_name || '');
  const rawPhone = input.whatsapp || input.phone || '';
  const cleanedPhone = cleanPhoneNumber(rawPhone);
  const formattedPhone = cleanedPhone ? formatPhoneNumber(cleanedPhone) : rawPhone;

  let score = 65;
  if (cleanedPhone) score += 12;
  if (input.email && input.email.includes('@')) score += 8;
  if (input.city && input.city !== 'Não informada') score += 5;
  if (input.name && input.name !== input.company_name) score += 5;
  if (score > 96) score = 96;

  let temperature: Temperature = 'morno';
  if (score >= 80) temperature = 'quente';
  else if (score < 60) temperature = 'frio';

  const services = getRecommendedServices(segment);
  const company = (input.company_name || input.name || 'Empresa').trim();
  const contactName = (input.name || 'Decisor').trim();
  const city = (input.city || 'São Paulo').trim();

  return {
    name: contactName,
    company_name: company,
    role: input.role || 'Decisor Comercial',
    segment: segment,
    city: city,
    state: input.state || 'SP',
    email: input.email || '',
    instagram: input.instagram || '',
    google_business: input.google_business || '',
    phone: formattedPhone,
    whatsapp: formattedPhone,
    score: score,
    temperature: temperature,
    status: 'novo',
    services: services,
    next_action: `Iniciar abordagem consultiva via WhatsApp para ${services[0]}`,
    notes: `Lead qualificado automaticamente pela IA em ${new Date().toLocaleDateString('pt-BR')}.`,
    ai_analysis: {
      data_points: [
        `Contato: ${contactName} (${company})`,
        `Telefone verificado: ${formattedPhone || 'Pendente'}`,
        `Nicho detectado: ${segment}`,
        `Localização: ${city}`,
      ],
      inferences: [
        `Alta oportunidade para implementação imediata de ${services[0]}.`,
        'Perfil receptivo a ganhos de velocidade e qualificação de clientes no WhatsApp.',
      ],
      recommendations: [
        `Abordar via WhatsApp destacando a dor comum de empresas de ${segment}.`,
        `Apresentar proposta de ${services.join(' e ')}.`,
      ],
      main_hook: `Olá ${contactName}! Notei a relevância da ${company} em ${city} e como podemos alavancar sua captação com ${services[0]}.`,
      should_approach: true,
    },
  };
}

export function qualifyProspectWithAI(input: QualifyInput): Omit<Prospect, 'id'> {
  const segment = detectNiche(input.segment || input.company_name || '');
  const rawPhone = input.whatsapp || input.phone || '';
  const cleanedPhone = cleanPhoneNumber(rawPhone);
  const formattedPhone = cleanedPhone ? formatPhoneNumber(cleanedPhone) : rawPhone;

  let score = 65;
  if (cleanedPhone) score += 15;
  if (input.email && input.email.includes('@')) score += 5;
  if (input.city && input.city !== 'Não informada') score += 5;
  if (score > 95) score = 95;

  const services = getRecommendedServices(segment);
  const company = (input.company_name || input.name || 'Empresa').trim();
  const contactName = (input.name || company).trim();

  return {
    nome: contactName,
    empresa: company,
    segment: segment,
    email: input.email || '',
    telefone: formattedPhone,
    whatsapp: formattedPhone,
    cidade: input.city || 'São Paulo',
    estado: input.state || 'SP',
    icp_score: score,
    opportunity_score: Math.min(score + 5, 95),
    digital_presence_score: Math.max(score - 10, 45),
    source: 'Importação com IA',
    suggested_service: services[0],
    identified_signals: [
      `Empresa do nicho de ${segment}`,
      `Telefone comercial ativo detectado: ${formattedPhone || 'Pendente'}`,
      `Oportunidade primária: ${services[0]}`,
    ],
    status: score >= 80 ? 'priority' : 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

