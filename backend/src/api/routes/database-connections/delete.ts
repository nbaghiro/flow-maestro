import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DatabaseConnectionRepository } from "../../../storage/repositories/DatabaseConnectionRepository";
import { authMiddleware } from "../../middleware";
import { AppError } from "../../middleware/error-handler";

interface DeleteDatabaseConnectionParams {
    id: string;
}

export async function deleteDatabaseConnectionRoute(fastify: FastifyInstance): Promise<void> {
    fastify.delete<{ Params: DeleteDatabaseConnectionParams }>(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (
            request: FastifyRequest<{ Params: DeleteDatabaseConnectionParams }>,
            reply: FastifyReply
        ) => {
            const { id } = request.params;
            const userId = request.user!.id;

            const repository = new DatabaseConnectionRepository();
            const deleted = await repository.delete(id, userId);

            if (!deleted) {
                throw new AppError(404, "Database connection not found or cannot be deleted");
            }

            return reply.send({
                success: true,
                message: "Database connection deleted successfully"
            });
        }
    );
}
