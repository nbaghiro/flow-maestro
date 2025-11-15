import { authMiddleware } from "../../middleware/auth";
import { getOperationsHandler } from "./operations";
import { getProvidersHandler } from "./providers";
import type { FastifyInstance } from "fastify";

/**
 * Integration routes - provider and operation discovery
 */
export async function integrationRoutes(fastify: FastifyInstance) {
    // Get all providers
    fastify.get("/providers", { preHandler: [authMiddleware] }, getProvidersHandler);

    // Get operations for a provider
    fastify.get<{ Params: { provider: string } }>(
        "/providers/:provider/operations",
        { preHandler: [authMiddleware] },
        getOperationsHandler
    );
}
