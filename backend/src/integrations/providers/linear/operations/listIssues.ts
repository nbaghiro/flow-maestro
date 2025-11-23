import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { LinearClient } from "../client/LinearClient";

/**
 * List issues input schema
 */
export const listIssuesSchema = z.object({
    teamId: z.string().optional().describe("Filter by team ID"),
    first: z.number().min(1).max(250).optional().default(50).describe("Number of issues to return"),
    after: z.string().optional().describe("Cursor for pagination"),
    filter: z.record(z.unknown()).optional().describe("Issue filters (GraphQL IssueFilter format)")
});

export type ListIssuesParams = z.infer<typeof listIssuesSchema>;

/**
 * List issues operation definition
 */
export const listIssuesOperation: OperationDefinition = {
    id: "listIssues",
    name: "List Issues",
    description: "List issues from Linear with optional filters",
    category: "issues",
    retryable: true,
    inputSchema: listIssuesSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            teamId: {
                type: "string",
                description: "Filter by team ID"
            },
            first: {
                type: "number",
                description: "Number of issues to return",
                default: 50
            },
            after: {
                type: "string",
                description: "Cursor for pagination"
            },
            filter: {
                type: "object",
                description: "Issue filters (GraphQL IssueFilter format)"
            }
        },
        required: []
    }
};

/**
 * Execute list issues operation
 */
export async function executeListIssues(
    client: LinearClient,
    params: ListIssuesParams
): Promise<OperationResult> {
    try {
        const response = await client.listIssues(params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list Linear issues",
                retryable: true
            }
        };
    }
}
