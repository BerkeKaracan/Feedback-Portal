-- Support rate-limit keys used by attachment / private message / admin note triggers.
-- Without this, inserts raise "Unknown rate-limit action" and uploads appear broken.

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
  ELSIF action_key = 'attachments' THEN
    SELECT COUNT(*)::INTEGER INTO recent_count
    FROM post_attachments
    WHERE created_by = caller
      AND created_at > timezone('utc'::text, now()) - make_interval(secs => window_seconds);
  ELSIF action_key = 'private_messages' THEN
    SELECT COUNT(*)::INTEGER INTO recent_count
    FROM post_private_messages
    WHERE author_id = caller
      AND created_at > timezone('utc'::text, now()) - make_interval(secs => window_seconds);
  ELSIF action_key = 'admin_notes' THEN
    SELECT COUNT(*)::INTEGER INTO recent_count
    FROM post_admin_notes
    WHERE author_id = caller
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
