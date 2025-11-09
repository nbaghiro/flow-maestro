import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware, validateParams, validateBody } from "../../middleware";
import {
    connectionIdParamSchema,
    ConnectionIdParam,
    updateConnectionSchema,
    UpdateConnectionRequest
} from "../../schemas/connection-schemas";

export async function updateConnectionRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                validateParams(connectionIdParamSchema),
                validateBody(updateConnectionSchema)
            ]
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const params = request.params as ConnectionIdParam;
            const body = request.body as UpdateConnectionRequest;

            // Verify ownership
            const ownerId = await connectionRepository.getOwnerId(params.id);
            if (ownerId !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "You do not have permission to update this connection"
                });
            }

            const connection = await connectionRepository.update(params.id, body);

            if (!connection) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            return reply.send({
                success: true,
                data: connection
            });
        }
    );
}
