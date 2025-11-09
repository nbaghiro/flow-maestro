import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware, validateQuery } from "../../middleware";
import { listConnectionsQuerySchema, ListConnectionsQuery } from "../../schemas/connection-schemas";

export async function listConnectionsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware, validateQuery(listConnectionsQuerySchema)]
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const query = request.query as ListConnectionsQuery;

            const result = await connectionRepository.findByUserId(request.user!.id, {
                limit: query.limit,
                offset: query.offset,
                provider: query.provider,
                connection_method: query.connection_method,
                status: query.status
            });

            return reply.send({
                success: true,
                data: result.connections,
                pagination: {
                    total: result.total,
                    limit: query.limit || 50,
                    offset: query.offset || 0
                }
            });
        }
    );
}
