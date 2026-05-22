-- Chunk embeddings for vector search (pgvector)
CREATE TABLE IF NOT EXISTS chunk_embeddings (
    chunk_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    embedding vector(1536) NOT NULL,
    embedding_model TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chunk_embeddings_pkey PRIMARY KEY (chunk_id),
    CONSTRAINT chunk_embeddings_chunk_id_fkey
        FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chunk_embeddings_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS chunk_embeddings_document_id_idx ON chunk_embeddings(document_id);
CREATE INDEX IF NOT EXISTS chunk_embeddings_tenant_id_idx ON chunk_embeddings(tenant_id);

CREATE INDEX IF NOT EXISTS chunk_embeddings_embedding_hnsw_idx
    ON chunk_embeddings USING hnsw (embedding vector_cosine_ops);
