import { FastifyInstance } from "fastify";
import { mcpDiscoverySchema, MCPDiscoveryRequest } from "../../schemas/connection-schemas";
import { authMiddleware, validateBody } from "../../middleware";
import { getMCPService } from "../../../services/mcp/MCPService";
import type { MCPConnectionData } from "../../../storage/models/Connection";

/**
 * Discover MCP tools from a server before saving the connection
 * Allows users to see what tools are available before creating the connection
 */
export async function mcpDiscoverRoute(fastify: FastifyInstance) {
    fastify.post(
        "/mcp/discover",
        {
            preHandler: [authMiddleware, validateBody(mcpDiscoverySchema)],
        },
        async (request, reply) => {
            const mcpService = getMCPService();
            const body = request.body as MCPDiscoveryRequest;

            // Build MCP auth data
            const auth: MCPConnectionData = {
                server_url: body.server_url,
                auth_type: body.auth_type,
                api_key: body.api_key,
                bearer_token: body.bearer_token,
                username: body.username,
                password: body.password,
                custom_headers: body.custom_headers,
                timeout: body.timeout,
            };

            try {
                // Test connection first
                const serverInfo = await mcpService.testConnection(body.server_url, auth);

                // Discover tools
                const toolsResponse = await mcpService.discoverTools(body.server_url, auth);

                return reply.send({
                    success: true,
                    data: {
                        server_info: serverInfo,
                        tools: toolsResponse.tools,
                        tool_count: toolsResponse.tools.length,
                    },
                });
            } catch (error) {
                return reply.status(400).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to discover MCP tools",
                    details:
                        error instanceof Error
                            ? {
                                  message: error.message,
                                  server_url: body.server_url,
                              }
                            : undefined,
                });
            }
        }
    );
}
