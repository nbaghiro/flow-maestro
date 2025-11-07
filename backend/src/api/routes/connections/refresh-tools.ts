import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { connectionIdParamSchema, ConnectionIdParam } from "../../schemas/connection-schemas";
import { authMiddleware, validateParams } from "../../middleware";
import { getMCPService } from "../../../services/mcp/MCPService";

/**
 * Refresh MCP tools for an existing connection
 * Re-discovers tools from the MCP server and updates the connection
 */
export async function refreshToolsRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/refresh-tools",
        {
            preHandler: [authMiddleware, validateParams(connectionIdParamSchema)]
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const mcpService = getMCPService();
            const params = request.params as ConnectionIdParam;

            // Verify ownership
            const ownerId = await connectionRepository.getOwnerId(params.id);
            if (ownerId !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "You do not have permission to refresh this connection"
                });
            }

            // Get connection with decrypted data
            const connection = await connectionRepository.findByIdWithData(params.id);

            if (!connection) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            // Verify this is an MCP connection
            if (connection.connection_method !== "mcp") {
                return reply.status(400).send({
                    success: false,
                    error: "This connection is not an MCP connection. Only MCP connections can refresh tools."
                });
            }

            try {
                // Refresh tools from the MCP server
                const tools = await mcpService.refreshTools(connection);

                // Update the connection with new tools
                await connectionRepository.updateMCPTools(params.id, tools);

                return reply.send({
                    success: true,
                    data: {
                        connection_id: params.id,
                        tools,
                        tool_count: tools.length
                    },
                    message: "Tools refreshed successfully"
                });
            } catch (error) {
                return reply.status(400).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to refresh tools"
                });
            }
        }
    );
}
