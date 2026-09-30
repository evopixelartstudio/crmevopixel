'use client';

import { useState, useEffect } from 'react';
import { brandService, BrandConfig } from '@/lib/services/brand-service';

export function useBrand() {
  const [config, setConfig] = useState<BrandConfig>(() => brandService.getConfig());

  useEffect(() => {
    setConfig(brandService.load());
    brandService.applyTheme();
    return brandService.subscribe(() => {
      setConfig(brandService.getConfig());
    });
  }, []);

  return {
    ...config,
    saveConfig: brandService.saveConfig.bind(brandService),
    setPreset: brandService.setPreset.bind(brandService),
    resetBrand: brandService.resetBrand.bind(brandService),
  };
}

