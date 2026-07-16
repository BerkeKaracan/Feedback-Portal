-- Harden post creation: force status=idea on INSERT, atomic create+vote RPC.

DROP POLICY IF EXISTS "Authenticated users can insert posts" ON posts;

CREATE POLICY "Authenticated users can insert posts"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND status = 'idea'
  );

CREATE OR REPLACE FUNCTION public.create_post_with_vote(
  post_title TEXT,
  post_description TEXT,
  post_tags TEXT[] DEFAULT '{}'
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

  IF char_length(trim(post_title)) = 0
    OR char_length(trim(post_description)) = 0 THEN
    RAISE EXCEPTION 'Title and description are required';
  END IF;

  INSERT INTO posts (title, description, author_id, status, tags)
  VALUES (
    trim(post_title),
    trim(post_description),
    auth.uid(),
    'idea',
    COALESCE(post_tags, '{}')
  )
  RETURNING * INTO created;

  INSERT INTO votes (post_id, user_id)
  VALUES (created.id, auth.uid());

  RETURN created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_post_with_vote(TEXT, TEXT, TEXT[])
  TO authenticated;
