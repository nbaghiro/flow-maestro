import { FastifyInstance } from "fastify";
import { listExecutionsRoute } from "./list";
import { getExecutionRoute } from "./get";
import { cancelExecutionRoute } from "./cancel";
import { getExecutionLogsRoute } from "./getLogs";

export async function executionRoutes(fastify: FastifyInstance) {
    // Register all execution routes
    await listExecutionsRoute(fastify);
    await getExecutionRoute(fastify);
    await cancelExecutionRoute(fastify);
    await getExecutionLogsRoute(fastify);
}
