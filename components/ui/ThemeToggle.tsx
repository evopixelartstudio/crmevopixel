'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
      aria-label="Alternar tema"
      className={`relative p-2 rounded-xl border transition-all duration-200 flex items-center justify-center ${
        theme === 'dark'
          ? 'text-[#9BA6A0] hover:text-[#F1F9A1] hover:bg-[#0C1A19] border-transparent hover:border-[rgba(218,241,222,0.1)]'
          : 'text-[#5C6B64] hover:text-[#0C1A19] hover:bg-[#E8EFEA] border-transparent hover:border-[rgba(12,26,25,0.1)]'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-[#F1F9A1] transition-transform hover:rotate-45 duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-[#163832] transition-transform hover:-rotate-12 duration-300" />
      )}
    </button>
  );
}
