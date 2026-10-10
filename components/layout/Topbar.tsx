'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useBrand } from '@/lib/hooks/useBrand';

interface TopbarProps {
  onOpenSearch?: () => void;
}

export function Topbar({ onOpenSearch }: TopbarProps) {
  const [configured, setConfigured] = useState(false);
  const { userName, userRole, userInitials, userAvatarUrl } = useBrand();

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, []);

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
      </div>

      {/* Ações & Perfil Customizável */}
      <div className="flex items-center gap-3">
        {/* Alternador de Tema Dark / Claro */}
        <ThemeToggle />
        <LogoutButton />

        <div className="h-4 w-[1px] bg-[var(--evo-border)] mx-1" />

        {/* Identificação de Usuário Personalizada */}
        <Link
          href="/configuracoes"
          className="flex items-center gap-2.5 pl-1 hover:opacity-85 transition-opacity group"
          title="Editar Perfil e Marca em Configurações"
        >
          {userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatarUrl}
              alt={userName}
              className="w-8 h-8 rounded-xl object-cover border border-[rgba(218,241,222,0.15)] shadow-inner"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] flex items-center justify-center text-xs font-semibold text-[#F1F9A1] font-heading shadow-inner group-hover:border-[#F1F9A1]/30 transition-colors">
              {userInitials || 'OL'}
            </div>
          )}
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-medium text-[#E7ECE8] font-heading leading-tight group-hover:text-[#F1F9A1] transition-colors">
              {userName || 'Oliveira'}
            </span>
            <span className="text-[10px] text-[#65706A] leading-tight">
              {userRole || 'EvoPixel Commercial'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
