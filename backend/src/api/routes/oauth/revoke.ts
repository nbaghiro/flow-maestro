import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware";
import { CredentialRepository } from "../../../storage/repositories/CredentialRepository";
import { oauthService } from "../../../services/oauth/OAuthService";
import { OAuth2TokenData } from "../../../storage/models/Credential";

interface RevokeParams {
    provider: string;
    credentialId: string;
}

/**
 * POST /oauth/:provider/revoke/:credentialId
 *
 * Revoke an OAuth token and delete the credential.
 *
 * This will:
 * 1. Revoke the token on the provider's side (if supported)
 * 2. Delete the credential from our database
 *
 * Requires authentication and credential ownership.
 */
export async function revokeRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: RevokeParams }>(
        "/:provider/revoke/:credentialId",
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
                        error: "You don't have permission to revoke this credential"
                    });
                }

                // Get credential with data
                const credential = await credentialRepo.findByIdWithData(credentialId);
                if (!credential) {
                    return reply.status(404).send({
                        success: false,
                        error: "Credential not found"
                    });
                }

                // Verify provider matches
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

                fastify.log.info(`Revoking OAuth token for credential ${credentialId}`);

                // Revoke on provider side
                const tokenData = credential.data as OAuth2TokenData;
                try {
                    await oauthService.revokeToken(provider, tokenData.access_token);
                    fastify.log.info(`Successfully revoked token on ${provider}'s side`);
                } catch (error: any) {
                    // Log but don't fail - provider revocation is best effort
                    fastify.log.warn(`Failed to revoke token on ${provider}'s side: ${error?.message || error}`);
                }

                // Delete from our database
                await credentialRepo.delete(credentialId);
                fastify.log.info(`Deleted credential ${credentialId} from database`);

                return reply.send({
                    success: true,
                    message: "Credential revoked successfully"
                });
            } catch (error: any) {
                fastify.log.error(`Failed to revoke credential ${credentialId}:`, error);

                return reply.status(500).send({
                    success: false,
                    error: error.message || "Failed to revoke credential"
                });
            }
        }
    );
}
