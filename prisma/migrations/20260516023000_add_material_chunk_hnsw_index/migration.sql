CREATE INDEX IF NOT EXISTS "material_chunk_embedding_hnsw_idx"
ON "material_chunk" USING hnsw ("embedding" vector_cosine_ops);
