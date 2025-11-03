import type { JsonObject } from "@flowmaestro/shared";
import type { ConversationMessage, ToolCall } from "../../../storage/models/AgentExecution";
import type { Tool } from "../../../storage/models/Agent";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import type { AgentConfig, LLMResponse } from "../../workflows/agent-orchestrator-workflow";

const agentRepo = new AgentRepository();
const executionRepo = new AgentExecutionRepository();
const workflowRepo = new WorkflowRepository();
const connectionRepo = new ConnectionRepository();

/**
 * Get agent configuration for workflow execution
 */
export interface GetAgentConfigInput {
    agentId: string;
    userId: string;
}

export async function getAgentConfig(input: GetAgentConfigInput): Promise<AgentConfig> {
    const { agentId, userId } = input;

    const agent = await agentRepo.findByIdAndUserId(agentId, userId);
    if (!agent) {
        throw new Error(`Agent ${agentId} not found or access denied`);
    }

    return {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        provider: agent.provider,
        connection_id: agent.connection_id,
        system_prompt: agent.system_prompt,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        max_iterations: agent.max_iterations,
        available_tools: agent.available_tools,
        memory_config: agent.memory_config
    };
}

/**
 * Call LLM with conversation history and tools
 */
export interface CallLLMInput {
    model: string;
    provider: string;
    connectionId: string | null;
    messages: ConversationMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
}

export async function callLLM(input: CallLLMInput): Promise<LLMResponse> {
    const { model, provider, connectionId, messages, tools, temperature, maxTokens } = input;

    // Get API credentials from connection
    let apiKey: string | null = null;
    if (connectionId) {
        const connection = await connectionRepo.findByIdWithData(connectionId);
        if (connection && connection.data) {
            // Extract API key from connection data
            const connectionData = connection.data;
            if ("api_key" in connectionData) {
                apiKey = connectionData.api_key || null;
            } else if ("apiKey" in connectionData) {
                apiKey = (connectionData as any).apiKey || null;
            }
        }
    }

    // If no connection or API key, try environment variables
    if (!apiKey) {
        switch (provider) {
            case "openai":
                apiKey = process.env.OPENAI_API_KEY || null;
                break;
            case "anthropic":
                apiKey = process.env.ANTHROPIC_API_KEY || null;
                break;
            case "google":
                apiKey = process.env.GOOGLE_API_KEY || null;
                break;
            case "cohere":
                apiKey = process.env.COHERE_API_KEY || null;
                break;
        }
    }

    if (!apiKey) {
        throw new Error(`No API key found for provider ${provider}`);
    }

    // Call appropriate LLM provider
    switch (provider) {
        case "openai":
            return await callOpenAI({ model, apiKey, messages, tools, temperature, maxTokens });
        case "anthropic":
            return await callAnthropic({ model, apiKey, messages, tools, temperature, maxTokens });
        default:
            throw new Error(`Provider ${provider} not yet implemented`);
    }
}

/**
 * Call OpenAI API
 */
interface OpenAICallInput {
    model: string;
    apiKey: string;
    messages: ConversationMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
}

async function callOpenAI(input: OpenAICallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens } = input;

    // Format messages for OpenAI
    const formattedMessages = messages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : msg.role === "tool" ? "tool" : "user",
        content: msg.content,
        ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        ...(msg.tool_name && { name: msg.tool_name })
    }));

    // Format tools for OpenAI function calling
    const formattedTools = tools.map(tool => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.schema
        }
    }));

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: formattedMessages,
            tools: formattedTools.length > 0 ? formattedTools : undefined,
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    const choice = data.choices[0];
    const message = choice.message;

    // Parse tool calls
    let toolCalls: ToolCall[] | undefined;
    if (message.tool_calls) {
        toolCalls = message.tool_calls.map((tc: any) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments)
        }));
    }

    return {
        content: message.content || "",
        tool_calls: toolCalls,
        isComplete: choice.finish_reason === "stop" && !toolCalls
    };
}

/**
 * Call Anthropic API
 */
interface AnthropicCallInput {
    model: string;
    apiKey: string;
    messages: ConversationMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
}

async function callAnthropic(input: AnthropicCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens } = input;

    // Extract system prompt (first message)
    const systemPrompt = messages.find(m => m.role === "system")?.content || "";
    const conversationMessages = messages.filter(m => m.role !== "system");

    // Format messages for Anthropic
    const formattedMessages = conversationMessages.map(msg => {
        if (msg.role === "assistant") {
            return {
                role: "assistant",
                content: msg.tool_calls
                    ? [
                        { type: "text", text: msg.content },
                        ...msg.tool_calls.map(tc => ({
                            type: "tool_use",
                            id: tc.id,
                            name: tc.name,
                            input: tc.arguments
                        }))
                    ]
                    : msg.content
            };
        } else if (msg.role === "tool") {
            return {
                role: "user",
                content: [{
                    type: "tool_result",
                    tool_use_id: msg.tool_call_id,
                    content: msg.content
                }]
            };
        } else {
            return {
                role: "user",
                content: msg.content
            };
        }
    });

    // Format tools for Anthropic
    const formattedTools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.schema
    }));

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model,
            system: systemPrompt,
            messages: formattedMessages,
            tools: formattedTools.length > 0 ? formattedTools : undefined,
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;

    // Parse response
    let content = "";
    let toolCalls: ToolCall[] | undefined;

    for (const block of data.content) {
        if (block.type === "text") {
            content += block.text;
        } else if (block.type === "tool_use") {
            if (!toolCalls) toolCalls = [];
            toolCalls.push({
                id: block.id,
                name: block.name,
                arguments: block.input
            });
        }
    }

    return {
        content,
        tool_calls: toolCalls,
        isComplete: data.stop_reason === "end_turn" && !toolCalls
    };
}

