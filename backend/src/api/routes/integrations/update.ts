import { FastifyInstance } from "fastify";
import { IntegrationRepository } from "../../../storage/repositories";
import {
    integrationIdParamSchema,
    updateIntegrationSchema,
    UpdateIntegrationRequest
} from "../../schemas/integration-schemas";
import { authMiddleware, validateParams, validateBody, NotFoundError } from "../../middleware";

export async function updateIntegrationRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                validateParams(integrationIdParamSchema),
                validateBody(updateIntegrationSchema)
            ]
        },
        async (request, reply) => {
            const integrationRepository = new IntegrationRepository();
            const { id } = request.params as any;
            const body = request.body as UpdateIntegrationRequest;

            // Check if integration exists and user owns it
            const existingIntegration = await integrationRepository.findById(id);
            if (!existingIntegration) {
                throw new NotFoundError("Integration not found");
            }

            if (existingIntegration.user_id !== request.user!.id) {
                throw new NotFoundError("Integration not found");
            }

            const integration = await integrationRepository.update(id, body);

            return reply.send({
                success: true,
                data: integration
            });
        }
    );
}
