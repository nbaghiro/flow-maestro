import { FastifyInstance } from "fastify";
import { IntegrationRepository } from "../../../storage/repositories";
import { integrationIdParamSchema } from "../../schemas/integration-schemas";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";

export async function deleteIntegrationRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(integrationIdParamSchema)]
        },
        async (request, reply) => {
            const integrationRepository = new IntegrationRepository();
            const { id } = request.params as any;

            // Check if integration exists and user owns it
            const integration = await integrationRepository.findById(id);
            if (!integration) {
                throw new NotFoundError("Integration not found");
            }

            if (integration.user_id !== request.user!.id) {
                throw new NotFoundError("Integration not found");
            }

            await integrationRepository.delete(id);

            return reply.send({
                success: true,
                message: "Integration deleted successfully"
            });
        }
    );
}
