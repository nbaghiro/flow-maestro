import { WorkflowRepository } from "../../../storage/repositories";
import { VersionsRepository } from "../../../storage/repositories/VersionsRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";
import type { FastifyInstance } from "fastify";

export async function revertVersionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/revert/:id",
        {
            preHandler: [authMiddleware, validateParams(workflowIdParamSchema)]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };

            const versionRepo = new VersionsRepository();
            const workflowRepo = new WorkflowRepository();

            const version = await versionRepo.get(id, request.user!.id);

            const updatedWorkflow = await workflowRepo.updateSnapshot(
                version.workflow_id,
                version.snapshot
            );

            return reply.send({
                success: true,
                data: updatedWorkflow
            });
        }
    );
}
