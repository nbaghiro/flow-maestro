import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { connectionIdParamSchema, ConnectionIdParam } from "../../schemas/connection-schemas";
import { authMiddleware, validateParams } from "../../middleware";

export async function getConnectionRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(connectionIdParamSchema)],
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const params = request.params as ConnectionIdParam;

            const connection = await connectionRepository.findById(params.id);

            if (!connection) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found",
                });
            }

            // Verify ownership
            const ownerId = await connectionRepository.getOwnerId(params.id);
            if (ownerId !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "You do not have permission to access this connection",
                });
            }

            return reply.send({
                success: true,
                data: connection,
            });
        }
    );
}
