import { FastifyInstance } from "fastify";
import {
    getMCPRegistryServersHandler,
    searchMCPRegistryHandler,
    getMCPServerByIdHandler
} from "./registry";

export async function mcpRoutes(fastify: FastifyInstance) {
    // MCP Registry routes (no auth required - public registry)
    fastify.get("/registry/servers", getMCPRegistryServersHandler);
    fastify.get("/registry/search", searchMCPRegistryHandler);
    fastify.get("/registry/servers/:serverId", getMCPServerByIdHandler);
}
