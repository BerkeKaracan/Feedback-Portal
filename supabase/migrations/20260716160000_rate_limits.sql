-- Per-user spam protection for posts, comments, and votes.
-- Enforced in the database so it cannot be bypassed via PostgREST.

CREATE OR REPLACE FUNCTION public.assert_user_rate_limit(
  action_key TEXT,
  max_count INTEGER,
  window_seconds INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER := 0;
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF action_key = 'posts' THEN
    SELECT COUNT(*)::INTEGER INTO recent_count
    FROM posts
    WHERE author_id = caller
      AND created_at > timezone('utc'::text, now()) - make_interval(secs => window_seconds);
  ELSIF action_key = 'comments' THEN
    SELECT COUNT(*)::INTEGER INTO recent_count
    FROM comments
    WHERE user_id = caller
      AND created_at > timezone('utc'::text, now()) - make_interval(secs => window_seconds);
  ELSIF action_key = 'votes' THEN
    SELECT COUNT(*)::INTEGER INTO recent_count
    FROM votes
    WHERE user_id = caller
      AND created_at > timezone('utc'::text, now()) - make_interval(secs => window_seconds);
  ELSE
    RAISE EXCEPTION 'Unknown rate-limit action: %', action_key;
  END IF;

  IF recent_count >= max_count THEN
    RAISE EXCEPTION
      'Rate limit exceeded for %. Try again in a few minutes.',
      action_key
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

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

  IF char_length(trim(post_title)) < 3
    OR char_length(trim(post_title)) > 120
    OR char_length(trim(post_description)) < 8
    OR char_length(trim(post_description)) > 4000 THEN
    RAISE EXCEPTION 'Title or description length is invalid';
  END IF;

  -- Burst + hourly caps
  PERFORM public.assert_user_rate_limit('posts', 1, 30);
  PERFORM public.assert_user_rate_limit('posts', 5, 3600);

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

CREATE OR REPLACE FUNCTION public.enforce_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_user_rate_limit('comments', 1, 10);
  PERFORM public.assert_user_rate_limit('comments', 20, 3600);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_vote_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_user_rate_limit('votes', 60, 3600);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_rate_limit ON comments;
CREATE TRIGGER comments_rate_limit
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_comment_rate_limit();

DROP TRIGGER IF EXISTS votes_rate_limit ON votes;
CREATE TRIGGER votes_rate_limit
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_vote_rate_limit();

GRANT EXECUTE ON FUNCTION public.assert_user_rate_limit(TEXT, INTEGER, INTEGER)
  TO authenticated;
