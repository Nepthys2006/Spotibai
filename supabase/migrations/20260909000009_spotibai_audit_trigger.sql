-- Spotibai audit trigger: catalog change log for admin review.
-- No secrets. No seeds. Idempotent (DROP IF EXISTS / OR REPLACE).
-- Fires on every tracks INSERT/UPDATE/DELETE and records the actor via
-- (select auth.uid()) so the entry attributes the API caller.

CREATE OR REPLACE FUNCTION public.log_catalog_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action text;
  v_target text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'track.insert';
    v_target := NEW.id::text;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'track.update';
    v_target := NEW.id::text;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'track.delete';
    v_target := OLD.id::text;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target_id)
  VALUES ((select auth.uid()), v_action, v_target);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_catalog_change ON public.tracks;
CREATE TRIGGER trg_log_catalog_change
  AFTER INSERT OR UPDATE OR DELETE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.log_catalog_change();

-- Trigger helpers run as triggers only; never callable via the Data API.
REVOKE ALL ON FUNCTION public.log_catalog_change() FROM PUBLIC, anon, authenticated;
