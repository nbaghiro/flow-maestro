import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { NotFoundError } from "../../middleware";
import { redisEventBus } from "../../../shared/events/RedisEventBus";

const streamParamsSchema = z.object({
    id: z.string().uuid(),
    executionId: z.string().uuid()
});

/**
 * Stream agent execution updates via Server-Sent Events
 * This endpoint provides real-time token-by-token streaming of agent responses
 */
export async function streamAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id: agentId, executionId } = streamParamsSchema.parse(request.params);

    const executionRepo = new AgentExecutionRepository();

    // Verify execution exists and belongs to user
    const execution = await executionRepo.findById(executionId);
    if (!execution || execution.user_id !== userId || execution.agent_id !== agentId) {
        throw new NotFoundError("Execution not found");
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no" // Disable nginx buffering
    });

    // Keep connection alive
    const keepAliveInterval = setInterval(() => {
        reply.raw.write(": keepalive\n\n");
    }, 15000); // Every 15 seconds

    // Track if client disconnected
    let clientDisconnected = false;

    // Handle client disconnect
    request.raw.on("close", () => {
        clientDisconnected = true;
        clearInterval(keepAliveInterval);
        unsubscribeAll();
    });

    // Helper function to send SSE event
    const sendEvent = (event: string, data: Record<string, unknown>): void => {
        if (clientDisconnected) return;

        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        reply.raw.write(message);
    };

    // Subscribe to Redis events for this execution
    const eventHandlers: Array<{
        channel: string;
        handler: (data: Record<string, unknown>) => void;
    }> = [];

    const subscribe = (
        eventType: string,
        handler: (data: Record<string, unknown>) => void
    ): void => {
        const channel = `agent:events:${eventType}`;
        eventHandlers.push({ channel, handler });
        redisEventBus.subscribe(channel, handler);
    };

    const unsubscribeAll = (): void => {
        eventHandlers.forEach(({ channel, handler }) => {
            redisEventBus.unsubscribe(channel, handler);
        });
    };

    // Subscribe to relevant events
    subscribe("started", (data) => {
        if (data.executionId === executionId) {
            sendEvent("started", {
                executionId: data.executionId,
                agentName: data.agentName
            });
        }
    });

    subscribe("thinking", (data) => {
        if (data.executionId === executionId) {
            sendEvent("thinking", { executionId: data.executionId });
        }
    });

    subscribe("token", (data) => {
        if (data.executionId === executionId) {
            sendEvent("token", {
                token: data.token,
                executionId: data.executionId
            });
        }
    });

    subscribe("message", (data) => {
        if (data.executionId === executionId) {
            sendEvent("message", {
                message: data.message,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_started", (data) => {
        if (data.executionId === executionId) {
            sendEvent("tool_call_started", {
                toolName: data.toolName,
                arguments: data.arguments,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_completed", (data) => {
        if (data.executionId === executionId) {
            sendEvent("tool_call_completed", {
                toolName: data.toolName,
                result: data.result,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_failed", (data) => {
        if (data.executionId === executionId) {
            sendEvent("tool_call_failed", {
                toolName: data.toolName,
                error: data.error,
                executionId: data.executionId
            });
        }
    });

    subscribe("completed", (data) => {
        if (data.executionId === executionId) {
            sendEvent("completed", {
                finalMessage: data.finalMessage,
                iterations: data.iterations,
                executionId: data.executionId
            });

            // Close connection after completion
            setTimeout(() => {
                clearInterval(keepAliveInterval);
                unsubscribeAll();
                reply.raw.end();
            }, 500);
        }
    });

    subscribe("failed", (data) => {
        if (data.executionId === executionId) {
            sendEvent("error", {
                error: data.error,
                executionId: data.executionId
            });

            // Close connection after error
            setTimeout(() => {
                clearInterval(keepAliveInterval);
                unsubscribeAll();
                reply.raw.end();
            }, 500);
        }
    });

    // Send initial connection event
    sendEvent("connected", {
        executionId,
        status: execution.status
    });
}
