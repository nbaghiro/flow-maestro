# FlowMaestro Agent System

Complete guide to the FlowMaestro AI agent system, including memory management, streaming, LLM providers, tool execution, RAG, observability, and the agent builder UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Memory Management](#memory-management)
3. [Streaming Infrastructure](#streaming-infrastructure)
4. [LLM Provider Integration](#llm-provider-integration)
5. [Tool Execution System](#tool-execution-system)
6. [RAG (Knowledge Bases)](#rag-knowledge-bases)
7. [Observability & Tracing](#observability--tracing)
8. [Agent Builder UI](#agent-builder-ui)
9. [MCP Integration](#mcp-integration)
10. [Workflows as MCP Tools](#workflows-as-mcp-tools)

---

## Overview

FlowMaestro agents are AI-powered conversational assistants that can:
- Maintain context across multi-turn conversations
- Execute tools (workflows, functions, knowledge base queries, MCP)
- Stream responses in real-time
- Work with multiple LLM providers (OpenAI, Anthropic, Google, Cohere)
- Search through uploaded documents (RAG)
- Be traced and monitored for debugging and optimization

### Key Features

- **Memory Management**: Buffer, summary, and vector memory for context retention
- **Streaming**: Real-time token-by-token response delivery via SSE
- **Multi-Provider**: Unified interface for 4+ LLM providers
- **Tool Execution**: Workflows, functions, knowledge bases, and MCP tools
- **RAG System**: Document processing, chunking, embedding, and semantic search
- **Observability**: OpenTelemetry integration with Jaeger visualization
- **Builder UI**: Visual agent configuration and management

---

## Memory Management

Agents need different types of memory to handle conversations effectively.

### Buffer Memory

**Status**: Implemented

**What it does**: Stores all conversation messages in chronological order

**Use case**: Short conversations (< 50 messages) where full history is important

**Implementation**:
```sql
CREATE TABLE flowmaestro.agent_executions (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES flowmaestro.agents(id),
    user_id UUID REFERENCES flowmaestro.users(id),
    conversation_history JSONB,  -- Array of messages
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Advantages**:
- Simple implementation
- Complete conversation context
- No information loss

**Limitations**:
- Token usage grows with conversation length
- Can exceed model context limits
- Cost increases with message count

---

### Summary Memory

**What it does**: Automatically condenses older messages using an LLM, keeping only recent messages in full detail

**Use case**: Long conversations where summarization can reduce token usage while preserving context

**Database Schema**:
```sql
CREATE TABLE flowmaestro.agent_memory_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES flowmaestro.agents(id),
    execution_id UUID REFERENCES flowmaestro.agent_executions(id),
    user_id UUID REFERENCES flowmaestro.users(id),
    content TEXT NOT NULL,
    message_ids UUID[] NOT NULL,
    message_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memory_summaries_agent_exec
ON flowmaestro.agent_memory_summaries(agent_id, execution_id);
```

**Configuration**:
```typescript
interface SummaryMemoryConfig {
    maxMessages: number;           // Keep recent N messages
    summaryInterval: number;        // Summarize every N messages
    summaryModel: string;           // LLM to use for summarization
}
```

**How it works**:
1. Buffer messages as they arrive
2. When buffer exceeds `summaryInterval`, trigger summarization
3. Take messages beyond `maxMessages` and create summary
4. Store summary and keep only recent messages
5. When building context, include summaries + recent messages

**Example Context Flow**:
```
Original: [msg1, msg2, msg3, msg4, msg5, msg6, msg7, msg8]
maxMessages: 3
summaryInterval: 8

After summarization:
Summary: "User asked about X, assistant explained Y, then discussed Z"
Recent: [msg6, msg7, msg8]

Context sent to LLM:
[
  {role: "system", content: "Previous conversation summary: ..."},
  {role: "user", content: msg6},
  {role: "assistant", content: msg7},
  {role: "user", content: msg8}
]
```

**Advantages**:
- Reduces token usage dramatically
- Maintains conversation continuity
- Stays within context limits

**Limitations**:
- LLM summarization can lose nuance
- Summarization costs tokens
- Not reversible (original messages discarded)

---

### Vector Memory (Semantic Recall)

**What it does**: Stores conversation messages as embeddings, enabling semantic search across all past conversations

**Use case**: Finding relevant context from days/weeks ago based on meaning, not recency

**Database Schema**:
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Memory table with vector embeddings
CREATE TABLE flowmaestro.agent_memory_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES flowmaestro.agents(id),
    user_id UUID REFERENCES flowmaestro.users(id),
    execution_id UUID,
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- OpenAI embeddings are 1536 dimensions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast similarity search
CREATE INDEX idx_memory_vectors_agent_user
ON flowmaestro.agent_memory_vectors(agent_id, user_id);

CREATE INDEX idx_memory_vectors_embedding
ON flowmaestro.agent_memory_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_memory_vectors_metadata
ON flowmaestro.agent_memory_vectors
USING gin (metadata jsonb_path_ops);
```

**How it works**:
1. When message arrives, generate embedding using OpenAI/Cohere
2. Store embedding + message content in vector database
3. On each user message, search for semantically similar past messages
4. Inject top K relevant messages as context

**Implementation Example**:
```typescript
// Generate embedding and store
const embedding = await embeddingService.embed(message.content);
await vectorStore.upsert({
    id: message.id,
    embedding,
    content: message.content,
    metadata: {
        role: message.role,
        timestamp: message.timestamp,
        agentId, userId, executionId
    }
});

// Search for relevant context
const queryEmbedding = await embeddingService.embed(userQuery);
const relevantMessages = await vectorStore.search({
    embedding: queryEmbedding,
    topK: 5,
    filter: { agentId, userId },
    minScore: 0.7  // 70%+ similarity
});
```

**Advantages**:
- Find relevant context regardless of when it occurred
- Semantic search is more powerful than keyword search
- Scales to millions of messages

**Limitations**:
- Requires embedding generation (costs + latency)
- Vector indices consume significant RAM
- Need to tune similarity threshold
- Relevance isn't perfect

---

## Streaming Infrastructure

Enables real-time token-by-token response streaming for ChatGPT-like typing effect.

### Server-Sent Events (SSE)

**Backend Implementation**:
```typescript
// backend/src/api/routes/agents/stream.ts

export async function streamAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const { id: agentId } = request.params as { id: string };
    const { message } = request.body as { message: string };

    // Configure SSE headers
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");

    const stream = new Readable({ read() {} });
    reply.send(stream);

    // Stream execution
    await streamAgentExecution({
        agent,
        message,
        userId,
        onToken: (token: string) => {
            stream.push(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
        },
        onToolCall: (toolCall: ToolCall) => {
            stream.push(`event: tool_call\ndata: ${JSON.stringify(toolCall)}\n\n`);
        },
        onComplete: (response: string) => {
            stream.push(`event: done\ndata: ${JSON.stringify({ response })}\n\n`);
            stream.push(null);
        },
        onError: (error: Error) => {
            stream.push(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
            stream.push(null);
        }
    });

    request.raw.on("close", () => stream.destroy());
}
```

### LLM Streaming Clients

Each LLM provider has different streaming formats. FlowMaestro provides unified clients:

**OpenAI Streaming**:
```typescript
async streamOpenAI(input: LLMCallInput, callbacks: StreamCallbacks): Promise<void> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: input.model,
            messages: input.messages,
            tools: input.tools,
            stream: true
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                    callbacks.onComplete?.(fullResponse);
                    return;
                }

                const parsed = JSON.parse(data);
                const token = parsed.choices[0]?.delta?.content;
                if (token) {
                    fullResponse += token;
                    callbacks.onToken?.(token);
                }
            }
        }
    }
}
```

**Anthropic Streaming**:
```typescript
async streamAnthropic(input: LLMCallInput, callbacks: StreamCallbacks): Promise<void> {
    // Anthropic requires system prompt separate
    const systemPrompt = input.messages.find(m => m.role === "system")?.content;
    const messages = input.messages.filter(m => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model: input.model,
            system: systemPrompt,
            messages,
            tools: input.tools,
            stream: true,
            max_tokens: input.maxTokens || 4096
        })
    });

    // Process Anthropic's event stream format
    // Different event types: content_block_delta, message_stop
}
```

### Frontend Streaming Client

**React Component**:
```typescript
export function StreamingChat({ agentId }: { agentId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentResponse, setCurrentResponse] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    const handleSubmit = async (message: string) => {
        setMessages(prev => [...prev, { role: "user", content: message }]);
        setIsStreaming(true);
        setCurrentResponse("");

        await client.streamAgentChat(agentId, message, {
            onToken: (token) => setCurrentResponse(prev => prev + token),
            onComplete: (response) => {
                setMessages(prev => [...prev, { role: "assistant", content: response }]);
                setCurrentResponse("");
                setIsStreaming(false);
            },
            onError: (error) => {
                console.error("Streaming error:", error);
                setIsStreaming(false);
            }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
                {messages.map((msg, i) => (
                    <div key={i} className="mb-4">
                        <strong>{msg.role}:</strong> {msg.content}
                    </div>
                ))}
                {currentResponse && (
                    <div className="mb-4">
                        <strong>assistant:</strong> {currentResponse}
                        <span className="animate-pulse">▋</span>
                    </div>
                )}
            </div>
            {/* Input form */}
        </div>
    );
}
```

---

## LLM Provider Integration

FlowMaestro provides a unified interface for multiple LLM providers.

### Supported Providers

1. **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
2. **Anthropic**: Claude 3 Opus, Sonnet, Haiku
3. **Google**: Gemini Pro, Gemini Ultra
4. **Cohere**: Command, Command-R+

### Unified Interface

```typescript
interface LLMRequest {
    model: string;
    messages: ConversationMessage[];
    tools?: Tool[];
    temperature?: number;
    maxTokens?: number;
}

interface LLMResponse {
    content: string;
    toolCalls?: ToolCall[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

interface LLMClient {
    complete(request: LLMRequest): Promise<LLMResponse>;
    stream(request: LLMRequest, callbacks: StreamCallbacks): Promise<void>;
}
```

### Provider-Specific Formatting

Each provider has different APIs. FlowMaestro handles conversion automatically:

**Google Gemini**:
- Uses `model` role instead of `assistant`
- No system message support
- Tools under `functionDeclarations`

**Cohere**:
- Current message separate from history
- UPPERCASE type names
- Different parameter structure

**Automatic Provider Detection**:
```typescript
function detectProvider(model: string): Provider {
    if (model.startsWith("gpt-")) return "openai";
    if (model.startsWith("claude-")) return "anthropic";
    if (model.startsWith("gemini-")) return "google";
    if (model.startsWith("command-")) return "cohere";
    throw new Error(`Unknown model: ${model}`);
}
```

### Fallback Logic

```typescript
async callWithFallback(
    request: LLMRequest,
    fallbackModels: string[]
): Promise<LLMResponse> {
    const models = [request.model, ...fallbackModels];

    for (const model of models) {
        try {
            return await this.call({ ...request, model });
        } catch (error) {
            console.error(`Model ${model} failed:`, error);
            // Try next model
        }
    }

    throw new Error("All models failed");
}
```

---

## Tool Execution System

Agents can execute four types of tools:

### 1. Workflow Tools

Execute FlowMaestro workflows as tools.

**Configuration**:
```json
{
  "type": "workflow",
  "name": "send_email",
  "description": "Send an email to a recipient",
  "config": {
    "workflowId": "uuid"
  },
  "schema": {
    "type": "object",
    "properties": {
      "to": { "type": "string" },
      "subject": { "type": "string" },
      "body": { "type": "string" }
    },
    "required": ["to", "subject", "body"]
  }
}
```

**Execution**:
```typescript
async function executeWorkflowTool(input: {
    tool: Tool;
    arguments: Record<string, unknown>;
    userId: string;
}): Promise<JsonObject> {
    const temporal = await getTemporalClient();
    const execution = await temporal.workflow.execute("workflowExecutor", {
        taskQueue: "flowmaestro",
        args: [{
            workflowId: input.tool.config.workflowId,
            userId: input.userId,
            inputs: input.arguments
        }]
    });

    return {
        success: true,
        outputs: execution.outputs,
        executionId: execution.id
    };
}
```

### 2. Function Tools

Built-in utility functions.

**Available Functions**:
- `get_current_time`: Get current timestamp and timezone
- `calculate`: Evaluate math expressions (safe, no eval)
- `generate_uuid`: Generate unique identifiers
- `encode_base64` / `decode_base64`: Base64 encoding/decoding
- `hash_text`: SHA-256 text hashing

**Example**:
```typescript
async function executeFunctionTool(
    functionName: string,
    args: Record<string, unknown>
): Promise<JsonObject> {
    switch (functionName) {
        case "get_current_time":
            return {
                timestamp: new Date().toISOString(),
                unix: Date.now(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

        case "calculate":
            const parser = require("expr-eval").Parser;
            return { result: parser.evaluate(args.expression) };

        case "generate_uuid":
            return { uuid: crypto.randomUUID() };

        // ... more functions
    }
}
```

### 3. Knowledge Base Tools

Query uploaded documents using RAG.

**Configuration**:
```json
{
  "type": "knowledge_base",
  "name": "search_docs",
  "description": "Search through uploaded documentation",
  "config": {
    "knowledgeBaseId": "uuid"
  },
  "schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" }
    },
    "required": ["query"]
  }
}
```

**Execution**:
```typescript
async function executeKnowledgeBaseTool(input: {
    tool: Tool;
    arguments: Record<string, unknown>;
    userId: string;
}): Promise<JsonObject> {
    const rag = new RAGPipeline(config);
    const results = await rag.query(
        input.arguments.query as string,
        {
            userId: input.userId,
            knowledgeBaseId: input.tool.config.knowledgeBaseId
        },
        5  // top K results
    );

    return {
        results: results.map(r => ({
            content: r.content,
            score: r.score,
            source: r.metadata.filename
        }))
    };
}
```

### 4. MCP Tools

Call external Model Context Protocol servers.

**Configuration**:
```json
{
  "type": "mcp",
  "name": "query_database",
  "description": "Query external database",
  "config": {
    "serverUrl": "http://mcp-server.example.com",
    "auth": {
      "type": "bearer",
      "token": "..."
    }
  }
}
```

**Execution**:
```typescript
async function executeMCPTool(input: {
    tool: Tool;
    arguments: Record<string, unknown>;
}): Promise<JsonObject> {
    const mcpClient = new MCPClient();

    try {
        // Try RESTful endpoint
        return await mcpClient.post(
            `/tools/${input.tool.name}/execute`,
            { arguments: input.arguments }
        );
    } catch (restError) {
        // Fallback to JSON-RPC
        return await mcpClient.post("/rpc", {
            jsonrpc: "2.0",
            method: "tools.execute",
            params: {
                name: input.tool.name,
                arguments: input.arguments
            },
            id: Date.now()
        });
    }
}
```

### Unified Tool Execution

```typescript
export async function executeToolCall(input: ExecuteToolCallInput): Promise<JsonObject> {
    const { toolCall, availableTools, userId } = input;
    const tool = availableTools.find(t => t.name === toolCall.name);
    if (!tool) throw new Error(`Tool "${toolCall.name}" not found`);

    switch (tool.type) {
        case "workflow":
            return await executeWorkflowTool({ tool, arguments: toolCall.arguments, userId });
        case "function":
            return await executeFunctionTool(tool.config.functionName!, toolCall.arguments);
        case "knowledge_base":
            return await executeKnowledgeBaseTool({ tool, arguments: toolCall.arguments, userId });
        case "mcp":
            return await executeMCPTool({ tool, arguments: toolCall.arguments });
        default:
            throw new Error(`Unknown tool type: ${tool.type}`);
    }
}
```

---

## RAG (Knowledge Bases)

Retrieval-Augmented Generation allows agents to search through uploaded documents.

### Document Processing

**Supported Formats**:
- PDF (`application/pdf`)
- Word (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- Plain text (`text/plain`)
- Markdown (`text/markdown`)
- HTML (`text/html`)

**Processing Pipeline**:
```typescript
async processFile(file: Buffer, filename: string, mimeType: string) {
    switch (mimeType) {
        case "application/pdf":
            const pdfData = await pdfParse(file);
            return { content: pdfData.text, pageCount: pdfData.numpages };

        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            const { value } = await mammoth.extractRawText({ buffer: file });
            return { content: value };

        case "text/html":
            const $ = cheerio.load(file.toString("utf-8"));
            $("script, style").remove();
            return { content: $("body").text().trim() };

        // ... more formats
    }
}
```

### Chunking Strategies

**1. Recursive Chunking (Recommended)**:
```typescript
// Respects document structure (paragraphs, sentences)
const chunks = await chunker.chunk(document, {
    strategy: "recursive",
    chunkSize: 512,
    chunkOverlap: 50,
    separators: ["\n\n", "\n", ". ", " "]
});
```

**2. Fixed-Size Chunking**:
```typescript
// Simple, predictable chunks
const chunks = await chunker.chunk(document, {
    strategy: "fixed",
    chunkSize: 512,
    chunkOverlap: 50
});
```

**3. Sliding Window**:
```typescript
// Overlapping chunks for better context
const chunks = await chunker.chunk(document, {
    strategy: "sliding",
    chunkSize: 512,
    chunkOverlap: 128
});
```

### Complete RAG Pipeline

```typescript
async ingestDocument(file: Buffer, filename: string, mimeType: string) {
    // 1. Extract text
    const document = await processor.processFile(file, filename, mimeType);

    // 2. Chunk document
    const chunks = await chunker.chunk(document, {
        strategy: "recursive",
        chunkSize: 512,
        chunkOverlap: 50
    });

    // 3. Generate embeddings (batch for efficiency)
    const embeddings = await embeddingService.embedBatch(
        chunks.map(c => c.content)
    );

    // 4. Store in vector database
    for (let i = 0; i < chunks.length; i++) {
        await vectorStore.upsert({
            id: chunks[i].id,
            embedding: embeddings[i],
            content: chunks[i].content,
            metadata: {
                documentId: document.id,
                filename,
                chunkIndex: i
            }
        });
    }
}

async query(query: string, topK: number = 5) {
    // 1. Generate query embedding
    const queryEmbedding = await embeddingService.embed(query);

    // 2. Vector search
    const results = await vectorStore.search({
        embedding: queryEmbedding,
        topK,
        minScore: 0.7  // 70%+ similarity
    });

    return results;
}
```

---

## Observability & Tracing

FlowMaestro integrates OpenTelemetry for comprehensive tracing.

### Setup

```typescript
// backend/src/observability/telemetry.ts

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export function initTelemetry() {
    const sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: "flowmaestro-backend",
            [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0"
        }),
        traceExporter: new OTLPTraceExporter({
            url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
                 "http://localhost:4318/v1/traces"
        }),
        instrumentations: [getNodeAutoInstrumentations()]
    });

    sdk.start();
}
```

### Tracing Agent Execution

```typescript
export async function traceAgentExecution<T>(
    executionId: string,
    agentName: string,
    fn: () => Promise<T>
): Promise<T> {
    const tracer = trace.getTracer("flowmaestro-agent");

    return await tracer.startActiveSpan(
        `agent.execute.${agentName}`,
        {
            attributes: {
                "agent.execution_id": executionId,
                "agent.name": agentName
            }
        },
        async (span) => {
            try {
                const result = await fn();
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                span.setStatus({ code: SpanStatusCode.ERROR });
                span.recordException(error as Error);
                throw error;
            } finally {
                span.end();
            }
        }
    );
}
```

### Tracing LLM Calls

```typescript
export async function traceLLMCall<T>(
    model: string,
    provider: string,
    fn: () => Promise<T>
): Promise<T> {
    const tracer = trace.getTracer("flowmaestro-llm");

    return await tracer.startActiveSpan(
        `llm.call.${provider}`,
        {
            attributes: {
                "llm.model": model,
                "llm.provider": provider
            }
        },
        async (span) => {
            const startTime = Date.now();

            try {
                const result = await fn();

                span.setAttribute("llm.duration_ms", Date.now() - startTime);

                if (typeof result === "object" && "usage" in result) {
                    const usage = (result as any).usage;
                    span.setAttribute("llm.prompt_tokens", usage.promptTokens);
                    span.setAttribute("llm.completion_tokens", usage.completionTokens);
                    span.setAttribute("llm.total_tokens", usage.totalTokens);
                }

                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                span.setStatus({ code: SpanStatusCode.ERROR });
                span.recordException(error as Error);
                throw error;
            } finally {
                span.end();
            }
        }
    );
}
```

### Jaeger Visualization

Add Jaeger to docker-compose for trace viewing:

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "4318:4318"    # OTLP HTTP receiver
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

**Access UI**: http://localhost:16686

**What you see**: Visual trace timelines showing agent execution → LLM calls → tool executions with durations, errors, and cost metrics.

---

## Agent Builder UI

React components for creating and managing agents.

### Agent Configuration Form

```typescript
export function AgentConfigForm({ agent, onSave }: AgentConfigFormProps) {
    const [formData, setFormData] = useState({
        name: agent?.name || "",
        description: agent?.description || "",
        model: agent?.model || "gpt-4",
        provider: agent?.provider || "openai",
        systemPrompt: agent?.system_prompt || "You are a helpful AI assistant.",
        temperature: agent?.temperature || 0.7,
        maxTokens: agent?.max_tokens || 4096,
        maxIterations: agent?.max_iterations || 100,
        memoryType: agent?.memory_config.type || "buffer",
        maxMessages: agent?.memory_config.max_messages || 50
    });

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic fields */}
            <div>
                <label>Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                />
            </div>

            {/* Provider and model selection */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label>Provider</label>
                    <select
                        value={formData.provider}
                        onChange={e => setFormData({ ...formData, provider: e.target.value })}
                    >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google</option>
                        <option value="cohere">Cohere</option>
                    </select>
                </div>

                <div>
                    <label>Model</label>
                    <select value={formData.model}>
                        {/* Dynamic options based on provider */}
                    </select>
                </div>
            </div>

            {/* Temperature slider */}
            <div>
                <label>Temperature ({formData.temperature})</label>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={e => setFormData({
                        ...formData,
                        temperature: parseFloat(e.target.value)
                    })}
                />
            </div>

            {/* Memory configuration */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label>Memory Type</label>
                    <select value={formData.memoryType}>
                        <option value="buffer">Buffer (Store All)</option>
                        <option value="summary">Summary (Summarize Old)</option>
                        <option value="vector">Vector (Semantic Search)</option>
                    </select>
                </div>

                <div>
                    <label>Max Messages</label>
                    <input
                        type="number"
                        value={formData.maxMessages}
                        min="1"
                        max="1000"
                    />
                </div>
            </div>
        </form>
    );
}
```

### Tool Management UI

```typescript
export function ToolManager({ agentId }: { agentId: string }) {
    const { data: agent } = useQuery({
        queryKey: ["agent", agentId],
        queryFn: () => api.getAgent(agentId)
    });

    const [showAddDialog, setShowAddDialog] = useState(false);

    const addToolMutation = useMutation({
        mutationFn: (tool: ToolData) => api.addAgentTool(agentId, tool),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agent", agentId] });
            setShowAddDialog(false);
        }
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3>Tools</h3>
                <button onClick={() => setShowAddDialog(true)}>
                    Add Tool
                </button>
            </div>

            <div className="space-y-2">
                {agent?.available_tools.map(tool => (
                    <div key={tool.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                            <div className="font-medium">{tool.name}</div>
                            <div className="text-sm text-gray-600">{tool.description}</div>
                            <div className="text-xs text-gray-500 mt-1">Type: {tool.type}</div>
                        </div>
                        <button onClick={() => removeToolMutation.mutate(tool.id)}>
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            {showAddDialog && (
                <AddToolDialog
                    onClose={() => setShowAddDialog(false)}
                    onAdd={(tool) => addToolMutation.mutate(tool)}
                />
            )}
        </div>
    );
}
```

### Streaming Chat Interface

```typescript
export function AgentChatInterface({ agentId }: { agentId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentResponse, setCurrentResponse] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [input, setInput] = useState("");

    const client = new StreamingAgentClient();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        setMessages(prev => [...prev, { role: "user", content: input }]);
        setInput("");
        setIsStreaming(true);
        setCurrentResponse("");

        await client.streamAgentChat(agentId, input, {
            onToken: (token) => setCurrentResponse(prev => prev + token),
            onToolCall: (toolCall) => {
                // Show tool execution indicator
            },
            onComplete: (response) => {
                setMessages(prev => [...prev, { role: "assistant", content: response }]);
                setCurrentResponse("");
                setIsStreaming(false);
            },
            onError: (error) => {
                console.error("Streaming error:", error);
                setIsStreaming(false);
            }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}
                {currentResponse && (
                    <div className="flex items-start space-x-2">
                        <AgentAvatar />
                        <div className="bg-gray-100 rounded-lg p-3">
                            {currentResponse}
                            <span className="animate-pulse">▋</span>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isStreaming}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border rounded"
                />
            </form>
        </div>
    );
}
```

---

## MCP Integration

FlowMaestro supports the Model Context Protocol for connecting to external tool providers.

### MCP Client

Connect to external MCP servers:

```typescript
export class MCPClient {
    async executeTool(
        serverUrl: string,
        toolName: string,
        arguments: Record<string, unknown>,
        auth?: MCPAuth
    ): Promise<JsonObject> {
        const client = this.createClient(serverUrl, auth);

        try {
            // Try RESTful endpoint
            const response = await client.post(`/tools/${toolName}/execute`, { arguments });
            return response.data.result;
        } catch (restError) {
            // Fallback to JSON-RPC
            const response = await client.post("/rpc", {
                jsonrpc: "2.0",
                method: "tools.execute",
                params: { name: toolName, arguments },
                id: Date.now()
            });
            return response.data.result;
        }
    }

    private createClient(serverUrl: string, auth?: MCPAuth) {
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };

        if (auth) {
            switch (auth.type) {
                case "api_key":
                    headers["X-API-Key"] = auth.apiKey;
                    break;
                case "bearer":
                    headers["Authorization"] = `Bearer ${auth.token}`;
                    break;
                case "basic":
                    const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
                    headers["Authorization"] = `Basic ${encoded}`;
                    break;
            }
        }

        return axios.create({
            baseURL: serverUrl,
            headers,
            timeout: 30000
        });
    }
}
```

---

## Workflows as MCP Tools

FlowMaestro can expose its workflows as MCP-compatible tools, allowing external agents to execute FlowMaestro workflows.

### MCP Server Implementation

```typescript
// backend/src/mcp/server.ts

export class FlowMaestroMCPServer {
    async listTools(): Promise<ToolDefinition[]> {
        const workflows = await workflowRepository.findAll();

        return workflows.map(wf => ({
            name: `workflow_${wf.id}`,
            description: wf.description || `Execute workflow: ${wf.name}`,
            input_schema: this.workflowToSchema(wf.definition)
        }));
    }

    async executeTool(toolName: string, arguments: Record<string, unknown>): Promise<JsonObject> {
        const workflowId = toolName.replace("workflow_", "");

        const temporal = await getTemporalClient();
        const execution = await temporal.workflow.execute("workflowExecutor", {
            taskQueue: "flowmaestro",
            args: [{
                workflowId,
                inputs: arguments
            }]
        });

        return execution.outputs;
    }

    private workflowToSchema(definition: WorkflowDefinition): JsonObject {
        // Extract input nodes to build schema
        const inputNodes = Object.values(definition.nodes).filter(n => n.type === "input");

        const properties: Record<string, any> = {};
        const required: string[] = [];

        for (const node of inputNodes) {
            const varName = node.config.variable || node.id;
            properties[varName] = {
                type: this.mapInputType(node.config.inputType),
                description: node.config.label
            };

            if (node.config.required) {
                required.push(varName);
            }
        }

        return {
            type: "object",
            properties,
            required
        };
    }
}
```

**HTTP Endpoints**:
```typescript
// GET /mcp/tools - List available workflow tools
// POST /mcp/tools/:toolName/execute - Execute workflow tool
// POST /mcp/rpc - JSON-RPC interface
```

This allows external MCP clients to discover and execute FlowMaestro workflows as if they were native tools.

---

## Related Documentation

- **[workflows.md](./workflows.md)**: Workflow system with agent workflow node
- **[integrations.md](./integrations.md)**: Connecting LLM providers and OAuth services
- **[temporal.md](./temporal.md)**: Workflow and agent orchestration
- **[websocket.md](./websocket.md)**: Real-time agent execution updates
- **[testing.md](./testing.md)**: Testing agents and tools

---

## Summary

FlowMaestro's agent system provides:

1. **Comprehensive Memory Management**: Buffer, summary, and vector memory for context retention
2. **Real-time Streaming**: Token-by-token response delivery via SSE
3. **Multi-Provider Support**: OpenAI, Anthropic, Google, Cohere with unified interface
4. **Rich Tool Ecosystem**: Workflows, functions, knowledge bases, and MCP tools
5. **Production-Grade RAG**: Document processing, chunking, and semantic search
6. **Full Observability**: OpenTelemetry tracing with Jaeger visualization
7. **Intuitive UI**: Visual agent builder and chat interface
8. **MCP Compatibility**: Both client and server capabilities

The system enables users to build sophisticated AI agents without writing code, while providing the flexibility and power of a programmatic framework.
