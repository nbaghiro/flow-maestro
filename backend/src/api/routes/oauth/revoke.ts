import { FastifyInstance } from "fastify";
import { oauthService } from "../../../services/oauth/OAuthService";
import { OAuth2TokenData } from "../../../storage/models/Connection";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware } from "../../middleware";

interface RevokeParams {
    provider: string;
    connectionId: string;
}

/**
 * POST /oauth/:provider/revoke/:connectionId
 *
 * Revoke an OAuth token and delete the connection.
 *
 * This will:
 * 1. Revoke the token on the provider's side (if supported)
 * 2. Delete the connection from our database
 *
 * Requires authentication and connection ownership.
 */
export async function revokeRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: RevokeParams }>(
        "/:provider/revoke/:connectionId",
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
                        error: "You don't have permission to revoke this connection"
                    });
                }

                // Get connection with data
                const connection = await connectionRepo.findByIdWithData(connectionId);
                if (!connection) {
                    return reply.status(404).send({
                        success: false,
                        error: "Connection not found"
                    });
                }

                // Verify provider matches
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

                fastify.log.info(`Revoking OAuth token for connection ${connectionId}`);

                // Revoke on provider side
                const tokenData = connection.data as OAuth2TokenData;
                try {
                    await oauthService.revokeToken(provider, tokenData.access_token);
                    fastify.log.info(`Successfully revoked token on ${provider}'s side`);
                } catch (error: unknown) {
                    // Log but don't fail - provider revocation is best effort
                    fastify.log.warn(
                        `Failed to revoke token on ${provider}'s side: ${error instanceof Error ? error.message : "Unknown error while revoking token"}`
                    );
                }

                // Delete from our database
                await connectionRepo.delete(connectionId);
                fastify.log.info(`Deleted connection ${connectionId} from database`);

                return reply.send({
                    success: true,
                    message: "Connection revoked successfully"
                });
            } catch (error: unknown) {
                fastify.log.error(error, `Failed to revoke connection ${connectionId}`);

                return reply.status(500).send({
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error while revoking connection"
                });
            }
        }
    );
}
