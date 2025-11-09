/**
 * Agent Orchestrator Workflow V2 - With ConversationManager
 * Refactored to use ConversationManager for better message handling
 */

import {
    proxyActivities,
    condition,
    defineSignal,
    setHandler,
    continueAsNew
} from "@temporalio/workflow";
import type * as activities from "../activities";
import type { ConversationMessage, ToolCall } from "../../storage/models/AgentExecution";
import type { Tool } from "../../storage/models/Agent";
import type { SerializedConversation } from "../../shared/conversation/conversation-manager";
import type { JsonObject } from "@flowmaestro/shared";

// Proxy activities
const {
    getAgentConfig,
    callLLM,
    executeToolCall,
    saveConversationIncremental
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2
    }
});

// Event emission activities (non-retryable)
const {
    emitAgentExecutionStarted,
    emitAgentMessage,
    emitAgentThinking,
    emitAgentToolCallStarted,
    emitAgentToolCallCompleted,
    emitAgentToolCallFailed,
    emitAgentExecutionCompleted,
    emitAgentExecutionFailed
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "5 seconds",
    retry: {
        maximumAttempts: 1
    }
});

// Signal for receiving user messages
export const userMessageSignal = defineSignal<[string]>("userMessage");

export interface AgentOrchestratorInput {
    executionId: string;
    agentId: string;
    userId: string;
    initialMessage?: string;
    // For continue-as-new with ConversationManager
    serializedConversation?: SerializedConversation;
    iterations?: number;
}

export interface AgentOrchestratorResult {
    success: boolean;
    serializedConversation: SerializedConversation;
    iterations: number;
    finalMessage?: string;
    error?: string;
}

export interface AgentConfig {
    id: string;
    name: string;
    model: string;
    provider: string;
    connection_id: string | null;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    max_iterations: number;
    available_tools: Tool[];
    memory_config: {
        type: "buffer" | "summary" | "vector";
        max_messages: number;
    };
}

export interface LLMResponse {
    content: string;
    tool_calls?: ToolCall[];
    requiresUserInput?: boolean;
    isComplete?: boolean;
}

/**
 * Message state for workflow (deterministic, plain objects only)
 */
interface WorkflowMessageState {
    messages: ConversationMessage[];
    savedMessageIds: string[];
    metadata: JsonObject;
}

/**
 * Agent Orchestrator Workflow V2 with ConversationManager
 *
 * Improvements over V1:
 * - Uses ConversationManager pattern for message handling
 * - Incremental persistence (only save new messages)
 * - Source tracking (memory vs new messages)
 * - Better serialization for continue-as-new
 * - Multi-format conversion support
 */
