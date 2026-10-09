-- Quadro compartilhado do CRM. Usa o mesmo acesso autenticado das demais tabelas protegidas.
CREATE TABLE IF NOT EXISTS public.rabisco_boards (
  id TEXT PRIMARY KEY,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(cards) = 'array'),
  connections JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(connections) = 'array'),
  strokes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(strokes) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.rabisco_boards ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.rabisco_boards TO authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rabisco_boards' AND policyname = 'authenticated_manage_rabisco') THEN
    CREATE POLICY authenticated_manage_rabisco ON public.rabisco_boards
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Atualiza as tabelas expostas pela API após a criação do quadro.
NOTIFY pgrst, 'reload schema';
