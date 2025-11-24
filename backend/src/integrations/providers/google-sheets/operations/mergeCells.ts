import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Merge cells input schema
 */
export const mergeCellsSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    sheetId: z.number().int().describe("Sheet ID (gid)"),
    startRowIndex: z.number().int().min(0).describe("Start row index (0-based)"),
    endRowIndex: z.number().int().min(1).describe("End row index (exclusive)"),
    startColumnIndex: z.number().int().min(0).describe("Start column index (0-based)"),
    endColumnIndex: z.number().int().min(1).describe("End column index (exclusive)"),
    mergeType: z
        .enum(["MERGE_ALL", "MERGE_COLUMNS", "MERGE_ROWS"])
        .optional()
        .default("MERGE_ALL")
        .describe("How to merge cells (default: MERGE_ALL)")
});

export type MergeCellsParams = z.infer<typeof mergeCellsSchema>;

/**
 * Merge cells operation definition
 */
export const mergeCellsOperation: OperationDefinition = {
    id: "mergeCells",
    name: "Merge Cells",
    description: "Merge cells in a range",
    category: "formatting",
    retryable: true,
    inputSchema: mergeCellsSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            spreadsheetId: { type: "string", description: "Spreadsheet ID" },
            sheetId: { type: "number", description: "Sheet ID (gid)" },
            startRowIndex: { type: "number", description: "Start row index (0-based)" },
            endRowIndex: { type: "number", description: "End row index (exclusive)" },
            startColumnIndex: { type: "number", description: "Start column index (0-based)" },
            endColumnIndex: { type: "number", description: "End column index (exclusive)" },
            mergeType: {
                type: "string",
                enum: ["MERGE_ALL", "MERGE_COLUMNS", "MERGE_ROWS"],
                description: "How to merge cells (default: MERGE_ALL)"
            }
        },
        required: [
            "spreadsheetId",
            "sheetId",
            "startRowIndex",
            "endRowIndex",
            "startColumnIndex",
            "endColumnIndex"
        ]
    }
};

/**
 * Execute merge cells operation
 */
export async function executeMergeCells(
    client: GoogleSheetsClient,
    params: MergeCellsParams
): Promise<OperationResult> {
    try {
        const request = {
            mergeCells: {
                range: {
                    sheetId: params.sheetId,
                    startRowIndex: params.startRowIndex,
                    endRowIndex: params.endRowIndex,
                    startColumnIndex: params.startColumnIndex,
                    endColumnIndex: params.endColumnIndex
                },
                mergeType: params.mergeType || "MERGE_ALL"
            }
        };

        const response = await client.batchUpdateSpreadsheet(params.spreadsheetId, [request]);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to merge cells",
                retryable: true
            }
        };
    }
}
