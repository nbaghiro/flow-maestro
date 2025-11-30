import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { getTemporalClient } from "../../../temporal/client";
import { NotFoundError, BadRequestError } from "../../middleware";

const executeAgentParamsSchema = z.object({
    id: z.string().uuid()
});

const executeAgentSchema = z.object({
    message: z.string().min(1),
    thread_id: z.string().uuid().optional() // Optional: use existing thread or create new one
});

export async function executeAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id: agentId } = executeAgentParamsSchema.parse(request.params);
    const { message, thread_id } = executeAgentSchema.parse(request.body);

    const agentRepo = new AgentRepository();
    const executionRepo = new AgentExecutionRepository();
    const threadRepo = new ThreadRepository();

    // Check if agent exists and belongs to user
    const agent = await agentRepo.findByIdAndUserId(agentId, userId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    try {
        // Get or create thread
        let threadId: string;

        // Load previous conversation history if using existing thread
        let previousConversationHistory: Array<{
            id: string;
            role: string;
            content: string;
            tool_calls?: unknown[];
            tool_name?: string;
            tool_call_id?: string;
            timestamp: Date;
        }> = [];

        if (thread_id) {
            // Use existing thread - verify it exists and belongs to user
            const existingThread = await threadRepo.findByIdAndUserId(thread_id, userId);
            if (!existingThread) {
                throw new NotFoundError("Thread not found");
            }
            // Verify thread belongs to same agent
            if (existingThread.agent_id !== agentId) {
                throw new BadRequestError("Thread belongs to a different agent");
            }
            threadId = thread_id;

            // Load previous conversation history from thread
            const previousMessages = await executionRepo.getMessagesByThread(threadId);
            previousConversationHistory = previousMessages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                tool_calls: msg.tool_calls || undefined,
                tool_name: msg.tool_name || undefined,
                tool_call_id: msg.tool_call_id || undefined,
                timestamp: msg.created_at
            }));
        } else {
            // Create new thread
            const newThread = await threadRepo.create({
                user_id: userId,
                agent_id: agentId,
                title: `Conversation ${new Date().toLocaleString()}` // Will be auto-generated later
            });
            threadId = newThread.id;
        }

        // Create execution record linked to thread
        const execution = await executionRepo.create({
            agent_id: agentId,
            user_id: userId,
            thread_id: threadId,
            status: "running",
            conversation_history: [],
            iterations: 0
        });

        // Start Temporal workflow with previous conversation history
        const client = await getTemporalClient();
        await client.workflow.start("agentOrchestratorWorkflow", {
            taskQueue: "flowmaestro-orchestrator",
            workflowId: execution.id,
            args: [
                {
                    executionId: execution.id,
                    agentId,
                    userId,
                    threadId,
                    initialMessage: message,
                    previousConversationHistory // Pass previous messages for context
                }
            ]
        });

        reply.code(201).send({
            success: true,
            data: {
                executionId: execution.id,
                threadId,
                agentId,
                status: "running"
            }
        });
    } catch (error) {
        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to start agent execution"
        );
    }
}
