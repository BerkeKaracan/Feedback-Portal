-- White-label / multi-tenant projects.
-- posts.project_id IS NULL => universal (default) board.
-- posts.project_id set => scoped to that tenant/project.

CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT projects_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 2 AND 64
  )
);

CREATE INDEX projects_slug_idx ON public.projects (slug);

ALTER TABLE public.posts
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX posts_project_id_idx ON public.posts (project_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Branding is public so the portal can load a tenant by slug without auth.
CREATE POLICY "Anyone can view projects"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Tenants are created by host connect (/connect?url=...), not seeded here.

-- Replace create RPC so posts can target an optional project (NULL = universal).
DROP FUNCTION IF EXISTS public.create_post_with_vote(TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS public.create_post_with_vote(TEXT, TEXT, TEXT[], UUID);

CREATE FUNCTION public.create_post_with_vote(
  post_title TEXT,
  post_description TEXT,
  post_tags TEXT[] DEFAULT '{}',
  post_project_id UUID DEFAULT NULL
)
RETURNS posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created posts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF char_length(trim(post_title)) < 3
    OR char_length(trim(post_title)) > 120
    OR char_length(trim(post_description)) < 8
    OR char_length(trim(post_description)) > 4000 THEN
    RAISE EXCEPTION 'Title or description length is invalid';
  END IF;

  IF post_project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM projects WHERE id = post_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  PERFORM public.assert_user_rate_limit('posts', 1, 30);
  PERFORM public.assert_user_rate_limit('posts', 5, 3600);

  INSERT INTO posts (title, description, author_id, status, tags, project_id)
  VALUES (
    trim(post_title),
    trim(post_description),
    auth.uid(),
    'idea',
    COALESCE(post_tags, '{}'),
    post_project_id
  )
  RETURNING * INTO created;

  INSERT INTO votes (post_id, user_id)
  VALUES (created.id, auth.uid());

  RETURN created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_post_with_vote(TEXT, TEXT, TEXT[], UUID)
  TO authenticated;

-- Keep merge from mixing posts across different projects / universal board.
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
  caller_is_admin BOOLEAN;
  best_status TEXT;
  canonical_project UUID;
BEGIN
  SELECT is_admin INTO caller_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(caller_is_admin, false) THEN
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

  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = canonical_post_id)
    OR EXISTS (
      SELECT 1
      FROM unnest(duplicate_post_ids) AS post_id
      WHERE NOT EXISTS (SELECT 1 FROM posts WHERE id = post_id)
    ) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  SELECT project_id INTO canonical_project
  FROM posts
  WHERE id = canonical_post_id;

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
