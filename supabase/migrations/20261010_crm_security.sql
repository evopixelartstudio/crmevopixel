-- Execute depois das migrações existentes, no projeto Supabase do CRM.
-- Preserva registros, tabelas, etapas e integrações com service_role.
-- Autorize ao menos um usuário em crm_members antes de publicar o novo aplicativo.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crm_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_members FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_members TO service_role;

CREATE OR REPLACE FUNCTION public.crm_is_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.crm_members WHERE user_id = (SELECT auth.uid()) AND enabled);
$$;
CREATE OR REPLACE FUNCTION public.crm_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.crm_members WHERE user_id = (SELECT auth.uid()) AND enabled AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.crm_is_member(), public.crm_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_is_member(), public.crm_is_admin() TO authenticated, service_role;

-- Lista explícita: evita alterar tabelas de um site institucional no mesmo projeto.
-- A política RESTRICTIVE também limita políticas permissivas preexistentes.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users','companies','contacts','services','opportunity_services','clients',
    'proposals','proposal_items','contracts','contract_items','projects',
    'project_services','project_tasks','historical_projects','tasks','follow_ups',
    'financial_transactions','payments','conversations','messages','automation_events',
    'notifications','activity_logs','ai_analysis','ai_recommendations','business_context',
    'commercial_goals','prospects','conversation_summaries','ai_commands',
    'ai_action_logs','ai_feedback','monthly_clients','rabisco_boards','niches',
    'lead_sources','sources','message_sequences','message_sequence_steps',
    'pipeline_stages','opportunities','monthly_expenses','leads',
    'lead_services','message_logs','lead_sequence_progress'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', table_name);
    -- TRUNCATE, REFERENCES e TRIGGER não são controlados por RLS.
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated, service_role', table_name);
    EXECUTE format('DROP POLICY IF EXISTS crm_members_only ON public.%I', table_name);
    EXECUTE format('CREATE POLICY crm_members_only ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.crm_is_member())) WITH CHECK ((SELECT public.crm_is_member()))', table_name);
    EXECUTE format('DROP POLICY IF EXISTS crm_member_access ON public.%I', table_name);
    EXECUTE format('CREATE POLICY crm_member_access ON public.%I FOR ALL TO authenticated USING ((SELECT public.crm_is_member())) WITH CHECK ((SELECT public.crm_is_member()))', table_name);
  END LOOP;

  -- Dados atendidos apenas pelo backend e segredos OAuth nunca são liberados ao browser.
  FOREACH table_name IN ARRAY ARRAY['crm_contacts','crm_contact_links','crm_automation_settings','crm_attendance_history','whatsapp_messages','google_calendar_connections','n8n_chat_memory','n8n_chat_histories','whatsapp_buffer','bot_pausa'] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', table_name);
  END LOOP;

  IF to_regclass('public.crm_agent_context') IS NOT NULL THEN
    REVOKE ALL ON public.crm_agent_context FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON public.crm_agent_context TO service_role;
  END IF;
END $$;

-- Revoga RPCs SECURITY DEFINER internas. Triggers continuam funcionando.
DO $$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY['public.crm_link_record(text,jsonb)','public.crm_sync_record()','public.crm_link_message()'] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', signature);
    END IF;
  END LOOP;
END $$;
COMMIT;
NOTIFY pgrst, 'reload schema';
