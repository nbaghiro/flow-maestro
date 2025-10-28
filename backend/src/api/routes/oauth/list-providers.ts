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
        } catch (error: any) {
            return reply.status(500).send({
                success: false,
                error: error.message || "Failed to list OAuth providers"
            });
        }
    });
}
