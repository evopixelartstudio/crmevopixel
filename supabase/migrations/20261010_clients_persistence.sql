-- Campos do cadastro de clientes usados pelo CRM.
-- Reexecutável: preserva registros, permissões e políticas existentes.
BEGIN;
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS google_business TEXT,
  ADD COLUMN IF NOT EXISTS projects_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cross_sell_opportunities TEXT[] NOT NULL DEFAULT '{}';
COMMIT;
