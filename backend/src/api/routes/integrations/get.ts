import { FastifyInstance } from "fastify";
import { IntegrationRepository } from "../../../storage/repositories";
import { integrationIdParamSchema } from "../../schemas/integration-schemas";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";

export async function getIntegrationRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(integrationIdParamSchema)]
        },
        async (request, reply) => {
            const integrationRepository = new IntegrationRepository();
            const { id } = request.params as any;

            const integration = await integrationRepository.findById(id);

            if (!integration) {
                throw new NotFoundError("Integration not found");
            }

            // Check if user owns this integration
            if (integration.user_id !== request.user!.id) {
                throw new NotFoundError("Integration not found");
            }

            return reply.send({
                success: true,
                data: integration
            });
        }
    );
}
