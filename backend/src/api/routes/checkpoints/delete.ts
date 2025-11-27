import { CheckpointsRepository } from "../../../storage/repositories/CheckpointsRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { checkpointIdParamSchema } from "../../schemas/checkpoint-schemas";
import type { FastifyInstance } from "fastify";

export async function deleteCheckpointRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(checkpointIdParamSchema)]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };

            const repo = new CheckpointsRepository();
            await repo.delete(id, request.user!.id);

            return reply.status(204).send();
        }
    );
}
