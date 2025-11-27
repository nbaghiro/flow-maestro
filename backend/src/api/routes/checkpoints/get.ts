import { CheckpointsRepository } from "../../../storage/repositories/CheckpointsRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { checkpointIdParamSchema } from "../../schemas/checkpoint-schemas";
import type { FastifyInstance } from "fastify";

export async function getCheckpointRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(checkpointIdParamSchema)]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };

            const repo = new CheckpointsRepository();
            const checkpoint = await repo.get(id, request.user!.id);

            return reply.send({
                success: true,
                data: checkpoint
            });
        }
    );
}
