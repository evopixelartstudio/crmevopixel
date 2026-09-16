'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import {
  Clock,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Calendar,
  Send,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

export default function FollowUpsPage() {
  const followUps = crmService.getFollowUps();
  const [activeTab, setActiveTab] = useState<'hoje' | 'atrasado' | 'proximo' | 'automatico'>('hoje');

  const filteredItems = followUps.filter((item) => {
    if (activeTab === 'automatico') return item.is_automated;
    return item.type === activeTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Clock className="w-3.5 h-3.5" />
            Central de Contatos & Reengajamento
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Central de Follow-ups
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Contatos manuais e réguas automáticas disparadas pelo n8n baseadas no prazo da etapa do nicho.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/prospeccao/mensagens">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#8EB69B]" />
              <span>Ver Réguas Automáticas</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Abas da Central: Hoje, Atrasados, Próximos, Automáticos (IA/n8n) (Seção 36) */}
      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        items={[
          { id: 'hoje', label: 'Hoje', count: followUps.filter((f) => f.type === 'hoje').length },
          { id: 'atrasado', label: 'Atrasados', count: followUps.filter((f) => f.type === 'atrasado').length },
          { id: 'proximo', label: 'Próximos', count: followUps.filter((f) => f.type === 'proximo').length },
          { id: 'automatico', label: 'Automáticos (IA/n8n)', count: followUps.filter((f) => f.is_automated).length },
        ]}
      />

      {/* Lista de Follow-ups */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#E7ECE8] font-heading">
                  {item.company_name}
                </span>
                <span className="text-xs text-[#9BA6A0]">({item.target_name})</span>
                {item.is_automated && (
                  <Badge variant="accent" className="text-[10px] py-0 px-2">
                    <Zap className="w-3 h-3 text-[#F1F9A1]" />
                    IA / n8n
                  </Badge>
                )}
                {item.type === 'atrasado' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                    Atrasado
                  </span>
                )}
              </div>

              <p className="text-xs text-[#9BA6A0] leading-relaxed">
                Contexto: <span className="text-[#E7ECE8]">{item.context}</span>
              </p>

              <div className="flex items-center gap-2 text-[11px] text-[#65706A]">
                <span>Prazo: {item.due_date}</span>
                <span>•</span>
                <span>Próxima ação: {item.next_action}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {item.is_automated ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs h-8 px-3 text-[#F1F9A1]"
                  onClick={() => alert('Automação pausada para intervenção manual!')}
                >
                  Intervir Manualmente
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs h-8 px-3"
                  onClick={() => alert('Follow-up marcado como concluído!')}
                >
                  Marcar Feito
                </Button>
              )}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="p-12 text-center text-xs text-[#9BA6A0] bg-[#0C1A19]/40 rounded-2xl border border-[rgba(218,241,222,0.06)]">
            Nenhum follow-up pendente nesta visualização.
          </div>
        )}
      </div>
    </div>
  );
}
