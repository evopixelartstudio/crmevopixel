'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Logo } from '@/components/ui/Logo';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Kanban,
  Target,
  Building2,
  Briefcase,
  CheckSquare,
  Clock,
  FileText,
  FileCheck,
  Layers,
  DollarSign,
  BarChart3,
  BrainCircuit,
  Workflow,
  Settings,
  ChevronLeft,
  ChevronRight,
  History,
  Bot,
  Crosshair,
  CalendarCheck,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sections: NavSection[] = [
    {
      items: [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'COMERCIAL',
      items: [
        { label: 'Prospects', href: '/prospects', icon: Target },
        { label: 'Leads', href: '/leads', icon: Users },
        { label: 'Prospecção IA', href: '/prospeccao', icon: Sparkles },
        { label: 'Pipeline', href: '/pipeline', icon: Kanban },
        { label: 'Oportunidades', href: '/oportunidades', icon: Crosshair },
      ],
    },
    {
      title: 'GESTÃO',
      items: [
        { label: 'Clientes', href: '/clientes', icon: Building2 },
        { label: 'Mensalistas', href: '/mensalidades', icon: CalendarCheck, badge: 'MRR' },
        { label: 'Projetos', href: '/projetos', icon: Briefcase },
        { label: 'Tarefas', href: '/tarefas', icon: CheckSquare },
        { label: 'Follow-ups', href: '/follow-ups', icon: Clock },
      ],
    },
    {
      title: 'NEGÓCIOS',
      items: [
        { label: 'Propostas', href: '/propostas', icon: FileText },
        { label: 'Contratos', href: '/contratos', icon: FileCheck },
        { label: 'Serviços', href: '/servicos', icon: Layers },
        { label: 'Financeiro', href: '/financeiro', icon: DollarSign },
        { label: 'Meu Histórico', href: '/minha-historia', icon: History },
      ],
    },
    {
      title: 'INTELIGÊNCIA',
      items: [
        { label: 'Evo Assistant', href: '/assistant', icon: Bot, badge: 'IA' },
        { label: 'Evo Intelligence', href: '/intelligence', icon: BrainCircuit },
        { label: 'Relatórios', href: '/relatorios', icon: BarChart3 },
        { label: 'Automações', href: '/automacoes', icon: Workflow },
      ],
    },

  ];

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-screen bg-[#07100F] border-r border-[rgba(218,241,222,0.07)] transition-all duration-300 z-30 select-none shrink-0',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header com Logo Oficial EvoPixel */}
      <div
        className={clsx(
          'h-16 flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] bg-[#050706]/40 transition-all duration-200',
          isCollapsed ? 'px-3' : 'px-5'
        )}
      >
        <Link href="/" className="flex items-center overflow-hidden py-1 group" title="EvoPixel OS">
          <Logo isCollapsed={isCollapsed} />
        </Link>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#9BA6A0] hover:text-[#E7ECE8] p-1.5 rounded-lg hover:bg-[#10201E] transition-colors shrink-0"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navegação */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && !isCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-heading font-semibold tracking-wider text-[#65706A] uppercase">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-heading transition-all duration-150',
                    isActive
                      ? 'bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.1)] font-medium'
                      : 'text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#0C1A19]/80'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  {/* Pequeno sinal acento em #F1F9A1 para item ativo */}
                  {isActive && (
                    <div className="absolute left-1 w-1 h-3.5 bg-[#F1F9A1] rounded-full" />
                  )}

                  <Icon
                    className={clsx(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-[#F1F9A1]' : 'text-[#8EB69B]/70 group-hover:text-[#8EB69B]'
                    )}
                  />

                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between overflow-hidden">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded font-mono',
                            isActive
                              ? 'bg-[#F1F9A1]/10 text-[#F1F9A1]'
                              : 'bg-[#163832] text-[#8EB69B]'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Rodapé da Sidebar */}
      <div className="p-3 border-t border-[rgba(218,241,222,0.06)] bg-[#050706]/40">
        <Link
          href="/configuracoes"
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-heading text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#0C1A19] transition-all',
            pathname === '/configuracoes' && 'bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.1)]'
          )}
        >
          <Settings className="w-4 h-4 text-[#65706A]" />
          {!isCollapsed && <span>Configurações</span>}
        </Link>
      </div>
    </aside>
  );
}
