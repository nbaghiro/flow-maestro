import { CheckpointsRepository } from "../../../storage/repositories/CheckpointsRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { checkpointIdParamSchema } from "../../schemas/checkpoint-schemas";
import type { FastifyInstance } from "fastify";

export async function restoreCheckpointRoute(fastify: FastifyInstance) {
    fastify.post(
        "/restore/:id",
        {
            preHandler: [authMiddleware, validateParams(checkpointIdParamSchema)]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };

            const checkpointRepo = new CheckpointsRepository();
            const workflowRepo = new WorkflowRepository();

            const checkpoint = await checkpointRepo.get(id, request.user!.id);

            const updatedWorkflow = await workflowRepo.updateSnapshot(
                checkpoint.workflow_id,
                checkpoint.snapshot
            );

            return reply.send({
                success: true,
                data: updatedWorkflow
            });
        }
    );
}
