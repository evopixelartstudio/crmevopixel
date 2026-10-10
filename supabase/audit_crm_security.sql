-- Somente leitura. Execute no SQL Editor após aplicar 20261010_crm_security.sql.
-- Não publique os resultados: nomes de tabelas/políticas são informações internas.
SELECT c.relname, c.relkind, c.relrowsecurity AS rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
       has_table_privilege('authenticated', c.oid, 'TRUNCATE') AS authenticated_truncate
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m')
ORDER BY c.relname;

SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

SELECT p.oid::regprocedure AS function, p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       p.proconfig AS function_settings
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef ORDER BY 1;

SELECT schemaname, viewname, definition FROM pg_views WHERE schemaname = 'public';

SELECT user_id, role, enabled FROM public.crm_members;

SELECT sequence_schema, sequence_name,
       has_sequence_privilege('anon', format('%I.%I', sequence_schema, sequence_name), 'USAGE') AS anon_usage,
       has_sequence_privilege('anon', format('%I.%I', sequence_schema, sequence_name), 'SELECT') AS anon_select
FROM information_schema.sequences WHERE sequence_schema = 'public';
