-- Execute no SQL Editor do Supabase antes de publicar a proteção de duplicados.
-- Preserva os cadastros existentes e guarda os telefones mesmo após exclusões.
BEGIN;

-- Fecha a janela entre o levantamento inicial e a instalação dos gatilhos.
LOCK TABLE public.leads, public.clients IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS public.crm_phone_registry (
  phone_key text NOT NULL CHECK (phone_key ~ '^[0-9]{10,15}$'),
  entity_type text NOT NULL CHECK (entity_type IN ('lead', 'client')),
  entity_id uuid NOT NULL,
  name text,
  company_name text,
  deleted_at timestamptz,
  PRIMARY KEY (phone_key, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS crm_phone_registry_entity_idx
  ON public.crm_phone_registry (entity_type, entity_id);
ALTER TABLE public.crm_phone_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_phone_registry FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_phone_registry TO service_role;

-- Mesma identidade usada em lib/utils/whatsapp.ts: DDI 55 para números locais,
-- equivalência do nono dígito apenas para celulares e telefone estrangeiro exato.
CREATE OR REPLACE FUNCTION public.crm_dedup_phone_digits(raw text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE n text; encoded bytea; character text; position integer;
BEGIN
  raw := btrim(coalesce(raw, ''));
  IF raw ~* '^(https?://)?(www\.)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/' THEN
    IF raw ~* '^(https?://)?(www\.)?wa\.me/' THEN
      raw := substring(raw from '(?i)^(?:https?://)?(?:www\.)?wa\.me/([^/?#]*)');
    ELSE
      -- Somente parâmetros da query: '&phone=' no caminho não é um telefone.
      raw := coalesce(substring(substring(raw from '\?([^#]*)') from '(?:^|&)phone=([^&]*)'), '');
      -- URLSearchParams decodifica o parâmetro phone antes de remover a máscara.
      encoded := ''::bytea;
      position := 1;
      WHILE position <= length(raw) LOOP
        character := substring(raw from position for 1);
        IF character = '%' AND substring(raw from position + 1 for 2) ~ '^[0-9a-fA-F]{2}$' THEN
          encoded := encoded || decode(substring(raw from position + 1 for 2), 'hex');
          position := position + 3;
        ELSE
          encoded := encoded || convert_to(character, 'UTF8');
          position := position + 1;
        END IF;
      END LOOP;
      BEGIN
        raw := convert_from(encoded, 'UTF8');
      EXCEPTION WHEN character_not_in_repertoire OR untranslatable_character THEN
        RETURN '';
      END;
    END IF;
  END IF;
  n := regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g');
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.crm_dedup_phone_key(raw text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE n text := public.crm_dedup_phone_digits(raw);
BEGIN
  IF n !~ '^[0-9]{10,15}$' THEN RETURN NULL; END IF;
  IF length(n) IN (10, 11) THEN n := '55' || n; END IF;
  IF n ~ '^55[0-9]{2}9[6-9][0-9]{7}$' THEN n := left(n, 4) || substring(n from 6); END IF;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.crm_record_phone_keys(record jsonb) RETURNS text[]
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE raw_phone text := public.crm_dedup_phone_digits(record->>'phone');
  raw_whatsapp text := public.crm_dedup_phone_digits(record->>'whatsapp');
  stored_whatsapp text; recovered text := ''; effective_phone text; effective_whatsapp text;
  notes text := coalesce(record->>'notes', ''); metadata text; metadata_json jsonb;
  marker text := 'Dados originais da planilha:'; marker_at integer;
  line text; separator integer; header text; original_value text; result text[];
BEGIN
  -- Mesmo reparo virtual do parseLeadFromSupabase: planilhas antigas podiam
  -- truncar o DDI + celular em 11 dígitos, mas preservavam o valor nas notas.
  -- Metadados JSON válidos não fazem parte das observações exibidas no CRM.
  metadata := substring(notes from '(?s)<!--METADATA:(.*?)-->');
  IF metadata IS NOT NULL THEN
    BEGIN
      metadata_json := metadata::jsonb;
      IF metadata_json <> 'null'::jsonb THEN
        notes := btrim(regexp_replace(notes, '(?s)<!--METADATA:.*?-->', ''));
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN NULL;
    END;
  END IF;
  marker_at := strpos(notes, marker);
  IF marker_at > 0 THEN
    FOR line IN SELECT unnest(string_to_array(substring(notes from marker_at + length(marker)), E'\n')) LOOP
      separator := strpos(line, ':');
      IF separator = 0 THEN CONTINUE; END IF;
      header := regexp_replace(lower(regexp_replace(normalize(left(line, separator - 1), NFD), U&'[\0300-\036f]', '', 'g')), '[^a-z0-9]', '', 'g');
      IF header = ANY(ARRAY['whatsapptelefone', 'telefonewhatsapp', 'whatsapp', 'telefone', 'phone', 'phonenumber', 'celular']) THEN
        original_value := btrim(substring(line from separator + 1));
        IF original_value <> '' THEN
          recovered := public.crm_dedup_phone_digits(original_value);
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END IF;
  stored_whatsapp := coalesce(nullif(raw_whatsapp, ''), raw_phone);
  IF length(recovered) > 11 AND stored_whatsapp = left(recovered, 11) THEN
    effective_phone := recovered;
    effective_whatsapp := recovered;
  ELSE
    effective_phone := coalesce(nullif(raw_phone, ''), recovered);
    effective_whatsapp := coalesce(nullif(stored_whatsapp, ''), recovered);
  END IF;
  -- Usa os telefones efetivos exibidos pelo CRM. O valor bruto truncado pode
  -- parecer outro número válido e não deve reservar a identidade de terceiros.
  SELECT coalesce(array_agg(phone_key ORDER BY phone_key), ARRAY[]::text[]) INTO result
  FROM (
    SELECT DISTINCT public.crm_dedup_phone_key(value) AS phone_key
    FROM (VALUES (effective_phone), (effective_whatsapp)) AS phones(value)
  ) AS normalized WHERE phone_key IS NOT NULL;
  RETURN result;
END;
$$;

-- Gatilho BEFORE: o bloqueio fica retido até COMMIT/ROLLBACK. Importações e abas
-- concorrentes que usam o mesmo telefone verificam o registro após a espera.
CREATE OR REPLACE FUNCTION public.crm_guard_lead_phone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_keys text[] := ARRAY[]::text[]; new_keys text[] := ARRAY[]::text[];
  introduced_keys text[]; phone_key text; matches jsonb; current_id uuid;
  saved_row jsonb; using_existing_lead boolean := false;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_keys := public.crm_record_phone_keys(to_jsonb(OLD)); END IF;
  IF TG_OP <> 'DELETE' THEN
    new_keys := public.crm_record_phone_keys(to_jsonb(NEW));
    current_id := NEW.id;
  END IF;

  -- INSERT ... ON CONFLICT(id) DO UPDATE também passa pelo gatilho INSERT.
  -- Usa o cadastro real como base para permitir upserts que apenas atualizam
  -- dados de um lead já convertido. O bloqueio da linha precede o de telefone,
  -- assim como em UPDATE, e mantém essa base estável até o fim da transação.
  IF TG_ARGV[0] = 'lead' AND TG_OP = 'INSERT' THEN
    SELECT to_jsonb(l) INTO saved_row FROM public.leads l
      WHERE l.id = current_id FOR UPDATE;
    IF saved_row IS NOT NULL THEN
      old_keys := public.crm_record_phone_keys(saved_row);
      using_existing_lead := true;
    END IF;
  END IF;

  -- Ordem estável também quando phone e whatsapp possuem números distintos.
  FOR phone_key IN SELECT DISTINCT key FROM unnest(old_keys || new_keys) AS keys(key) ORDER BY key LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('crm_phone_registry:' || phone_key, 0));
  END LOOP;

  IF TG_ARGV[0] = 'lead' AND TG_OP <> 'DELETE' THEN
    IF (TG_OP = 'UPDATE' AND OLD.id = NEW.id) OR using_existing_lead THEN
      SELECT coalesce(array_agg(key), ARRAY[]::text[]) INTO introduced_keys
      FROM unnest(new_keys) AS keys(key) WHERE NOT (key = ANY(old_keys));
    ELSE
      introduced_keys := new_keys;
    END IF;
    -- Em REPEATABLE READ a espera por um advisory lock não renova o snapshot.
    -- Apenas a introdução de um telefone no lead precisa dessa verificação.
    IF cardinality(introduced_keys) > 0
      AND current_setting('transaction_isolation') = 'repeatable read' THEN
      RAISE EXCEPTION USING ERRCODE = '25000',
        MESSAGE = 'CRM_PHONE_DEDUP_REQUIRES_READ_COMMITTED_OR_SERIALIZABLE';
    END IF;
    SELECT jsonb_agg(to_jsonb(matching_record)) INTO matches FROM (
      SELECT r.phone_key, r.entity_type, r.entity_id, r.name, r.company_name, r.deleted_at
      FROM public.crm_phone_registry r
      WHERE r.phone_key = ANY(introduced_keys)
        AND NOT (r.entity_type = 'lead' AND r.entity_id = current_id)
      ORDER BY r.phone_key, r.entity_type, r.entity_id LIMIT 20
    ) AS matching_record;
    IF matches IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'LEAD_PHONE_DUPLICATE',
        DETAIL = jsonb_build_object('matches', matches)::text;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- Gatilho AFTER: grava somente alterações que realmente aconteceram. Um INSERT
-- com ON CONFLICT DO NOTHING não deixa uma identidade inexistente no histórico.
CREATE OR REPLACE FUNCTION public.crm_track_record_phones() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE previous jsonb; current_record jsonb; keys text[]; removed_at timestamptz;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    previous := to_jsonb(OLD);
    keys := public.crm_record_phone_keys(previous);
    removed_at := CASE WHEN TG_OP = 'DELETE' THEN now() ELSE NULL END;
    IF TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id THEN removed_at := now(); END IF;
    INSERT INTO public.crm_phone_registry(phone_key, entity_type, entity_id, name, company_name, deleted_at)
    SELECT key, TG_ARGV[0], OLD.id, previous->>'name', previous->>'company_name', removed_at
    FROM unnest(keys) AS phones(key)
    ON CONFLICT (phone_key, entity_type, entity_id) DO UPDATE
      SET name = EXCLUDED.name, company_name = EXCLUDED.company_name,
          deleted_at = EXCLUDED.deleted_at;
    -- Inclui números antigos que já não estão no cadastro atual.
    UPDATE public.crm_phone_registry SET name = previous->>'name',
      company_name = previous->>'company_name', deleted_at = removed_at
    WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    current_record := to_jsonb(NEW);
    keys := public.crm_record_phone_keys(current_record);
    INSERT INTO public.crm_phone_registry(phone_key, entity_type, entity_id, name, company_name, deleted_at)
    SELECT key, TG_ARGV[0], NEW.id, current_record->>'name', current_record->>'company_name', NULL
    FROM unnest(keys) AS phones(key)
    ON CONFLICT (phone_key, entity_type, entity_id) DO UPDATE
      SET name = EXCLUDED.name, company_name = EXCLUDED.company_name, deleted_at = NULL;
    UPDATE public.crm_phone_registry SET name = current_record->>'name',
      company_name = current_record->>'company_name'
    WHERE entity_type = TG_ARGV[0] AND entity_id = NEW.id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- Backfill inclui leads no pipeline/lixeira: as oportunidades continuam ligadas
-- aos mesmos leads, sem filtro por status ou etapa. Duplicados antigos permanecem.
INSERT INTO public.crm_phone_registry(phone_key, entity_type, entity_id, name, company_name)
SELECT key, 'lead', l.id, to_jsonb(l)->>'name', to_jsonb(l)->>'company_name'
FROM public.leads l CROSS JOIN LATERAL unnest(public.crm_record_phone_keys(to_jsonb(l))) AS phones(key)
ON CONFLICT (phone_key, entity_type, entity_id) DO UPDATE
  SET name = EXCLUDED.name, company_name = EXCLUDED.company_name, deleted_at = NULL;
INSERT INTO public.crm_phone_registry(phone_key, entity_type, entity_id, name, company_name)
SELECT key, 'client', c.id, to_jsonb(c)->>'name', to_jsonb(c)->>'company_name'
FROM public.clients c CROSS JOIN LATERAL unnest(public.crm_record_phone_keys(to_jsonb(c))) AS phones(key)
ON CONFLICT (phone_key, entity_type, entity_id) DO UPDATE
  SET name = EXCLUDED.name, company_name = EXCLUDED.company_name, deleted_at = NULL;

DROP TRIGGER IF EXISTS crm_guard_lead_phone ON public.leads;
CREATE TRIGGER crm_guard_lead_phone BEFORE INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_guard_lead_phone('lead');
DROP TRIGGER IF EXISTS crm_track_record_phones ON public.leads;
CREATE TRIGGER crm_track_record_phones AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_track_record_phones('lead');
DROP TRIGGER IF EXISTS crm_guard_lead_phone ON public.clients;
CREATE TRIGGER crm_guard_lead_phone BEFORE INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.crm_guard_lead_phone('client');
DROP TRIGGER IF EXISTS crm_track_record_phones ON public.clients;
CREATE TRIGGER crm_track_record_phones AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.crm_track_record_phones('client');

REVOKE ALL ON FUNCTION public.crm_dedup_phone_digits(text), public.crm_dedup_phone_key(text), public.crm_record_phone_keys(jsonb),
  public.crm_guard_lead_phone(), public.crm_track_record_phones() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_dedup_phone_digits(text), public.crm_dedup_phone_key(text), public.crm_record_phone_keys(jsonb),
  public.crm_guard_lead_phone(), public.crm_track_record_phones() TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
