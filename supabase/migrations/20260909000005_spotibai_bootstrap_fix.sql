-- Gate 1 remediation: allow the one-time first-Admin bootstrap and make the
-- base migration replayable. Exempts direct database sessions (SQL editor /
-- service_role, used for bootstrap and the Phase-5 promotion Edge Function)
-- from the role-escalation guard; anon/authenticated callers stay blocked.
-- SECURITY INVOKER is required: inside a DEFINER function current_user would be
-- the owner (always exempt, total bypass). INVOKER sees the real caller.
-- Re-issues trigger-helper revokes (idempotent). No secrets.

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

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;
