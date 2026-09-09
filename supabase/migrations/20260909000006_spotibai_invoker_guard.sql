-- Gate 1 re-review fix: prevent_role_escalation MUST be SECURITY INVOKER.
-- The DEFINER version tested current_user against the function owner (always
-- exempt = total bypass). INVOKER sees the real caller: postgres/service_role
-- sessions (SQL editor, Edge Functions) stay exempt for Admin bootstrap and
-- promotion; anon/authenticated callers are blocked. No secrets.

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'role change requires admin';
  END IF;
  RETURN NEW;
END;
$$;
