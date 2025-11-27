import { z } from "zod";

export const createVersionSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional()
});

export const versionIdParamSchema = z.object({
    id: z.string().uuid()
});

export type CreateVersionRequest = z.infer<typeof createVersionSchema>;
