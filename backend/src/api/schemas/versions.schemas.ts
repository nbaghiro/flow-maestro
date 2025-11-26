import { z } from "zod";

export const createVersionSchema = z.object({
    name: z.string().min(1).max(255).optional()
});

export type CreateVersionRequest = z.infer<typeof createVersionSchema>;
