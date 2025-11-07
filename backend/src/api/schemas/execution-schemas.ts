import { z } from "zod";

// Query parameters for listing executions
export const listExecutionsQuerySchema = z.object({
    workflowId: z.string().uuid().optional(),
    status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).optional(),
    limit: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1).max(100))
        .optional(),
    offset: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(0))
        .optional()
});

// Query parameters for getting logs
export const getLogsQuerySchema = z.object({
    limit: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1).max(1000))
        .optional(),
    offset: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(0))
        .optional(),
    level: z.enum(["info", "warn", "error", "debug"]).optional(),
    nodeId: z.string().optional()
});

// URL parameters
export const executionIdParamSchema = z.object({
    id: z.string().uuid()
});

export type ListExecutionsQuery = z.infer<typeof listExecutionsQuerySchema>;
export type GetLogsQuery = z.infer<typeof getLogsQuerySchema>;
export type ExecutionIdParam = z.infer<typeof executionIdParamSchema>;
