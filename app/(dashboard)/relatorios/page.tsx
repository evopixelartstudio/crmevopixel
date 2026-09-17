'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import {
  BarChart3,
  TrendingUp,
  Layers,
  Sparkles,
  Users,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<'prospeccao' | 'vendas' | 'servicos'>('prospeccao');

  const nichePerformance = [
    {
      niche: 'Contabilidade',
      leadsTotal: 48,
      aberturaTaxa: '12%',
      followup1Taxa: '34%', // Mais alto!
      followup2Taxa: '16%',
      conversaoOportunidade: '28%',
      destaque: 'Maior pico de resposta no Follow-up 1',
    },
    {
      niche: 'Clínicas / Odonto / Estética',
      leadsTotal: 36,
      aberturaTaxa: '24%',
      followup1Taxa: '18%',
      followup2Taxa: '8%',
      conversaoOportunidade: '31%',
      destaque: 'Alta resposta na Abertura',
    },
    {
      niche: 'Advocacia',
      leadsTotal: 22,
      aberturaTaxa: '18%',
      followup1Taxa: '22%',
      followup2Taxa: '10%',
      conversaoOportunidade: '24%',
      destaque: 'Ciclo mais longo e consultivo',
    },
    {
      niche: 'Imobiliárias',
      leadsTotal: 30,
      aberturaTaxa: '15%',
      followup1Taxa: '16%',
      followup2Taxa: '12%',
      conversaoOportunidade: '19%',
      destaque: 'Responde bem no WhatsApp à tarde',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            Business Intelligence & Métricas Comerciais
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Relatórios Estratégicos
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Taxas de resposta por nicho e etapa de sequência, volume de vendas e rentabilidade por serviço.
          </p>
        </div>
      </div>

      {/* Abas */}
      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        items={[
          { id: 'prospeccao', label: 'Performance de Prospecção por Nicho' },
          { id: 'vendas', label: 'Vendas & Conversão' },
          { id: 'servicos', label: 'Serviços Mais Rentáveis' },
        ]}
      />

      {/* Relatório de Prospecção por Nicho (Seção 33) */}
      {activeTab === 'prospeccao' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="border-b border-[rgba(218,241,222,0.06)] pb-4">
              <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
                Funil de Resposta por Nicho e Etapa da Sequência
              </h3>
              <p className="text-xs text-[#9BA6A0] mt-0.5">
                Compare em qual etapa (Abertura, Follow-up 1 ou Follow-up 2) cada nicho responde com maior frequência.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(218,241,222,0.06)] text-[11px] font-mono text-[#65706A] uppercase">
                    <th className="py-3 px-3">Nicho de Atuação</th>
                    <th className="py-3 px-3">Leads Disparados</th>
                    <th className="py-3 px-3">Resp. Abertura</th>
                    <th className="py-3 px-3">Resp. Follow-up 1</th>
                    <th className="py-3 px-3">Resp. Follow-up 2</th>
                    <th className="py-3 px-3">Conversão Final</th>
                    <th className="py-3 px-3">Padrão Detectado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(218,241,222,0.04)]">
                  {nichePerformance.map((np, idx) => (
                    <tr key={idx} className="hover:bg-[#10201E]/40">
                      <td className="py-3 px-3 font-semibold text-[#E7ECE8] font-heading">
                        {np.niche}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#9BA6A0]">{np.leadsTotal}</td>
                      <td className="py-3 px-3 font-mono text-[#9BA6A0]">{np.aberturaTaxa}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-[#F1F9A1]">
                        {np.followup1Taxa}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#9BA6A0]">{np.followup2Taxa}</td>
                      <td className="py-3 px-3 font-mono text-[#8EB69B]">
                        {np.conversaoOportunidade}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#9BA6A0]">{np.destaque}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Relatório de Vendas */}
      {activeTab === 'vendas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-2">
            <span className="text-xs text-[#9BA6A0]">Ticket Médio no Período</span>
            <div className="text-2xl font-bold font-mono text-[#F1F9A1]">R$ 4.280</div>
            <p className="text-xs text-[#8EB69B]">+18% vs trimestre anterior</p>
          </Card>
          <Card className="p-6 space-y-2">
            <span className="text-xs text-[#9BA6A0]">Taxa de Fechamento de Propostas</span>
            <div className="text-2xl font-bold font-mono text-[#8EB69B]">74.2%</div>
            <p className="text-xs text-[#9BA6A0]">3 em cada 4 propostas enviadas são aceitas</p>
          </Card>
          <Card className="p-6 space-y-2">
            <span className="text-xs text-[#9BA6A0]">Tempo Médio de Ciclo</span>
            <div className="text-2xl font-bold font-mono text-[#E7ECE8]">12 dias</div>
            <p className="text-xs text-[#9BA6A0]">Do primeiro contato à assinatura</p>
          </Card>
        </div>
      )}

      {/* Relatório de Serviços */}
      {activeTab === 'servicos' && (
        <Card className="p-6 space-y-4">
          <CardTitle>Participação na Receita Acumulada</CardTitle>
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-[#E7ECE8] mb-1">
                <span>Websites Institucionais & Landing Pages</span>
                <span className="font-mono text-[#F1F9A1]">54% (R$ 79.800)</span>
              </div>
              <div className="w-full bg-[#10201E] h-2 rounded-full overflow-hidden">
                <div className="bg-[#8EB69B] h-full" style={{ width: '54%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[#E7ECE8] mb-1">
                <span>Automação WhatsApp & Agentes IA (n8n)</span>
                <span className="font-mono text-[#F1F9A1]">28% (R$ 41.400)</span>
              </div>
              <div className="w-full bg-[#10201E] h-2 rounded-full overflow-hidden">
                <div className="bg-[#F1F9A1] h-full" style={{ width: '28%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[#E7ECE8] mb-1">
                <span>Presença Digital, SEO & Manutenção Recorrente</span>
                <span className="font-mono text-[#F1F9A1]">18% (R$ 26.650)</span>
              </div>
              <div className="w-full bg-[#10201E] h-2 rounded-full overflow-hidden">
                <div className="bg-[#235347] h-full" style={{ width: '18%' }} />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
