import {
    KnowledgeDocumentRepository,
    KnowledgeChunkRepository,
    KnowledgeBaseRepository
} from "../../storage/repositories";
import { TextExtractor, TextChunker } from "../../services/document-processing";
import { EmbeddingService } from "../../services/embeddings";
import { DocumentFileType } from "../../storage/models/KnowledgeDocument";
import { CreateKnowledgeChunkInput } from "../../storage/models/KnowledgeChunk";

export interface ProcessDocumentInput {
    documentId: string;
    knowledgeBaseId: string;
    filePath?: string;
    sourceUrl?: string;
    fileType: DocumentFileType;
    userId?: string;
}

const documentRepository = new KnowledgeDocumentRepository();
const chunkRepository = new KnowledgeChunkRepository();
const kbRepository = new KnowledgeBaseRepository();
const textExtractor = new TextExtractor();
const embeddingService = new EmbeddingService();

/**
 * Activity: Extract text from document
 */
export async function extractTextActivity(input: ProcessDocumentInput): Promise<string> {
    console.log(`[extractTextActivity] Starting text extraction for document ${input.documentId}`);

    try {
        // Update status to processing
        await documentRepository.updateStatus(input.documentId, "processing");

        let extractedText: { content: string; metadata: Record<string, any> };

        if (input.sourceUrl) {
            // Extract from URL
            extractedText = await textExtractor.extractFromURL(input.sourceUrl);
        } else if (input.filePath) {
            // Extract from file
            extractedText = await textExtractor.extractFromFile(input.filePath, input.fileType);
        } else {
            throw new Error("Either filePath or sourceUrl must be provided");
        }

        // Update document with extracted content and metadata
        await documentRepository.update(input.documentId, {
            content: extractedText.content,
            metadata: extractedText.metadata
        });

        console.log(
            `[extractTextActivity] Successfully extracted ${extractedText.content.length} characters`
        );

        return extractedText.content;
    } catch (error: any) {
        console.error(`[extractTextActivity] Error:`, error);
        await documentRepository.updateStatus(input.documentId, "failed", error.message);
        throw error;
    }
}

/**
 * Activity: Chunk text into smaller pieces
 */
export async function chunkTextActivity(input: ProcessDocumentInput & { content: string }): Promise<
    Array<{
        content: string;
        index: number;
        metadata: any;
    }>
> {
    console.log(`[chunkTextActivity] Starting text chunking for document ${input.documentId}`);

    try {
        // Get KB config for chunk settings
        const kb = await kbRepository.findById(input.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base ${input.knowledgeBaseId} not found`);
        }

        const chunker = new TextChunker({
            chunkSize: kb.config.chunkSize,
            chunkOverlap: kb.config.chunkOverlap
        });

        // Get document metadata
        const document = await documentRepository.findById(input.documentId);

        // Chunk the text
        const chunks = chunker.chunkText(input.content, {
            document_id: input.documentId,
            document_name: document?.name,
            file_type: input.fileType
        });

        console.log(`[chunkTextActivity] Created ${chunks.length} chunks`);

        return chunks;
    } catch (error: any) {
        console.error(`[chunkTextActivity] Error:`, error);
        await documentRepository.updateStatus(input.documentId, "failed", error.message);
        throw error;
    }
}

/**
 * Activity: Generate embeddings for chunks
 */
export async function generateEmbeddingsActivity(
    input: ProcessDocumentInput & {
        chunks: Array<{
            content: string;
            index: number;
            metadata: any;
        }>;
    }
): Promise<number[][]> {
    console.log(
        `[generateEmbeddingsActivity] Generating embeddings for ${input.chunks.length} chunks`
    );

    try {
        // Get KB config for embedding settings
        const kb = await kbRepository.findById(input.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base ${input.knowledgeBaseId} not found`);
        }

        // Extract text from chunks
        const texts = input.chunks.map((chunk) => chunk.content);

        // Generate embeddings
        const result = await embeddingService.generateEmbeddings(
            texts,
            {
                model: kb.config.embeddingModel,
                provider: kb.config.embeddingProvider,
                dimensions: kb.config.embeddingDimensions
            },
            input.userId
        );

        console.log(
            `[generateEmbeddingsActivity] Generated ${result.embeddings.length} embeddings, used ${result.usage.total_tokens} tokens`
        );

        return result.embeddings;
    } catch (error: any) {
        console.error(`[generateEmbeddingsActivity] Error:`, error);
        await documentRepository.updateStatus(input.documentId, "failed", error.message);
        throw error;
    }
}

/**
 * Activity: Store chunks with embeddings in database
 */
export async function storeChunksActivity(
    input: ProcessDocumentInput & {
        chunks: Array<{
            content: string;
            index: number;
            metadata: any;
        }>;
        embeddings: number[][];
    }
): Promise<{ chunkCount: number }> {
    console.log(
        `[storeChunksActivity] Storing ${input.chunks.length} chunks with embeddings`
    );

    try {
        if (input.chunks.length !== input.embeddings.length) {
            throw new Error(
                `Mismatch between chunks (${input.chunks.length}) and embeddings (${input.embeddings.length})`
            );
        }

        // Prepare chunk inputs
        const chunkInputs: CreateKnowledgeChunkInput[] = input.chunks.map((chunk, index) => ({
            document_id: input.documentId,
            knowledge_base_id: input.knowledgeBaseId,
            chunk_index: chunk.index,
            content: chunk.content,
            embedding: input.embeddings[index],
            token_count: embeddingService.estimateTokens(chunk.content),
            metadata: chunk.metadata
        }));

        // Batch insert chunks
        const createdChunks = await chunkRepository.batchInsert(chunkInputs);

        console.log(`[storeChunksActivity] Successfully stored ${createdChunks.length} chunks`);

        return { chunkCount: createdChunks.length };
    } catch (error: any) {
        console.error(`[storeChunksActivity] Error:`, error);
        await documentRepository.updateStatus(input.documentId, "failed", error.message);
        throw error;
    }
}

/**
 * Activity: Mark document as ready
 */
export async function completeDocumentProcessingActivity(
    input: ProcessDocumentInput
): Promise<void> {
    console.log(`[completeDocumentProcessingActivity] Marking document ${input.documentId} as ready`);

    try {
        await documentRepository.updateStatus(input.documentId, "ready");
        console.log(`[completeDocumentProcessingActivity] Document marked as ready`);
    } catch (error: any) {
        console.error(`[completeDocumentProcessingActivity] Error:`, error);
        throw error;
    }
}
