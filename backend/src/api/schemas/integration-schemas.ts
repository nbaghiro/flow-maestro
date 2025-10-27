import { z } from "zod";

// Create integration request
export const createIntegrationSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.string().min(1).max(100),
    config: z.record(z.any()),
    credentials: z.record(z.any()),
    enabled: z.boolean().optional()
});

// Update integration request
export const updateIntegrationSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    config: z.record(z.any()).optional(),
    credentials: z.record(z.any()).optional(),
    enabled: z.boolean().optional()
});

// Query parameters for listing integrations
export const listIntegrationsQuerySchema = z.object({
    type: z.string().optional(),
    limit: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform((val) => parseInt(val)).pipe(z.number().min(0)).optional()
});

// URL parameters
export const integrationIdParamSchema = z.object({
    id: z.string().uuid()
});

export type CreateIntegrationRequest = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationRequest = z.infer<typeof updateIntegrationSchema>;
export type ListIntegrationsQuery = z.infer<typeof listIntegrationsQuerySchema>;
export type IntegrationIdParam = z.infer<typeof integrationIdParamSchema>;
