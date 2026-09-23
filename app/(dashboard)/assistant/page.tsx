'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  Database,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  ExternalLink,
  Lock,
  Settings, // Added Settings
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal'; // Added Modal
import { crmService } from '@/lib/services/crm-service';
import { assistantTools, ToolExecutionResult } from '@/lib/services/assistant-tools';
import { aiProvider, AIProviderConfig, AIProviderType } from '@/lib/ai/ai-provider'; // Added aiProvider
import { PermissionLevel } from '@/types/database';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  result?: ToolExecutionResult;
  feedback?: 'positive' | 'negative';
  pendingConfirmation?: {
    toolName: string;
    params: Record<string, unknown>;
  };
}

const INITIAL_CONVERSATION: Message[] = [
  {
    id: 'msg-1',
    sender: 'assistant',
    text: 'Olá, Oliveira. Sou o Evo Assistant, seu motor operacional e analítico no EVOCRM. Posso consultar métricas, verificar leads prioritários, sugerir abordagens e executar ações autorizadas no sistema.',
    timestamp: 'Hoje, 09:00',
  },
  {
    id: 'msg-2',
    sender: 'user',
    text: 'Como está nossa taxa de conversão?',
    timestamp: 'Hoje, 09:02',
  },
  {
    id: 'msg-3',
    sender: 'assistant',
    text: 'Nos últimos 30 dias: 84 leads analisados, 19 oportunidades qualificadas e 6 vendas fechadas.',
    timestamp: 'Hoje, 09:02',
    result: {
      tool: 'get_conversion_rate',
      permissionLevel: 'READ',
      success: true,
      message: 'Taxa de conversão atual de 7.1% (+1.4% em relação ao ciclo anterior).',
      source: ['Leads', 'Pipeline', 'Vendas Realizadas'],
      data: {
        totalLeads: 84,
        oportunidadesQualificadas: 19,
        fechamentos: 6,
        taxa: 7.1,
        comparativoAnterior: 1.4,
      },
    },
  },
];

