-- Track time in a stage independently of contact/price edits.
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ;
-- Past stage transitions cannot be reconstructed reliably: start at migration time.
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
NOTIFY pgrst, 'reload schema';
