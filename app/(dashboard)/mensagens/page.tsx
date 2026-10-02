'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { useCrmSync } from '@/lib/hooks/useCrmSync';
import { Lead } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { openWhatsApp, cleanPhoneNumber } from '@/lib/utils/whatsapp';
import {
  MessageSquare,
  Search,
  Send,
  Sparkles,
  QrCode,
  Check,
  CheckCheck,
  Phone,
  ArrowUpRight,
  Kanban,
  User,
  Paperclip,
  Smile,
  RefreshCw,
  Plus,
  Wifi,
  WifiOff,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Info,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'contact';
  text: string;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  leadId?: string;
  contactName: string;
  companyName: string;
  phone: string;
  segment?: string;
  temperature?: 'quente' | 'morno' | 'frio' | 'desqualificado';
  score?: number;
  unreadCount: number;
  lastMessage: string;
  lastTime: string;
  messages: ChatMessage[];
  isOnline?: boolean;
}

export default function MensagensWhatsAppPage() {
  useCrmSync();
  const leads = crmService.getLeads();
  const opportunities = crmService.getOpportunities();

  // Estado da Conexão WhatsApp (API Não Oficial - Evolution / Baileys)
  const [connectionStatus, setConnectionStatus] = useState<'conectado' | 'desconectado' | 'conectando'>('conectado');
  const [instanceName, setInstanceName] = useState('evocrm-prod');
  const [connectedNumber, setConnectedNumber] = useState('(11) 98765-4321');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrTimer, setQrTimer] = useState(45);

  // Conversas & Chat Ativo
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'todas' | 'nao_lidas' | 'quentes'>('todas');
  const [inputText, setInputText] = useState('');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar conversas a partir dos Leads do CRM
  useEffect(() => {
    const savedChats = localStorage.getItem('evocrm_whatsapp_chats');
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveChatId(parsed[0].id);
          return;
        }
      } catch (e) {}
    }

    // Criar conversas iniciais com os leads do CRM
    const initialConversations: Conversation[] = leads.slice(0, 12).map((lead, idx) => {
      const now = new Date();
      const hoursAgo = idx * 2;
      const messageTime = new Date(now.getTime() - hoursAgo * 3600000);
      const timeStr = `${String(messageTime.getHours()).padStart(2, '0')}:${String(messageTime.getMinutes()).padStart(2, '0')}`;

      const msgs: ChatMessage[] = [
        {
          id: `msg-1-${lead.id}`,
          sender: 'user',
          text: `Olá ${lead.name || lead.company_name}, tudo bem? Aqui é da EvoPixel. Identifiquei oportunidades para aumentar o faturamento da ${lead.company_name} através de automação comercial e presença digital otimizada. Você teria 5 minutos para conversar?`,
          time: timeStr,
          status: 'read',
        },
      ];

      if (idx === 0) {
        msgs.push({
          id: `msg-2-${lead.id}`,
          sender: 'contact',
          text: 'Olá! Tudo ótimo por aqui. Tenho interesse sim, como funciona essa automação no WhatsApp?',
          time: `${String(new Date().getHours()).padStart(2, '0')}:${String(Math.max(0, new Date().getMinutes() - 5)).padStart(2, '0')}`,
        });
      }

      return {
        id: lead.id,
        leadId: lead.id,
        contactName: lead.name || 'Contato Comercial',
        companyName: lead.company_name,
        phone: lead.whatsapp || lead.phone || '(11) 9' + Math.floor(10000000 + Math.random() * 90000000),
        segment: lead.segment,
        temperature: lead.temperature,
        score: lead.score,
        unreadCount: idx === 0 ? 1 : 0,
        lastMessage: msgs[msgs.length - 1].text,
        lastTime: timeStr,
        messages: msgs,
        isOnline: idx < 3,
      };
    });

    if (initialConversations.length > 0) {
      setConversations(initialConversations);
      setActiveChatId(initialConversations[0].id);
      localStorage.setItem('evocrm_whatsapp_chats', JSON.stringify(initialConversations));
    }
  }, [leads.length]);

  // Salvar no localStorage sempre que as conversas mudarem
  const saveChats = (updated: Conversation[]) => {
    setConversations(updated);
    try {
      localStorage.setItem('evocrm_whatsapp_chats', JSON.stringify(updated));
    } catch (e) {}
  };

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, conversations]);

  // Contagem regressiva do QR Code
  useEffect(() => {
    if (!isQrModalOpen) return;
    setQrTimer(45);
    const interval = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isQrModalOpen]);

  const activeChat = conversations.find((c) => c.id === activeChatId) || conversations[0];
  const activeLead = activeChat?.leadId ? leads.find((l) => l.id === activeChat.leadId) : null;
  const activeOpp = activeChat?.leadId ? opportunities.find((o) => o.lead_id === activeChat.leadId) : null;

  // Enviar Mensagem
  const handleSendMessage = () => {
    if (!inputText.trim() || !activeChat) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const textToSend = inputText.trim();

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: timeStr,
      status: 'sent',
    };

    // Registrar no CRM Service
    if (activeChat.leadId) {
      crmService.addMessageLog({
        lead_id: activeChat.leadId,
        channel: 'whatsapp',
        sent_text: textToSend,
        direction: 'enviada',
        sent_at: new Date().toISOString(),
        source: 'manual',
        status: 'entregue',
      });
    }

    const updated = conversations.map((conv) => {
      if (conv.id === activeChat.id) {
        return {
          ...conv,
          lastMessage: textToSend,
          lastTime: timeStr,
          messages: [...conv.messages, newMsg],
        };
      }
      return conv;
    });

    saveChats(updated);
    setInputText('');

    // Atualiza status para entregue após 600ms
    setTimeout(() => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === activeChat.id) {
            return {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === newMsg.id ? { ...m, status: 'delivered' } : m
              ),
            };
          }
          return conv;
        })
      );
    }, 600);

    // Resposta simulada para manter interatividade se o contato for um lead ativo
    if (connectionStatus === 'conectado') {
      setTimeout(() => {
        const replyTime = new Date();
        const replyTimeStr = `${String(replyTime.getHours()).padStart(2, '0')}:${String(replyTime.getMinutes()).padStart(2, '0')}`;
        const autoResponses = [
          'Perfeito! Vamos marcar uma demonstração sim.',
          'Entendido! Pode me enviar uma proposta com os valores?',
          'Vou alinhar com meu sócio e te retorno ainda hoje.',
          'Obrigado pelo retorno rápido, achei a ideia muito boa.',
        ];
        const randomReply = autoResponses[Math.floor(Math.random() * autoResponses.length)];

        const replyMsg: ChatMessage = {
          id: `reply-${Date.now()}`,
          sender: 'contact',
          text: randomReply,
          time: replyTimeStr,
        };

        setConversations((prev) => {
          const next = prev.map((conv) => {
            if (conv.id === activeChat.id) {
              return {
                ...conv,
                lastMessage: randomReply,
                lastTime: replyTimeStr,
                unreadCount: 0,
                messages: conv.messages.map((m) => (m.id === newMsg.id ? { ...m, status: 'read' } : m)).concat(replyMsg),
              };
            }
            return conv;
          });
          localStorage.setItem('evocrm_whatsapp_chats', JSON.stringify(next));
          return next;
        });
      }, 2500);
    }
  };

  // Simular Conexão QR Code
  const handleSimulateQrScan = () => {
    setConnectionStatus('conectando');
    setIsQrModalOpen(false);
    setTimeout(() => {
      setConnectionStatus('conectado');
      setConnectedNumber('(11) 98765-4321');
      alert('WhatsApp conectado com sucesso via Evolution API (Sessão evocrm-prod)!');
    }, 1500);
  };

  // Templates de Abordagem Rápida
  const QUICK_TEMPLATES = [
    {
      title: 'Presença Digital & Site Oficial',
      text: `Olá ${activeChat?.contactName || ''}! Notei que a ${activeChat?.companyName || 'sua empresa'} tem excelente atuação na região, mas ainda não possui um portal institucional otimizado para o Google. Podemos conversar 5 minutinhos sobre como criar um canal de vendas oficial?`,
    },
    {
      title: 'Automação Comercial WhatsApp (24h)',
      text: `Olá ${activeChat?.contactName || ''}! Passando para compartilhar um dado rápido: empresas do seu nicho perdem até 40% das vendas por demora na resposta no WhatsApp. Estruturamos fluxos de triagem e agendamento instantâneo. Faz sentido avaliar?`,
    },
    {
      title: 'Follow-up de Proposta',
      text: `Olá ${activeChat?.contactName || ''}! Tudo bem? Gostaria de saber se conseguiu avaliar a proposta comercial que enviamos. Tem alguma dúvida em relação ao escopo ou aos prazos de implantação?`,
    },
    {
      title: 'Confirmação de Reunião de Diagnóstico',
      text: `Olá ${activeChat?.contactName || ''}! Confirmando nossa conversa rápida de diagnóstico para alinharmos os objetivos da ${activeChat?.companyName || 'empresa'}. Fica melhor pela manhã ou à tarde?`,
    },
  ];

  const filteredConversations = conversations.filter((c) => {
    const matchesQuery =
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;
    if (chatFilter === 'nao_lidas') return c.unreadCount > 0;
    if (chatFilter === 'quentes') return c.temperature === 'quente';
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Cabeçalho de Conexão WhatsApp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--evo-border)] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <WhatsAppIcon className="w-3.5 h-3.5 fill-[#25D366]" />
            Comunicação em Tempo Real • API Não Oficial
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[var(--evo-text)] font-heading">
            Chat WhatsApp
          </h1>
          <p className="text-xs text-[var(--evo-muted)] mt-1">
            Conecte seu WhatsApp via Evolution API / Baileys, visualize conversas ativas, digite e atenda seus leads diretamente do CRM.
          </p>
        </div>

        {/* Status de Conexão & Botões */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0C1A19] border border-[var(--evo-border)] text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'conectado'
                  ? 'bg-[#25D366] animate-pulse'
                  : connectionStatus === 'conectando'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-red-400'
              }`}
            />
            <span className="text-[var(--evo-text)] font-medium">
              {connectionStatus === 'conectado'
                ? `Online: ${connectedNumber}`
                : connectionStatus === 'conectando'
                ? 'Conectando...'
                : 'WhatsApp Desconectado'}
            </span>
            <span className="text-[10px] font-mono text-[#8EB69B] bg-[#10201E] px-1.5 py-0.5 rounded border border-[var(--evo-border)]">
              {instanceName}
            </span>
          </div>

          {connectionStatus === 'conectado' ? (
            <button
              onClick={() => {
                if (confirm('Deseja desconectar a sessão do WhatsApp?')) {
                  setConnectionStatus('desconectado');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-medium transition-all active:scale-95"
            >
              Desconectar
            </button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 text-xs bg-[#25D366] hover:bg-[#20ba59] text-black border-none"
              onClick={() => setIsQrModalOpen(true)}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Conectar via QR Code</span>
            </Button>
          )}

          <Link href="/configuracoes">
            <button
              className="p-2 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[var(--evo-border)] text-[#8EB69B] hover:text-[#F1F9A1] transition-all text-xs"
              title="Configurar Evolution API e Webhooks"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </div>

      {/* Janela Principal do Chat WhatsApp Web */}
      <div className="h-[74vh] min-h-[580px] bg-[#0C1A19] border border-[var(--evo-border)] rounded-2xl overflow-hidden shadow-2xl flex">
        {/* =====================================================================
            COLUNA 1: LISTA DE CONVERSAS (WHATSAPP INBOX)
            ===================================================================== */}
        <div className="w-80 md:w-96 border-r border-[var(--evo-border)] bg-[#07100F]/90 flex flex-col shrink-0">
          {/* Barra de Busca de Conversas */}
          <div className="p-3 border-b border-[var(--evo-border)] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8EB69B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversa, lead ou mensagem..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#10201E] border border-[var(--evo-border)] text-xs text-[var(--evo-text)] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
              />
            </div>

            {/* Filtros Rápidos */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setChatFilter('todas')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chatFilter === 'todas'
                    ? 'bg-[#163832] text-[#F1F9A1] font-medium border border-[#8EB69B]/30'
                    : 'text-[#9BA6A0] hover:bg-[#10201E]'
                }`}
              >
                Todas ({conversations.length})
              </button>
              <button
                onClick={() => setChatFilter('nao_lidas')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chatFilter === 'nao_lidas'
                    ? 'bg-[#163832] text-[#F1F9A1] font-medium border border-[#8EB69B]/30'
                    : 'text-[#9BA6A0] hover:bg-[#10201E]'
                }`}
              >
                Não Lidas
              </button>
              <button
                onClick={() => setChatFilter('quentes')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chatFilter === 'quentes'
                    ? 'bg-[#163832] text-[#F1F9A1] font-medium border border-[#8EB69B]/30'
                    : 'text-[#9BA6A0] hover:bg-[#10201E]'
                }`}
              >
                🔥 Quentes
              </button>
            </div>
          </div>

          {/* Lista Rolável de Chats */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--evo-border)]">
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeChat?.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveChatId(conv.id);
                    // Marcar como lida
                    setConversations((prev) =>
                      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
                    );
                  }}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#10201E] border-l-4 border-l-[#F1F9A1]'
                      : 'hover:bg-[#10201E]/50'
                  }`}
                >
                  {/* Avatar com status online */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#163832] border border-[var(--evo-border)] flex items-center justify-center text-xs font-semibold text-[#F1F9A1] font-heading">
                      {conv.companyName.substring(0, 2).toUpperCase()}
                    </div>
                    {conv.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25D366] border-2 border-[#07100F]" />
                    )}
                  </div>

                  {/* Informações da conversa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-[var(--evo-text)] truncate font-heading">
                        {conv.companyName}
                      </span>
                      <span className="text-[10px] font-mono text-[#65706A] shrink-0">
                        {conv.lastTime}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#8EB69B] truncate mb-1">
                      {conv.contactName}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-[var(--evo-muted)] truncate flex-1 leading-tight">
                        {conv.lastMessage}
                      </p>

                      {conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#25D366] text-black text-[9px] font-bold flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-xs text-[var(--evo-muted)]">
                Nenhuma conversa encontrada.
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            COLUNA 2: JANELA PRINCIPAL DE MENSAGENS (CHAT ATIVO)
            ===================================================================== */}
        {activeChat ? (
          <div className="flex-1 flex flex-col min-w-0 bg-[#07100F]/40 relative">
            {/* Header do Chat Ativo */}
            <div className="h-16 px-5 border-b border-[var(--evo-border)] bg-[#07100F]/80 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#163832] border border-[var(--evo-border)] flex items-center justify-center text-xs font-semibold text-[#F1F9A1] font-heading shrink-0">
                  {activeChat.companyName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--evo-text)] font-heading truncate">
                      {activeChat.companyName}
                    </h2>
                    {activeChat.temperature && (
                      <Badge temperature={activeChat.temperature} className="text-[9px] py-0 px-1">
                        {activeChat.temperature === 'quente' ? '🔥 Quente' : activeChat.temperature}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--evo-muted)] flex items-center gap-2 truncate">
                    <span>{activeChat.contactName}</span>
                    <span>•</span>
                    <span className="font-mono text-[#8EB69B]">{activeChat.phone}</span>
                    <span>•</span>
                    <span className="text-[#25D366] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                      online
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas do Chat */}
              <div className="flex items-center gap-2">
                {activeLead && (
                  <Link href={`/leads/${activeLead.id}`}>
                    <Button variant="secondary" size="sm" className="text-xs h-8 gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#8EB69B]" />
                      <span className="hidden md:inline">Ver Ficha</span>
                    </Button>
                  </Link>
                )}

                <Link href="/pipeline">
                  <Button variant="secondary" size="sm" className="text-xs h-8 gap-1.5">
                    <Kanban className="w-3.5 h-3.5 text-[#F1F9A1]" />
                    <span className="hidden md:inline">Pipeline</span>
                  </Button>
                </Link>

                <button
                  onClick={() => openWhatsApp(activeChat.phone)}
                  className="p-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] transition-all active:scale-95"
                  title="Abrir no WhatsApp Oficial"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={() => setShowLeadDetails(!showLeadDetails)}
                  className={`p-2 rounded-xl border transition-all text-xs ${
                    showLeadDetails
                      ? 'bg-[#163832] text-[#F1F9A1] border-[#8EB69B]/40'
                      : 'bg-[#10201E] text-[var(--evo-muted)] border-[var(--evo-border)]'
                  }`}
                  title={showLeadDetails ? 'Ocultar detalhes do lead' : 'Ver detalhes do lead'}
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Área de Mensagens (Estilo WhatsApp) */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[radial-gradient(#163832_1px,transparent_1px)] [background-size:24px_24px] [background-color:#07100F]">
              <div className="flex justify-center my-2">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#10201E] text-[#8EB69B] border border-[var(--evo-border)]">
                  Hoje • Criptografia de ponta a ponta
                </span>
              </div>

              {activeChat.messages.map((msg) => {
                const isUser = msg.sender === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                  >
                    <div
                      className={`max-w-[78%] md:max-w-[65%] rounded-2xl p-3 shadow-md relative group ${
                        isUser
                          ? 'bg-[#163832] text-[#DAF1DE] rounded-br-none border border-[#8EB69B]/30'
                          : 'bg-[#0C1A19] text-[var(--evo-text)] rounded-bl-none border border-[var(--evo-border)]'
                      }`}
                    >
                      <p className="text-xs leading-relaxed whitespace-pre-wrap select-text">
                        {msg.text}
                      </p>

                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8EB69B]/80 font-mono">
                        <span>{msg.time}</span>
                        {isUser && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#8EB69B]" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-[#8EB69B]" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Menu de Templates Rápidos de Abordagem */}
            {isTemplatesOpen && (
              <div className="absolute bottom-16 left-4 right-4 max-w-xl bg-[#0C1A19] border border-[#8EB69B]/40 rounded-2xl p-4 shadow-2xl z-20 space-y-2 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-[var(--evo-border)] pb-2">
                  <span className="text-xs font-semibold text-[#F1F9A1] font-heading flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Modelos Rápidos de Prospecção & Vendas
                  </span>
                  <button
                    onClick={() => setIsTemplatesOpen(false)}
                    className="text-xs text-[#9BA6A0] hover:text-[#E7ECE8]"
                  >
                    Fechar
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputText(tmpl.text);
                        setIsTemplatesOpen(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-[#10201E] hover:bg-[#163832] border border-[var(--evo-border)] text-xs transition-colors"
                    >
                      <div className="font-semibold text-[#E7ECE8] mb-0.5">{tmpl.title}</div>
                      <div className="text-[11px] text-[#9BA6A0] line-clamp-2 italic">
                        {tmpl.text}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Barra de Digitação & Envio */}
            <div className="p-3 bg-[#07100F] border-t border-[var(--evo-border)] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                className={`p-2 rounded-xl border transition-all ${
                  isTemplatesOpen
                    ? 'bg-[#163832] text-[#F1F9A1] border-[#8EB69B]/40'
                    : 'bg-[#10201E] hover:bg-[#163832] text-[#8EB69B] hover:text-[#F1F9A1] border-[var(--evo-border)]'
                }`}
                title="Modelos de Mensagem IA"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Digite uma mensagem para ${activeChat.companyName}... (Pressione Enter para enviar)`}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#10201E] border border-[var(--evo-border)] text-xs text-[var(--evo-text)] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
              />

              <Button
                variant="primary"
                size="sm"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="h-10 px-4 gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-black font-semibold border-none shrink-0"
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--evo-muted)]">
            Selecione uma conversa para começar a digitar.
          </div>
        )}

        {/* =====================================================================
            COLUNA 3: FICHA LATERAL RÁPIDA DO LEAD (INTEGRAÇÃO CRM)
            ===================================================================== */}
        {showLeadDetails && activeChat && (
          <div className="w-72 border-l border-[var(--evo-border)] bg-[#07100F]/95 p-4 overflow-y-auto space-y-4 shrink-0 hidden lg:block">
            <div className="text-center pb-3 border-b border-[var(--evo-border)]">
              <div className="w-14 h-14 rounded-2xl bg-[#163832] border border-[var(--evo-border)] flex items-center justify-center text-base font-bold text-[#F1F9A1] font-heading mx-auto mb-2 shadow-inner">
                {activeChat.companyName.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="text-xs font-bold text-[var(--evo-text)] font-heading leading-tight">
                {activeChat.companyName}
              </h3>
              <p className="text-[11px] text-[#8EB69B] mt-0.5">{activeChat.contactName}</p>
            </div>

            {/* Informações Comerciais */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider font-semibold">
                Dados no CRM
              </span>

              <div className="p-2.5 rounded-xl bg-[#10201E] border border-[var(--evo-border)] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#9BA6A0]">Nicho:</span>
                  <span className="font-mono text-[var(--evo-text)]">{activeChat.segment || 'Geral'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9BA6A0]">Score IA:</span>
                  <span className="font-mono text-[#F1F9A1] font-bold">{activeChat.score || 80}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9BA6A0]">Telefone:</span>
                  <span className="font-mono text-[var(--evo-text)]">{activeChat.phone}</span>
                </div>
              </div>
            </div>

            {/* Estágio do Pipeline */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider font-semibold">
                Estágio Pipeline
              </span>
              <div className="p-2.5 rounded-xl bg-[#10201E] border border-[var(--evo-border)] text-center">
                <span className="text-xs font-semibold text-[#F1F9A1] font-heading">
                  {activeOpp ? activeOpp.stage_slug.replace('_', ' ').toUpperCase() : 'PRIMEIRO CONTATO'}
                </span>
                <p className="text-[10px] text-[#9BA6A0] mt-1">
                  Avança automaticamente para Follow-up após 24h em Proposta
                </p>
                <Link href="/pipeline" className="mt-2 block">
                  <Button variant="secondary" size="sm" className="w-full text-[11px] h-7 gap-1">
                    <span>Abrir no Funil</span>
                    <ArrowUpRight className="w-3 h-3 text-[#8EB69B]" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Próximas Ações Rápidas */}
            <div className="pt-2 border-t border-[var(--evo-border)] space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5 text-[#F1F9A1] hover:border-[#F1F9A1]/30"
                onClick={() => {
                  setInputText(`Olá ${activeChat.contactName}, preparei a proposta oficial com as condições especiais para a ${activeChat.companyName}. Faria sentido agendarmos uma chamada de 10 minutos hoje?`);
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gerar Pitch com IA</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Conexão QR Code (Evolution API / WhatsApp Não Oficial) */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Conectar WhatsApp via QR Code"
        subtitle="Escaneie o QR Code no seu aplicativo do WhatsApp (Aparelhos Conectados) para habilitar o envio e leitura de mensagens no CRM."
        maxWidth="md"
      >
        <div className="p-4 text-center space-y-4">
          <div className="inline-block p-4 rounded-2xl bg-white shadow-xl mx-auto">
            {/* QR Code Visual Estilizado */}
            <div className="w-52 h-52 flex flex-col items-center justify-center border-4 border-black p-2 bg-white relative">
              <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-gray-50 border border-gray-300">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-sm ${
                      (i % 2 === 0 || i % 5 === 0 || i < 8) && i !== 14
                        ? 'bg-black'
                        : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-2 rounded-xl bg-white shadow-lg border border-gray-200">
                  <WhatsAppIcon className="w-8 h-8 fill-[#25D366]" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--evo-text)]">
              Instância: <strong className="font-mono text-[#F1F9A1]">{instanceName}</strong>
            </p>
            <p className="text-[11px] text-[var(--evo-muted)]">
              1. Abra o WhatsApp no celular &gt; 2. Toque em Aparelhos Conectados &gt; 3. Conectar um aparelho.
            </p>
            <div className="text-[11px] font-mono text-[#8EB69B] pt-1">
              QR Code expira em: <strong>{qrTimer}s</strong>
            </div>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsQrModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-[#25D366] hover:bg-[#20ba59] text-black border-none font-semibold gap-1.5"
              onClick={handleSimulateQrScan}
            >
              <Check className="w-4 h-4" />
              <span>Simular Escaneamento (Conectar)</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
