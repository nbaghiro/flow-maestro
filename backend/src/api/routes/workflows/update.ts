import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import { updateWorkflowSchema, workflowIdParamSchema } from "../../schemas/workflow-schemas";
import { authMiddleware, validateRequest, validateParams, NotFoundError } from "../../middleware";

export async function updateWorkflowRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                validateParams(workflowIdParamSchema),
                validateRequest(updateWorkflowSchema)
            ]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params as any;
            const body = request.body as any;

            // Check if workflow exists and user owns it
            const existingWorkflow = await workflowRepository.findById(id);
            if (!existingWorkflow) {
                throw new NotFoundError("Workflow not found");
            }

            if (existingWorkflow.user_id !== request.user!.id) {
                throw new NotFoundError("Workflow not found");
            }

            // Update workflow
            const workflow = await workflowRepository.update(id, {
                name: body.name,
                description: body.description,
                definition: body.definition
            });

            return reply.send({
                success: true,
                data: workflow
            });
        }
    );
}
