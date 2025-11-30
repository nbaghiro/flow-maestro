import { z } from "zod";
import { normalizeNotionId } from "../utils/id-normalizer";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { NotionClient } from "../client/NotionClient";

/**
 * Update page input schema
 */
export const updatePageSchema = z.object({
    page_id: z.string().min(1).describe("Page ID to update"),
    properties: z.record(z.unknown()).describe("Properties to update"),
    archived: z.boolean().optional().describe("Archive the page")
});

export type UpdatePageParams = z.infer<typeof updatePageSchema>;

/**
 * Update page operation definition
 */
export const updatePageOperation: OperationDefinition = {
    id: "updatePage",
    name: "Update Page",
    description: "Update an existing Notion page",
    category: "write",
    retryable: true,
    inputSchema: updatePageSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            page_id: {
                type: "string",
                description: "Page ID to update"
            },
            properties: {
                type: "object",
                description: "Properties to update"
            },
            archived: {
                type: "boolean",
                description: "Archive the page"
            }
        },
        required: ["page_id", "properties"]
    }
};

/**
 * Execute update page operation
 */
export async function executeUpdatePage(
    client: NotionClient,
    params: UpdatePageParams
): Promise<OperationResult> {
    try {
        // Normalize page ID to proper UUID format
        const normalizedPageId = normalizeNotionId(params.page_id);

        const response = await client.updatePage(normalizedPageId, {
            properties: params.properties,
            archived: params.archived
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
                message: error instanceof Error ? error.message : "Failed to update Notion page",
                retryable: true
            }
        };
    }
}
