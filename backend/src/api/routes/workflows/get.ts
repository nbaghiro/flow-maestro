import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";

export async function getWorkflowRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(workflowIdParamSchema)]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params as { id: string };

            const workflow = await workflowRepository.findById(id);

            if (!workflow) {
                throw new NotFoundError("Workflow not found");
            }

            // Check if user owns this workflow
            if (workflow.user_id !== request.user!.id) {
                throw new NotFoundError("Workflow not found");
            }

            return reply.send({
                success: true,
                data: workflow
            });
        }
    );
}
