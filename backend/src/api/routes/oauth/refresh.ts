import { FastifyInstance } from "fastify";
import { forceRefreshToken } from "../../../services/oauth/TokenRefreshService";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware } from "../../middleware";

interface RefreshParams {
    provider: string;
    connectionId: string;
}

/**
 * POST /oauth/:provider/refresh/:connectionId
 *
 * Manually refresh an OAuth token.
 *
 * This is useful for:
 * - Testing token refresh
 * - Forcing a refresh before expiry
 * - Recovering from expired tokens
 *
 * Requires authentication and connection ownership.
 */
export async function refreshRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: RefreshParams }>(
        "/:provider/refresh/:connectionId",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { provider, connectionId } = request.params;
            const userId = request.user!.id;

            try {
                const connectionRepo = new ConnectionRepository();

                // Verify ownership
                const ownerId = await connectionRepo.getOwnerId(connectionId);
                if (ownerId !== userId) {
                    return reply.status(403).send({
                        success: false,
                        error: "You don't have permission to refresh this connection"
                    });
                }

                // Verify provider matches
                const connection = await connectionRepo.findById(connectionId);
                if (!connection) {
                    return reply.status(404).send({
                        success: false,
                        error: "Connection not found"
                    });
                }

                if (connection.provider !== provider) {
                    return reply.status(400).send({
                        success: false,
                        error: `Connection is for ${connection.provider}, not ${provider}`
                    });
                }

                if (connection.connection_method !== "oauth2") {
                    return reply.status(400).send({
                        success: false,
                        error: "Connection is not an OAuth token"
                    });
                }

                // Force refresh the token
                await forceRefreshToken(connectionId);

                fastify.log.info(`Successfully refreshed token for connection ${connectionId}`);

                // Get updated connection
                const updatedConnection = await connectionRepo.findById(connectionId);

                return reply.send({
                    success: true,
                    message: "Token refreshed successfully",
                    data: updatedConnection
                });
            } catch (error: unknown) {
                fastify.log.error(error, `Failed to refresh token for connection ${connectionId}`);

                return reply.status(400).send({
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error while refreshing token"
                });
            }
        }
    );
}
