import { z } from "zod";

// URL parameters
export const nodeTypeParamSchema = z.object({
    type: z.string().min(1)
});

export type NodeTypeParam = z.infer<typeof nodeTypeParamSchema>;
