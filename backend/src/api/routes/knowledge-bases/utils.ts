import type { KnowledgeDocumentModel } from "../../../storage/models/KnowledgeDocument";

/**
 * Convert a document model to a JSON-serializable format
 * Converts BigInt file_size to number
 */
export function serializeDocument(
    document: KnowledgeDocumentModel
): Omit<KnowledgeDocumentModel, "file_size"> & { file_size: number | null } {
    return {
        ...document,
        file_size: document.file_size !== null ? Number(document.file_size) : null
    };
}

/**
 * Convert an array of documents to JSON-serializable format
 */
export function serializeDocuments(
    documents: KnowledgeDocumentModel[]
): Array<Omit<KnowledgeDocumentModel, "file_size"> & { file_size: number | null }> {
    return documents.map(serializeDocument);
}
