import { FastifyInstance } from "fastify";
import { createConnectionRoute } from "./create";
import { listConnectionsRoute } from "./list";
import { getConnectionRoute } from "./get";
import { updateConnectionRoute } from "./update";
import { deleteConnectionRoute } from "./delete";
import { testConnectionRoute } from "./test";
import { testBeforeSaveRoute } from "./test-before-save";
import { mcpDiscoverRoute } from "./mcp-discover";
import { mcpProvidersRoute } from "./mcp-providers";
import { refreshToolsRoute } from "./refresh-tools";

export async function connectionRoutes(fastify: FastifyInstance) {
    // Standard CRUD routes
    await createConnectionRoute(fastify);
    await listConnectionsRoute(fastify);
    await getConnectionRoute(fastify);
    await updateConnectionRoute(fastify);
    await deleteConnectionRoute(fastify);

    // Testing routes
    await testConnectionRoute(fastify);
    await testBeforeSaveRoute(fastify);

    // MCP-specific routes
    await mcpProvidersRoute(fastify);
    await mcpDiscoverRoute(fastify);
    await refreshToolsRoute(fastify);
}
