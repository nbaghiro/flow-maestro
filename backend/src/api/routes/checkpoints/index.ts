import { FastifyInstance } from "fastify";
import { createCheckpointRoute } from "./create";
import { deleteCheckpointRoute } from "./delete";
import { getCheckpointRoute } from "./get";
import { listCheckpointRoute } from "./list";
import { renameCheckpointRoute } from "./rename";
import { restoreCheckpointRoute } from "./revert";

export async function checkpointRoutes(fastify: FastifyInstance) {
    await createCheckpointRoute(fastify);
    await getCheckpointRoute(fastify);
    await listCheckpointRoute(fastify);
    await deleteCheckpointRoute(fastify);
    await restoreCheckpointRoute(fastify);
    await renameCheckpointRoute(fastify);
}
