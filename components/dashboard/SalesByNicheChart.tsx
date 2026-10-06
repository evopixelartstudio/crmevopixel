'use client';

import { useState } from 'react';
import type { NicheSales } from '@/lib/services/sales-by-niche';

const COLORS = ['#8EB69B', '#F1F9A1', '#77A7FF', '#FFB2D2', '#C084FC', '#FF9F5A', '#4DD0E1', '#FDE047'];
export function SalesByNicheChart({ data }: { data: NicheSales[] }) {
  const [active, setActive] = useState<string | null>(null);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let angle = -Math.PI / 2;
  return <section className="p-5 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]" aria-labelledby="niche-chart-title">
    <h2 id="niche-chart-title" className="text-sm font-semibold text-[#E7ECE8]">Vendas por nicho</h2>
    <p className="text-xs text-[#9BA6A0] mt-1">Participação pela quantidade de vendas concluídas no período.</p>
    {total === 0 ? <p className="py-10 text-sm text-[#9BA6A0]">Ainda não há vendas concluídas neste período.</p> : <>
      <div className="mt-6 flex flex-col lg:flex-row items-center gap-8">
        <svg viewBox="0 0 240 240" className="w-60 h-60 max-w-full shrink-0" role="img" aria-label={`Gráfico de pizza com ${total} vendas por nicho`}>
          {data.map((item, index) => {
            const start = angle;
            angle += item.count / total * Math.PI * 2;
            const path = `M 120 120 L ${120 + 110 * Math.cos(start)} ${120 + 110 * Math.sin(start)} A 110 110 0 ${item.percentage > 50 ? 1 : 0} 1 ${120 + 110 * Math.cos(angle)} ${120 + 110 * Math.sin(angle)} Z`;
            const props = { fill: COLORS[index % COLORS.length], opacity: active && active !== item.niche ? 0.4 : 1,
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
              onFocus={() => setActive(item.niche)} onBlur={() => setActive(null)} onClick={() => setActive(active === item.niche ? null : item.niche)}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-sm text-[#E7ECE8] flex-1 min-w-0 break-words">{item.niche}</span>
              <span className="text-xs text-[#9BA6A0] shrink-0">{item.count} {item.count === 1 ? 'venda' : 'vendas'}</span>
              <span className="text-sm font-mono text-[#E7ECE8]">{item.percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
            </button>
          </li>)}
        </ul>
      </div>
      <p className="mt-4 text-xs text-[#8EB69B]">Maior demanda: {data.filter(item => item.count === data[0].count).map(item => item.niche).join(' e ')} · {data[0].count} {data[0].count === 1 ? 'venda' : 'vendas'} {data.filter(item => item.count === data[0].count).length > 1 ? 'por nicho' : `de ${total}`}.</p>
    </>}
  </section>;
}
