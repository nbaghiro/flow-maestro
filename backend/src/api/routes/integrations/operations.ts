import { z } from "zod";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import type { FastifyRequest, FastifyReply } from "fastify";

const executionRouter = new ExecutionRouter(providerRegistry);

/**
 * Request params schema
 */
const getOperationsParamsSchema = z.object({
    provider: z.string()
});

interface GetOperationsParams {
    provider: string;
}

/**
 * Get all operations for a provider
 */
export async function getOperationsHandler(
    request: FastifyRequest<{ Params: GetOperationsParams }>,
    reply: FastifyReply
): Promise<void> {
    try {
        // Validate params
        const params = getOperationsParamsSchema.parse(request.params);

        // Get operations
        const operations = await executionRouter.discoverOperations(params.provider);

        reply.code(200).send({
            success: true,
            data: {
                provider: params.provider,
                operations
            }
        });
    } catch (error) {
        console.error("[API] Error getting operations:", error);

        reply.code(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to get operations"
            }
        });
    }
}
