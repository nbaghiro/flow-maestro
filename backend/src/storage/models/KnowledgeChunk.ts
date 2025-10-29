export interface ChunkMetadata {
    page?: number;
    section?: string;
    heading?: string;
    start_char?: number;
    end_char?: number;
    [key: string]: any; // Allow additional custom metadata
}

export interface KnowledgeChunkModel {
    id: string;
    document_id: string;
    knowledge_base_id: string;
    chunk_index: number;
    content: string;
    embedding: number[] | null; // Vector embedding
    token_count: number | null;
    metadata: ChunkMetadata;
    created_at: Date;
}

export interface CreateKnowledgeChunkInput {
    document_id: string;
    knowledge_base_id: string;
    chunk_index: number;
    content: string;
    embedding?: number[];
    token_count?: number;
    metadata?: ChunkMetadata;
}

export interface ChunkSearchResult {
    id: string;
    document_id: string;
    document_name: string;
    chunk_index: number;
    content: string;
    metadata: ChunkMetadata;
    similarity: number; // Cosine similarity score (0-1)
}

export interface SearchChunksInput {
    knowledge_base_id: string;
    query_embedding: number[];
    top_k: number;
    similarity_threshold?: number;
}
