'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Settings,
  MessageSquare,
  Workflow,
  Database,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Sparkles,
  Copy,
  ExternalLink,
  RefreshCw,
  Server,
  Layers,
  Bot,
  Cpu,
  Terminal,
  Check,
  Eye,
  EyeOff,
  Save,
  Globe,
  Zap,
} from 'lucide-react';
import { aiProvider, AIProviderConfig } from '@/lib/ai/ai-provider';

export default function ConfiguracoesPage() {
  const [evolutionUrl, setEvolutionUrl] = useState('https://evolution.evopixel.com.br');
  const [evolutionApiKey, setEvolutionApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('https://n8n.evopixel.com.br/webhook/crm-events');

  // Supabase State
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedVPSCommand, setCopiedVPSCommand] = useState(false);

  // AI Providers State
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(aiProvider.getConfig());
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingClaude, setIsTestingClaude] = useState(false);
  const [claudeResult, setClaudeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const checkSupabaseStatus = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await fetch('/api/supabase-status');
      const data = await res.json();
      setSupabaseStatus(data);
    } catch {
      setSupabaseStatus({ status: 'error', message: 'Erro ao conectar à API local.' });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  useEffect(() => {
    checkSupabaseStatus();
    setAiConfig(aiProvider.loadConfig());
  }, []);

  const handleSaveAiConfig = () => {
    aiProvider.saveConfig(aiConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiResult(null);
    try {
      const res = await aiProvider.testGemini(aiConfig.gemini.apiKey, aiConfig.gemini.model);
      setGeminiResult(res);
      if (res.success) {
        setAiConfig((prev) => ({
          ...prev,
          gemini: { ...prev.gemini, enabled: true },
        }));
        aiProvider.saveConfig({
          gemini: { ...aiConfig.gemini, enabled: true },
        });
      }
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleTestClaude = async () => {
    setIsTestingClaude(true);
    setClaudeResult(null);
    try {
      const res = await aiProvider.testClaude(aiConfig.claude.apiKey, aiConfig.claude.model);
      setClaudeResult(res);
      if (res.success) {
        setAiConfig((prev) => ({
          ...prev,
          claude: { ...prev.claude, enabled: true },
        }));
        aiProvider.saveConfig({
          claude: { ...aiConfig.claude, enabled: true },
        });
      }
    } finally {
      setIsTestingClaude(false);
    }
  };

  const TABLES_LIST = [
    { name: 'users', desc: 'Usuários, perfis e permissões' },
    { name: 'companies', desc: 'Empresas clientes e alvos' },
    { name: 'contacts', desc: 'Contatos e decisores' },
    { name: 'services', desc: 'Catálogo de serviços e preços' },
    { name: 'niches', desc: 'Nichos de atuação estratégica' },
    { name: 'message_sequences', desc: 'Sequências de prospecção n8n' },
    { name: 'message_sequence_steps', desc: 'Etapas de mensagem (Abertura, Follow-ups)' },
    { name: 'leads', desc: 'Leads qualificados e scores' },
    { name: 'lead_services', desc: 'Serviços identificados no lead' },
    { name: 'lead_sequence_progress', desc: 'Progresso da régua de mensagens' },
    { name: 'message_logs', desc: 'Histórico de envios e respostas' },
    { name: 'pipeline_stages', desc: '8 estágios do funil Kanban' },
    { name: 'opportunities', desc: 'Oportunidades e valores potenciais' },
    { name: 'clients', desc: 'Clientes 360 e LTV' },
    { name: 'proposals', desc: 'Propostas comerciais multisserviço' },
    { name: 'contracts', desc: 'Contratos e assinaturas' },
    { name: 'projects', desc: 'Projetos e checklists operacionais' },
    { name: 'historical_projects', desc: 'Histórico desde a fundação' },
    { name: 'tasks', desc: 'Tarefas e entregas' },
    { name: 'follow_ups', desc: 'Follow-ups manuais e automáticos' },
    { name: 'financial_transactions', desc: 'Transações (Contratado vs Recebido vs Pendente)' },
    { name: 'conversations', desc: 'Conversas por canal' },
    { name: 'messages', desc: 'Mensagens trocadas' },
    { name: 'business_context', desc: 'Contexto operacional da EvoPixel para IA' },
    { name: 'commercial_goals', desc: 'Metas comerciais periódicas' },
    { name: 'prospects', desc: 'Base de prospecção pura com ICP Score' },
    { name: 'conversation_summaries', desc: 'Resumos estruturados para IA' },
    { name: 'ai_commands', desc: 'Histórico de comandos do Evo Assistant' },
    { name: 'ai_action_logs', desc: 'Auditoria de mutações feitas por IA' },
    { name: 'ai_feedback', desc: 'Feedback e aprendizado contínuo' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--evo-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Settings className="w-3.5 h-3.5" />
            Infraestrutura & Integrações
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[var(--evo-text)] font-heading">
            Configurações do Sistema
          </h1>
          <p className="text-xs text-[var(--evo-muted)] mt-1">
            Conexão com Banco de Dados Supabase (PostgreSQL), VPS Hostinger, APIs de Inteligência Artificial (Claude & Gemini), WhatsApp e n8n.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#163832] text-[#DAF1DE] border border-[#8EB69B]/40 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#F1F9A1]" />
            <span>Configurações salvas e ativas!</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          SEÇÃO 1: MOTORES DE INTELIGÊNCIA ARTIFICIAL (CLAUDE & GEMINI)
          ========================================================================= */}
      <Card className="p-6 space-y-6 border border-[var(--evo-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--evo-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10201E] border border-[var(--evo-border)] flex items-center justify-center text-[#F1F9A1]">
              <Sparkles className="w-5 h-5 text-[#F1F9A1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--evo-text)] font-heading">
                  Provedores de Inteligência Artificial (Claude & Gemini)
                </h3>
                <Badge variant={aiConfig.activeProvider === 'simulation' ? 'frio' : 'quente'}>
                  {aiConfig.activeProvider === 'gemini'
                    ? 'Google Gemini Ativo'
                    : aiConfig.activeProvider === 'claude'
                    ? 'Anthropic Claude Ativo'
                    : 'Modo Simulação'}
                </Badge>
              </div>
              <span className="text-[11px] text-[var(--evo-muted)]">
                Conecte chaves oficiais para alimentar o Evo Assistant, análises de leads e automações de prospecção.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleSaveAiConfig}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Chaves de IA</span>
            </Button>
          </div>
        </div>

        {/* Seleção do Motor Ativo */}
        <div className="space-y-2">
          <label className="text-xs font-heading font-semibold text-[var(--evo-text)]">
            Selecione o Motor Ativo para o Evo Assistant & Pipeline
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Opção Gemini */}
            <button
              type="button"
              onClick={() => setAiConfig((prev) => ({ ...prev, activeProvider: 'gemini' }))}
              className={`p-3 rounded-xl border text-left transition-all ${
                aiConfig.activeProvider === 'gemini'
                  ? 'bg-[#10201E] border-[#F1F9A1] shadow-sm'
                  : 'bg-[var(--evo-surface)] border-[var(--evo-border)] hover:border-[var(--evo-border-hover)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-heading font-semibold text-xs text-[var(--evo-text)]">
                  <Cpu className="w-4 h-4 text-[#8EB69B]" />
                  Google Gemini
                </div>
                {aiConfig.activeProvider === 'gemini' && (
                  <span className="w-2 h-2 rounded-full bg-[#F1F9A1]" />
                )}
              </div>
              <p className="text-[10px] text-[var(--evo-muted)]">
                Gemini 2.5 Flash & 1.5 Pro. Alto desempenho e janela de contexto estendida.
              </p>
            </button>

            {/* Opção Claude */}
            <button
              type="button"
              onClick={() => setAiConfig((prev) => ({ ...prev, activeProvider: 'claude' }))}
              className={`p-3 rounded-xl border text-left transition-all ${
                aiConfig.activeProvider === 'claude'
                  ? 'bg-[#10201E] border-[#F1F9A1] shadow-sm'
                  : 'bg-[var(--evo-surface)] border-[var(--evo-border)] hover:border-[var(--evo-border-hover)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-heading font-semibold text-xs text-[var(--evo-text)]">
                  <Bot className="w-4 h-4 text-[#F1F9A1]" />
                  Anthropic Claude
                </div>
                {aiConfig.activeProvider === 'claude' && (
                  <span className="w-2 h-2 rounded-full bg-[#F1F9A1]" />
                )}
              </div>
              <p className="text-[10px] text-[var(--evo-muted)]">
                Claude 3.7 Sonnet & 3.5 Haiku. Precisão analítica superior e raciocínio editorial.
              </p>
            </button>

            {/* Opção Simulação Offline */}
            <button
              type="button"
              onClick={() => setAiConfig((prev) => ({ ...prev, activeProvider: 'simulation' }))}
              className={`p-3 rounded-xl border text-left transition-all ${
                aiConfig.activeProvider === 'simulation'
                  ? 'bg-[#10201E] border-[#F1F9A1] shadow-sm'
                  : 'bg-[var(--evo-surface)] border-[var(--evo-border)] hover:border-[var(--evo-border-hover)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-heading font-semibold text-xs text-[var(--evo-text)]">
                  <Zap className="w-4 h-4 text-[#8EB69B]" />
                  Simulação Local (Offline)
                </div>
                {aiConfig.activeProvider === 'simulation' && (
                  <span className="w-2 h-2 rounded-full bg-[#F1F9A1]" />
                )}
              </div>
              <p className="text-[10px] text-[var(--evo-muted)]">
                Motor nativo baseado em regras e métricas locais do CRM sem custo de tokens.
              </p>
            </button>
          </div>
        </div>

        {/* Formulários de Configuração das APIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Card Google Gemini */}
          <div className="p-4 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--evo-border)] pb-2.5">
              <div className="flex items-center gap-2 font-heading font-semibold text-xs text-[var(--evo-text)]">
                <Cpu className="w-4 h-4 text-[#8EB69B]" />
                Google Gemini API
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#8EB69B] hover:underline flex items-center gap-1"
              >
                Gerar Chave no AI Studio <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--evo-muted)] mb-1 font-medium">
                Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={aiConfig.gemini.apiKey}
                  onChange={(e) =>
                    setAiConfig((prev) => ({
                      ...prev,
                      gemini: { ...prev.gemini, apiKey: e.target.value },
                    }))
                  }
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-[var(--evo-card)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-2.5 top-2.5 text-[var(--evo-muted)] hover:text-[var(--evo-text)]"
                >
                  {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--evo-muted)] mb-1 font-medium">
                Modelo do Gemini
              </label>
              <select
                value={aiConfig.gemini.model}
                onChange={(e) =>
                  setAiConfig((prev) => ({
                    ...prev,
                    gemini: { ...prev.gemini, model: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-card)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none text-xs"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Mais Rápido & Recomendado)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Raciocínio Profundo)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Econômico)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleTestGemini}
                disabled={isTestingGemini || !aiConfig.gemini.apiKey}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingGemini ? 'animate-spin' : ''}`} />
                <span>Testar Conexão Gemini</span>
              </Button>

              {geminiResult && (
                <span
                  className={`text-[11px] font-medium ${
                    geminiResult.success ? 'text-[#8EB69B]' : 'text-amber-500'
                  }`}
                >
                  {geminiResult.success ? '✓ Conexão Estabelecida' : '✕ Erro na Validação'}
                </span>
              )}
            </div>

            {geminiResult && (
              <div
                className={`p-2.5 rounded-lg text-[10px] leading-relaxed border ${
                  geminiResult.success
                    ? 'bg-[#10201E] text-[#DAF1DE] border-[#8EB69B]/30'
                    : 'bg-red-950/20 text-red-300 border-red-800/30'
                }`}
              >
                <strong>Resposta:</strong> {geminiResult.message}
              </div>
            )}
          </div>

          {/* Card Anthropic Claude */}
          <div className="p-4 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--evo-border)] pb-2.5">
              <div className="flex items-center gap-2 font-heading font-semibold text-xs text-[var(--evo-text)]">
                <Bot className="w-4 h-4 text-[#F1F9A1]" />
                Anthropic Claude API
              </div>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#8EB69B] hover:underline flex items-center gap-1"
              >
                Obter Chave no Console Anthropic <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--evo-muted)] mb-1 font-medium">
                Claude API Key
              </label>
              <div className="relative">
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  placeholder="sk-ant-api03-..."
                  value={aiConfig.claude.apiKey}
                  onChange={(e) =>
                    setAiConfig((prev) => ({
                      ...prev,
                      claude: { ...prev.claude, apiKey: e.target.value },
                    }))
                  }
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-[var(--evo-card)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="absolute right-2.5 top-2.5 text-[var(--evo-muted)] hover:text-[var(--evo-text)]"
                >
                  {showClaudeKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--evo-muted)] mb-1 font-medium">
                Modelo do Claude
              </label>
              <select
                value={aiConfig.claude.model}
                onChange={(e) =>
                  setAiConfig((prev) => ({
                    ...prev,
                    claude: { ...prev.claude, model: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-card)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none text-xs"
              >
                <option value="claude-3-7-sonnet-20250219">claude-3-7-sonnet-20250219 (Estado da Arte)</option>
                <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022 (Equilibrado)</option>
                <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022 (Ultrarrápido)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleTestClaude}
                disabled={isTestingClaude || !aiConfig.claude.apiKey}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingClaude ? 'animate-spin' : ''}`} />
                <span>Testar Conexão Claude</span>
              </Button>

              {claudeResult && (
                <span
                  className={`text-[11px] font-medium ${
                    claudeResult.success ? 'text-[#8EB69B]' : 'text-amber-500'
                  }`}
                >
                  {claudeResult.success ? '✓ Conexão Estabelecida' : '✕ Erro na Validação'}
                </span>
              )}
            </div>

            {claudeResult && (
              <div
                className={`p-2.5 rounded-lg text-[10px] leading-relaxed border ${
                  claudeResult.success
                    ? 'bg-[#10201E] text-[#DAF1DE] border-[#8EB69B]/30'
                    : 'bg-red-950/20 text-red-300 border-red-800/30'
                }`}
              >
                <strong>Resposta:</strong> {claudeResult.message}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* =========================================================================
          SEÇÃO 2: SUPABASE & HOSPEDAGEM VPS HOSTINGER (PRODUÇÃO)
          ========================================================================= */}
      <Card className="p-6 space-y-6 border border-[var(--evo-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--evo-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10201E] border border-[var(--evo-border)] flex items-center justify-center text-[#8EB69B]">
              <Database className="w-5 h-5 text-[#8EB69B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--evo-text)] font-heading">
                  Banco de Dados Supabase (PostgreSQL) & VPS Hostinger
                </h3>
                <Badge variant={supabaseStatus?.status === 'connected_active' ? 'quente' : 'morno'}>
                  {supabaseStatus?.status === 'connected_active' ? 'Conectado & Ativo' : 'Pronto para Conexão'}
                </Badge>
              </div>
              <span className="text-[11px] text-[var(--evo-muted)]">
                Ambiente de produção preparado para deploy na VPS Hostinger com persistência direta no Supabase.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs gap-1.5"
              onClick={checkSupabaseStatus}
              disabled={isCheckingSupabase}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSupabase ? 'animate-spin' : ''}`} />
              <span>Testar Conexão Supabase</span>
            </Button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="primary" size="sm" className="text-xs gap-1.5">
                <span>Abrir Supabase Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#07100F]" />
              </Button>
            </a>
          </div>
        </div>

        {/* 3 Passos de Produção para Hostinger VPS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] space-y-2">
            <div className="font-semibold text-[var(--evo-text)] flex items-center gap-1.5 font-heading">
              <Key className="w-4 h-4 text-[#F1F9A1]" />
              1. Credenciais do Supabase
            </div>
            <p className="text-[11px] text-[var(--evo-muted)] leading-relaxed">
              Configuradas no <code className="text-[#8EB69B]">.env.local</code> localmente e no <code className="text-[#8EB69B]">.env.production</code> da VPS:
            </p>
            <div className="p-2 rounded bg-[var(--evo-card)] font-mono text-[10px] text-[#8EB69B] space-y-0.5">
              <div>NEXT_PUBLIC_SUPABASE_URL</div>
              <div>NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
              <div>SUPABASE_SERVICE_ROLE_KEY</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] space-y-2">
            <div className="font-semibold text-[var(--evo-text)] flex items-center gap-1.5 font-heading">
              <Layers className="w-4 h-4 text-[#8EB69B]" />
              2. Execução do Schema SQL
            </div>
            <p className="text-[11px] text-[var(--evo-muted)] leading-relaxed">
              Execute o arquivo completo <code className="text-[#8EB69B]">supabase/schema.sql</code> no SQL Editor do seu projeto Supabase para criar as 30 tabelas.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs gap-1.5 py-1"
              onClick={() => {
                navigator.clipboard.writeText('supabase/schema.sql');
                setCopiedSchema(true);
                setTimeout(() => setCopiedSchema(false), 3000);
              }}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedSchema ? 'Caminho Copiado!' : 'Copiar Caminho do Schema'}</span>
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] space-y-2">
            <div className="font-semibold text-[var(--evo-text)] flex items-center gap-1.5 font-heading">
              <Server className="w-4 h-4 text-[#8EB69B]" />
              3. Deploy na VPS Hostinger
            </div>
            <p className="text-[11px] text-[var(--evo-muted)] leading-relaxed">
              Script automatizado de deploy em 1 clique preparado com PM2 cluster e Nginx proxy:
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs gap-1.5 py-1 font-mono text-[11px]"
              onClick={() => {
                navigator.clipboard.writeText('chmod +x deploy-hostinger.sh && ./deploy-hostinger.sh');
                setCopiedVPSCommand(true);
                setTimeout(() => setCopiedVPSCommand(false), 3000);
              }}
            >
              <Terminal className="w-3.5 h-3.5 text-[#F1F9A1]" />
              <span>{copiedVPSCommand ? 'Comando Copiado!' : './deploy-hostinger.sh'}</span>
            </Button>
          </div>
        </div>

        {/* Tabelas Mapeadas */}
        <div className="pt-2 border-t border-[var(--evo-border)]">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-heading font-semibold text-[var(--evo-text)]">
              Tabelas Relacionais do EVOCRM no Supabase ({TABLES_LIST.length} entidades)
            </span>
            <span className="text-[11px] font-mono text-[#8EB69B]">
              Totalmente tipadas com Row Level Security (RLS)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 max-h-44 overflow-y-auto pr-1">
            {TABLES_LIST.map((tab) => (
              <div
                key={tab.name}
                className="p-2 rounded-lg bg-[var(--evo-surface)] border border-[var(--evo-border)] flex flex-col justify-between"
              >
                <span className="font-mono text-[11px] font-semibold text-[#8EB69B] truncate">
                  {tab.name}
                </span>
                <span className="text-[10px] text-[var(--evo-muted)] truncate">
                  {tab.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* =========================================================================
          SEÇÃO 3: WHATSAPP (EVOLUTION API) & N8N
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp / Evolution API */}
        <Card className="p-6 space-y-4 border border-[var(--evo-border)]">
          <div className="flex items-start justify-between border-b border-[var(--evo-border)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#10201E] border border-[var(--evo-border)] flex items-center justify-center text-[#8EB69B]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--evo-text)] font-heading">
                  WhatsApp (Evolution API)
                </h3>
                <span className="text-[11px] text-[var(--evo-muted)]">
                  Canal de envio para o Banco de Mensagens e régua de prospecção
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#163832] text-[#8EB69B] font-mono">
              Online
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--evo-muted)] mb-1 font-medium">Evolution API URL</label>
              <input
                type="text"
                value={evolutionUrl}
                onChange={(e) => setEvolutionUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[var(--evo-muted)] mb-1 font-medium">Global API Key</label>
              <input
                type="password"
                value={evolutionApiKey}
                onChange={(e) => setEvolutionApiKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none font-mono text-[11px]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[var(--evo-border)]">
              <div className="flex items-center gap-2 text-xs text-[var(--evo-muted)]">
                <QrCode className="w-4 h-4 text-[#8EB69B]" />
                <span>Instância: <strong className="text-[var(--evo-text)] font-mono">evocrm-prod</strong></span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-7"
                onClick={() => alert('Abrindo QR Code para sincronização com o WhatsApp da EvoPixel...')}
              >
                Conectar via QR Code
              </Button>
            </div>
          </div>
        </Card>

        {/* Integração n8n */}
        <Card className="p-6 space-y-4 border border-[var(--evo-border)]">
          <div className="flex items-start justify-between border-b border-[var(--evo-border)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#10201E] border border-[var(--evo-border)] flex items-center justify-center text-[#F1F9A1]">
                <Workflow className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--evo-text)] font-heading">
                  Orquestrador de Fluxos (n8n)
                </h3>
                <span className="text-[11px] text-[var(--evo-muted)]">
                  Gatilhos de prospecção, régua de follow-up e movimentação de pipeline
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#163832] text-[#8EB69B] font-mono">
              Pronto
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--evo-muted)] mb-1 font-medium">Webhook Endpoint URL</label>
              <input
                type="text"
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-[var(--evo-text)] focus:outline-none font-mono text-[11px]"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--evo-surface)] border border-[var(--evo-border)] text-xs text-[var(--evo-muted)] leading-relaxed">
              O EVOCRM emite payloads contendo o lead, nicho, etapa da sequência e texto pronto com variáveis resolvidas para execução automática no n8n.
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                className="text-xs"
                onClick={() => alert('Configurações salvas com sucesso!')}
              >
                Salvar Configurações
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
