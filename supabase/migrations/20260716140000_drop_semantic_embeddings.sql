-- Remove unused Gemini/pgvector embedding artifacts. Duplicate detection is
-- now entirely local (lib/search); merge RPCs are kept.

DROP FUNCTION IF EXISTS public.find_post_embedding_pairs(REAL, INTEGER);
DROP FUNCTION IF EXISTS public.match_post_embeddings(
  extensions.vector(768), REAL, INTEGER
);
DROP FUNCTION IF EXISTS public.set_post_embedding(
  UUID, extensions.vector(768), TEXT
);

DROP INDEX IF EXISTS public.posts_ai_embedding_hnsw_idx;

ALTER TABLE public.posts
  DROP COLUMN IF EXISTS ai_embedding,
  DROP COLUMN IF EXISTS ai_embedding_model,
  DROP COLUMN IF EXISTS ai_embedding_updated_at;

DROP EXTENSION IF EXISTS vector;
