-- Compatibilidade com a tabela antiga (monthly_fee/name/service_description).
-- Preserva colunas e dados antigos. Execute no SQL Editor.
BEGIN;
CREATE TABLE IF NOT EXISTS public.monthly_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '', billing_day integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active', notes text, created_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='monthly_clients' AND column_name='monthly_value') THEN
    ALTER TABLE public.monthly_clients ADD COLUMN monthly_value numeric(12,2) NOT NULL DEFAULT 0;
    UPDATE public.monthly_clients m SET monthly_value=coalesce((to_jsonb(m)->>'monthly_fee')::numeric,0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='monthly_clients' AND column_name='client_name') THEN
    ALTER TABLE public.monthly_clients ADD COLUMN client_name text NOT NULL DEFAULT '';
    UPDATE public.monthly_clients m SET client_name=coalesce(to_jsonb(m)->>'name',m.company_name,'');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='monthly_clients' AND column_name='plan_name') THEN
    ALTER TABLE public.monthly_clients ADD COLUMN plan_name text NOT NULL DEFAULT 'Plano mensal';
    UPDATE public.monthly_clients m SET plan_name=coalesce(nullif(to_jsonb(m)->>'service_description',''),'Plano mensal');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='monthly_clients' AND column_name='subscription_status') THEN
    ALTER TABLE public.monthly_clients ADD COLUMN subscription_status text NOT NULL DEFAULT 'ativo'
      CHECK(subscription_status IN ('ativo','inadimplente','pausado','cancelado'));
    UPDATE public.monthly_clients SET subscription_status=CASE
      WHEN status IN ('ativo','active') THEN 'ativo'
      WHEN status IN ('inadimplente','overdue') THEN 'inadimplente'
      WHEN status IN ('pausado','paused') THEN 'pausado'
      WHEN status IN ('cancelado','cancelled','canceled','inactive') THEN 'cancelado'
      ELSE 'ativo' END;
  END IF;
END $$;
ALTER TABLE public.monthly_clients ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.monthly_clients ADD COLUMN IF NOT EXISTS segment text NOT NULL DEFAULT 'Geral';
ALTER TABLE public.monthly_clients ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'pix';
ALTER TABLE public.monthly_clients ADD COLUMN IF NOT EXISTS current_month_status text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.monthly_clients ADD COLUMN IF NOT EXISTS start_date date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.monthly_clients ADD COLUMN IF NOT EXISTS last_payment_date date;
ALTER TABLE public.monthly_clients ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.monthly_clients ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.monthly_clients TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
