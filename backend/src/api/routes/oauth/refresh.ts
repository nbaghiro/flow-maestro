import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware";
import { CredentialRepository } from "../../../storage/repositories/CredentialRepository";
import { forceRefreshToken } from "../../../services/oauth/TokenRefreshService";

interface RefreshParams {
    provider: string;
    credentialId: string;
}

/**
 * POST /oauth/:provider/refresh/:credentialId
 *
 * Manually refresh an OAuth token.
 *
 * This is useful for:
 * - Testing token refresh
 * - Forcing a refresh before expiry
 * - Recovering from expired tokens
 *
 * Requires authentication and credential ownership.
 */
export async function refreshRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: RefreshParams }>(
        "/:provider/refresh/:credentialId",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { provider, credentialId } = request.params;
            const userId = request.user!.id;

            try {
                const credentialRepo = new CredentialRepository();

                // Verify ownership
                const ownerId = await credentialRepo.getOwnerId(credentialId);
                if (ownerId !== userId) {
                    return reply.status(403).send({
                        success: false,
                        error: "You don't have permission to refresh this credential"
                    });
                }

                // Verify provider matches
                const credential = await credentialRepo.findById(credentialId);
                if (!credential) {
                    return reply.status(404).send({
                        success: false,
                        error: "Credential not found"
                    });
                }

                if (credential.provider !== provider) {
                    return reply.status(400).send({
                        success: false,
                        error: `Credential is for ${credential.provider}, not ${provider}`
                    });
                }

                if (credential.type !== 'oauth2') {
                    return reply.status(400).send({
                        success: false,
                        error: "Credential is not an OAuth token"
                    });
                }

                // Force refresh the token
                await forceRefreshToken(credentialId);

                fastify.log.info(`Successfully refreshed token for credential ${credentialId}`);

                // Get updated credential
                const updatedCredential = await credentialRepo.findById(credentialId);

                return reply.send({
                    success: true,
                    message: "Token refreshed successfully",
                    data: updatedCredential
                });
            } catch (error: any) {
                fastify.log.error(`Failed to refresh token for credential ${credentialId}:`, error);

                return reply.status(400).send({
                    success: false,
                    error: error.message || "Failed to refresh token"
                });
            }
        }
    );
}
