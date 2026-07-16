-- Admin duplicate review and a safe, transactional merge operation.

CREATE OR REPLACE FUNCTION public.find_post_embedding_pairs(
  match_threshold REAL DEFAULT 0.62,
  match_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  canonical_id UUID,
  canonical_title TEXT,
  canonical_votes BIGINT,
  duplicate_id UUID,
  duplicate_title TEXT,
  duplicate_votes BIGINT,
  similarity REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    left_post.id AS canonical_id,
    left_post.title AS canonical_title,
    (SELECT COUNT(*) FROM votes WHERE post_id = left_post.id) AS canonical_votes,
    right_post.id AS duplicate_id,
    right_post.title AS duplicate_title,
    (SELECT COUNT(*) FROM votes WHERE post_id = right_post.id) AS duplicate_votes,
    (1 - (left_post.ai_embedding <=> right_post.ai_embedding))::REAL AS similarity
  FROM posts AS left_post
  JOIN posts AS right_post
    ON left_post.id < right_post.id
  WHERE left_post.ai_embedding IS NOT NULL
    AND right_post.ai_embedding IS NOT NULL
    AND (1 - (left_post.ai_embedding <=> right_post.ai_embedding)) >= match_threshold
  ORDER BY similarity DESC
  LIMIT LEAST(match_count, 100);
$$;

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

GRANT EXECUTE ON FUNCTION public.find_post_embedding_pairs(REAL, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_post(UUID, UUID)
  TO authenticated;
