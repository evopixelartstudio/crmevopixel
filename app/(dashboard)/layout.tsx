import { redirect } from 'next/navigation';
import { crmIdentity } from '@/lib/server/crm-auth';
import DashboardShell from '@/components/layout/DashboardShell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let identity;
  try { identity = await crmIdentity(); } catch { identity = null; }
  if (!identity) redirect('/login');
  return <DashboardShell>{children}</DashboardShell>;
}
