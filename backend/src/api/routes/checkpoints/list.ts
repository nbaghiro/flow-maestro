import { CheckpointsRepository } from "../../../storage/repositories/CheckpointsRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { checkpointWorkflowIdParamSchema } from "../../schemas/checkpoint-schemas";
import type { FastifyInstance } from "fastify";

export async function listCheckpointRoute(fastify: FastifyInstance) {
    fastify.get(
        "/workflow/:workflowId",
        {
            preHandler: [authMiddleware, validateParams(checkpointWorkflowIdParamSchema)]
        },
        async (request, reply) => {
            const { workflowId } = request.params as { workflowId: string };

            const repo = new CheckpointsRepository();
            const checkpoints = await repo.list(workflowId, request.user!.id);

            return reply.send({
                success: true,
                data: checkpoints
            });
        }
    );
}
