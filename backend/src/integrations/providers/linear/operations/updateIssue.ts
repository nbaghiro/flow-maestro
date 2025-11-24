import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { LinearClient } from "../client/LinearClient";

/**
 * Update issue input schema
 */
export const updateIssueSchema = z.object({
    id: z.string().min(1).describe("Issue ID to update"),
    title: z.string().min(1).max(255).optional().describe("Issue title"),
    description: z.string().optional().describe("Issue description (markdown)"),
    assigneeId: z.string().optional().describe("Assignee user ID"),
    priority: z
        .number()
        .min(0)
        .max(4)
        .optional()
        .describe("Priority (0=None, 1=Urgent, 2=High, 3=Normal, 4=Low)"),
    stateId: z.string().optional().describe("Workflow state ID"),
    labelIds: z.array(z.string()).optional().describe("Array of label IDs")
});

export type UpdateIssueParams = z.infer<typeof updateIssueSchema>;

/**
 * Update issue operation definition
 */
export const updateIssueOperation: OperationDefinition = {
    id: "updateIssue",
    name: "Update Issue",
    description: "Update an existing issue in Linear",
    category: "issues",
    retryable: true,
    inputSchema: updateIssueSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "Issue ID to update"
            },
            title: {
                type: "string",
                description: "Issue title"
            },
            description: {
                type: "string",
                description: "Issue description (markdown)"
            },
            assigneeId: {
                type: "string",
                description: "Assignee user ID"
            },
            priority: {
                type: "number",
                description: "Priority (0=None, 1=Urgent, 2=High, 3=Normal, 4=Low)"
            },
            stateId: {
                type: "string",
                description: "Workflow state ID"
            },
            labelIds: {
                type: "array",
                items: { type: "string" },
                description: "Array of label IDs"
            }
        },
        required: ["id"]
    }
};

/**
 * Execute update issue operation
 */
export async function executeUpdateIssue(
    client: LinearClient,
    params: UpdateIssueParams
): Promise<OperationResult> {
    try {
        const response = await client.updateIssue(params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update Linear issue",
                retryable: true
            }
        };
    }
}
