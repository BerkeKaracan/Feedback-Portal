-- Semantic duplicate detection with Gemini embeddings + pgvector.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE posts
  ADD COLUMN ai_embedding extensions.vector(768),
  ADD COLUMN ai_embedding_model TEXT,
  ADD COLUMN ai_embedding_updated_at TIMESTAMPTZ;

CREATE INDEX posts_ai_embedding_hnsw_idx
  ON posts
  USING hnsw (ai_embedding extensions.vector_cosine_ops)
  WHERE ai_embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION public.match_post_embeddings(
  query_embedding extensions.vector(768),
  match_threshold REAL DEFAULT 0.55,
  match_count INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  tags TEXT[],
  status TEXT,
  similarity REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    posts.id,
    posts.title,
    posts.description,
    posts.tags,
    posts.status,
    (1 - (posts.ai_embedding <=> query_embedding))::REAL AS similarity
  FROM posts
  WHERE posts.ai_embedding IS NOT NULL
    AND (1 - (posts.ai_embedding <=> query_embedding)) >= match_threshold
  ORDER BY posts.ai_embedding <=> query_embedding
  LIMIT LEAST(match_count, 10);
$$;

CREATE OR REPLACE FUNCTION public.set_post_embedding(
  target_post_id UUID,
  target_embedding extensions.vector(768),
  model_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_author_id UUID;
  caller_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT author_id INTO target_author_id
  FROM posts
  WHERE id = target_post_id;

  IF target_author_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  SELECT is_admin INTO caller_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF target_author_id <> auth.uid() AND NOT COALESCE(caller_is_admin, false) THEN
    RAISE EXCEPTION 'Not authorized to index this post';
  END IF;

  UPDATE posts
  SET
    ai_embedding = target_embedding,
    ai_embedding_model = model_name,
    ai_embedding_updated_at = timezone('utc'::text, now())
  WHERE id = target_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_post_embeddings(
  extensions.vector(768), REAL, INTEGER
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_post_embedding(
  UUID, extensions.vector(768), TEXT
) TO authenticated;
