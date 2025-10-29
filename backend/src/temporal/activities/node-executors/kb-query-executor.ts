import { ExecuteNodeInput, NodeResult } from "./index";
import { KnowledgeBaseRepository, KnowledgeChunkRepository } from "../../../storage/repositories";
import { EmbeddingService } from "../../../services/embeddings";
import { interpolateVariables } from "../../../shared/utils/interpolate-variables";

export interface KnowledgeBaseQueryNodeConfig {
    knowledgeBaseId: string;
    queryText: string; // Can include variable interpolation like {{input.query}}
    topK?: number; // Number of results to return (default: 5)
    similarityThreshold?: number; // Minimum similarity score (default: 0.7)
    includeMetadata?: boolean; // Include chunk metadata in results (default: true)
}

/**
 * Execute Knowledge Base Query Node
 * Performs semantic similarity search on a knowledge base
 */
export async function executeKnowledgeBaseQueryNode(
    input: ExecuteNodeInput
): Promise<NodeResult> {
    const config = input.config as KnowledgeBaseQueryNodeConfig;
    const kbRepository = new KnowledgeBaseRepository();
    const chunkRepository = new KnowledgeChunkRepository();
    const embeddingService = new EmbeddingService();

    try {
        // Validate config
        if (!config.knowledgeBaseId) {
            throw new Error("Knowledge base ID is required");
        }

        if (!config.queryText) {
            throw new Error("Query text is required");
        }

        // Interpolate variables in query text
        const interpolatedQuery = interpolateVariables(config.queryText, input.context || {});

        if (!interpolatedQuery || interpolatedQuery.trim().length === 0) {
            throw new Error("Query text is empty after variable interpolation");
        }

        // Get knowledge base
        const kb = await kbRepository.findById(config.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base not found: ${config.knowledgeBaseId}`);
        }

        // Generate embedding for the query
        const queryEmbedding = await embeddingService.generateQueryEmbedding(
            interpolatedQuery,
            {
                model: kb.config.embeddingModel,
                provider: kb.config.embeddingProvider,
                dimensions: kb.config.embeddingDimensions
            }
            // Note: userId would ideally be passed from the execution context
        );

        // Search for similar chunks
        const searchResults = await chunkRepository.searchSimilar({
            knowledge_base_id: config.knowledgeBaseId,
            query_embedding: queryEmbedding,
            top_k: config.topK || 5,
            similarity_threshold: config.similarityThreshold || 0.7
        });

        // Format results
        const results = searchResults.map((result) => {
            const formattedResult: any = {
                content: result.content,
                similarity: result.similarity,
                documentName: result.document_name,
                chunkIndex: result.chunk_index
            };

            // Optionally include metadata
            if (config.includeMetadata !== false) {
                formattedResult.metadata = result.metadata;
            }

            return formattedResult;
        });

        // Get top result for convenience
        const topResult = results.length > 0 ? results[0] : null;

        // Combine all results into a single text for easy use in prompts
        const combinedText = results
            .map((r, index) => {
                const sourceInfo = r.documentName
                    ? `[Source: ${r.documentName}, Chunk ${r.chunkIndex}]`
                    : "";
                return `Result ${index + 1} (similarity: ${r.similarity.toFixed(3)}):\n${r.content}\n${sourceInfo}`;
            })
            .join("\n\n---\n\n");

        return {
            success: true,
            data: {
                query: interpolatedQuery,
                results,
                topResult,
                combinedText, // Easy to use in LLM prompts
                count: results.length,
                metadata: {
                    knowledgeBaseId: config.knowledgeBaseId,
                    knowledgeBaseName: kb.name,
                    topK: config.topK || 5,
                    similarityThreshold: config.similarityThreshold || 0.7
                }
            }
        };
    } catch (error: any) {
        console.error("[KB Query Executor] Error:", error);
        return {
            success: false,
            error: error.message || "Failed to query knowledge base"
        };
    }
}
