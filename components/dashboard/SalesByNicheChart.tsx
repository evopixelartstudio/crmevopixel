'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { NicheSales } from '@/lib/services/sales-by-niche';

const COLORS = ['#14B8A6', '#3B82F6', '#6366F1', '#F59E0B', '#06B6D4', '#8B5CF6', '#E11D48', '#64748B'];
export function SalesByNicheChart({ data }: { data: NicheSales[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedNiche = data.find(item => item.niche === selected);
  const highlighted = active || selected;
  const selectNiche = (niche: string) => setSelected(previous => previous === niche ? null : niche);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let angle = -Math.PI / 2;
  return <section className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]" aria-labelledby="niche-chart-title">
    <h2 id="niche-chart-title" className="text-sm font-semibold text-[#E7ECE8]">Vendas por nicho</h2>
    <p className="text-xs text-[#9BA6A0] mt-1">Participação pela quantidade de vendas concluídas no período. Clique em um nicho para ver os clientes.</p>
    {total === 0 ? <p className="py-10 text-sm text-[#9BA6A0]">Ainda não há vendas concluídas neste período.</p> : <>
      <div className="mt-6 flex flex-col lg:flex-row items-center gap-8">
        <svg viewBox="0 0 240 240" className="w-60 h-60 max-w-full shrink-0" role="group" aria-label={`Gráfico de pizza com ${total} vendas por nicho`}>
          {data.map((item, index) => {
            const start = angle;
            angle += item.count / total * Math.PI * 2;
            const path = `M 120 120 L ${120 + 110 * Math.cos(start)} ${120 + 110 * Math.sin(start)} A 110 110 0 ${item.percentage > 50 ? 1 : 0} 1 ${120 + 110 * Math.cos(angle)} ${120 + 110 * Math.sin(angle)} Z`;
            const props = { fill: COLORS[index % COLORS.length], opacity: highlighted && highlighted !== item.niche ? 0.35 : 1,
              role: 'button', tabIndex: 0, 'aria-label': `Ver clientes de ${item.niche}`, 'aria-pressed': selected === item.niche,
              className: 'cursor-pointer focus-visible:outline focus-visible:outline-white',
              onClick: () => selectNiche(item.niche),
              onKeyDown: (event: React.KeyboardEvent<SVGElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectNiche(item.niche); } },
              onMouseEnter: () => setActive(item.niche), onMouseLeave: () => setActive(null) };
            const title = `${item.niche}: ${item.count} vendas (${item.percentage.toFixed(1)}%)`;
            return data.length === 1 ? <circle key={item.niche} cx="120" cy="120" r="110" {...props}><title>{title}</title></circle>
              : <path key={item.niche} d={path} {...props} stroke="#0C1A19" strokeWidth="2"><title>{title}</title></path>;
          })}
        </svg>
        <ul className="w-full space-y-1">
          {data.map((item, index) => <li key={item.niche}>
            <button className="flex w-full items-center gap-3 py-2 px-2 rounded-lg text-left hover:bg-[#10201E] focus-visible:outline focus-visible:outline-[#F1F9A1]"
              onMouseEnter={() => setActive(item.niche)} onMouseLeave={() => setActive(null)}
              aria-pressed={selected === item.niche} aria-controls="niche-customers"
              onFocus={() => setActive(item.niche)} onBlur={() => setActive(null)} onClick={() => selectNiche(item.niche)}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-sm text-[#E7ECE8] flex-1 min-w-0 break-words">{item.niche}</span>
              <span className="text-xs text-[#9BA6A0] shrink-0">{item.count} {item.count === 1 ? 'venda' : 'vendas'}</span>
              <span className="text-sm font-mono text-[#E7ECE8]">{item.percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
            </button>
          </li>)}
        </ul>
      </div>
      {selectedNiche && <div id="niche-customers" className="mt-5 border-t border-[rgba(218,241,222,0.08)] pt-4" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#E7ECE8]">Clientes de {selectedNiche.niche} ({selectedNiche.customers.length})</h3>
          <button onClick={() => setSelected(null)} className="text-xs text-[#9BA6A0] hover:text-white">Fechar lista</button>
        </div>
        <ul className="mt-3 divide-y divide-[rgba(218,241,222,0.06)]">
          {selectedNiche.customers.map(customer => <li key={customer.company} className="flex justify-between items-center gap-4 py-3 text-sm">
            {customer.clientId ? <Link href={`/clientes/${customer.clientId}`} className="text-[#E7ECE8] underline underline-offset-4 hover:text-[#14B8A6]">{customer.company}</Link>
              : <span className="text-[#E7ECE8]">{customer.company}</span>}
            <span className="text-xs text-[#9BA6A0] shrink-0">{customer.count} {customer.count === 1 ? 'venda' : 'vendas'}</span>
          </li>)}
        </ul>
      </div>}
      <p className="mt-4 text-xs text-[#8EB69B]">Maior demanda: {data.filter(item => item.count === data[0].count).map(item => item.niche).join(' e ')} · {data[0].count} {data[0].count === 1 ? 'venda' : 'vendas'} {data.filter(item => item.count === data[0].count).length > 1 ? 'por nicho' : `de ${total}`}.</p>
    </>}
  </section>;
}
