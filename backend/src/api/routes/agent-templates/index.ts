import { FastifyInstance } from "fastify";
import { getAgentCategoriesRoute } from "./categories";
import { copyAgentTemplateRoute } from "./copy";
import { getAgentTemplateRoute } from "./get";
import { listAgentTemplatesRoute } from "./list";

export async function agentTemplateRoutes(fastify: FastifyInstance) {
    // Register all agent template routes
    await listAgentTemplatesRoute(fastify);
    await getAgentCategoriesRoute(fastify);
    await getAgentTemplateRoute(fastify);
    await copyAgentTemplateRoute(fastify);
}
