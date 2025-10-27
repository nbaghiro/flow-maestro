import { FastifyInstance } from "fastify";
import { IntegrationRepository } from "../../../storage/repositories";
import { createIntegrationSchema, CreateIntegrationRequest } from "../../schemas/integration-schemas";
import { authMiddleware, validateBody } from "../../middleware";

export async function createIntegrationRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware, validateBody(createIntegrationSchema)]
        },
        async (request, reply) => {
            const integrationRepository = new IntegrationRepository();
            const body = request.body as CreateIntegrationRequest;

            const integration = await integrationRepository.create({
                ...body,
                user_id: request.user!.id
            });

            return reply.status(201).send({
                success: true,
                data: integration
            });
        }
    );
}
