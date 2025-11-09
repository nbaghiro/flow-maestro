import { FastifyInstance } from "fastify";
import { createConnectionRoute } from "./create";
import { deleteConnectionRoute } from "./delete";
import { getConnectionRoute } from "./get";
import { listConnectionsRoute } from "./list";
import { mcpDiscoverRoute } from "./mcp-discover";
import { mcpProvidersRoute } from "./mcp-providers";
import { refreshToolsRoute } from "./refresh-tools";
import { testConnectionRoute } from "./test";
import { testBeforeSaveRoute } from "./test-before-save";
import { updateConnectionRoute } from "./update";

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