const SUGGESTED_QUERIES = [
  'Filtre os prospects recém-importados e sugira o serviço ideal para eles.',
  'Classifique os leads por probabilidade de fechamento.',
  'Como está nossa taxa de conversão?',
  'Quais leads precisam de atenção?',
  'O que você sugere para prospectarmos hoje?',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_CONVERSATION);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // IA Config State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig | null>(null);
  
  useEffect(() => {
    setAiConfig(aiProvider.getConfig());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');

    const userMsgId = `usr-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const cfg = aiProvider.getConfig();
      // Se tiver uma API configurada e ativa (gemini ou claude) com chave, usa a API generativa
      if ((cfg.activeProvider === 'gemini' && cfg.gemini.apiKey) || 
          (cfg.activeProvider === 'claude' && cfg.claude.apiKey)) {
          
          // Prepara contexto com dados de prospects e leads
          const contextData = {
            prospects: crmService.getProspects().slice(0, 50), // limits to 50 for token constraints
            leads: crmService.getLeads().slice(0, 50)
          };
          
          const aiResponse = await aiProvider.generateCompletion(query, contextData);
          
          const assistantMsg: Message = {
            id: `ast-${Date.now()}`,
            sender: 'assistant',
            text: aiResponse.text,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            result: {
              tool: 'ai_generation',
              permissionLevel: 'READ',
              success: true,
              message: `Resposta gerada via IA (${aiResponse.provider.toUpperCase()} - ${aiResponse.model}). Contexto: ${contextData.prospects.length} Prospects, ${contextData.leads.length} Leads.`,
              source: ['Evo Assistant AI API', 'CRM Context'],
            }
          };
          setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Fallback pro mock de ferramentas se nǜo houver API conectada
        const parsed = assistantTools.parseIntent(query);
        const result = await assistantTools.executeTool(
          parsed.toolName,
          parsed.params,
          'session-active',
          query
        );

        const assistantMsg: Message = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: result.requiresConfirmation
            ? result.confirmationMessage || result.message
            : result.message,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          result,
          pendingConfirmation: result.requiresConfirmation
            ? { toolName: parsed.toolName, params: parsed.params }
            : undefined,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      const errorMsg: Message = {
        id: `ast-err-${Date.now()}`,
        sender: 'assistant',
        text: 'Ocorreu um erro ao processar seu comando. A operação não pôde ser executada.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, toolName: string, params: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const confirmedParams = { ...params, confirmed: true };
      const result = await assistantTools.executeTool(toolName, confirmedParams, 'session-active', 'Ação Confirmada pelo Usuário');

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId) {
            return {
              ...m,
              pendingConfirmation: undefined,
              text: result.message,
              result,
            };
          }
          return m;
        })
      );
    } catch {
      // Ignorar
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          return {
            ...m,
            pendingConfirmation: undefined,
            text: 'Operação cancelada com segurança. Nenhuma modificação foi feita no sistema.',
          };
        }
        return m;
      })
    );
  };

  const handleFeedback = (msgId: string, type: 'positive' | 'negative') => {
    crmService.addAiFeedback({
      entity_type: 'assistant_message',
      entity_id: msgId,
      recommendation: 'Evo Assistant Query Response',
      feedback: type,
      reason: type === 'positive' ? 'Resposta assertiva' : 'Ajustar parâmetros',
    });

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: type } : m))
    );
  };

  const saveAiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiConfig) {
      aiProvider.saveConfig(aiConfig);
      setIsSettingsOpen(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-[#07100F] border border-[rgba(218,241,222,0.06)] rounded-xl overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. Cabeçalho do Chat */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(218,241,222,0.06)] bg-[#0C1A19] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8EB69B] to-[#4A6455] flex items-center justify-center shadow-lg shadow-[#8EB69B]/10">
            <Bot className="w-5 h-5 text-[#07100F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[#E7ECE8] font-heading">
                Evo Assistant
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-[#8EB69B] animate-pulse" />
              <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                Motor Ativo
              </span>
            </div>
            <p className="text-[11px] text-[#65706A]">
              Interface conversacional conectada aos módulos comerciais e operacionais da EvoPixel.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#65706A] px-3 py-1.5 rounded-lg bg-[#07100F] border border-[rgba(218,241,222,0.05)]">
            <ShieldCheck className="w-3 h-3 text-[#8EB69B]" />
            <span>Permissões: READ / WRITE / RESTRICTED</span>
          </div>
          <Button variant="secondary" size="sm" className="gap-2 text-xs" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-3.5 h-3.5" />
            Conectar IA
          </Button>
          <Link href="/intelligence">
            <Button variant="outline" size="sm" className="gap-2 text-xs border-[rgba(218,241,222,0.12)]">
              Ver Evo Intelligence
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Área de Mensagens (Histórico) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-[rgba(218,241,222,0.06)] scrollbar-track-transparent">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-2 ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className="text-[11px] font-mono text-[#65706A]">
                {msg.sender === 'user' ? 'Oliveira (Você)' : 'Evo Assistant'}
              </span>
              <span className="text-[10px] font-mono text-[#44504A]">
                {msg.timestamp}
              </span>
            </div>

            {/* Balão do Usuário */}
            {msg.sender === 'user' ? (
              <div className="max-w-xl bg-[#10201E] border border-[rgba(218,241,222,0.12)] text-[#E7ECE8] text-sm px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm font-sans leading-relaxed">
                {msg.text}
              </div>
            ) : (
              /* Balão do Assistente (IA) */
              <div className="max-w-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] text-sm p-5 rounded-2xl rounded-tl-sm shadow-md font-sans space-y-4">
                <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                {/* Bloco de Resultado de Ferramenta (se houver) */}
                {msg.result && !msg.pendingConfirmation ? (
                  <div className="p-3 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.05)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                        <Database className="w-3.5 h-3.5" />
                        Dados Consultados
                      </div>
                      <Badge variant="accent" className="text-[9px] py-0 px-1.5 font-mono">
                        {msg.result.permissionLevel}
                      </Badge>
                    </div>

                    <div className="text-xs text-[#9BA6A0] leading-relaxed">
                      {msg.result.message}
                    </div>

                    {msg.result.source && msg.result.source.length > 0 && (
                      <div className="flex items-center gap-2 pt-2 text-[10px] font-mono text-[#65706A]">
                        <span>Fontes verificadas:</span>
                        <div className="flex flex-wrap gap-1">
                          {msg.result.source.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-[#10201E] text-[#8EB69B] border border-[rgba(218,241,222,0.05)]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Confirmação de Ação Restrita (RESTRICTED) */}
                {msg.pendingConfirmation && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 font-heading">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Confirmação Humana Obrigatória (Ação Restrita)
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      Esta ação altera ou exclui registros sensíveis. Nenhuma modificação será aplicada sem sua validação.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCancelAction(msg.id)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleConfirmAction(
                            msg.id,
                            msg.pendingConfirmation!.toolName,
                            msg.pendingConfirmation!.params
                          )
                        }
                        className="text-xs gap-1.5 bg-amber-400 text-[#07100F] hover:bg-amber-300"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Confirmar Ação</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rodapé da Resposta: Feedback & Status */}
                <div className="flex items-center justify-between pt-2 border-t border-[rgba(218,241,222,0.05)] text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-[#65706A]">
                    {msg.result?.actionLogged && (
                      <span className="flex items-center gap-1 text-[#8EB69B] font-mono text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        Auditado em ai_action_logs
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#65706A] mr-1">Útil?</span>
                    <button
                      onClick={() => handleFeedback(msg.id, 'positive')}
                      className={`p-1 rounded hover:bg-[#10201E] transition-colors ${
                        msg.feedback === 'positive' ? 'text-[#F1F9A1]' : 'text-[#65706A]'
                      }`}
                      title="Útil"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, 'negative')}
                      className={`p-1 rounded hover:bg-[#10201E] transition-colors ${
                        msg.feedback === 'negative' ? 'text-red-400' : 'text-[#65706A]'
                      }`}
                      title="Inadequado"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Indicador de Carregamento */}
        {isLoading && (
          <div className="flex flex-col items-start space-y-2">
            <span className="text-[11px] font-mono text-[#65706A] px-1">Evo Assistant</span>
            <div className="bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] rounded-2xl rounded-tl-sm p-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#F1F9A1] animate-ping" />
              <span className="text-xs text-[#9BA6A0] font-mono">
                Consultando dados, conectando IA e validando permissões...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Barra de Perguntas Frequentes / Sugestões Rápidas */}
      <div className="px-6 py-2.5 bg-[#07100F]/90 border-t border-[rgba(218,241,222,0.06)] overflow-x-auto scrollbar-none flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono text-[#65706A] uppercase shrink-0 mr-1 flex items-center gap-1">
          <Zap className="w-3 h-3 text-[#F1F9A1]" /> Sugestões:
        </span>
        {SUGGESTED_QUERIES.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="text-[11px] font-heading text-[#9BA6A0] hover:text-[#E7ECE8] bg-[#0C1A19] hover:bg-[#10201E] border border-[rgba(218,241,222,0.06)] px-3 py-1 rounded-full whitespace-nowrap transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 4. Campo de Entrada de Mensagem */}
      <div className="p-4 bg-[#07100F] border-t border-[rgba(218,241,222,0.08)] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3 bg-[#0C1A19] border border-[rgba(218,241,222,0.12)] focus-within:border-[rgba(218,241,222,0.25)] rounded-xl px-4 py-2.5 transition-all shadow-inner"
        >
          <Sparkles className="w-4 h-4 text-[#8EB69B] shrink-0" />
          <input
            type="text"
            placeholder="Converse com o CRM... Ex: 'Filtrar melhores leads', 'Classifique nossos prospects', 'Sugira ações'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="w-full bg-transparent text-sm text-[#E7ECE8] placeholder-[#65706A] focus:outline-none font-sans"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!input.trim() || isLoading}
            className="shrink-0 gap-1.5 text-xs px-3"
          >
            <span>Enviar</span>
            <Send className="w-3 h-3 text-[#07100F]" />
          </Button>
        </form>
        <div className="flex items-center justify-between text-[10px] font-mono text-[#65706A] mt-2 px-1">
          <span>O Evo Assistant analisa os dados de Prospects e Leads se a API de IA estiver configurada.</span>
          <span>Atalho global: Ctrl + K</span>
        </div>
      </div>
      
      {/* Modal Configuração API */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <div className="p-6">
          <h2 className="text-lg font-heading text-[#E7ECE8] mb-4">Conectar API de IA</h2>
          {aiConfig && (
            <form onSubmit={saveAiSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#9BA6A0] mb-1">Provedor Ativo</label>
                <select
                  value={aiConfig.activeProvider}
                  onChange={(e) => setAiConfig({...aiConfig, activeProvider: e.target.value as AIProviderType})}
                  className="w-full bg-[#07100F] border border-[rgba(218,241,222,0.12)] rounded-lg px-3 py-2 text-sm text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="simulation">Apenas Simulação (Mock)</option>
                </select>
              </div>
              
              {aiConfig.activeProvider === 'gemini' && (
                <div>
                  <label className="block text-xs font-mono text-[#9BA6A0] mb-1">Gemini API Key</label>
                  <input
                    type="password"
                    value={aiConfig.gemini.apiKey}
                    onChange={(e) => setAiConfig({
                      ...aiConfig, 
                      gemini: {...aiConfig.gemini, apiKey: e.target.value}
                    })}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#07100F] border border-[rgba(218,241,222,0.12)] rounded-lg px-3 py-2 text-sm text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
                  />
                  <p className="text-[10px] text-[#65706A] mt-1">Sua chave é armazenada apenas localmente no seu navegador.</p>
                </div>
              )}
              
              {aiConfig.activeProvider === 'claude' && (
                <div>
                  <label className="block text-xs font-mono text-[#9BA6A0] mb-1">Claude API Key</label>
                  <input
                    type="password"
                    value={aiConfig.claude.apiKey}
                    onChange={(e) => setAiConfig({
                      ...aiConfig, 
                      claude: {...aiConfig.claude, apiKey: e.target.value}
                    })}
                    placeholder="sk-ant-..."
                    className="w-full bg-[#07100F] border border-[rgba(218,241,222,0.12)] rounded-lg px-3 py-2 text-sm text-[#E7ECE8] focus:outline-none focus:border-[#8EB69B]"
                  />
                  <p className="text-[10px] text-[#65706A] mt-1">Sua chave é armazenada apenas localmente no seu navegador.</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
                <Button type="button" variant="ghost" onClick={() => setIsSettingsOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="primary">Salvar Configurações</Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

    </div>
  );
}
