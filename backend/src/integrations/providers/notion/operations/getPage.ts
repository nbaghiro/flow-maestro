import { z } from "zod";
import { normalizeNotionId } from "../utils/id-normalizer";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { NotionClient } from "../client/NotionClient";

/**
 * Get page input schema
 */
export const getPageSchema = z.object({
    page_id: z.string().min(1).describe("Page ID to retrieve")
});

export type GetPageParams = z.infer<typeof getPageSchema>;

/**
 * Get page operation definition
 */
export const getPageOperation: OperationDefinition = {
    id: "getPage",
    name: "Get Page",
    description: "Retrieve a Notion page by ID",
    category: "read",
    retryable: true,
    inputSchema: getPageSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            page_id: {
                type: "string",
                description: "Page ID to retrieve"
            }
        },
        required: ["page_id"]
    }
};

/**
 * Execute get page operation
 */
export async function executeGetPage(
    client: NotionClient,
    params: GetPageParams
): Promise<OperationResult> {
    try {
        // Normalize page ID to proper UUID format
        const normalizedPageId = normalizeNotionId(params.page_id);
        const response = await client.getPage(normalizedPageId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Notion page",
                retryable: true
            }
        };
    }
}
