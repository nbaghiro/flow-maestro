import type { JsonObject, JsonValue } from "@flowmaestro/shared";
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
                apiKey = ((connectionData as Record<string, unknown>).apiKey as string) || null;
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
    const formattedMessages = messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : msg.role === "tool" ? "tool" : "user",
        content: msg.content,
        ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        ...(msg.tool_name && { name: msg.tool_name })
    }));

    // Format tools for OpenAI function calling
    const formattedTools = tools.map((tool) => ({
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
            Authorization: `Bearer ${apiKey}`
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

    interface OpenAIResponse {
        choices: Array<{
            message: {
                content?: string;
                tool_calls?: Array<{
                    id: string;
                    function: {
                        name: string;
                        arguments: string;
                    };
                }>;
            };
            finish_reason: string;
        }>;
    }

    const data = (await response.json()) as OpenAIResponse;
    const choice = data.choices[0];
    const message = choice.message;

    // Parse tool calls
    let toolCalls: ToolCall[] | undefined;
    if (message.tool_calls) {
        toolCalls = message.tool_calls.map((tc) => ({
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
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Anthropic
    const formattedMessages = conversationMessages.map((msg) => {
        if (msg.role === "assistant") {
            return {
                role: "assistant",
                content: msg.tool_calls
                    ? [
                          { type: "text", text: msg.content },
                          ...msg.tool_calls.map((tc) => ({
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
                content: [
                    {
                        type: "tool_result",
                        tool_use_id: msg.tool_call_id,
                        content: msg.content
                    }
                ]
            };
        } else {
            return {
                role: "user",
                content: msg.content
            };
        }
    });

    // Format tools for Anthropic
    const formattedTools = tools.map((tool) => ({
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

    interface AnthropicResponse {
        content: Array<
            | { type: "text"; text: string }
            | { type: "tool_use"; id: string; name: string; input: JsonObject }
        >;
        stop_reason: string;
    }

    const data = (await response.json()) as AnthropicResponse;

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
    const tool = availableTools.find((t) => t.name === toolCall.name);
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
    arguments: JsonObject;
    userId: string;
}

async function executeWorkflowTool(input: ExecuteWorkflowToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId } = input;

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

    // Validate workflow definition
    if (!workflow.definition || typeof workflow.definition !== "object") {
        throw new Error(`Workflow ${workflow.id} has invalid definition`);
    }

    interface WorkflowDefinition {
        nodes: Record<string, unknown>;
        edges: Array<unknown>;
    }

    const definition = workflow.definition as WorkflowDefinition;
    if (!definition.nodes || !definition.edges) {
        throw new Error(`Workflow ${workflow.id} definition missing nodes or edges`);
    }

    // Import Temporal client for workflow execution
    const { Connection, Client } = await import("@temporalio/client");
    const connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || "localhost:7233"
    });
    const client = new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || "default"
    });

    // Generate execution ID for the workflow
    const workflowExecutionId = `wf-tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
        // Start workflow execution
        const handle = await client.workflow.start("orchestratorWorkflow", {
            taskQueue: process.env.TEMPORAL_TASK_QUEUE || "flowmaestro",
            workflowId: workflowExecutionId,
            args: [
                {
                    executionId: workflowExecutionId,
                    workflowDefinition: {
                        name: workflow.name,
                        nodes: definition.nodes,
                        edges: definition.edges
                    },
                    inputs: args,
                    userId
                }
            ]
        });

        // Wait for workflow to complete
        const result = await handle.result();

        // Return workflow execution result
        return {
            success: result.success,
            workflowId: workflow.id,
            workflowName: workflow.name,
            executionId: workflowExecutionId,
            outputs: result.outputs,
            ...(result.error && { error: result.error })
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Workflow execution failed: ${errorMessage}`);
    }
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
            return await getCurrentTime(args);

        case "calculate":
            return await calculate(args);

        case "format_date":
            return await formatDate(args);

        case "parse_json":
            return await parseJson(args);

        case "validate_email":
            return await validateEmail(args);

        case "generate_random_number":
            return await generateRandomNumber(args);

        case "generate_uuid":
            return await generateUuid();

        case "encode_base64":
            return await encodeBase64(args);

        case "decode_base64":
            return await decodeBase64(args);

        case "hash_text":
            return await hashText(args);

        default:
            throw new Error(`Unknown function: ${tool.config.functionName}`);
    }
}

/**
 * Built-in function implementations
 */

async function getCurrentTime(args: JsonObject): Promise<JsonObject> {
    const timezone = typeof args.timezone === "string" ? args.timezone : "UTC";
    const date = new Date();

    return {
        timestamp: date.toISOString(),
        timezone,
        unix: Math.floor(date.getTime() / 1000),
        formatted: date.toLocaleString("en-US", { timeZone: timezone })
    };
}

async function calculate(args: JsonObject): Promise<JsonObject> {
    if (typeof args.expression !== "string") {
        throw new Error("Calculate requires 'expression' string argument");
    }

    try {
        // Use mathjs for safe mathematical expression evaluation
        const { evaluate } = await import("mathjs");
        const result = evaluate(args.expression);

        return {
            expression: args.expression,
            result: typeof result === "number" ? result : String(result)
        };
    } catch (error) {
        throw new Error(
            `Calculate error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

async function formatDate(args: JsonObject): Promise<JsonObject> {
    const dateInput = args.date;
    const format = typeof args.format === "string" ? args.format : "ISO";

    let date: Date;
    if (typeof dateInput === "string") {
        date = new Date(dateInput);
    } else if (typeof dateInput === "number") {
        date = new Date(dateInput);
    } else {
        date = new Date();
    }

    if (isNaN(date.getTime())) {
        throw new Error("Invalid date input");
    }

    const formats: Record<string, string> = {
        ISO: date.toISOString(),
        UTC: date.toUTCString(),
        locale: date.toLocaleString(),
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString()
    };

    return {
        formatted: formats[format] || date.toISOString(),
        timestamp: date.toISOString()
    };
}

async function parseJson(args: JsonObject): Promise<JsonObject> {
    if (typeof args.json !== "string") {
        throw new Error("parseJson requires 'json' string argument");
    }

    try {
        const parsed = JSON.parse(args.json);
        return {
            success: true,
            data: parsed
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Invalid JSON"
        };
    }
}

async function validateEmail(args: JsonObject): Promise<JsonObject> {
    if (typeof args.email !== "string") {
        throw new Error("validateEmail requires 'email' string argument");
    }

    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(args.email);

    return {
        email: args.email,
        isValid,
        reason: isValid ? "Valid email format" : "Invalid email format"
    };
}

async function generateRandomNumber(args: JsonObject): Promise<JsonObject> {
    const min = typeof args.min === "number" ? args.min : 0;
    const max = typeof args.max === "number" ? args.max : 100;

    const random = Math.floor(Math.random() * (max - min + 1)) + min;

    return {
        number: random,
        min,
        max
    };
}

async function generateUuid(): Promise<JsonObject> {
    // Simple UUID v4 generation
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });

    return {
        uuid
    };
}

async function encodeBase64(args: JsonObject): Promise<JsonObject> {
    if (typeof args.text !== "string") {
        throw new Error("encodeBase64 requires 'text' string argument");
    }

    const encoded = Buffer.from(args.text, "utf-8").toString("base64");

    return {
        original: args.text,
        encoded
    };
}

async function decodeBase64(args: JsonObject): Promise<JsonObject> {
    if (typeof args.encoded !== "string") {
        throw new Error("decodeBase64 requires 'encoded' string argument");
    }

    try {
        const decoded = Buffer.from(args.encoded, "base64").toString("utf-8");

        return {
            encoded: args.encoded,
            decoded
        };
    } catch (error) {
        throw new Error("Invalid base64 string");
    }
}

async function hashText(args: JsonObject): Promise<JsonObject> {
    if (typeof args.text !== "string") {
        throw new Error("hashText requires 'text' string argument");
    }

    const { createHash } = await import("crypto");
    const algorithm = typeof args.algorithm === "string" ? args.algorithm : "sha256";

    try {
        const hash = createHash(algorithm).update(args.text).digest("hex");

        return {
            text: args.text,
            algorithm,
            hash
        };
    } catch (error) {
        throw new Error(
            `Hashing error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
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
    const { tool, arguments: args, userId } = input;

    if (!tool.config.knowledgeBaseId) {
        throw new Error("Knowledge base tool missing knowledgeBaseId in config");
    }

    if (typeof args.query !== "string") {
        throw new Error("Knowledge base tool requires 'query' string argument");
    }

    const query = args.query;
    const topK = typeof args.topK === "number" ? args.topK : 5;
    const minScore = typeof args.minScore === "number" ? args.minScore : 0.7;

    // Import required services
    const { KnowledgeBaseRepository } = await import(
        "../../../storage/repositories/KnowledgeBaseRepository"
    );
    const { KnowledgeChunkRepository } = await import(
        "../../../storage/repositories/KnowledgeChunkRepository"
    );
    const { EmbeddingService } = await import("../../../services/embeddings/EmbeddingService");

    const kbRepo = new KnowledgeBaseRepository();
    const chunkRepo = new KnowledgeChunkRepository();
    const embeddingService = new EmbeddingService();

    try {
        // Load knowledge base
        const knowledgeBase = await kbRepo.findById(tool.config.knowledgeBaseId);
        if (!knowledgeBase) {
            throw new Error(`Knowledge base ${tool.config.knowledgeBaseId} not found`);
        }

        // Verify ownership (knowledge bases are user-scoped)
        if (knowledgeBase.user_id !== userId) {
            throw new Error("Access denied to knowledge base");
        }

        // Generate embedding for the query
        const queryEmbedding = await embeddingService.generateQueryEmbedding(
            query,
            {
                model: knowledgeBase.config.embeddingModel || "text-embedding-3-small",
                provider: knowledgeBase.config.embeddingProvider || "openai",
                dimensions: knowledgeBase.config.embeddingDimensions
            },
            userId
        );

        // Search for similar chunks
        const searchResults = await chunkRepo.searchSimilar({
            knowledge_base_id: tool.config.knowledgeBaseId,
            query_embedding: queryEmbedding,
            top_k: topK,
            similarity_threshold: minScore
        });

        // Format results for the agent
        const formattedResults = searchResults.map((result, index) => ({
            rank: index + 1,
            content: result.content,
            source: result.document_name,
            chunkIndex: result.chunk_index,
            similarity: result.similarity,
            metadata: result.metadata
        }));

        return {
            success: true,
            query,
            knowledgeBaseName: knowledgeBase.name,
            resultCount: formattedResults.length,
            results: formattedResults as unknown as JsonValue[],
            // Provide a summary for the LLM
            summary:
                formattedResults.length > 0
                    ? `Found ${formattedResults.length} relevant document chunks from "${knowledgeBase.name}"`
                    : `No relevant information found in "${knowledgeBase.name}" for the query`
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Knowledge base query failed: ${errorMessage}`);
    }
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
