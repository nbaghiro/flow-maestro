import { z } from "zod";

export const createCheckpointSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional()
});

export const checkpointIdParamSchema = z.object({
    id: z.string().uuid()
});

export const checkpointWorkflowIdParamSchema = z.object({
    workflowId: z.string().uuid()
});

export const renameCheckpointSchema = z.object({
    name: z.string().min(1).max(255)
});

export type CreateCheckpointRequest = z.infer<typeof createCheckpointSchema>;
