-- Execute após 20261010_crm_security.sql e o primeiro login da conta no Supabase Auth.
-- O login GitHub precisa estar configurado em Authentication / Providers.
-- Autoriza apenas a identidade com e-mail confirmado; não altera registros do CRM.
BEGIN;
DO $$
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users
  WHERE lower(email) = 'evopixelart@gmail.com' AND email_confirmed_at IS NOT NULL;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'A conta evopixelart@gmail.com precisa entrar e confirmar sua identidade no Supabase Auth antes da autorização.';
  END IF;
  INSERT INTO public.crm_members(user_id, role, enabled) VALUES (admin_id, 'admin', true)
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin', enabled = true;
END $$;
COMMIT;
