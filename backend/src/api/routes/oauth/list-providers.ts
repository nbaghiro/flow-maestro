import { FastifyInstance } from "fastify";
import { listOAuthProviders } from "../../../services/oauth/OAuthProviderRegistry";

/**
 * GET /oauth/providers
 *
 * List all available OAuth providers with their configuration status
 */
export async function listProvidersRoute(fastify: FastifyInstance) {
    fastify.get("/providers", async (_request, reply) => {
        try {
            const providers = listOAuthProviders();

            return reply.send({
                success: true,
                data: providers
            });
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            return reply.status(500).send({
                success: false,
                error: errorMsg || "Failed to list OAuth providers"
            });
        }
    });
}