export async function agentOrchestratorWorkflowV2(
    input: AgentOrchestratorInput
): Promise<AgentOrchestratorResult> {
    const {
        executionId,
        agentId,
        userId,
        initialMessage,
        serializedConversation,
        iterations = 0
    } = input;

    console.log(
        `[Agent V2] Starting orchestrator for execution ${executionId}, iteration ${iterations}`
    );

    // Load agent configuration
    const agent = await getAgentConfig({ agentId, userId });

    // Initialize message state (deterministic - just plain objects)
    let messageState: WorkflowMessageState;

    if (serializedConversation) {
        // Restoring from continue-as-new
        messageState = {
            messages: serializedConversation.messages,
            savedMessageIds: serializedConversation.savedMessageIds,
            metadata: serializedConversation.metadata
        };
    } else {
        // First run - initialize
        messageState = {
            messages: [],
            savedMessageIds: [],
            metadata: {}
        };

        // Add system prompt
        const systemMessage: ConversationMessage = {
            id: `sys-${Date.now()}`,
            role: "system",
            content: agent.system_prompt,
            timestamp: new Date()
        };
        messageState.messages.push(systemMessage);
        messageState.savedMessageIds.push(systemMessage.id); // System message is "saved"

        // Add initial user message if provided
        if (initialMessage) {
            const userMessage: ConversationMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: initialMessage,
                timestamp: new Date()
            };
            messageState.messages.push(userMessage);
        }

        // Emit execution started event
        await emitAgentExecutionStarted({
            executionId,
            agentId,
            agentName: agent.name
        });
    }

    // Set up signal handler for user messages
    let pendingUserMessage: string | null = null;
    setHandler(userMessageSignal, (message: string) => {
        console.log(`[Agent V2] Received user message for execution ${executionId}`);
        pendingUserMessage = message;
    });

    const maxIterations = agent.max_iterations || 100;
    let currentIterations = iterations;
    const CONTINUE_AS_NEW_THRESHOLD = 50;

    // Main agent loop (ReAct pattern)
    while (currentIterations < maxIterations) {
        console.log(`[Agent V2] Iteration ${currentIterations}/${maxIterations}`);

        // Continue-as-new every 50 iterations to prevent history bloat
        if (currentIterations > 0 && currentIterations % CONTINUE_AS_NEW_THRESHOLD === 0) {
            console.log(`[Agent V2] Continue-as-new at iteration ${currentIterations}`);

            // Save incremental messages before continue-as-new
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveConversationIncremental({
                    executionId,
                    messages: unsavedMessages
                });
                // Mark as saved
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }

            // Summarize history if needed (keep last N messages)
            const summarizedState = summarizeMessageState(
                messageState,
                agent.memory_config.max_messages
            );

            return continueAsNew<typeof agentOrchestratorWorkflowV2>({
                executionId,
                agentId,
                userId,
                serializedConversation: summarizedState,
                iterations: currentIterations
            });
        }

        // Emit thinking event
        await emitAgentThinking({ executionId });

        // Call LLM with conversation history and available tools
        let llmResponse: LLMResponse;
        try {
            llmResponse = await callLLM({
                model: agent.model,
                provider: agent.provider,
                connectionId: agent.connection_id,
                messages: messageState.messages,
                tools: agent.available_tools,
                temperature: agent.temperature,
                maxTokens: agent.max_tokens
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown LLM error";
            console.error(`[Agent V2] LLM call failed: ${errorMessage}`);

            await emitAgentExecutionFailed({
                executionId,
                error: errorMessage
            });

            return {
                success: false,
                serializedConversation: messageState,
                iterations: currentIterations,
                error: errorMessage
            };
        }

        // Add assistant response to history
        const assistantMessage: ConversationMessage = {
            id: `asst-${Date.now()}-${currentIterations}`,
            role: "assistant",
            content: llmResponse.content,
            tool_calls: llmResponse.tool_calls,
            timestamp: new Date()
        };
        messageState.messages.push(assistantMessage);

        // Emit message event
        await emitAgentMessage({
            executionId,
            message: assistantMessage
        });

        // Check if agent is done (no tool calls and has final answer)
        const hasToolCalls = llmResponse.tool_calls && llmResponse.tool_calls.length > 0;

        if (!hasToolCalls) {
            // Check if agent needs user input
            if (llmResponse.requiresUserInput) {
                console.log("[Agent V2] Waiting for user input");

                // Wait for user message signal (5 minute timeout)
                const receivedInput = await condition(() => pendingUserMessage !== null, 300000);

                if (!receivedInput) {
                    // Timeout
                    const timeoutError = "User input timeout after 5 minutes";
                    await emitAgentExecutionFailed({
                        executionId,
                        error: timeoutError
                    });

                    return {
                        success: false,
                        serializedConversation: messageState,
                        iterations: currentIterations,
                        error: timeoutError
                    };
                }

                // Add user message to history
                const userMessage: ConversationMessage = {
                    id: `user-${Date.now()}-${currentIterations}`,
                    role: "user",
                    content: pendingUserMessage!,
                    timestamp: new Date()
                };
                messageState.messages.push(userMessage);

                await emitAgentMessage({
                    executionId,
                    message: userMessage
                });

                // Reset pending message
                pendingUserMessage = null;

                // Continue loop to process user input
                currentIterations++;
                continue;
            }

            // Agent is done - save any unsaved messages
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveConversationIncremental({
                    executionId,
                    messages: unsavedMessages
                });
            }

            console.log("[Agent V2] Agent completed task");

            await emitAgentExecutionCompleted({
                executionId,
                finalMessage: llmResponse.content,
                iterations: currentIterations
            });

            return {
                success: true,
                serializedConversation: messageState,
                iterations: currentIterations,
                finalMessage: llmResponse.content
            };
        }

        // Execute tool calls
        for (const toolCall of llmResponse.tool_calls!) {
            console.log(`[Agent V2] Executing tool: ${toolCall.name}`);

            await emitAgentToolCallStarted({
                executionId,
                toolName: toolCall.name,
                arguments: toolCall.arguments
            });

            try {
                const toolResult = await executeToolCall({
                    executionId,
                    toolCall,
                    availableTools: agent.available_tools,
                    userId,
                    agentId
                });

                // Add tool result to conversation
                const toolMessage: ConversationMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify(toolResult),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);

                await emitAgentToolCallCompleted({
                    executionId,
                    toolName: toolCall.name,
                    result: toolResult
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown tool error";
                console.error(`[Agent V2] Tool ${toolCall.name} failed: ${errorMessage}`);

                // Add error result to conversation
                const toolMessage: ConversationMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify({ error: errorMessage }),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);

                await emitAgentToolCallFailed({
                    executionId,
                    toolName: toolCall.name,
                    error: errorMessage
                });
            }
        }

        // Save unsaved messages periodically (every 10 iterations)
        if (currentIterations > 0 && currentIterations % 10 === 0) {
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveConversationIncremental({
                    executionId,
                    messages: unsavedMessages
                });
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }
        }

        currentIterations++;
    }

    // Max iterations reached
    const maxIterError = `Max iterations (${maxIterations}) reached`;
    console.log(`[Agent V2] ${maxIterError}`);

    // Save any unsaved messages
    const unsavedMessages = getUnsavedMessages(messageState);
    if (unsavedMessages.length > 0) {
        await saveConversationIncremental({
            executionId,
            messages: unsavedMessages
        });
    }

    await emitAgentExecutionFailed({
        executionId,
        error: maxIterError
    });

    return {
        success: false,
        serializedConversation: messageState,
        iterations: currentIterations,
        error: maxIterError
    };
}

