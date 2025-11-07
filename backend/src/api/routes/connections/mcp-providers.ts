import { FastifyInstance } from "fastify";
import { listMCPProviders } from "../../../services/mcp/MCPProviderRegistry";

/**
 * List available MCP providers
 * Returns the registry of known MCP servers that users can connect to
 */
export async function mcpProvidersRoute(fastify: FastifyInstance) {
    fastify.get("/mcp/providers", async (_request, reply) => {
        const providers = listMCPProviders();

        return reply.send({
            success: true,
            data: providers
        });
    });
}
