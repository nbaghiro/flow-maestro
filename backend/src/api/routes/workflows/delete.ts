import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";

export async function deleteWorkflowRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(workflowIdParamSchema)]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params as any;

            // Check if workflow exists and user owns it
            const existingWorkflow = await workflowRepository.findById(id);
            if (!existingWorkflow) {
                throw new NotFoundError("Workflow not found");
            }

            if (existingWorkflow.user_id !== request.user!.id) {
                throw new NotFoundError("Workflow not found");
            }

            // Soft delete
            await workflowRepository.delete(id);

            return reply.status(204).send();
        }
    );
}
