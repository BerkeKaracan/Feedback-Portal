-- Admin-only transactional merge for duplicate feature requests.

CREATE OR REPLACE FUNCTION public.merge_duplicate_post(
  canonical_post_id UUID,
  duplicate_post_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO caller_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(caller_is_admin, false) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF canonical_post_id = duplicate_post_id THEN
    RAISE EXCEPTION 'Choose two different posts';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = canonical_post_id)
    OR NOT EXISTS (SELECT 1 FROM posts WHERE id = duplicate_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  INSERT INTO votes (post_id, user_id)
  SELECT canonical_post_id, user_id
  FROM votes
  WHERE post_id = duplicate_post_id
  ON CONFLICT (post_id, user_id) DO NOTHING;

  UPDATE comments
  SET post_id = canonical_post_id
  WHERE post_id = duplicate_post_id;

  UPDATE posts
  SET tags = (
    SELECT ARRAY(
      SELECT DISTINCT tag
      FROM unnest(
        COALESCE((SELECT tags FROM posts WHERE id = canonical_post_id), '{}')
        || COALESCE((SELECT tags FROM posts WHERE id = duplicate_post_id), '{}')
      ) AS tag
      ORDER BY tag
    )
  )
  WHERE id = canonical_post_id;

  DELETE FROM posts
  WHERE id = duplicate_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_duplicate_post(UUID, UUID)
  TO authenticated;
