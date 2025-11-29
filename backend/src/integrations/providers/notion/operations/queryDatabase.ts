import { z } from "zod";
import { normalizeNotionId } from "../utils/id-normalizer";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { NotionClient } from "../client/NotionClient";

/**
 * Query database input schema
 */
export const queryDatabaseSchema = z.object({
    database_id: z.string().min(1).describe("Database ID to query"),
    filter: z.record(z.unknown()).optional().describe("Filter object for database query"),
    sorts: z.array(z.unknown()).optional().describe("Array of sort objects"),
    page_size: z.number().min(1).max(100).optional().describe("Number of results per page")
});

export type QueryDatabaseParams = z.infer<typeof queryDatabaseSchema>;

/**
 * Query database operation definition
 */
export const queryDatabaseOperation: OperationDefinition = {
    id: "queryDatabase",
    name: "Query Database",
    description: "Query a Notion database with filters and sorting",
    category: "read",
    retryable: true,
    inputSchema: queryDatabaseSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            database_id: {
                type: "string",
                description: "Database ID to query"
            },
            filter: {
                type: "object",
                description: "Filter object for database query"
            },
            sorts: {
                type: "array",
                description: "Array of sort objects",
                items: {
                    type: "object",
                    additionalProperties: true
                }
            },
            page_size: {
                type: "number",
                description: "Number of results per page",
                minimum: 1,
                maximum: 100
            }
        },
        required: ["database_id"]
    }
};

/**
 * Execute query database operation
 */
export async function executeQueryDatabase(
    client: NotionClient,
    params: QueryDatabaseParams
): Promise<OperationResult> {
    try {
        // Normalize database ID to proper UUID format
        const normalizedDatabaseId = normalizeNotionId(params.database_id);
        const response = await client.queryDatabase(normalizedDatabaseId, {
            filter: params.filter,
            sorts: params.sorts,
            page_size: params.page_size
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to query Notion database",
                retryable: true
            }
        };
    }
}
