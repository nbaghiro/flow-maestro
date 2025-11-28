import { FastifyInstance } from "fastify";
import { getCategoriesRoute } from "./categories";
import { copyTemplateRoute } from "./copy";
import { getTemplateRoute } from "./get";
import { listTemplatesRoute } from "./list";

export async function templateRoutes(fastify: FastifyInstance) {
    // Register all template routes
    await listTemplatesRoute(fastify);
    await getCategoriesRoute(fastify);
    await getTemplateRoute(fastify);
    await copyTemplateRoute(fastify);
}
