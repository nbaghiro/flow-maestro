import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { connectionIdParamSchema, ConnectionIdParam } from "../../schemas/connection-schemas";
import { authMiddleware, validateParams } from "../../middleware";

export async function deleteConnectionRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(connectionIdParamSchema)]
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const params = request.params as ConnectionIdParam;

            // Verify ownership
            const ownerId = await connectionRepository.getOwnerId(params.id);
            if (ownerId !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "You do not have permission to delete this connection"
                });
            }

            const deleted = await connectionRepository.delete(params.id);

            if (!deleted) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            return reply.send({
                success: true,
                message: "Connection deleted successfully"
            });
        }
    );
}
