import type { JsonObject, WebSocketEvent } from "@flowmaestro/shared";
import type { ConversationMessage } from "../../../storage/models/AgentExecution";
import { redisEventBus } from "../../../shared/events/RedisEventBus";

/**
 * Activities for emitting agent events to WebSocket clients
 * These are side-effect activities called from the agent orchestrator workflow
 */

export interface EmitAgentExecutionStartedInput {
    executionId: string;
    agentId: string;
    agentName: string;
}

export interface EmitAgentMessageInput {
    executionId: string;
    message: ConversationMessage;
}

export interface EmitAgentThinkingInput {
    executionId: string;
}

export interface EmitAgentTokenInput {
    executionId: string;
    token: string;
}

export interface EmitAgentToolCallStartedInput {
    executionId: string;
    toolName: string;
    arguments: JsonObject;
}

export interface EmitAgentToolCallCompletedInput {
    executionId: string;
    toolName: string;
    result: JsonObject;
}

export interface EmitAgentToolCallFailedInput {
    executionId: string;
    toolName: string;
    error: string;
}

export interface EmitAgentExecutionCompletedInput {
    executionId: string;
    finalMessage: string;
    iterations: number;
}

export interface EmitAgentExecutionFailedInput {
    executionId: string;
    error: string;
}

/**
 * Emit agent execution started event
 */
export async function emitAgentExecutionStarted(
    input: EmitAgentExecutionStartedInput
): Promise<void> {
    const { executionId, agentId, agentName } = input;
    await redisEventBus.publish("agent:events:execution:started", {
        type: "agent:execution:started",
        timestamp: Date.now(),
        executionId,
        agentId,
        agentName
    });
}

/**
 * Emit new message event (user, assistant, or tool)
 */
export async function emitAgentMessage(input: EmitAgentMessageInput): Promise<void> {
    const { executionId, message } = input;
    const serializedMessage: JsonObject = {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        ...(message.tool_calls && {
            tool_calls: message.tool_calls.map((tc) => ({
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments
            }))
        }),
        ...(message.tool_name && { tool_name: message.tool_name }),
        ...(message.tool_call_id && { tool_call_id: message.tool_call_id })
    };

    await redisEventBus.publish("agent:events:message:new", {
        type: "agent:message:new",
        timestamp: Date.now(),
        executionId,
        message: serializedMessage
    });
}

/**
 * Emit agent thinking event
 */
export async function emitAgentThinking(input: EmitAgentThinkingInput): Promise<void> {
    const { executionId } = input;
    await redisEventBus.publish("agent:events:thinking", {
        type: "agent:thinking",
        timestamp: Date.now(),
        executionId
    });
}

/**
 * Emit token for streaming responses
 */
export async function emitAgentToken(input: EmitAgentTokenInput): Promise<void> {
    const { executionId, token } = input;
    await redisEventBus.publish("agent:events:token", {
        type: "agent:token",
        timestamp: Date.now(),
        executionId,
        token
    } as unknown as WebSocketEvent);
}

/**
 * Emit tool call started event
 */
export async function emitAgentToolCallStarted(
    input: EmitAgentToolCallStartedInput
): Promise<void> {
    const { executionId, toolName, arguments: args } = input;
    await redisEventBus.publish("agent:events:tool:call:started", {
        type: "agent:tool:call:started",
        timestamp: Date.now(),
        executionId,
        toolName,
        arguments: args
    });
}

/**
 * Emit tool call completed event
 */
export async function emitAgentToolCallCompleted(
    input: EmitAgentToolCallCompletedInput
): Promise<void> {
    const { executionId, toolName, result } = input;
    await redisEventBus.publish("agent:events:tool:call:completed", {
        type: "agent:tool:call:completed",
        timestamp: Date.now(),
        executionId,
        toolName,
        result
    });
}

/**
 * Emit tool call failed event
 */
export async function emitAgentToolCallFailed(input: EmitAgentToolCallFailedInput): Promise<void> {
    const { executionId, toolName, error } = input;
    await redisEventBus.publish("agent:events:tool:call:failed", {
        type: "agent:tool:call:failed",
        timestamp: Date.now(),
        executionId,
        toolName,
        error
    });
}

/**
 * Emit agent execution completed event
 */
export async function emitAgentExecutionCompleted(
    input: EmitAgentExecutionCompletedInput
): Promise<void> {
    const { executionId, finalMessage, iterations } = input;
    await redisEventBus.publish("agent:events:execution:completed", {
        type: "agent:execution:completed",
        timestamp: Date.now(),
        executionId,
        status: "completed",
        finalMessage,
        iterations
    });
}

/**
 * Emit agent execution failed event
 */
export async function emitAgentExecutionFailed(
    input: EmitAgentExecutionFailedInput
): Promise<void> {
    const { executionId, error } = input;
    await redisEventBus.publish("agent:events:execution:failed", {
        type: "agent:execution:failed",
        timestamp: Date.now(),
        executionId,
        status: "failed",
        error
    });
}
