import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { DatabaseConnectionRepository } from "../../../storage/repositories/DatabaseConnectionRepository";
import { authMiddleware } from "../../middleware";

const listDatabaseConnectionsQuerySchema = z.object({
    provider: z.enum(["postgresql", "mysql", "mongodb"]).optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
    offset: z.coerce.number().int().nonnegative().default(0)
});

type ListDatabaseConnectionsQuery = z.infer<typeof listDatabaseConnectionsQuerySchema>;

export async function listDatabaseConnectionsRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Querystring: ListDatabaseConnectionsQuery }>(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (
            request: FastifyRequest<{ Querystring: ListDatabaseConnectionsQuery }>,
            reply: FastifyReply
        ) => {
            const query = listDatabaseConnectionsQuerySchema.parse(request.query);
            const userId = request.user!.id;

            const repository = new DatabaseConnectionRepository();
            const result = await repository.findByUserId(userId, {
                provider: query.provider,
                limit: query.limit,
                offset: query.offset
            });

            return reply.send({
                success: true,
                data: result.connections,
                pagination: {
                    total: result.total,
                    limit: query.limit,
                    offset: query.offset
                }
            });
        }
    );
}
