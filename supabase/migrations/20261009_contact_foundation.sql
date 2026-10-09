-- Execute no SQL Editor. Não ativa o agente nem altera as etapas do pipeline.
BEGIN;
CREATE OR REPLACE FUNCTION public.crm_contact_phone(raw text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE n text;
BEGIN
  IF raw ~* 'wa.me/' THEN raw := substring(raw from 'wa.me/([0-9]+)');
  ELSIF raw ~* '[?&]phone=' THEN raw := substring(raw from '[?&]phone=([0-9]+)'); END IF;
  n := regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g');
  IF length(n) IN (10,11) THEN n := '55' || n; END IF;
  IF n !~ '^[0-9]{10,15}$' THEN RETURN NULL; END IF;
  IF n ~ '^55[0-9]{2}9[6-9][0-9]{7}$' THEN n := left(n,4) || substring(n from 6); END IF;
  RETURN n;
END $$;

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_key text NOT NULL UNIQUE CHECK (phone_key ~ '^[0-9]{10,15}$'),
  origin text NOT NULL DEFAULT 'unknown' CHECK (origin IN ('unknown','outbound','inbound')),
  acquisition_channel text NOT NULL DEFAULT 'unknown' CHECK (acquisition_channel IN ('unknown','whatsapp','instagram','referral','website','other')),
  relationship text NOT NULL DEFAULT 'lead' CHECK (relationship IN ('lead','client','former_client')),
  relationship_confirmed boolean NOT NULL DEFAULT false,
  attendance_owner text NOT NULL DEFAULT 'human' CHECK (attendance_owner IN ('human','ai')),
  assigned_to text NOT NULL DEFAULT '',
  automation_enabled boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 0,
  changed_by text NOT NULL DEFAULT 'crm',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crm_contact_links (
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('lead','client')),
  record_id uuid NOT NULL,
  PRIMARY KEY (record_type,record_id)
);
CREATE INDEX IF NOT EXISTS crm_contact_links_contact_idx ON public.crm_contact_links(contact_id);
CREATE TABLE IF NOT EXISTS public.crm_automation_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.crm_automation_settings(id,enabled) VALUES (true,false) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.crm_attendance_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  previous_owner text NOT NULL,
  new_owner text NOT NULL,
  automation_enabled boolean NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.crm_contact_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := now();
  IF NEW.attendance_owner IS DISTINCT FROM OLD.attendance_owner OR NEW.automation_enabled IS DISTINCT FROM OLD.automation_enabled THEN
    INSERT INTO public.crm_attendance_history(contact_id,previous_owner,new_owner,automation_enabled,changed_by)
    VALUES (OLD.id,OLD.attendance_owner,NEW.attendance_owner,NEW.automation_enabled,NEW.changed_by);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_contact_change ON public.crm_contacts;
CREATE TRIGGER crm_contact_change BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.crm_contact_change();

-- A identidade usa apenas telefone; nunca associa empresas por nome.
CREATE OR REPLACE FUNCTION public.crm_link_record(kind text, record jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE phone text; cid uuid;
BEGIN
  phone := public.crm_contact_phone(coalesce(nullif(record->>'whatsapp',''),record->>'phone'));
  IF phone IS NULL THEN RETURN; END IF;
  INSERT INTO public.crm_contacts(phone_key,relationship) VALUES (phone,CASE WHEN kind='client' THEN 'client' ELSE 'lead' END)
  ON CONFLICT(phone_key) DO NOTHING;
  SELECT id INTO cid FROM public.crm_contacts WHERE phone_key=phone;
  INSERT INTO public.crm_contact_links(contact_id,record_type,record_id) VALUES(cid,kind,(record->>'id')::uuid)
  ON CONFLICT(record_type,record_id) DO UPDATE SET contact_id=excluded.contact_id;
  IF kind='client' THEN UPDATE public.crm_contacts SET relationship='client' WHERE id=cid AND NOT relationship_confirmed AND relationship <> 'client'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.crm_link_record(text,jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.crm_sync_record() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    DELETE FROM public.crm_contact_links WHERE record_type=TG_ARGV[0] AND record_id=OLD.id;
    RETURN OLD;
  END IF;
  -- Remove o vínculo antigo inclusive quando o telefone é apagado.
  DELETE FROM public.crm_contact_links WHERE record_type=TG_ARGV[0] AND record_id=NEW.id;
  PERFORM public.crm_link_record(TG_ARGV[0],to_jsonb(NEW));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_sync_contact ON public.leads;
CREATE TRIGGER crm_sync_contact AFTER INSERT OR UPDATE OR DELETE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.crm_sync_record('lead');
DROP TRIGGER IF EXISTS crm_sync_contact ON public.clients;
CREATE TRIGGER crm_sync_contact AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.crm_sync_record('client');
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT to_jsonb(l) AS value FROM public.leads l LOOP PERFORM public.crm_link_record('lead',r.value); END LOOP;
  FOR r IN SELECT to_jsonb(c) AS value FROM public.clients c LOOP PERFORM public.crm_link_record('client',r.value); END LOOP;
END $$;

ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id);
CREATE OR REPLACE FUNCTION public.crm_link_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE phone text;
BEGIN
  phone := public.crm_contact_phone(NEW.phone);
  IF phone IS NOT NULL THEN
    INSERT INTO public.crm_contacts(phone_key) VALUES(phone) ON CONFLICT DO NOTHING;
    SELECT id INTO NEW.contact_id FROM public.crm_contacts WHERE phone_key=phone;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_link_message ON public.whatsapp_messages;
CREATE TRIGGER crm_link_message BEFORE INSERT OR UPDATE OF phone ON public.whatsapp_messages FOR EACH ROW EXECUTE FUNCTION public.crm_link_message();
UPDATE public.whatsapp_messages SET phone=phone WHERE contact_id IS NULL;
CREATE INDEX IF NOT EXISTS whatsapp_messages_contact_idx ON public.whatsapp_messages(contact_id);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_contacts,public.crm_contact_links,public.crm_automation_settings,public.crm_attendance_history FROM anon,authenticated;
GRANT ALL ON public.crm_contacts,public.crm_contact_links,public.crm_automation_settings,public.crm_attendance_history TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.crm_attendance_history_id_seq TO service_role;
CREATE OR REPLACE VIEW public.crm_agent_context WITH (security_invoker=true) AS
SELECT c.*, (s.enabled AND c.automation_enabled AND c.attendance_owner='ai') AS can_auto_reply
FROM public.crm_contacts c CROSS JOIN public.crm_automation_settings s WHERE s.id=true;
REVOKE ALL ON public.crm_agent_context FROM anon,authenticated;
GRANT SELECT ON public.crm_agent_context TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
