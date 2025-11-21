import { z } from "zod";

/**
 * Shared Zod schemas for Airtable operations
 */

// Common schemas
export const baseIdSchema = z.string().describe("The Airtable base ID");
export const tableIdSchema = z.string().describe("The Airtable table ID or name");
export const recordIdSchema = z.string().describe("The Airtable record ID");
export const fieldIdSchema = z.string().describe("The Airtable field ID");
export const viewIdSchema = z.string().describe("The Airtable view ID or name");
export const webhookIdSchema = z.string().describe("The Airtable webhook ID");

// Pagination
export const paginationSchema = z.object({
    pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of records per page (max 100)"),
    offset: z.string().optional().describe("Pagination offset from previous response")
});

// Sorting
export const sortSchema = z.object({
    field: z.string().describe("Field name to sort by"),
    direction: z.enum(["asc", "desc"]).describe("Sort direction")
});

// Fields
export const fieldsSchema = z.record(z.any()).describe("Record fields as key-value pairs");
