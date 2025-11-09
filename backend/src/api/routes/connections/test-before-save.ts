import { FastifyInstance } from "fastify";
import { getConnectionTestService } from "../../../services/ConnectionTestService";
import { authMiddleware, validateBody } from "../../middleware";
import { createConnectionSchema, CreateConnectionRequest } from "../../schemas/connection-schemas";

/**
 * Test connection before saving
 * Allows users to verify their connection details work before creating the connection
 */
export async function testBeforeSaveRoute(fastify: FastifyInstance) {
    fastify.post(
        "/test",
        {
            preHandler: [authMiddleware, validateBody(createConnectionSchema)]
        },
        async (request, reply) => {
            const connectionTestService = getConnectionTestService();
            const body = request.body as CreateConnectionRequest;

            // Create a temporary connection object for testing
            const tempConnection = {
                id: "temp-test-id",
                user_id: request.user!.id,
                name: body.name,
                connection_method: body.connection_method,
                provider: body.provider,
                data: body.data,
                metadata: body.metadata || {},
                status: body.status || "active",
                mcp_server_url: body.mcp_server_url || null,
                mcp_tools: body.mcp_tools || null,
                capabilities: body.capabilities || {},
                last_tested_at: null,
                last_used_at: null,
                created_at: new Date(),
                updated_at: new Date()
            };

            try {
                const testResult = await connectionTestService.testConnection(tempConnection);

                return reply.send({
                    success: true,
                    data: {
                        test_result: testResult,
                        connection_valid: testResult.success
                    }
                });
            } catch (error) {
                return reply.status(400).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Connection test failed",
                    details:
                        error instanceof Error
                            ? {
                                  message: error.message,
                                  provider: body.provider,
                                  connection_method: body.connection_method
                              }
                            : undefined
                });
            }
        }
    );
}
