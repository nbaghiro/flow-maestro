import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FigmaClient } from "../client/FigmaClient";

export const getFileOperation: OperationDefinition = {
    id: "getFile",
    name: "Get Figma File",
    description: "Retrieve complete file data including document tree, components, and styles",
    category: "files",
    inputSchema: z.object({
        fileKey: z.string().describe("Figma file key from URL (e.g., abc123def456)"),
        version: z.string().optional().describe("Specific version ID to retrieve"),
        depth: z
            .number()
            .min(1)
            .optional()
            .describe("Tree depth to retrieve (limits nesting levels)"),
        includeGeometry: z.boolean().optional().describe("Include vector path geometry data"),
        branchData: z.boolean().optional().describe("Include branch metadata")
    }),
    inputSchemaJSON: {
        type: "object",
        properties: {
            fileKey: {
                type: "string",
                description: "Figma file key from URL (e.g., abc123def456)"
            },
            version: { type: "string", description: "Specific version ID to retrieve" },
            depth: {
                type: "number",
                description: "Tree depth to retrieve (limits nesting levels)"
            },
            includeGeometry: {
                type: "boolean",
                description: "Include vector path geometry data"
            },
            branchData: { type: "boolean", description: "Include branch metadata" }
        },
        required: ["fileKey"]
    },
    retryable: true
};

export async function executeGetFile(
    client: FigmaClient,
    params: z.infer<typeof getFileOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.getFile(params.fileKey, {
            version: params.version,
            depth: params.depth,
            geometry: params.includeGeometry ? "paths" : undefined,
            branch_data: params.branchData
        });

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Figma file",
                retryable: true
            }
        };
    }
}
