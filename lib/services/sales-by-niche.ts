import type { HistoricalProject, Project, Opportunity, Lead, Client } from '@/types/database';

export type SalesPeriod = 'hoje' | '7d' | '30d' | '90d' | 'ano' | 'historico';
export interface NicheSales { niche: string; count: number; percentage: number }

export function getSalesByNiche(
  historical: HistoricalProject[], projects: Project[], opportunities: Opportunity[],
  leads: Lead[], clients: Client[], period: SalesPeriod = 'historico', now = new Date(),
): NicheSales[] {
  const normalize = (value?: string) => (value || '').trim().toLocaleLowerCase('pt-BR');
  const sales: { company: string; segment?: string; date?: string; amount: number; notes?: string }[] = [];
  historical.filter(project => project.status !== 'cancelado').forEach(project => sales.push({
    company: project.company_name, segment: project.segment, date: project.project_date,
    amount: project.amount_contracted, notes: project.notes,
  }));
  const alreadyCounted = (company: string, amount: number, date?: string) => sales.some(sale =>
    normalize(sale.company) === normalize(company) && sale.amount === amount && sale.date?.slice(0, 10) === date?.slice(0, 10),
  );
  projects.filter(project => project.status === 'concluido').forEach(project => {
    if (!alreadyCounted(project.company_name, project.amount_contracted || 0, project.deadline)) sales.push({
      company: project.company_name, segment: project.segment, date: project.deadline, amount: project.amount_contracted || 0,
    });
  });
  opportunities.filter(opp => opp.stage_slug === 'fechado' || opp.stage_slug === 'won').forEach(opp => {
    if (sales.some(sale => sale.notes?.includes(opp.id)) || alreadyCounted(opp.company_name, opp.estimated_value || 0, opp.closed_at || opp.updated_at)) return;
    sales.push({ company: opp.company_name, segment: opp.leads?.segment || leads.find(lead => lead.id === opp.lead_id)?.segment,
      date: opp.closed_at || opp.updated_at, amount: opp.estimated_value || 0 });
  });
  const groups = new Map<string, { niche: string; count: number }>();
  for (const sale of sales) {
    if (period !== 'historico') {
      if (!sale.date) continue;
      const date = new Date(`${sale.date.slice(0, 10)}T00:00:00`);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (Number.isNaN(date.getTime()) || date > now) continue;
      if (period === 'hoje' && date.getTime() !== today.getTime()) continue;
      if (period === 'ano' && date.getFullYear() !== now.getFullYear()) continue;
      if (['7d', '30d', '90d'].includes(period)) {
        const start = new Date(today);
        start.setDate(start.getDate() - Number.parseInt(period) + 1);
        if (date < start) continue;
      }
    }
    const niche = sale.segment?.trim() || clients.find(client => normalize(client.company_name) === normalize(sale.company))?.segment?.trim() || 'Nicho não informado';
    const key = normalize(niche);
    const group = groups.get(key) || { niche, count: 0 };
    group.count++;
    groups.set(key, group);
  }
  const total = [...groups.values()].reduce((sum, group) => sum + group.count, 0);
  return [...groups.values()].sort((a, b) => b.count - a.count || a.niche.localeCompare(b.niche, 'pt-BR'))
    .map(group => ({ ...group, percentage: group.count / total * 100 }));
}
