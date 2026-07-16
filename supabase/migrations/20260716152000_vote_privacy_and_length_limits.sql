-- Hide other voters' identities; expose only aggregate counts via RPC.
-- Also add title/description length guards.

-- Pad any existing short descriptions so the CHECK can be applied.
UPDATE posts
SET description = description || ' (details pending)'
WHERE char_length(trim(description)) < 8;

UPDATE posts
SET title = left(trim(title) || ' request', 120)
WHERE char_length(trim(title)) < 3;

ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_title_length,
  DROP CONSTRAINT IF EXISTS posts_description_length;

ALTER TABLE posts
  ADD CONSTRAINT posts_title_length
    CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
  ADD CONSTRAINT posts_description_length
    CHECK (char_length(trim(description)) BETWEEN 8 AND 4000);

DROP POLICY IF EXISTS "Anyone can view votes" ON votes;

CREATE POLICY "Users can view their own votes"
  ON votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.post_vote_counts()
RETURNS TABLE (post_id UUID, vote_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT votes.post_id, COUNT(*)::BIGINT AS vote_count
  FROM votes
  GROUP BY votes.post_id;
$$;

GRANT EXECUTE ON FUNCTION public.post_vote_counts() TO anon, authenticated;
