import {
    proxyActivities,
    condition,
    defineSignal,
    setHandler,
    continueAsNew
} from "@temporalio/workflow";
import type { Tool } from "../../storage/models/Agent";
import type { ConversationMessage, ToolCall } from "../../storage/models/AgentExecution";
import type * as activities from "../activities";

// Proxy activities
const { getAgentConfig, callLLM, executeToolCall, saveAgentCheckpoint } = proxyActivities<
    typeof activities
>({
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
    // For continue-as-new
    messages?: ConversationMessage[];
    iterations?: number;
}

export interface AgentOrchestratorResult {
    success: boolean;
    messages: ConversationMessage[];
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
 * Agent Orchestrator Workflow
 *
 * Implements the ReAct (Reasoning + Acting) pattern for AI agents:
 * 1. LLM reasons about the current state
 * 2. LLM decides to call tools or respond
 * 3. Tools are executed
 * 4. Results are fed back to LLM
 * 5. Loop continues until agent signals completion or reaches max iterations
 *
 * Uses continue-as-new to prevent Temporal history limits for long conversations.
 */
export async function agentOrchestratorWorkflow(
    input: AgentOrchestratorInput
): Promise<AgentOrchestratorResult> {
    const { executionId, agentId, userId, initialMessage, messages = [], iterations = 0 } = input;

    console.log(
        `[Agent] Starting orchestrator for execution ${executionId}, iteration ${iterations}`
    );

    // Load agent configuration
    const agent = await getAgentConfig({ agentId, userId });

    // Initialize conversation history
    const conversationHistory: ConversationMessage[] = [...messages];

    // Add system prompt if first run
    if (conversationHistory.length === 0) {
        conversationHistory.push({
            id: `sys-${Date.now()}`,
            role: "system",
            content: agent.system_prompt,
            timestamp: new Date()
        });

        // Add initial user message if provided
        if (initialMessage) {
            conversationHistory.push({
                id: `user-${Date.now()}`,
                role: "user",
                content: initialMessage,
                timestamp: new Date()
            });
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
        console.log(`[Agent] Received user message for execution ${executionId}`);
        pendingUserMessage = message;
    });

    const maxIterations = agent.max_iterations || 100;
    let currentIterations = iterations;
    const CONTINUE_AS_NEW_THRESHOLD = 50;

    // Main agent loop (ReAct pattern)
    while (currentIterations < maxIterations) {
        console.log(`[Agent] Iteration ${currentIterations}/${maxIterations}`);

        // Continue-as-new every 50 iterations to prevent history bloat
        if (currentIterations > 0 && currentIterations % CONTINUE_AS_NEW_THRESHOLD === 0) {
            console.log(`[Agent] Continue-as-new at iteration ${currentIterations}`);

            // Save checkpoint
            await saveAgentCheckpoint({
                executionId,
                messages: conversationHistory,
                iterations: currentIterations
            });

            // Summarize history if needed (keep last N messages)
            const summarizedHistory = summarizeHistory(
                conversationHistory,
                agent.memory_config.max_messages
            );

            return continueAsNew<typeof agentOrchestratorWorkflow>({
                executionId,
                agentId,
                userId,
                messages: summarizedHistory,
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
                messages: conversationHistory,
                tools: agent.available_tools,
                temperature: agent.temperature,
                maxTokens: agent.max_tokens
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown LLM error";
            console.error(`[Agent] LLM call failed: ${errorMessage}`);

            await emitAgentExecutionFailed({
                executionId,
                error: errorMessage
            });

            return {
                success: false,
                messages: conversationHistory,
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
        conversationHistory.push(assistantMessage);

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
                console.log("[Agent] Waiting for user input");

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
                        messages: conversationHistory,
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
                conversationHistory.push(userMessage);

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

            // Agent is done
            console.log("[Agent] Agent completed task");

            await emitAgentExecutionCompleted({
                executionId,
                finalMessage: llmResponse.content,
                iterations: currentIterations
            });

            return {
                success: true,
                messages: conversationHistory,
                iterations: currentIterations,
                finalMessage: llmResponse.content
            };
        }

        // Execute tool calls
        for (const toolCall of llmResponse.tool_calls!) {
            console.log(`[Agent] Executing tool: ${toolCall.name}`);

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
                    userId
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
                conversationHistory.push(toolMessage);

                await emitAgentToolCallCompleted({
                    executionId,
                    toolName: toolCall.name,
                    result: toolResult
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown tool error";
                console.error(`[Agent] Tool ${toolCall.name} failed: ${errorMessage}`);

                // Add error result to conversation
                const toolMessage: ConversationMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify({ error: errorMessage }),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                conversationHistory.push(toolMessage);

                await emitAgentToolCallFailed({
                    executionId,
                    toolName: toolCall.name,
                    error: errorMessage
                });
            }
        }

        currentIterations++;
    }

    // Max iterations reached
    const maxIterError = `Max iterations (${maxIterations}) reached`;
    console.log(`[Agent] ${maxIterError}`);

    await emitAgentExecutionFailed({
        executionId,
        error: maxIterError
    });

    return {
        success: false,
        messages: conversationHistory,
        iterations: currentIterations,
        error: maxIterError
    };
}

/**
 * Summarize conversation history to keep only recent messages
 * This prevents history from growing too large for continue-as-new
 */
function summarizeHistory(
    messages: ConversationMessage[],
    maxMessages: number
): ConversationMessage[] {
    if (messages.length <= maxMessages) {
        return messages;
    }

    // Always keep the system prompt (first message)
    const systemPrompt = messages[0];

    // Keep the last N messages
    const recentMessages = messages.slice(-(maxMessages - 1));

    return [systemPrompt, ...recentMessages];
}
