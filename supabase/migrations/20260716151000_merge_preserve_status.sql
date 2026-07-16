-- When merging duplicates, keep the furthest-along pipeline status.

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

  -- Prefer the furthest status among canonical + duplicates.
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
