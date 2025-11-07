import type { JsonValue } from "@flowmaestro/shared";

export type DocumentSourceType = "file" | "url";

export type DocumentFileType = "pdf" | "docx" | "doc" | "txt" | "md" | "html" | "json" | "csv";

export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export interface DocumentMetadata extends Record<string, JsonValue | undefined> {
    author?: string;
    created_date?: string;
    pages?: number;
    language?: string;
    file_size?: number;
    word_count?: number;
}

export interface KnowledgeDocumentModel {
    id: string;
    knowledge_base_id: string;
    name: string;
    source_type: DocumentSourceType;
    source_url: string | null;
    file_path: string | null;
    file_type: DocumentFileType;
    file_size: bigint | null;
    content: string | null;
    metadata: DocumentMetadata;
    status: DocumentStatus;
    error_message: string | null;
    processing_started_at: Date | null;
    processing_completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateKnowledgeDocumentInput {
    knowledge_base_id: string;
    name: string;
    source_type: DocumentSourceType;
    source_url?: string;
    file_path?: string;
    file_type: DocumentFileType;
    file_size?: bigint;
    metadata?: DocumentMetadata;
}

export interface UpdateKnowledgeDocumentInput {
    name?: string;
    content?: string;
    metadata?: DocumentMetadata;
    status?: DocumentStatus;
    error_message?: string;
    processing_started_at?: Date;
    processing_completed_at?: Date;
}
