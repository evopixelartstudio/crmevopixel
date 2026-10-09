BEGIN;

CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  id UUID PRIMARY KEY,
  google_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  credentials TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_calendar_connections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_connections TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
