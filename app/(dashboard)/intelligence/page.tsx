'use client';

import React from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

export default function IntelligencePage() {
  const insights = crmService.getInsights();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <BrainCircuit className="w-3.5 h-3.5" />
            Evo Intelligence • IA Comercial Aplicada
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Evo Intelligence & Insights de Negócio
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Recomendações e padrões extraídos exclusivamente dos dados reais da EvoPixel, sem alucinações.
          </p>
        </div>
      </div>

      {/* Grid de Insights Estratégicos (Seção 35) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((ins) => (
          <div
            key={ins.id}
            className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(241,249,161,0.25)] transition-all flex flex-col justify-between space-y-4 shadow-sm group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                  {ins.category}
                </span>
                {ins.metric && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#10201E] text-[#F1F9A1] border border-[rgba(241,249,161,0.2)]">
                    {ins.metric}
                  </span>
                )}
              </div>

              <h3 className="text-base font-semibold text-[#E7ECE8] font-heading group-hover:text-[#F1F9A1] transition-colors">
                {ins.title}
              </h3>

              <p className="text-xs text-[#9BA6A0] mt-2 leading-relaxed">
                {ins.description}
              </p>
            </div>

            <div className="pt-3 border-t border-[rgba(218,241,222,0.06)] flex items-center justify-end">
              {ins.link && ins.action_label && (
                <Link href={ins.link}>
                  <Button variant="secondary" size="sm" className="text-xs gap-1.5">
                    <span>{ins.action_label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#8EB69B]" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Princípio de Transparência da IA (Seção 19 & 34) */}
      <Card className="p-6 space-y-3 bg-[#07100F]/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8EB69B] font-heading">
          <Sparkles className="w-4 h-4 text-[#F1F9A1]" />
          <span>Diretriz Editorial de IA da EvoPixel</span>
        </div>
        <p className="text-xs text-[#9BA6A0] leading-relaxed">
          O EVOCRM nunca apresenta dados fabricados ou inferências como se fossem fatos absolutos. Em todas as análises de perfil e prospecção, há demarcação visual nítida entre <strong className="text-[#8EB69B]">[DADO]</strong> (verificado), <strong className="text-[#9BA6A0]">[INFERÊNCIA]</strong> (probabilística) e <strong className="text-[#F1F9A1]">[RECOMENDAÇÃO]</strong> (sugestão de ação humana).
        </p>
      </Card>
    </div>
  );
}
