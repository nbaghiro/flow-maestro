import { providerRegistry } from "../../../integrations/registry";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Get all available providers
 */
export async function getProvidersHandler(
    _request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        const providers = await providerRegistry.getProviderSummaries();

        reply.code(200).send({
            success: true,
            data: providers
        });
    } catch (error) {
        console.error("[API] Error getting providers:", error);

        reply.code(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to get providers"
            }
        });
    }
}
