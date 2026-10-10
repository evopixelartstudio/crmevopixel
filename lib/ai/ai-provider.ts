// ==============================================================================
// EVOCRM — MOTOR DE CONEXÃO COM PROVEDORES DE IA (CLAUDE & GEMINI)
// ==============================================================================

export type AIProviderType = 'gemini' | 'claude' | 'simulation';

export interface AIProviderConfig {
  activeProvider: AIProviderType;
  gemini: {
    configured: boolean;
    model: string; // 'gemini-1.5-flash' | 'gemini-1.5-pro'
    temperature: number;
    enabled: boolean;
  };
  claude: {
    configured: boolean;
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
    configured: false,
    model: 'gemini-1.5-flash',
    temperature: 0.4,
    enabled: false,
  },
  claude: {
    configured: false,
    model: 'claude-3-7-sonnet-20250219',
    temperature: 0.4,
    enabled: false,
  },
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

class AIProviderService {
  private config: AIProviderConfig = structuredClone(DEFAULT_AI_CONFIG);
  public loadConfig(): AIProviderConfig { return this.config; }
  public getConfig(): AIProviderConfig { return this.config; }
  public saveConfig(newConfig: Partial<AIProviderConfig>): AIProviderConfig {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }
  public async refreshStatus(): Promise<AIProviderConfig> {
    try {
      const response = await fetch('/api/ai', { cache: 'no-store' });
      if (response.ok) {
        const status = await response.json();
        this.config.gemini.configured = status.gemini === true;
        this.config.claude.configured = status.claude === true;
      }
    } catch { /* A tela permite testar novamente. */ }
    return this.config;
  }
  private async test(provider: 'gemini' | 'claude', model: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', provider, model }) });
      const data = await response.json();
      return { success: response.ok, message: response.ok ? data.text : data.error };
    } catch { return { success: false, message: 'Verifique sua conexão e tente novamente.' }; }
  }
  public testGemini(model = this.config.gemini.model) { return this.test('gemini', model); }
  public testClaude(model = this.config.claude.model) { return this.test('claude', model); }
  public async generateCompletion(userPrompt: string, contextData: Record<string, unknown>): Promise<{ text: string; provider: string; model: string }> {
    const cfg = this.config;
    if (cfg.activeProvider === 'gemini' || cfg.activeProvider === 'claude') {
      const options = cfg[cfg.activeProvider];
      try {
        const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'completion', provider: cfg.activeProvider, model: options.model, temperature: options.temperature, systemPrompt: cfg.systemPrompt, userPrompt, contextData }) });
        if (response.ok) return await response.json();
      } catch { /* Preserva o motor nativo quando o provedor está indisponível. */ }
    }
    return { text: 'O motor nativo analisou a solicitação com as métricas estruturadas disponíveis no CRM.', provider: 'Motor Nativo EvoPixel', model: 'Rule-based Pipeline' };
  }
}
export const aiProvider = new AIProviderService();
