import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { LinearClient } from "../client/LinearClient";

/**
 * Create issue input schema
 */
export const createIssueSchema = z.object({
    teamId: z.string().min(1).describe("Team ID where issue will be created"),
    title: z.string().min(1).max(255).describe("Issue title"),
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

export type CreateIssueParams = z.infer<typeof createIssueSchema>;

/**
 * Create issue operation definition
 */
export const createIssueOperation: OperationDefinition = {
    id: "createIssue",
    name: "Create Issue",
    description: "Create a new issue in Linear",
    category: "issues",
    retryable: true,
    inputSchema: createIssueSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            teamId: {
                type: "string",
                description: "Team ID where issue will be created"
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
        required: ["teamId", "title"]
    }
};

/**
 * Execute create issue operation
 */
export async function executeCreateIssue(
    client: LinearClient,
    params: CreateIssueParams
): Promise<OperationResult> {
    try {
        const response = await client.createIssue(params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Linear issue",
                retryable: true
            }
        };
    }
}
