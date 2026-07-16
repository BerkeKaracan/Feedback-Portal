-- Host sites connect themselves; portal does not own tenant creation as product data.
-- First signed-in user on a project claims admin; later users join as members.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS origin_url TEXT,
  ADD COLUMN IF NOT EXISTS origin_host TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS projects_origin_host_uidx
  ON public.projects (origin_host)
  WHERE origin_host IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_id_idx
  ON public.project_members (user_id);
CREATE INDEX IF NOT EXISTS project_members_project_admin_idx
  ON public.project_members (project_id)
  WHERE role = 'admin';

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view memberships for their projects"
  ON public.project_members;
CREATE POLICY "Members can view memberships for their projects"
  ON public.project_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Upsert project from a connecting host (name/logo/slug supplied by connect API).
CREATE OR REPLACE FUNCTION public.connect_project(
  p_origin_url TEXT,
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
  cleaned_url TEXT := NULLIF(trim(p_origin_url), '');
  cleaned_name TEXT := NULLIF(trim(p_name), '');
  cleaned_slug TEXT := lower(trim(p_slug));
  host TEXT;
  result public.projects;
  default_features JSONB := jsonb_build_object(
    'comments', true,
    'duplicateDetection', true,
    'submitIdeas', true,
    'integrations', '{}'::jsonb
  );
BEGIN
  IF cleaned_url IS NULL OR cleaned_name IS NULL OR cleaned_slug IS NULL THEN
    RAISE EXCEPTION 'origin_url, name, and slug are required';
  END IF;

  IF cleaned_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    OR char_length(cleaned_slug) < 2
    OR char_length(cleaned_slug) > 64 THEN
    RAISE EXCEPTION 'Invalid project slug';
  END IF;

  host := lower(regexp_replace(
    split_part(regexp_replace(cleaned_url, '^https?://', '', 'i'), '/', 1),
    ':.*$',
    ''
  ));

  IF host IS NULL OR length(host) < 1 THEN
    RAISE EXCEPTION 'Invalid origin host';
  END IF;

  SELECT * INTO result FROM public.projects WHERE origin_host = host;
  IF FOUND THEN
    UPDATE public.projects
    SET
      name = cleaned_name,
      logo_url = COALESCE(NULLIF(trim(p_logo_url), ''), logo_url),
      theme_config = CASE
        WHEN COALESCE(p_theme_config, '{}'::jsonb) = '{}'::jsonb THEN theme_config
        ELSE p_theme_config
      END,
      origin_url = cleaned_url,
      custom_features = COALESCE(p_custom_features, custom_features)
    WHERE id = result.id
    RETURNING * INTO result;
    RETURN result;
  END IF;

  IF EXISTS (SELECT 1 FROM public.projects WHERE slug = cleaned_slug) THEN
    cleaned_slug := left(cleaned_slug || '-' || substr(md5(host), 1, 6), 64);
  END IF;

  INSERT INTO public.projects (
    slug,
    name,
    logo_url,
    theme_config,
    custom_features,
    origin_url,
    origin_host
  )
  VALUES (
    cleaned_slug,
    cleaned_name,
    NULLIF(trim(p_logo_url), ''),
    COALESCE(p_theme_config, '{}'::jsonb),
    COALESCE(p_custom_features, default_features),
    cleaned_url,
    host
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- First user becomes project admin; later users become members.
CREATE OR REPLACE FUNCTION public.claim_project_access(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  existing_role TEXT;
  has_admin BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  SELECT role INTO existing_role
  FROM public.project_members
  WHERE project_id = p_project_id
    AND user_id = caller;

  IF existing_role IS NOT NULL THEN
    RETURN existing_role;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND role = 'admin'
  ) INTO has_admin;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (
    p_project_id,
    caller,
    CASE WHEN has_admin THEN 'member' ELSE 'admin' END
  )
  RETURNING role INTO existing_role;

  RETURN existing_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
  OR (
    p_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_admin_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.posts
    JOIN public.project_members
      ON project_members.project_id = posts.project_id
     AND project_members.user_id = auth.uid()
     AND project_members.role = 'admin'
    WHERE posts.id = p_post_id
      AND posts.project_id IS NOT NULL
  );
$$;

DROP POLICY IF EXISTS "Admins can update posts" ON posts;
CREATE POLICY "Admins can update posts"
  ON posts FOR UPDATE
  USING (public.can_admin_post(id))
  WITH CHECK (public.can_admin_post(id));

DROP POLICY IF EXISTS "Admins can delete posts" ON posts;
CREATE POLICY "Admins can delete posts"
  ON posts FOR DELETE
  USING (public.can_admin_post(id));

DROP POLICY IF EXISTS "Admins can delete any comment" ON comments;
CREATE POLICY "Admins can delete any comment"
  ON comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.posts
      JOIN public.project_members
        ON project_members.project_id = posts.project_id
       AND project_members.user_id = auth.uid()
       AND project_members.role = 'admin'
      WHERE posts.id = comments.post_id
        AND posts.project_id IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.merge_duplicate_posts(
  canonical_post_id UUID,
  duplicate_post_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  best_status TEXT;
  canonical_project UUID;
  allowed BOOLEAN;
BEGIN
  SELECT project_id INTO canonical_project
  FROM posts
  WHERE id = canonical_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF canonical_project IS NULL THEN
    allowed := EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    );
  ELSE
    allowed := public.is_project_admin(canonical_project);
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  duplicate_post_ids := ARRAY(
    SELECT DISTINCT post_id
    FROM unnest(COALESCE(duplicate_post_ids, '{}')) AS post_id
    WHERE post_id <> canonical_post_id
  );

  IF cardinality(duplicate_post_ids) = 0 THEN
    RAISE EXCEPTION 'Choose at least one duplicate post';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(duplicate_post_ids) AS post_id
    WHERE NOT EXISTS (SELECT 1 FROM posts WHERE id = post_id)
  ) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM posts
    WHERE id = ANY(duplicate_post_ids)
      AND project_id IS DISTINCT FROM canonical_project
  ) THEN
    RAISE EXCEPTION 'Cannot merge posts from different projects';
  END IF;

  INSERT INTO votes (post_id, user_id)
  SELECT canonical_post_id, user_id
  FROM votes
  WHERE post_id = ANY(duplicate_post_ids)
  ON CONFLICT (post_id, user_id) DO NOTHING;

  UPDATE comments
  SET post_id = canonical_post_id
  WHERE post_id = ANY(duplicate_post_ids);

  UPDATE posts
  SET tags = (
    SELECT ARRAY(
      SELECT DISTINCT tag
      FROM posts,
        unnest(COALESCE(posts.tags, '{}')) AS tag
      WHERE posts.id = canonical_post_id
        OR posts.id = ANY(duplicate_post_ids)
      ORDER BY tag
    )
  )
  WHERE id = canonical_post_id;

  SELECT status INTO best_status
  FROM posts
  WHERE id = canonical_post_id
    OR id = ANY(duplicate_post_ids)
  ORDER BY
    CASE status
      WHEN 'done' THEN 4
      WHEN 'in-progress' THEN 3
      WHEN 'planned' THEN 2
      ELSE 1
    END DESC
  LIMIT 1;

  UPDATE posts
  SET status = best_status
  WHERE id = canonical_post_id
    AND status IS DISTINCT FROM best_status;

  DELETE FROM posts
  WHERE id = ANY(duplicate_post_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.connect_project(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_project_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_admin_post(UUID) TO authenticated;

GRANT SELECT ON TABLE public.project_members TO authenticated;
