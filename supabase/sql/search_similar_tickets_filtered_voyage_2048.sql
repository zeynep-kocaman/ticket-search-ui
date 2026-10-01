-- RPC for searching 2048-dimensional Voyage embeddings.
-- Assumes a table public.vdb_embeddings_voyage_2048 with:
--   conv_id text-compatible
--   embedding vector(2048)

CREATE OR REPLACE FUNCTION public.search_similar_tickets_filtered_voyage_2048(
  query_embedding vector(2048),
  match_threshold float DEFAULT 0.84,
  filter_date_from timestamptz DEFAULT NULL,
  filter_date_to timestamptz DEFAULT NULL,
  match_count int DEFAULT 500
)
RETURNS TABLE (
  conv_id text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.conv_id::text,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.vdb_embeddings_voyage_2048 e
  JOIN public.vdb_raw_tickets t
    ON t.conv_id = e.conv_id
  WHERE 1 - (e.embedding <=> query_embedding) >= match_threshold
    AND t.new_message IS NOT NULL
    AND (filter_date_from IS NULL OR t.created_at >= filter_date_from)
    AND (filter_date_to IS NULL OR t.created_at < filter_date_to)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
