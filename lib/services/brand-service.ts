export interface BrandConfig {
  logoUrl: string | null;
  logoCollapsedUrl?: string | null;
  userName: string;
  userRole: string;
  userInitials: string;
  userAvatarUrl?: string | null;
  colorPreset: 'emerald' | 'cyber_blue' | 'purple' | 'amber' | 'carbon' | 'ruby' | 'custom';
  accentColor: string;
  supportColor: string;
  bgColor: string;
  cardColor: string;
}

export const COLOR_PRESETS = {
  emerald: {
    name: 'Esmeralda EvoPixel',
    accent: '#F1F9A1',
    support: '#8EB69B',
    bg: '#07100F',
    card: '#0C1A19',
    badge: '#163832',
  },
  cyber_blue: {
    name: 'Azul Cyber / Cobalto',
    accent: '#38BDF8',
    support: '#60A5FA',
    bg: '#08101E',
    card: '#0F172A',
    badge: '#1E293B',
  },
  purple: {
    name: 'Violeta / Roxo Imperial',
    accent: '#C084FC',
    support: '#A855F7',
    bg: '#0F0A1A',
    card: '#1A102E',
    badge: '#2E1A47',
  },
  amber: {
    name: 'Âmbar Dourado / Ouro',
    accent: '#F59E0B',
    support: '#FBBF24',
    bg: '#14100A',
    card: '#1F180E',
    badge: '#382B14',
  },
  carbon: {
    name: 'Carbono Monocromático',
    accent: '#E2E8F0',
    support: '#94A3B8',
    bg: '#101112',
    card: '#181A1B',
    badge: '#272A2C',
  },
  ruby: {
    name: 'Carmim / Rubi',
    accent: '#F87171',
    support: '#EF4444',
    bg: '#14080A',
    card: '#220D11',
    badge: '#3B141B',
  },
};

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  logoUrl: null,
  logoCollapsedUrl: null,
  userName: 'Oliveira',
  userRole: 'EvoPixel Commercial',
  userInitials: 'OL',
  userAvatarUrl: null,
  colorPreset: 'emerald',
  accentColor: '#F1F9A1',
  supportColor: '#8EB69B',
  bgColor: '#07100F',
  cardColor: '#0C1A19',
};

class BrandService {
  private config: BrandConfig = { ...DEFAULT_BRAND_CONFIG };
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.load();
      this.applyTheme();
    }
  }

  public getConfig(): BrandConfig {
    return { ...this.config };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Erro no listener do brandService:', e);
      }
    });
  }

  public load(): BrandConfig { return this.config; }

  public saveConfig(newConfig: Partial<BrandConfig>): BrandConfig {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      this.applyTheme();
    }
    this.notify();
    return this.config;
  }

  public setPreset(presetKey: keyof typeof COLOR_PRESETS): BrandConfig {
    const preset = COLOR_PRESETS[presetKey];
    if (!preset) return this.config;

    return this.saveConfig({
      colorPreset: presetKey as any,
      accentColor: preset.accent,
      supportColor: preset.support,
      bgColor: preset.bg,
      cardColor: preset.card,
    });
  }

  public resetBrand(): BrandConfig {
    this.config = { ...DEFAULT_BRAND_CONFIG };
    if (typeof window !== 'undefined') {

      this.applyTheme();
    }
    this.notify();
    return this.config;
  }

  public applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const { accentColor, supportColor, bgColor, cardColor } = this.config;

    root.style.setProperty('--evo-bg', bgColor);
    root.style.setProperty('--evo-card', cardColor);
    root.style.setProperty('--evo-accent', accentColor);
    root.style.setProperty('--evo-support', supportColor);

    // Injeta CSS dinâmico para estilizar elementos com cores customizadas
    let styleTag = document.getElementById('evocrm-custom-theme-style');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'evocrm-custom-theme-style';
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      body {
        background-color: ${bgColor} !important;
      }
      aside {
        background-color: ${bgColor} !important;
      }
      .bg-\\[\\#07100F\\] {
        background-color: ${bgColor} !important;
      }
      .bg-\\[\\#0C1A19\\] {
        background-color: ${cardColor} !important;
      }
      .text-\\[\\#F1F9A1\\] {
        color: ${accentColor} !important;
      }
      .text-\\[\\#8EB69B\\] {
        color: ${supportColor} !important;
      }
      .border-\\[\\#F1F9A1\\] {
        border-color: ${accentColor} !important;
      }
      .border-\\[\\#8EB69B\\] {
        border-color: ${supportColor} !important;
      }
      .bg-\\[\\#F1F9A1\\] {
        background-color: ${accentColor} !important;
      }
      .bg-\\[\\#8EB69B\\] {
        background-color: ${supportColor} !important;
      }
    `;
  }
}

export const brandService = new BrandService();
