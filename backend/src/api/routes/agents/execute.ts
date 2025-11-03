import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { getTemporalClient } from "../../../temporal/client";
import { NotFoundError, BadRequestError } from "../../middleware";

const executeAgentParamsSchema = z.object({
    id: z.string().uuid(),
});

const executeAgentSchema = z.object({
    message: z.string().min(1),
});

export async function executeAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id: agentId } = executeAgentParamsSchema.parse(request.params);
    const { message } = executeAgentSchema.parse(request.body);

    const agentRepo = new AgentRepository();
    const executionRepo = new AgentExecutionRepository();

    // Check if agent exists and belongs to user
    const agent = await agentRepo.findByIdAndUserId(agentId, userId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    try {
        // Create execution record
        const execution = await executionRepo.create({
            agent_id: agentId,
            user_id: userId,
            status: "running",
            conversation_history: [],
            iterations: 0,
        });

        // Start Temporal workflow
        const client = await getTemporalClient();
        await client.workflow.start("agentOrchestratorWorkflow", {
            taskQueue: "flowmaestro",
            workflowId: execution.id,
            args: [{
                executionId: execution.id,
                agentId,
                userId,
                initialMessage: message,
            }],
        });

        reply.code(201).send({
            success: true,
            data: {
                executionId: execution.id,
                agentId,
                status: "running",
            },
        });
    } catch (error) {
        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to start agent execution"
        );
    }
}
