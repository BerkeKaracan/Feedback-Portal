-- Public/private image attachments, user private messages (admin-only read),
-- and admin internal notes. Separate tables so RLS can hide sensitive content.

-- ---------------------------------------------------------------------------
-- Admin internal notes (team-only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.post_admin_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) >= 1 AND char_length(content) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX post_admin_notes_post_id_idx ON public.post_admin_notes (post_id);
CREATE INDEX post_admin_notes_created_at_idx ON public.post_admin_notes (created_at DESC);

ALTER TABLE public.post_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin notes"
  ON public.post_admin_notes FOR SELECT
  USING (public.can_admin_post(post_id));

CREATE POLICY "Admins can insert admin notes"
  ON public.post_admin_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND public.can_admin_post(post_id)
  );

CREATE POLICY "Admins can delete admin notes"
  ON public.post_admin_notes FOR DELETE
  USING (public.can_admin_post(post_id));

GRANT SELECT, INSERT, DELETE ON TABLE public.post_admin_notes TO authenticated;

-- ---------------------------------------------------------------------------
-- User private messages (visible to author + admins only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.post_private_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) >= 1 AND char_length(content) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX post_private_messages_post_id_idx ON public.post_private_messages (post_id);
CREATE INDEX post_private_messages_author_id_idx ON public.post_private_messages (author_id);

ALTER TABLE public.post_private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Author or admin can view private messages"
  ON public.post_private_messages FOR SELECT
  USING (
    author_id = auth.uid()
    OR public.can_admin_post(post_id)
  );

CREATE POLICY "Post author can insert private messages"
  ON public.post_private_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_id
        AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Author or admin can delete private messages"
  ON public.post_private_messages FOR DELETE
  USING (
    author_id = auth.uid()
    OR public.can_admin_post(post_id)
  );

GRANT SELECT, INSERT, DELETE ON TABLE public.post_private_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_private_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_user_rate_limit('private_messages', 3, 60);
  PERFORM public.assert_user_rate_limit('private_messages', 20, 3600);
  RETURN NEW;
END;
$$;

CREATE TRIGGER private_messages_rate_limit
  BEFORE INSERT ON public.post_private_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_private_message_rate_limit();

-- ---------------------------------------------------------------------------
-- Attachments metadata
-- ---------------------------------------------------------------------------
CREATE TABLE public.post_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  private_message_id UUID REFERENCES public.post_private_messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'admin_only')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT post_attachments_target_check CHECK (
    (
      visibility = 'public'
      AND private_message_id IS NULL
    )
    OR (
      visibility = 'admin_only'
      AND private_message_id IS NOT NULL
      AND comment_id IS NULL
    )
  )
);

CREATE INDEX post_attachments_post_id_idx ON public.post_attachments (post_id);
CREATE INDEX post_attachments_comment_id_idx ON public.post_attachments (comment_id)
  WHERE comment_id IS NOT NULL;
CREATE INDEX post_attachments_private_message_id_idx
  ON public.post_attachments (private_message_id)
  WHERE private_message_id IS NOT NULL;

ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public attachments"
  ON public.post_attachments FOR SELECT
  USING (
    visibility = 'public'
    OR created_by = auth.uid()
    OR public.can_admin_post(post_id)
  );

CREATE POLICY "Authenticated users can insert attachments"
  ON public.post_attachments FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      (
        visibility = 'public'
        AND (
          EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_id
              AND posts.author_id = auth.uid()
          )
          OR (
            comment_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.comments
              WHERE comments.id = comment_id
                AND comments.user_id = auth.uid()
                AND comments.post_id = post_attachments.post_id
            )
          )
        )
      )
      OR (
        visibility = 'admin_only'
        AND private_message_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.post_private_messages pm
          WHERE pm.id = private_message_id
            AND pm.author_id = auth.uid()
            AND pm.post_id = post_attachments.post_id
        )
      )
    )
  );

CREATE POLICY "Uploader or admin can delete attachments"
  ON public.post_attachments FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.can_admin_post(post_id)
  );

GRANT SELECT ON TABLE public.post_attachments TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.post_attachments TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_attachment_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  public_count INTEGER;
  private_count INTEGER;
BEGIN
  PERFORM public.assert_user_rate_limit('attachments', 10, 60);
  PERFORM public.assert_user_rate_limit('attachments', 40, 3600);

  IF NEW.visibility = 'public' AND NEW.comment_id IS NULL THEN
    SELECT COUNT(*) INTO public_count
    FROM public.post_attachments
    WHERE post_id = NEW.post_id
      AND visibility = 'public'
      AND comment_id IS NULL;

    IF public_count >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 public images per post';
    END IF;
  END IF;

  IF NEW.visibility = 'public' AND NEW.comment_id IS NOT NULL THEN
    SELECT COUNT(*) INTO public_count
    FROM public.post_attachments
    WHERE comment_id = NEW.comment_id
      AND visibility = 'public';

    IF public_count >= 1 THEN
      RAISE EXCEPTION 'Maximum 1 image per comment';
    END IF;
  END IF;

  IF NEW.visibility = 'admin_only' AND NEW.private_message_id IS NOT NULL THEN
    SELECT COUNT(*) INTO private_count
    FROM public.post_attachments
    WHERE private_message_id = NEW.private_message_id
      AND visibility = 'admin_only';

    IF private_count >= 2 THEN
      RAISE EXCEPTION 'Maximum 2 private images per message';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER attachments_limits
  BEFORE INSERT ON public.post_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_attachment_limits();

-- ---------------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-attachments',
  'feedback-attachments',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Authenticated users can upload feedback attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Read feedback attachments via metadata RLS"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback-attachments'
    AND EXISTS (
      SELECT 1 FROM public.post_attachments a
      WHERE a.storage_path = name
        AND (
          a.visibility = 'public'
          OR a.created_by = auth.uid()
          OR public.can_admin_post(a.post_id)
        )
    )
  );

CREATE POLICY "Uploader or admin can delete feedback attachment objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'feedback-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.post_attachments a
        WHERE a.storage_path = name
          AND public.can_admin_post(a.post_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Merge: reassign notes / messages / attachments before posts are deleted
-- ---------------------------------------------------------------------------
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

  UPDATE post_admin_notes
  SET post_id = canonical_post_id
  WHERE post_id = ANY(duplicate_post_ids);

  UPDATE post_private_messages
  SET post_id = canonical_post_id
  WHERE post_id = ANY(duplicate_post_ids);

  UPDATE post_attachments
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

-- Admin notes rate limit (light)
CREATE OR REPLACE FUNCTION public.enforce_admin_note_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_user_rate_limit('admin_notes', 20, 60);
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_notes_rate_limit
  BEFORE INSERT ON public.post_admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_note_rate_limit();
