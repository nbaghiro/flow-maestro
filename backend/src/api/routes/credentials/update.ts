import { FastifyInstance } from "fastify";
import { CredentialRepository } from "../../../storage/repositories";
import {
    updateCredentialSchema,
    credentialIdParamSchema,
    UpdateCredentialRequest
} from "../../schemas/credential-schemas";
import { authMiddleware, validateBody, validateParams } from "../../middleware";

export async function updateCredentialRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                validateParams(credentialIdParamSchema),
                validateBody(updateCredentialSchema)
            ]
        },
        async (request, reply) => {
            const credentialRepository = new CredentialRepository();
            const { id } = request.params as any;
            const body = request.body as UpdateCredentialRequest;

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

            const updated = await credentialRepository.update(id, body);

            return reply.send({
                success: true,
                data: updated
            });
        }
    );
}
