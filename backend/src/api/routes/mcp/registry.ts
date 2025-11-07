import { FastifyRequest, FastifyReply } from "fastify";
import { mcpRegistryClient } from "../../../services/mcp/MCPRegistryClient";

/**
 * Get all MCP servers from the registry
 */
export async function getMCPRegistryServersHandler(
    _request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        const servers = await mcpRegistryClient.getAllServers();

        reply.code(200).send({
            success: true,
            data: {
                servers,
                total: servers.length
            }
        });
    } catch (error) {
        reply.code(500).send({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch MCP registry servers"
        });
    }
}

/**
 * Search MCP servers in the registry
 */
interface SearchQuery {
    q?: string;
}

export async function searchMCPRegistryHandler(
    request: FastifyRequest<{
        Querystring: SearchQuery;
    }>,
    reply: FastifyReply
): Promise<void> {
    const { q: query } = request.query;

    if (!query) {
        reply.code(400).send({
            success: false,
            error: "Search query is required"
        });
        return;
    }

    try {
        const servers = await mcpRegistryClient.searchServers(query);

        reply.code(200).send({
            success: true,
            data: {
                servers,
                total: servers.length,
                query
            }
        });
    } catch (error) {
        reply.code(500).send({
            success: false,
            error: error instanceof Error ? error.message : "Failed to search MCP registry"
        });
    }
}

/**
 * Get a specific MCP server by ID
 */
interface ServerIdParams {
    serverId: string;
}

export async function getMCPServerByIdHandler(
    request: FastifyRequest<{
        Params: ServerIdParams;
    }>,
    reply: FastifyReply
): Promise<void> {
    const { serverId } = request.params;

    try {
        const server = await mcpRegistryClient.getServerById(serverId);

        if (!server) {
            reply.code(404).send({
                success: false,
                error: "MCP server not found"
            });
            return;
        }

        reply.code(200).send({
            success: true,
            data: server
        });
    } catch (error) {
        reply.code(500).send({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch MCP server details"
        });
    }
}
