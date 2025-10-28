import { FastifyInstance } from "fastify";
import { CredentialRepository } from "../../../storage/repositories";
import { createCredentialSchema, CreateCredentialRequest } from "../../schemas/credential-schemas";
import { authMiddleware, validateBody } from "../../middleware";

export async function createCredentialRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware, validateBody(createCredentialSchema)]
        },
        async (request, reply) => {
            const credentialRepository = new CredentialRepository();
            const body = request.body as CreateCredentialRequest;

            const credential = await credentialRepository.create({
                ...body,
                user_id: request.user!.id
            });

            return reply.status(201).send({
                success: true,
                data: credential
            });
        }
    );
}
