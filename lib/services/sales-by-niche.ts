import type { HistoricalProject, Project, Opportunity, Lead, Client } from '@/types/database';

export type SalesPeriod = 'hoje' | '7d' | '30d' | '90d' | 'ano' | 'historico';
export interface NicheSales { niche: string; count: number; percentage: number; customers: { company: string; clientId?: string; count: number }[] }

export function getSalesByNiche(
  historical: HistoricalProject[], projects: Project[], opportunities: Opportunity[],
  leads: Lead[], clients: Client[], period: SalesPeriod = 'historico', now = new Date(),
): NicheSales[] {
  const normalize = (value?: string) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();
  const contactKey = (value?: string) => normalize(value).replace(/^(?:dr|dra|doutor|doutora)\s+/, '').replace(/\s+(?:advocacia|advogado|advogada|contabilidade)$/, '').trim();
  const uniqueMatch = <T,>(items: T[]): T | undefined => items.length === 1 ? items[0] : undefined;
  const meaningfulSegment = (value?: string) => value && !['geral', 'nicho nao informado', 'nao informado'].includes(normalize(value)) ? value.trim() : undefined;
  const sales: { company: string; contact?: string; segment?: string; date?: string; amount: number; notes?: string }[] = [];
  historical.filter(project => project.status !== 'cancelado').forEach(project => sales.push({
    company: project.company_name, contact: project.client_name, segment: project.segment, date: project.project_date,
    amount: project.amount_contracted, notes: project.notes,
  }));
  const alreadyCounted = (company: string, amount: number, date?: string) => sales.some(sale =>
    normalize(sale.company) === normalize(company) && sale.amount === amount && sale.date?.slice(0, 10) === date?.slice(0, 10),
  );
  projects.filter(project => project.status === 'concluido').forEach(project => {
    if (!alreadyCounted(project.company_name, project.amount_contracted || 0, project.deadline)) sales.push({
      company: project.company_name, contact: project.client_name, segment: project.segment, date: project.deadline, amount: project.amount_contracted || 0,
    });
  });
  opportunities.filter(opp => opp.stage_slug === 'fechado' || opp.stage_slug === 'won').forEach(opp => {
    if (sales.some(sale => sale.notes?.includes(opp.id)) || alreadyCounted(opp.company_name, opp.estimated_value || 0, opp.closed_at || opp.updated_at)) return;
    sales.push({ company: opp.company_name, contact: opp.leads?.name || opp.lead_name, segment: opp.leads?.segment || leads.find(lead => lead.id === opp.lead_id)?.segment,
      date: opp.closed_at || opp.updated_at, amount: opp.estimated_value || 0 });
  });
  const groups = new Map<string, { niche: string; count: number; customers: NicheSales['customers'] }>();
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
    const client = uniqueMatch(clients.filter(client => normalize(client.company_name) === normalize(sale.company)))
      || (contactKey(sale.contact) ? uniqueMatch(clients.filter(client => contactKey(client.name) === contactKey(sale.contact))) : undefined)
      || (contactKey(sale.company) ? uniqueMatch(clients.filter(client => contactKey(client.name) === contactKey(sale.company))) : undefined);
    const lead = uniqueMatch(leads.filter(lead => normalize(lead.company_name) === normalize(sale.company)));
    const niche = meaningfulSegment(client?.segment) || meaningfulSegment(sale.segment) || meaningfulSegment(lead?.segment) || 'Nicho não informado';
    const key = normalize(niche);
    const group = groups.get(key) || { niche, count: 0, customers: [] };
    group.count++;
    const company = client?.company_name?.trim() || sale.company?.trim() || 'Cliente não informado';
    const customer = group.customers.find(customer => normalize(customer.company) === normalize(company));
    if (customer) customer.count++;
    else group.customers.push({ company, count: 1, clientId: client?.id });
    groups.set(key, group);
  }
  const total = [...groups.values()].reduce((sum, group) => sum + group.count, 0);
  return [...groups.values()].sort((a, b) => b.count - a.count || a.niche.localeCompare(b.niche, 'pt-BR'))
    .map(group => ({ ...group, customers: group.customers.sort((a, b) => b.count - a.count || a.company.localeCompare(b.company, 'pt-BR')), percentage: group.count / total * 100 }));
}
