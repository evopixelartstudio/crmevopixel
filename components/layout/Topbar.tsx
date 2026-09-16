'use client';

import React from 'react';
import { Search, Bell, Sparkles, Activity } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface TopbarProps {
  onOpenSearch?: () => void;
}

export function Topbar({ onOpenSearch }: TopbarProps) {
  return (
    <header className="h-16 border-b border-[var(--evo-border)] bg-[var(--evo-bg)]/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
      {/* Busca Global (Command Palette Trigger) */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[var(--evo-card)] border border-[var(--evo-border)] hover:border-[var(--evo-border-hover)] text-xs text-[var(--evo-muted)] transition-all group w-64 md:w-80 text-left shadow-sm"
        >
          <Search className="w-3.5 h-3.5 text-[#8EB69B] group-hover:text-[var(--evo-text)] transition-colors" />
          <span className="flex-1 truncate">Buscar leads, propostas, clientes...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-[var(--evo-surface)] px-1.5 py-0.5 rounded text-[var(--evo-disabled)] border border-[var(--evo-border)] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Status discreto n8n / webhook */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--evo-card)] border border-[var(--evo-border)] text-[11px] text-[var(--evo-muted)]">
          <span className="w-2 h-2 rounded-full bg-[#8EB69B] animate-pulse" />
          <span className="font-medium text-[var(--evo-text)]">n8n & Evolution API:</span>
          <span className="text-[#8EB69B]">Pronto para conexão</span>
        </div>
      </div>

      {/* Ações & Perfil */}
      <div className="flex items-center gap-3">
        {/* Alternador de Tema Dark / Claro */}
        <ThemeToggle />

        {/* Notificações */}
        <button className="relative p-2 rounded-xl text-[var(--evo-muted)] hover:text-[var(--evo-text)] hover:bg-[var(--evo-card)] border border-transparent hover:border-[var(--evo-border)] transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#F1F9A1]" />
        </button>

        <div className="h-4 w-[1px] bg-[var(--evo-border)] mx-1" />


        {/* Identificação Oliveira / EvoPixel */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] flex items-center justify-center text-xs font-semibold text-[#F1F9A1] font-heading shadow-inner">
            OL
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-medium text-[#E7ECE8] font-heading leading-tight">
              Oliveira
            </span>
            <span className="text-[10px] text-[#65706A] leading-tight">
              EvoPixel Commercial
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
