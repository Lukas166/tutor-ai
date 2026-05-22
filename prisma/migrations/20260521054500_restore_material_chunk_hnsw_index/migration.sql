-- Keep pgvector similarity search fast for RAG retrieval.
-- Prisma cannot model this HNSW index on Unsupported("vector(768)"), so it must live as raw SQL.
CREATE INDEX IF NOT EXISTS "material_chunk_embedding_hnsw_idx"
ON "material_chunk" USING hnsw ("embedding" vector_cosine_ops);
