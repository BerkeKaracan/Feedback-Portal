-- Domain ownership proof before a project board can be connected.
-- Host must serve /.well-known/feedback-portal-verify.txt with the challenge token.

CREATE TABLE public.project_verify_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_url TEXT NOT NULL,
  origin_host TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX project_verify_challenges_user_id_idx
  ON public.project_verify_challenges (user_id);
CREATE INDEX project_verify_challenges_host_idx
  ON public.project_verify_challenges (origin_host);

ALTER TABLE public.project_verify_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verify challenges"
  ON public.project_verify_challenges FOR SELECT
  USING (user_id = auth.uid());

-- Start a verification challenge for the signed-in user.
CREATE OR REPLACE FUNCTION public.start_project_verify(p_origin_url TEXT)
RETURNS public.project_verify_challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  cleaned_url TEXT := NULLIF(trim(p_origin_url), '');
  host TEXT;
  result public.project_verify_challenges;
  new_token TEXT;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF cleaned_url IS NULL THEN
    RAISE EXCEPTION 'origin_url is required';
  END IF;

  host := lower(regexp_replace(
    split_part(regexp_replace(cleaned_url, '^https?://', '', 'i'), '/', 1),
    ':.*$',
    ''
  ));

  IF host IS NULL OR length(host) < 1 THEN
    RAISE EXCEPTION 'Invalid origin host';
  END IF;

  -- Expire older open challenges for this user+host.
  UPDATE public.project_verify_challenges
  SET consumed_at = timezone('utc'::text, now())
  WHERE user_id = caller
    AND origin_host = host
    AND consumed_at IS NULL;

  new_token := 'fp_verify_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO public.project_verify_challenges (
    user_id,
    origin_url,
    origin_host,
    token,
    expires_at
  )
  VALUES (
    caller,
    cleaned_url,
    host,
    new_token,
    timezone('utc'::text, now()) + interval '30 minutes'
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- Finalize connect only after the API has fetched a matching well-known token.
CREATE OR REPLACE FUNCTION public.connect_project_verified(
  p_challenge_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_logo_url TEXT DEFAULT NULL,
  p_theme_config JSONB DEFAULT '{}'::jsonb,
  p_custom_features JSONB DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  challenge public.project_verify_challenges;
  created public.projects;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO challenge
  FROM public.project_verify_challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification challenge not found';
  END IF;

  IF challenge.user_id <> caller THEN
    RAISE EXCEPTION 'Verification challenge does not belong to you';
  END IF;

  IF challenge.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Verification challenge already used';
  END IF;

  IF challenge.expires_at < timezone('utc'::text, now()) THEN
    RAISE EXCEPTION 'Verification challenge expired';
  END IF;

  -- Mark consumed before creating the project (prevents double-submit races).
  UPDATE public.project_verify_challenges
  SET consumed_at = timezone('utc'::text, now())
  WHERE id = challenge.id;

  created := public.connect_project(
    challenge.origin_url,
    p_name,
    p_slug,
    p_logo_url,
    p_theme_config,
    p_custom_features
  );

  PERFORM public.claim_project_access(created.id);

  RETURN created;
END;
$$;

-- Lock down raw connect: only verified path (and SECURITY DEFINER callers).
REVOKE ALL ON FUNCTION public.connect_project(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.start_project_verify(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_project_verified(UUID, TEXT, TEXT, TEXT, JSONB, JSONB)
  TO authenticated;

GRANT SELECT ON TABLE public.project_verify_challenges TO authenticated;
