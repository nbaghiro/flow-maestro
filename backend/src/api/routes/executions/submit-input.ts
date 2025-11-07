import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { executionIdParamSchema } from "../../schemas/execution-schemas";
import {
    authMiddleware,
    validateParams,
    validateBody,
    NotFoundError,
    BadRequestError
} from "../../middleware";
import { getTemporalClient } from "../../../temporal/client";
import { userInputSignal } from "../../../temporal/workflows/user-input-workflow";

const submitInputBodySchema = z.object({
    userResponse: z.string().min(1, "User response cannot be empty"),
    nodeId: z.string().optional()
});

export async function submitInputRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/submit-input",
        {
            preHandler: [
                authMiddleware,
                validateParams(executionIdParamSchema),
                validateBody(submitInputBodySchema)
            ]
        },
        async (request, reply) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id } = (request.params as { id: string });
            const { userResponse, nodeId } = request.body as z.infer<typeof submitInputBodySchema>;

            const execution = await executionRepository.findById(id);

            if (!execution) {
                throw new NotFoundError("Execution not found");
            }

            // Check if user owns the workflow
            const workflow = await workflowRepository.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== request.user!.id) {
                throw new NotFoundError("Execution not found");
            }

            // Check if execution is running
            if (execution.status !== "running") {
                throw new BadRequestError(
                    `Cannot submit input for execution with status: ${execution.status}`
                );
            }

            try {
                // Get the Temporal workflow handle and send the signal
                const client = await getTemporalClient();
                const handle = client.workflow.getHandle(id);

                // Send the user input signal to the workflow
                await handle.signal(userInputSignal, userResponse);

                fastify.log.info(
                    {
                        executionId: id,
                        nodeId,
                        responseLength: userResponse.length
                    },
                    "User input submitted to workflow"
                );

                return reply.send({
                    success: true,
                    message: "User input submitted successfully"
                });
            } catch (error: unknown) {
                fastify.log.error(
                    {
                        error,
                        executionId: id,
                        nodeId
                    },
                    "Failed to submit user input to workflow"
                );

                const msg = error instanceof Error ? error.message : "Failed to submit user input to workflow";
                throw new BadRequestError(msg);
            }
        }
    );
}
