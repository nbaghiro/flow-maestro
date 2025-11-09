import { FastifyInstance } from "fastify";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";
import { executionIdParamSchema } from "../../schemas/execution-schemas";

interface GetExecutionParams {
    id: string;
}

export async function getExecutionRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: GetExecutionParams }>(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(executionIdParamSchema)]
        },
        async (request, reply) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params;

            const execution = await executionRepository.findById(id);

            if (!execution) {
                throw new NotFoundError("Execution not found");
            }

            // Check if user owns the workflow
            const workflow = await workflowRepository.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== request.user!.id) {
                throw new NotFoundError("Execution not found");
            }

            return reply.send({
                success: true,
                data: execution
            });
        }
    );
}
