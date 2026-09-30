'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useBrand } from '@/lib/hooks/useBrand';

interface LogoProps {
  isCollapsed?: boolean;
  className?: string;
}

export function Logo({ isCollapsed = false, className = '' }: LogoProps) {
  const { theme } = useTheme();
  const { logoUrl, logoCollapsedUrl } = useBrand();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Antes de montar no client, usa dark como padrão
  const isDark = mounted ? theme === 'dark' : true;

  // Se houver logo customizada carregada nas configurações
  if (mounted && logoUrl) {
    if (isCollapsed) {
      return (
        <div className={`flex items-center justify-center ${className}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoCollapsedUrl || logoUrl}
            alt="Logo"
            className="w-7 h-7 object-contain rounded-md select-none"
          />
        </div>
      );
    }

    return (
      <div className={`flex items-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="Logo"
          className="h-7 w-auto max-w-[160px] object-contain select-none"
        />
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Image
          src={isDark ? '/logo-icon-dark.png' : '/logo-icon-light.png'}
          alt="EvoPixel"
          width={28}
          height={28}
          className="w-7 h-7 object-contain select-none"
          priority
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={isDark ? '/logo-dark.png' : '/logo-light.png'}
        alt="EvoPixel"
        width={160}
        height={24}
        className="h-6 w-auto max-w-[160px] object-contain select-none"
        priority
        unoptimized
      />
    </div>
  );
}

