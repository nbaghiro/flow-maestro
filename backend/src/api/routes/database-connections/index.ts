import { FastifyInstance } from "fastify";
import { createDatabaseConnectionRoute } from "./create";
import { deleteDatabaseConnectionRoute } from "./delete";
import { getDatabaseConnectionRoute } from "./get";
import { listDatabaseConnectionsRoute } from "./list";
import { listTablesRoute } from "./list-tables";
import { updateDatabaseConnectionRoute } from "./update";

export async function databaseConnectionRoutes(fastify: FastifyInstance): Promise<void> {
    // CRUD routes
    await createDatabaseConnectionRoute(fastify);
    await listDatabaseConnectionsRoute(fastify);
    await getDatabaseConnectionRoute(fastify);
    await updateDatabaseConnectionRoute(fastify);
    await deleteDatabaseConnectionRoute(fastify);

    // Utility routes
    await listTablesRoute(fastify);
}
