-- Gate 1 re-review follow-up: authenticated callers need USAGE on schema
-- private, otherwise every (SELECT private.is_admin()) policy check and the
-- INVOKER role guard fail with "permission denied for schema private".
-- No secrets. Idempotent.

GRANT USAGE ON SCHEMA private TO authenticated;
