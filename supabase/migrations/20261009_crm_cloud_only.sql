-- Cole TODO este arquivo no SQL Editor do projeto conectado ao CRM.
-- Reexecutável. Não exclui tabelas nem registros existentes.
BEGIN;

CREATE TABLE IF NOT EXISTS public.rabisco_boards (
  id TEXT PRIMARY KEY,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(cards) = 'array'),
  connections JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(connections) = 'array'),
  strokes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(strokes) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.rabisco_boards ENABLE ROW LEVEL SECURITY;
-- O acesso do CRM passa pelo backend protegido por CRM_ACCESS_TOKEN.
GRANT SELECT, INSERT, UPDATE ON public.rabisco_boards TO service_role;
REVOKE ALL ON public.rabisco_boards FROM anon;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_link TEXT,
  ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS loss_reason TEXT,
  ADD COLUMN IF NOT EXISTS loss_notes TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- O histórico anterior das movimentações não pode ser reconstruído.
UPDATE public.opportunities SET stage_entered_at = NOW() WHERE stage_entered_at IS NULL;
ALTER TABLE public.opportunities ALTER COLUMN stage_entered_at SET DEFAULT NOW();
ALTER TABLE public.opportunities ALTER COLUMN stage_entered_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.track_opportunity_stage_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.stage_entered_at := NOW();
  ELSIF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    NEW.stage_entered_at := NOW();
  ELSE
    NEW.stage_entered_at := OLD.stage_entered_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS opportunity_stage_entry ON public.opportunities;
CREATE TRIGGER opportunity_stage_entry BEFORE INSERT OR UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.track_opportunity_stage_entry();

INSERT INTO public.pipeline_stages (name, slug, display_order, color)
SELECT 'Sem resposta', 'sem_resposta', COALESCE(MAX(display_order), 0) + 1, '#EAB308'
FROM public.pipeline_stages
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance TEXT NOT NULL,
  message_id TEXT NOT NULL,
  phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10,15}$'),
  from_me BOOLEAN NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instance, message_id)
);
CREATE INDEX IF NOT EXISTS whatsapp_messages_phone_time
  ON public.whatsapp_messages (instance, phone, sent_at DESC);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_messages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_messages TO service_role;
CREATE TABLE IF NOT EXISTS public.monthly_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  due_date DATE,
  recurring BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'atrasado')),
  notes TEXT
);
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_expenses TO authenticated, service_role;
REVOKE ALL ON public.monthly_expenses FROM anon;
DROP POLICY IF EXISTS authenticated_manage_monthly_expenses ON public.monthly_expenses;
CREATE POLICY authenticated_manage_monthly_expenses ON public.monthly_expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
COMMIT;
NOTIFY pgrst, 'reload schema';
