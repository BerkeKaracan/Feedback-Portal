-- Prefer OAuth provider names when creating profiles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_name TEXT;
BEGIN
  raw_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'user_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'preferred_username'), ''),
    NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
    'User'
  );

  INSERT INTO public.profiles (id, display_name, is_admin)
  VALUES (NEW.id, left(raw_name, 40), false);

  RETURN NEW;
END;
$$;
