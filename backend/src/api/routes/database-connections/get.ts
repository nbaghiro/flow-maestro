import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DatabaseConnectionRepository } from "../../../storage/repositories/DatabaseConnectionRepository";
import { authMiddleware } from "../../middleware";
import { AppError } from "../../middleware/error-handler";

interface GetDatabaseConnectionParams {
    id: string;
}

export async function getDatabaseConnectionRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Params: GetDatabaseConnectionParams }>(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (
            request: FastifyRequest<{ Params: GetDatabaseConnectionParams }>,
            reply: FastifyReply
        ) => {
            const { id } = request.params;
            const userId = request.user!.id;

            const repository = new DatabaseConnectionRepository();
            const connection = await repository.findById(id, userId);

            if (!connection) {
                throw new AppError(404, "Database connection not found");
            }

            return reply.send({
                success: true,
                data: connection
            });
        }
    );
}
