import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware";
import { oauthService } from "../../../services/oauth/OAuthService";

interface AuthorizeParams {
    provider: string;
}

/**
 * GET /oauth/:provider/authorize
 *
 * Generate OAuth authorization URL for the specified provider.
 * User will be redirected to this URL to grant permissions.
 *
 * Requires authentication.
 */
export async function authorizeRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: AuthorizeParams }>(
        "/:provider/authorize",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { provider } = request.params;
            const userId = request.user!.id;

            try {
                const authUrl = oauthService.generateAuthUrl(provider, userId);

                return reply.send({
                    success: true,
                    data: {
                        authUrl,
                        provider
                    }
                });
            } catch (error: any) {
                fastify.log.error(`Failed to generate auth URL for ${provider}:`, error);

                return reply.status(400).send({
                    success: false,
                    error: error.message || `Failed to generate authorization URL for ${provider}`
                });
            }
        }
    );
}
