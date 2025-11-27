import { VersionsRepository } from "../../../storage/repositories/VersionsRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { versionIdParamSchema } from "../../schemas/versions.schemas";
import type { FastifyInstance } from "fastify";

export async function revertVersionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/revert/:id",
        {
            preHandler: [authMiddleware, validateParams(versionIdParamSchema)]
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