/**
 * Get unsaved messages from message state
 */
function getUnsavedMessages(state: WorkflowMessageState): ConversationMessage[] {
    const savedIds = new Set(state.savedMessageIds);
    return state.messages.filter((msg) => !savedIds.has(msg.id));
}

/**
 * Summarize message state to keep only recent messages
 * This prevents history from growing too large for continue-as-new
 */
function summarizeMessageState(
    state: WorkflowMessageState,
    maxMessages: number
): SerializedConversation {
    if (state.messages.length <= maxMessages) {
        return {
            messages: state.messages,
            savedMessageIds: state.savedMessageIds,
            metadata: state.metadata
        };
    }

    // Always keep the system prompt (first message)
    const systemPrompt = state.messages.find((msg) => msg.role === "system");

    // Keep the last N messages
    const recentMessages = state.messages.slice(-(maxMessages - 1));

    // Combine
    const summarizedMessages = systemPrompt
        ? [systemPrompt, ...recentMessages.filter((msg) => msg.id !== systemPrompt.id)]
        : recentMessages;

    // Keep only saved IDs that are still in the messages
    const keptMessageIds = new Set(summarizedMessages.map((m) => m.id));
    const savedIds = state.savedMessageIds.filter((id) => keptMessageIds.has(id));

    return {
        messages: summarizedMessages,
        savedMessageIds: savedIds,
        metadata: state.metadata
    };
}