/**
 * Execute tool call (workflow, function, or knowledge base)
 */
export interface ExecuteToolCallInput {
    executionId: string;
    toolCall: ToolCall;
    availableTools: Tool[];
    userId: string;
}

export async function executeToolCall(input: ExecuteToolCallInput): Promise<JsonObject> {
    const { toolCall, availableTools, userId } = input;

    // Find tool definition
    const tool = availableTools.find(t => t.name === toolCall.name);
    if (!tool) {
        throw new Error(`Tool "${toolCall.name}" not found in available tools`);
    }

    switch (tool.type) {
        case "workflow":
            return await executeWorkflowTool({ tool, arguments: toolCall.arguments, userId });
        case "function":
            return await executeFunctionTool({ tool, arguments: toolCall.arguments });
        case "knowledge_base":
            return await executeKnowledgeBaseTool({ tool, arguments: toolCall.arguments, userId });
        default:
            throw new Error(`Unknown tool type: ${tool.type}`);
    }
}

/**
 * Execute workflow as tool
 */
interface ExecuteWorkflowToolInput {
    tool: Tool;
    arguments: JsonObject;  // eslint-disable-line @typescript-eslint/no-unused-vars
    userId: string;
}

async function executeWorkflowTool(input: ExecuteWorkflowToolInput): Promise<JsonObject> {
    const { tool, arguments: _args, userId } = input;

    if (!tool.config.workflowId) {
        throw new Error("Workflow tool missing workflowId in config");
    }

    // Load workflow
    const workflow = await workflowRepo.findById(tool.config.workflowId);
    if (!workflow) {
        throw new Error(`Workflow ${tool.config.workflowId} not found`);
    }

    // Verify ownership
    if (workflow.user_id !== userId) {
        throw new Error("Access denied to workflow");
    }

    // Note: Actual workflow execution would be done via Temporal child workflow
    // For now, return a placeholder result
    // TODO: Implement child workflow execution
    return {
        success: true,
        workflowId: workflow.id,
        workflowName: workflow.name,
        message: "Workflow tool execution not yet fully implemented - would execute child workflow here"
    };
}

/**
 * Execute function tool
 */
interface ExecuteFunctionToolInput {
    tool: Tool;
    arguments: JsonObject;
}

async function executeFunctionTool(input: ExecuteFunctionToolInput): Promise<JsonObject> {
    const { tool, arguments: args } = input;

    // Built-in functions
    switch (tool.config.functionName) {
        case "get_current_time":
            return {
                timestamp: new Date().toISOString(),
                timezone: "UTC"
            };

        case "calculate":
            // Simple calculator (in production, use safe-eval)
            if (typeof args.expression === "string") {
                try {
                    // WARNING: eval is dangerous - this is just for demo
                    // In production, use a safe math expression evaluator
                    const result = eval(args.expression);
                    return { result };
                } catch (error) {
                    throw new Error(`Calculate error: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
            }
            throw new Error("Calculate requires 'expression' string argument");

        default:
            throw new Error(`Unknown function: ${tool.config.functionName}`);
    }
}

/**
 * Execute knowledge base tool
 */
interface ExecuteKnowledgeBaseToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
}

async function executeKnowledgeBaseTool(input: ExecuteKnowledgeBaseToolInput): Promise<JsonObject> {
    const { tool, arguments: args } = input;

    if (!tool.config.knowledgeBaseId) {
        throw new Error("Knowledge base tool missing knowledgeBaseId in config");
    }

    if (typeof args.query !== "string") {
        throw new Error("Knowledge base tool requires 'query' string argument");
    }

    // TODO: Implement actual knowledge base query
    // This would use the existing RAG system
    return {
        results: [],
        message: "Knowledge base tool not yet implemented - would query RAG system here"
    };
}

/**
 * Save agent checkpoint for continue-as-new
 */
export interface SaveAgentCheckpointInput {
    executionId: string;
    messages: ConversationMessage[];
    iterations: number;
}

export async function saveAgentCheckpoint(input: SaveAgentCheckpointInput): Promise<void> {
    const { executionId, messages, iterations } = input;

    await executionRepo.update(executionId, {
        conversation_history: messages,
        iterations
    });
}
