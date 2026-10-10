import { requireCrmApi } from '@/lib/server/crm-auth';
import { NextResponse } from 'next/server';
import { cloudDatabase } from '@/lib/server/crm-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = ['client_id', 'client_name', 'company_name', 'segment', 'plan_name', 'monthly_value', 'billing_day', 'payment_method', 'status', 'current_month_status', 'start_date', 'last_payment_date', 'notes'];
const normalize = (row: any) => ({ ...row, status: row.subscription_status ?? row.status });

export async function GET(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  try {
    const { data, error } = await cloudDatabase().from('monthly_clients').select('id,client_id,client_name,company_name,segment,plan_name,monthly_value,billing_day,payment_method,subscription_status,current_month_status,start_date,last_payment_date,notes').order('billing_day');
    if (error) throw error;
    return NextResponse.json(data.map(normalize), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Não foi possível carregar as mensalidades. Execute 20261009_monthly_clients_fix.sql e confira as credenciais do Supabase na VPS.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (!uuid.test(body.id || '') || !['save', 'delete'].includes(body.action)) return NextResponse.json({ error: 'Mensalidade inválida.' }, { status: 400 });
    const db = cloudDatabase();
    if (body.action === 'delete') {
      const { data, error } = await db.from('monthly_clients').delete().eq('id', body.id).select('id').single();
      if (error || !data) throw error;
      return NextResponse.json({ deleted: true });
    }
    const values: Record<string, unknown> = {};
    for (const field of fields) if (Object.hasOwn(body.data || {}, field)) values[field] = body.data[field];
    if (values.client_id && !uuid.test(String(values.client_id))) return NextResponse.json({ error: 'O cliente vinculado precisa estar salvo no Supabase.' }, { status: 400 });
    if ('monthly_value' in values && (typeof values.monthly_value !== 'number' || !Number.isFinite(values.monthly_value) || values.monthly_value < 0)) return NextResponse.json({ error: 'Informe um valor mensal válido.' }, { status: 400 });
    if ('billing_day' in values && (!Number.isInteger(values.billing_day) || Number(values.billing_day) < 1 || Number(values.billing_day) > 31)) return NextResponse.json({ error: 'O vencimento deve ser entre 1 e 31.' }, { status: 400 });
    for (const [field, allowed] of Object.entries({ status: ['ativo','inadimplente','pausado','cancelado'], payment_method: ['pix','boleto','cartao','transferencia'], current_month_status: ['pago','pendente','atrasado'] })) {
      if (field in values && !allowed.includes(String(values[field]))) return NextResponse.json({ error: 'Situação ou forma de pagamento inválida.' }, { status: 400 });
    }
    if (body.create && (!values.company_name || !values.client_name || !values.plan_name)) return NextResponse.json({ error: 'Informe cliente, empresa e plano.' }, { status: 400 });
    if ('status' in values) { values.subscription_status = values.status; delete values.status; }
    values.updated_at = new Date().toISOString();
    const query = body.create ? db.from('monthly_clients').upsert({ ...values, id: body.id }, { onConflict: 'id' }) : db.from('monthly_clients').update(values).eq('id', body.id);
    const { data, error } = await query.select('*').single();
    if (error || !data) throw error;
    return NextResponse.json(normalize(data));
  } catch { return NextResponse.json({ error: 'Não foi possível salvar no Supabase. Execute 20261009_monthly_clients_fix.sql e verifique o cliente vinculado; nenhuma alteração foi confirmada.' }, { status: 503 }); }
}
