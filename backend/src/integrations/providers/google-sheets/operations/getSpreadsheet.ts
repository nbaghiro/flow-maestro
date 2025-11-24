import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Get spreadsheet input schema
 */
export const getSpreadsheetSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    includeGridData: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include cell data in response (default: false)")
});

export type GetSpreadsheetParams = z.infer<typeof getSpreadsheetSchema>;

/**
 * Get spreadsheet operation definition
 */
export const getSpreadsheetOperation: OperationDefinition = {
    id: "getSpreadsheet",
    name: "Get Spreadsheet",
    description: "Get metadata and properties of a spreadsheet",
    category: "spreadsheets",
    retryable: true,
    inputSchema: getSpreadsheetSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            spreadsheetId: {
                type: "string",
                description: "Spreadsheet ID"
            },
            includeGridData: {
                type: "boolean",
                description: "Include cell data in response (default: false)"
            }
        },
        required: ["spreadsheetId"]
    }
};

/**
 * Execute get spreadsheet operation
 */
export async function executeGetSpreadsheet(
    client: GoogleSheetsClient,
    params: GetSpreadsheetParams
): Promise<OperationResult> {
    try {
        const response = await client.getSpreadsheet(
            params.spreadsheetId,
            params.includeGridData ?? false
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get spreadsheet",
                retryable: true
            }
        };
    }
}
