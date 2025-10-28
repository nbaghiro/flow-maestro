import { FastifyInstance } from "fastify";
import { CredentialRepository } from "../../../storage/repositories";
import { credentialIdParamSchema } from "../../schemas/credential-schemas";
import { authMiddleware, validateParams } from "../../middleware";
import { testCredential } from "../../../services/CredentialTestService";

export async function testCredentialRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/test",
        {
            preHandler: [authMiddleware, validateParams(credentialIdParamSchema)]
        },
        async (request, reply) => {
            const credentialRepository = new CredentialRepository();
            const { id } = request.params as any;

            // Get credential with decrypted data
            const credential = await credentialRepository.findByIdWithData(id);

            if (!credential) {
                return reply.status(404).send({
                    success: false,
                    error: "Credential not found"
                });
            }

            // Verify ownership
            if (credential.user_id !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Access denied"
                });
            }

            try {
                // Test the credential
                const testResult = await testCredential(credential);

                // Update test status in database
                await credentialRepository.markAsTested(
                    id,
                    testResult.success ? 'active' : 'invalid'
                );

                return reply.send({
                    success: true,
                    data: {
                        valid: testResult.success,
                        message: testResult.message,
                        details: testResult.details
                    }
                });
            } catch (error) {
                // Mark as invalid
                await credentialRepository.markAsTested(id, 'invalid');

                return reply.send({
                    success: false,
                    data: {
                        valid: false,
                        message: error instanceof Error ? error.message : 'Test failed',
                        details: null
                    }
                });
            }
        }
    );
}
