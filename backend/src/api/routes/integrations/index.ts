import { FastifyInstance } from "fastify";
import { listIntegrationsRoute } from "./list";
import { getIntegrationRoute } from "./get";
import { createIntegrationRoute } from "./create";
import { updateIntegrationRoute } from "./update";
import { deleteIntegrationRoute } from "./delete";

export async function integrationRoutes(fastify: FastifyInstance) {
    // Register all integration routes
    await listIntegrationsRoute(fastify);
    await getIntegrationRoute(fastify);
    await createIntegrationRoute(fastify);
    await updateIntegrationRoute(fastify);
    await deleteIntegrationRoute(fastify);
}
