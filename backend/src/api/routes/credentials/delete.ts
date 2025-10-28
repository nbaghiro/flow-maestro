import { FastifyInstance } from "fastify";
import { CredentialRepository } from "../../../storage/repositories";
import { credentialIdParamSchema } from "../../schemas/credential-schemas";
import { authMiddleware, validateParams } from "../../middleware";

export async function deleteCredentialRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(credentialIdParamSchema)]
        },
        async (request, reply) => {
            const credentialRepository = new CredentialRepository();
            const { id } = request.params as any;

            // Verify credential exists and user owns it
            const ownerId = await credentialRepository.getOwnerId(id);
            if (!ownerId) {
                return reply.status(404).send({
                    success: false,
                    error: "Credential not found"
                });
            }

            if (ownerId !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Access denied"
                });
            }

            const deleted = await credentialRepository.delete(id);

            return reply.send({
                success: true,
                data: { deleted }
            });
        }
    );
}
