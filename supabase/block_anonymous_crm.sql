-- Minimum containment: removes anonymous table access only; no data/schema changes.
-- Run manually after confirming integrations use service_role.
-- Existing authenticated RLS policies are NOT fixed by this script.
BEGIN;
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
  ,'crm_contacts','crm_contact_links','crm_automation_settings','crm_attendance_history','whatsapp_messages','google_calendar_connections','n8n_chat_memory','n8n_chat_histories','whatsapp_buffer','bot_pausa'
  ] LOOP
    IF to_regclass(format('public.%I',table_name)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon',table_name);
  END LOOP;
  IF to_regclass('public.crm_agent_context') IS NOT NULL THEN
    REVOKE ALL ON public.crm_agent_context FROM PUBLIC, anon;
  END IF;
END $$;
COMMIT;
NOTIFY pgrst, 'reload schema';
