'use client';

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { openWhatsApp, cleanPhoneNumber } from '@/lib/utils/whatsapp';

export interface TargetEntity {
  id?: string;
  name: string;
  company_name: string;
  phone?: string;
  whatsapp?: string;
  segment?: string;
  city?: string;
  state?: string;
  suggested_service?: string;
  services?: string[];
  role?: string;
}

interface GenerateMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetEntity | null;
  onSent?: (target: TargetEntity) => void;
}

export function GenerateMessageModal({
  isOpen,
  onClose,
  target,
  onSent,
}: GenerateMessageModalProps) {
  const [message, setMessage] = useState('');
  const [variationIndex, setVariationIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Generate templates based on target
  const generateTemplates = (item: TargetEntity): string[] => {
    const company = item.company_name || item.name || 'sua empresa';
    const contact = item.name && item.name !== item.company_name ? item.name.split(' ')[0] : '';
    const city = item.city && item.city !== 'Não informada' ? item.city : 'sua região';
    const niche = item.segment && item.segment !== 'Geral' ? item.segment : 'seu segmento';
    const service = item.suggested_service || (item.services && item.services[0]) || 'presença digital e automação';

    return [
      // Variação 1: Presença Digital, Site Profissional & Google (Idêntica ao estilo do Anexo 1)
      `Olá! Tudo bem? 😊\n\nMe chamo Oliveira e encontrei a *${company}* em ${city} durante uma pesquisa de mercado.\n\nNotei que a *${company}* ainda não possui um site próprio oficial. Hoje, ter um site profissional e bem posicionado é essencial para atrair novos clientes qualificados e transmitir credibilidade imediata.\n\nPosso ajudar a criar um site moderno, rápido e otimizado para o Google para destacar a *${company}* no topo da sua região.\n\nVocê teria 5 minutinhos essa semana para conversarmos sobre como atrair mais clientes?`,

      // Variação 2: Automação no WhatsApp & Velocidade de Resposta (n8n/IA)
      `Olá${contact ? ` ${contact}` : ''}! Tudo bem? 😊\n\nAqui é o Oliveira da EvoPixel. Vi a atuação de destaque da *${company}* no nicho de ${niche}.\n\nA maioria das empresas em ${city} perde até 40% das oportunidades por demorar para responder orçamentos no WhatsApp ou não ter uma triagem automática 24 horas.\n\nDesenvolvemos automações inteligentes e chatbots comerciais no WhatsApp que qualificam o lead na hora e já direcionam pronto para fechar.\n\nFaria sentido conversarmos 5 minutos esta semana para ver como aplicar isso na *${company}*?`,

      // Variação 3: Reputação, Google Meu Negócio & Avaliações
      `Olá${contact ? ` ${contact}` : ''}! Tudo bem? 😊\n\nEstava analisando empresas referências em ${niche} em ${city} e notei a presença da *${company}*.\n\nPercebi que a empresa tem potencial enorme para multiplicar contatos diários otimizando o perfil do Google e integrando com um fluxo direto de agendamento no WhatsApp.\n\nAjudamos empresas a estruturarem sua captação digital com ${service}.\n\nQual o melhor dia para trocarmos uma ideia rápida de 5 minutinhos?`,

      // Variação 4: Abordagem Direta & Consultiva
      `Olá${contact ? ` ${contact}` : ''}, bom dia! Tudo bem?\n\nSou o Oliveira, especialista em tecnologia e captação digital na EvoPixel.\n\nIdentifiquei oportunidades práticas para a *${company}* aumentar o volume de clientes e profissionalizar seu atendimento comercial online.\n\nPreparei um diagnóstico breve e gostaria de compartilhar com você sem compromisso.\n\nVocê teria disponibilidade para um alinhamento rápido de 5 minutos esta semana?`
    ];
  };

  useEffect(() => {
    if (target && isOpen) {
      const templates = generateTemplates(target);
      setMessage(templates[0]);
      setVariationIndex(0);
      setCopied(false);
      setPhoneInput(target.whatsapp || target.phone || '');
      setIsEditingPhone(!target.whatsapp && !target.phone);
    }
  }, [target, isOpen]);

  if (!isOpen || !target) return null;

  const templates = generateTemplates(target);

  const handleNextVariation = () => {
    const nextIdx = (variationIndex + 1) % templates.length;
    setVariationIndex(nextIdx);
    setMessage(templates[nextIdx]);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSendWhatsApp = () => {
    const effectivePhone = phoneInput.trim() || target.whatsapp || target.phone || '';
    if (!cleanPhoneNumber(effectivePhone)) {
      setIsEditingPhone(true);
      alert('Por favor, informe um número de WhatsApp válido com DDD para envio.');
      return;
    }

    const opened = openWhatsApp(effectivePhone, message);
    if (opened) {
      if (onSent && target) {
        onSent(target);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop com blur escuro elegante */}
      <div
        className="fixed inset-0 bg-[#050706]/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Caixa do Modal (Estilo fiel ao Anexo 1 adaptado ao design system) */}
      <div className="relative w-full max-w-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.14)] rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(218,241,222,0.08)] bg-[#07100F]/60">
          <div>
            <h2 className="text-base font-semibold text-[#E7ECE8] font-heading flex items-center gap-2">
              Mensagem para <span className="text-[#F1F9A1]">{target.company_name}</span>
            </h2>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Personalize, edite livremente ou gere novas abordagens com 1 clique
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo: Campo de Telefone & Textarea Editável */}
        <div className="p-6 space-y-4">
          {/* Status do Telefone do Lead */}
          <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.06)]">
            <div className="flex items-center gap-2">
              <WhatsAppIcon className="w-4 h-4 text-[#25D366] fill-current" />
              <span className="text-[#9BA6A0]">Destinatário:</span>
              {isEditingPhone ? (
                <input
                  type="text"
                  placeholder="(DDD) 99999-9999"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="px-2 py-0.5 rounded bg-[#10201E] border border-[rgba(218,241,222,0.2)] text-[#E7ECE8] font-mono text-xs focus:outline-none focus:border-[#25D366]"
                  autoFocus
                />
              ) : (
                <span className="font-mono text-[#E7ECE8] font-medium">
                  {phoneInput || 'Sem número informado'}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsEditingPhone(!isEditingPhone)}
              className="text-[11px] text-[#8EB69B] hover:text-[#F1F9A1] underline"
            >
              {isEditingPhone ? 'Salvar' : 'Alterar número'}
            </button>
          </div>

          {/* Textarea de Edição Direta */}
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={9}
              className="w-full p-4 rounded-2xl bg-[#07100F] border border-[rgba(218,241,222,0.12)] focus:border-[#8EB69B] text-[#E7ECE8] text-xs leading-relaxed focus:outline-none resize-none font-sans transition-all selection:bg-[#25D366]/30"
              placeholder="Digite ou edite a mensagem de abordagem..."
            />
            <div className="flex items-center justify-between text-[11px] text-[#65706A] px-1 pt-1">
              <span>{message.length} caracteres • Pronto para WhatsApp</span>
              <span className="font-mono text-[#8EB69B]">Variação {variationIndex + 1} de {templates.length}</span>
            </div>
          </div>
        </div>

        {/* Rodapé com os 3 botões (Exatamente como no Anexo 1) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[rgba(218,241,222,0.08)] bg-[#07100F]/60">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Botão Gerar Nova */}
            <button
              onClick={handleNextVariation}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[rgba(218,241,222,0.12)] text-[#E7ECE8] hover:text-[#F1F9A1] text-xs font-heading font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              title="Alternar para outra abordagem de mensagem"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#8EB69B]" />
              <span>Gerar nova</span>
            </button>

            {/* Botão Copiar */}
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border text-xs font-heading font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${
                copied
                  ? 'bg-[#163832] border-[#25D366]/50 text-[#F1F9A1]'
                  : 'bg-[#10201E] hover:bg-[#163832] border-[rgba(218,241,222,0.12)] text-[#E7ECE8] hover:text-[#F1F9A1]'
              }`}
              title="Copiar mensagem para a área de transferência"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8EB69B]" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* Botão Enviar no WhatsApp (Destaque Verde Oficial WhatsApp) */}
          <button
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-[#07100F] font-heading font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#25D366]/20 active:scale-95 hover:brightness-105"
            title="Abrir no WhatsApp com a mensagem pronta"
          >
            <WhatsAppIcon className="w-4 h-4 fill-current text-[#07100F]" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}

