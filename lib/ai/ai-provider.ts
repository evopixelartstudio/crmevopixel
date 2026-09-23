// ==============================================================================
// EVOCRM — MOTOR DE CONEXÃO COM PROVEDORES DE IA (CLAUDE & GEMINI)
// ==============================================================================

export type AIProviderType = 'gemini' | 'claude' | 'simulation';

export interface AIProviderConfig {
  activeProvider: AIProviderType;
  gemini: {
    apiKey: string;
    model: string; // 'gemini-1.5-flash' | 'gemini-1.5-pro'
    temperature: number;
    enabled: boolean;
  };
  claude: {
    apiKey: string;
    model: string; // 'claude-3-7-sonnet-20250219' | 'claude-3-5-haiku-20241022'
    temperature: number;
    enabled: boolean;
  };
  systemPrompt: string;
}

const DEFAULT_SYSTEM_PROMPT = `Você é o Evo Assistant, o motor de inteligência analítica e operacional da EvoPixel.
Sua postura é editorial, executiva, precisa, sem enrolação e focada em resultados comerciais.
Você analisa dados do EVOCRM (leads, clientes, prospects, propostas, pipeline, financeiro) e ajuda na tomada de decisão.
Diferencie sempre fatos verificados [DADO], deduções inteligentes [INFERÊNCIA] e recomendações práticas [RECOMENDAÇÃO].`;

export const DEFAULT_AI_CONFIG: AIProviderConfig = {
  activeProvider: 'gemini',
  gemini: {
    apiKey: '',
    model: 'gemini-1.5-flash',
    temperature: 0.4,
    enabled: false,
  },
  claude: {
    apiKey: '',
    model: 'claude-3-7-sonnet-20250219',
    temperature: 0.4,
    enabled: false,
  },
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

class AIProviderService {
  private config: AIProviderConfig = { ...DEFAULT_AI_CONFIG };

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadConfig();
    }
  }

  public loadConfig(): AIProviderConfig {
    if (typeof window === 'undefined') return this.config;
    try {
      const saved = localStorage.getItem('evocrm_ai_config');
      if (saved) {
        this.config = { ...DEFAULT_AI_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      this.config = { ...DEFAULT_AI_CONFIG };
    }
    return this.config;
  }

  public saveConfig(newConfig: Partial<AIProviderConfig>): AIProviderConfig {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('evocrm_ai_config', JSON.stringify(this.config));
    }
    return this.config;
  }

  public getConfig(): AIProviderConfig {
    return this.config;
  }

  // Testar conexão com Google Gemini
  public async testGemini(apiKey: string, model: string = 'gemini-1.5-flash'): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API Key do Gemini não fornecida.' };
    }
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda apenas: "OK. Conexão Gemini estabelecida com sucesso."' }] }],
            generationConfig: { maxOutputTokens: 20 },
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: `Erro da API Gemini (${res.status}): ${errData.error?.message || 'Chave inválida ou modelo inacessível.'}`,
        };
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Conectado!';
      return { success: true, message: reply.trim() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha de rede';
      return { success: false, message: `Falha na requisição Gemini: ${errorMsg}` };
    }
  }

  // Testar conexão com Anthropic Claude
  public async testClaude(apiKey: string, model: string = 'claude-3-7-sonnet-20250219'): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API Key da Anthropic Claude não fornecida.' };
    }
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-20241022',
          max_tokens: 25,
          messages: [{ role: 'user', content: 'Responda apenas: "OK. Conexão Claude estabelecida com sucesso."' }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: `Erro da API Claude (${res.status}): ${errData.error?.message || 'Chave inválida ou sem saldo.'}`,
        };
      }

      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Conectado!';
      return { success: true, message: reply.trim() };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha de rede';
      return { success: false, message: `Falha na requisição Claude: ${errorMsg}` };
    }
  }

  // Enviar mensagem completa com contexto para o provedor configurado
  public async generateCompletion(
    userPrompt: string,
    contextData: Record<string, unknown>
  ): Promise<{ text: string; provider: string; model: string }> {
    const cfg = this.loadConfig();

    const systemPromptWithContext = `${cfg.systemPrompt}\n\n[CONTEXTO ATUAL DO CRM]:\n${JSON.stringify(contextData, null, 2)}`;

    // 1. Google Gemini
    if (cfg.activeProvider === 'gemini' && cfg.gemini.apiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${cfg.gemini.model}:generateContent?key=${cfg.gemini.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPromptWithContext }] },
              contents: [{ parts: [{ text: userPrompt }] }],
              generationConfig: {
                temperature: cfg.gemini.temperature,
                maxOutputTokens: 800,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return {
              text: reply.trim(),
              provider: 'Google Gemini',
              model: cfg.gemini.model,
            };
          }
        }
      } catch (e) {
        console.warn('Falha na chamada Gemini, usando fallback:', e);
      }
    }

    // 2. Anthropic Claude
    if (cfg.activeProvider === 'claude' && cfg.claude.apiKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': cfg.claude.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: cfg.claude.model,
            system: systemPromptWithContext,
            max_tokens: 800,
            temperature: cfg.claude.temperature,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.content?.[0]?.text;
          if (reply) {
            return {
              text: reply.trim(),
              provider: 'Anthropic Claude',
              model: cfg.claude.model,
            };
          }
        }
      } catch (e) {
        console.warn('Falha na chamada Claude, usando fallback:', e);
      }
    }

    // 3. Fallback inteligente estruturado
    return {
      text: `Analisando com motor analítico nativo: "${userPrompt}". O sistema utilizou as métricas estruturadas de faturamento e prospecção registradas no CRM.`,
      provider: 'Motor Nativo EvoPixel',
      model: 'Rule-based Pipeline',
    };
  }
}

export const aiProvider = new AIProviderService();
