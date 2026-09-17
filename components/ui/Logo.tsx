'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/providers/ThemeProvider';

interface LogoProps {
  isCollapsed?: boolean;
  className?: string;
}

export function Logo({ isCollapsed = false, className = '' }: LogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Antes de montar no client, usa dark como padrão
  const isDark = mounted ? theme === 'dark' : true;

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
