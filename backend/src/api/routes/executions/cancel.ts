import { FastifyInstance } from "fastify";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { executionIdParamSchema } from "../../schemas/execution-schemas";
import { authMiddleware, validateParams, NotFoundError, BadRequestError } from "../../middleware";
import { getTemporalClient } from "../../../temporal/client";

export async function cancelExecutionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/cancel",
        {
            preHandler: [authMiddleware, validateParams(executionIdParamSchema)]
        },
        async (request, reply) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params as any;

            const execution = await executionRepository.findById(id);

            if (!execution) {
                throw new NotFoundError("Execution not found");
            }

            // Check if user owns the workflow
            const workflow = await workflowRepository.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== request.user!.id) {
                throw new NotFoundError("Execution not found");
            }

            // Check if execution can be cancelled
            if (execution.status !== "running" && execution.status !== "pending") {
                throw new BadRequestError(
                    `Cannot cancel execution with status: ${execution.status}`
                );
            }

            try {
                // Cancel the Temporal workflow
                const client = await getTemporalClient();
                const handle = client.workflow.getHandle(id);
                await handle.cancel();

                // Update execution status
                await executionRepository.update(id, {
                    status: "cancelled",
                    completed_at: new Date()
                });

                const updatedExecution = await executionRepository.findById(id);

                return reply.send({
                    success: true,
                    data: updatedExecution,
                    message: "Execution cancelled successfully"
                });
            } catch (error: any) {
                fastify.log.error({ error, executionId: id }, "Failed to cancel execution");
                throw new BadRequestError("Failed to cancel execution");
            }
        }
    );
}
