import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { connectionIdParamSchema, ConnectionIdParam } from "../../schemas/connection-schemas";
import { authMiddleware, validateParams } from "../../middleware";
import { getConnectionTestService } from "../../../services/ConnectionTestService";

export async function testConnectionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/test",
        {
            preHandler: [authMiddleware, validateParams(connectionIdParamSchema)],
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const connectionTestService = getConnectionTestService();
            const params = request.params as ConnectionIdParam;

            // Verify ownership
            const ownerId = await connectionRepository.getOwnerId(params.id);
            if (ownerId !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "You do not have permission to test this connection",
                });
            }

            // Get connection with decrypted data
            const connection = await connectionRepository.findByIdWithData(params.id);

            if (!connection) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found",
                });
            }

            try {
                // Test the connection
                const testResult = await connectionTestService.testConnection(connection);

                // Update last tested timestamp and status
                await connectionRepository.markAsTested(
                    params.id,
                    testResult.success ? "active" : "invalid"
                );

                return reply.send({
                    success: true,
                    data: {
                        connection_id: params.id,
                        test_result: testResult,
                    },
                });
            } catch (error) {
                // Mark as invalid if test failed
                await connectionRepository.markAsTested(params.id, "invalid");

                return reply.status(400).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Connection test failed",
                });
            }
        }
    );
}
