import { FastifyInstance } from "fastify";
import { createVersionRoute } from "./create";
import { deleteVersionRoute } from "./delete";
import { getVersionRoute } from "./get";
import { listVersionRoute } from "./list";
import { revertVersionRoute } from "./revert";

export async function versionRoutes(fastify: FastifyInstance) {
    // Register all version routes
    await createVersionRoute(fastify);
    await getVersionRoute(fastify);
    await listVersionRoute(fastify);
    await deleteVersionRoute(fastify);
    await revertVersionRoute(fastify);
}
