'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { CommandPalette } from '@/components/layout/CommandPalette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07100F]">
      {/* Sidebar Fixa recolhível */}
      <Sidebar />

      {/* Área Central Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar Discreta */}
        <Topbar onOpenSearch={() => setIsCommandOpen(true)} />

        {/* Conteúdo com iluminação atmosférica sutil */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 evo-atmospheric-glow">
          <div className="max-w-7xl mx-auto space-y-8 pb-16">{children}</div>
        </main>
      </div>

      {/* Command Palette Global (Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </div>
  );
}
