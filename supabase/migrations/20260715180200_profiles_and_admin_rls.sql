-- Profiles + admin-only post updates

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX profiles_is_admin_idx ON profiles (is_admin) WHERE is_admin = true;

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
    NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
    'User'
  );

  INSERT INTO public.profiles (id, display_name, is_admin)
  VALUES (NEW.id, raw_name, false);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Prevent authenticated clients from elevating themselves
CREATE OR REPLACE FUNCTION public.preserve_profile_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin AND auth.uid() IS NOT NULL THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_preserve_is_admin
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_profile_is_admin();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own display name"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT SELECT ON TABLE profiles TO anon, authenticated;
GRANT UPDATE ON TABLE profiles TO authenticated;

-- Replace open update policy with admin-only
DROP POLICY IF EXISTS "Authenticated users can update posts" ON posts;

CREATE POLICY "Admins can update posts"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );
