import { FastifyInstance } from "fastify";
import { IntegrationRepository } from "../../../storage/repositories";
import { listIntegrationsQuerySchema } from "../../schemas/integration-schemas";
import { authMiddleware, validateQuery } from "../../middleware";

export async function listIntegrationsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware, validateQuery(listIntegrationsQuerySchema)]
        },
        async (request, reply) => {
            const integrationRepository = new IntegrationRepository();
            const query = request.query as any;

            const { integrations, total } = await integrationRepository.findByUserId(
                request.user!.id,
                {
                    type: query.type,
                    limit: query.limit || 50,
                    offset: query.offset || 0
                }
            );

            const limit = query.limit || 50;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const pageSize = limit;
            const hasMore = offset + integrations.length < total;

            return reply.send({
                success: true,
                data: {
                    items: integrations,
                    total,
                    page,
                    pageSize,
                    hasMore
                }
            });
        }
    );
}
