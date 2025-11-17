import { z } from "zod";

/**
 * Shared Zod schemas for Coda operations
 */

export const CodaDocIdSchema = z.string().describe("Coda document ID");

export const CodaTableIdSchema = z.string().describe("Coda table ID or name");

export const CodaLimitSchema = z
    .number()
    .min(1)
    .max(500)
    .optional()
    .default(100)
    .describe("Maximum number of items to return");
