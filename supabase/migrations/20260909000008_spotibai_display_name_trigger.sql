-- Gate 2 remediation: preserve the chosen signup display_name in profiles.
-- Prefers raw_user_meta_data->>'display_name' (display text only, never used
-- for authorization), falls back to email, then 'New user'. Rendered output
-- is DOMPurify-sanitized client-side. No secrets. Idempotent.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(LEFT(COALESCE(NEW.raw_user_meta_data->>'display_name', ''), 80), ''),
      NEW.email,
      'New user'
    ),
    'USER'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
