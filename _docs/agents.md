# FlowMaestro Agent System

Complete architectural guide to the FlowMaestro AI agent system, covering memory management, streaming, LLM providers, tool execution, RAG, observability, and the agent builder UI.

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

FlowMaestro agents are AI-powered conversational assistants that provide:

- Multi-turn conversation context management
- Tool execution (workflows, functions, knowledge bases, MCP)
- Real-time response streaming
- Multi-provider LLM support (OpenAI, Anthropic, Google, Cohere)
- Document search via RAG
- Comprehensive tracing and monitoring

### Key Features

- **Memory Management**: Buffer, summary, and vector memory strategies
- **Streaming**: Token-by-token response delivery via Server-Sent Events
- **Multi-Provider**: Unified interface across LLM providers
- **Tool Execution**: Four tool types (workflows, functions, knowledge bases, MCP)
- **RAG System**: Complete document ingestion and semantic search pipeline
- **Observability**: OpenTelemetry traces with Jaeger visualization
- **Builder UI**: Visual agent configuration interface

---

## Memory Management

Agents support three memory strategies for managing conversation context across different use cases.

### Buffer Memory

**Purpose**: Complete conversation history storage

**Best for**: Short conversations (< 50 messages) requiring full context

**Data Storage**: Conversation history stored as JSONB array in `agent_executions` table

**Key fields**:

- `conversation_history`: Array of message objects with role, content, timestamp
- Linked to agent and user via foreign keys
- Indexed on agent_id and execution_id for fast retrieval

**Advantages**:

- Simple implementation
- Complete conversation context preserved
- No information loss

**Trade-offs**:

- Token usage scales linearly with message count
- Can exceed model context windows
- Higher API costs for long conversations

---

### Summary Memory

**Purpose**: Automatic conversation summarization to reduce token usage

**Best for**: Long conversations where older context can be condensed

**Architecture**:

- Stores condensed summaries of older messages
- Keeps recent N messages in full detail
- Uses LLM to generate summaries when buffer exceeds threshold

**Database Schema**:

- `agent_memory_summaries` table tracks summaries
- Links summaries to original message IDs
- Stores summary content, message count, and creation timestamp

**Configuration Parameters**:

- `maxMessages`: Number of recent messages to keep
- `summaryInterval`: Trigger summarization every N messages
- `summaryModel`: LLM model for summarization

**How It Works**:

1. Buffer messages as they arrive
2. When buffer exceeds `summaryInterval`, trigger summarization
3. Generate summary of messages beyond `maxMessages`
4. Store summary and retain only recent messages
5. Context sent to LLM includes: summary + recent messages

**Advantages**:

- Dramatically reduced token usage
- Maintains conversation continuity
- Stays within context limits

**Trade-offs**:

- Summarization costs tokens
- Some nuance may be lost
- Irreversible (original messages discarded)

---

### Vector Memory (Semantic Recall)

**Purpose**: Semantic search across all conversation history

**Best for**: Finding relevant context from past conversations regardless of recency

**Architecture**:

- Uses pgvector extension for vector similarity search
- Stores message embeddings alongside content
- Enables semantic retrieval of relevant past context

**Database Schema**:

- `agent_memory_vectors` table with `VECTOR(1536)` column
- IVFFlat index on embeddings for fast similarity search
- Metadata stored as JSONB for flexible filtering

**How It Works**:

1. Generate embedding for each message using OpenAI/Cohere
2. Store embedding + content + metadata in vector database
3. For each user query, embed the question
4. Search for semantically similar past messages (cosine similarity)
5. Inject top K relevant messages as additional context

**Query Parameters**:

- `topK`: Number of similar messages to retrieve (typically 5)
- `minScore`: Minimum similarity threshold (e.g., 0.7 = 70% similar)
- Filters on agent_id and user_id for isolation

**Advantages**:

- Finds relevant context regardless of temporal distance
- More powerful than keyword search
- Scales to millions of messages

**Trade-offs**:

- Embedding generation adds latency and cost
- Vector indices require significant RAM
- Similarity threshold tuning required
- Not perfect - relevance is probabilistic

---

## Streaming Infrastructure

Real-time token-by-token response streaming for ChatGPT-like user experience.

### Server-Sent Events (SSE)

**Protocol**: HTTP streaming with event-stream content type

**Backend Implementation** (`backend/src/api/routes/agents/stream.ts`):

- SSE headers configured (content-type, cache-control, keep-alive)
- Node.js Readable stream for data transmission
- Event types: `token`, `tool_call`, `done`, `error`
- Client disconnect handling

**Event Format**:

```
event: token
data: {"token": "Hello"}

event: done
data: {"response": "Hello, how can I help?"}
```

### LLM Streaming Clients

Each provider has unique streaming format. FlowMaestro provides unified clients that handle:

**OpenAI**:

- SSE format with `data:` prefix lines
- `[DONE]` marker for completion
- Delta content in chunks

**Anthropic**:

- Event-based streaming
- Separate system prompts
- Multiple event types (content_block_delta, message_stop)

**Google & Cohere**:

- Provider-specific streaming protocols
- Format translation to unified interface

**Unified Interface**:

- `onToken(token: string)`: Called for each token
- `onComplete(response: string)`: Called on completion
- `onError(error: Error)`: Called on failure

### Frontend Streaming Client

**React Component Pattern**:

- State management for messages and streaming response
- `client.streamAgentChat()` method with callbacks
- Real-time UI updates as tokens arrive
- Loading states and error handling
- Animated cursor during streaming

**UI Experience**:

- User sees response appear character-by-character
- Tool calls displayed during execution
- Graceful error handling
- Connection state management

---

## LLM Provider Integration

Unified interface across multiple LLM providers with automatic provider detection and fallback logic.

### Supported Providers

1. **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
2. **Anthropic**: Claude 3 Opus, Sonnet, Haiku
3. **Google**: Gemini Pro, Gemini Ultra
4. **Cohere**: Command, Command-R+

### Unified Interface

**Request/Response Abstraction**:

- Normalized message format across providers
- Tool definitions converted to provider-specific formats
- Temperature, max tokens, and other parameters standardized
- Usage tracking (prompt tokens, completion tokens, total)

**Provider-Specific Handling**:

- **Google Gemini**: Uses `model` role instead of `assistant`, no system messages
- **Cohere**: Current message separate from history, uppercase type names
- **Anthropic**: System prompt as separate field, tools array format differs

**Automatic Provider Detection**:

- Model prefix determines provider (`gpt-` → OpenAI, `claude-` → Anthropic)
- Throws error for unknown models

### Fallback Logic

**Multi-Model Resilience**:

- Primary model + array of fallback models
- Automatic retry with next model on failure
- Error logging for each attempt
- Final failure after exhausting all options

---

## Tool Execution System

Agents execute four types of tools with unified execution interface.

### 1. Workflow Tools

**Purpose**: Execute FlowMaestro workflows as tools

**Configuration**:

- References workflow by ID
- JSON schema defines expected parameters
- Maps tool arguments to workflow inputs

**Execution Flow**:

- Tool invocation triggers Temporal workflow
- Workflow executes with provided inputs
- Results returned as tool output
- Execution ID included for tracking

---

### 2. Function Tools

**Purpose**: Built-in utility functions for common operations

**Available Functions**:

- `get_current_time`: Timestamp and timezone information
- `calculate`: Safe math expression evaluation
- `generate_uuid`: UUID generation
- `encode_base64` / `decode_base64`: Base64 operations
- `hash_text`: SHA-256 hashing

**Implementation**: Direct JavaScript functions without external dependencies

---

### 3. Knowledge Base Tools

**Purpose**: Query uploaded documents using RAG

**Configuration**:

- References knowledge base by ID
- Single parameter: search query string
- Returns top K relevant document chunks

**Execution**: Queries RAG pipeline with semantic search

**Response Format**:

- Array of results with content, score, source metadata
- Sorted by relevance score
- Configurable result count

---

### 4. MCP Tools

**Purpose**: Call external Model Context Protocol servers

**Configuration**:

- Server URL and authentication
- Tool name and parameters
- Protocol support (RESTful + JSON-RPC fallback)

**Execution**:

- Attempts RESTful endpoint first (`POST /tools/{name}/execute`)
- Falls back to JSON-RPC if RESTful fails
- Handles various auth types (API key, bearer token, basic auth)

---

### Unified Tool Execution

**Central Router** (`executeToolCall` function):

- Dispatches to appropriate executor based on tool type
- Standard input format: tool definition + arguments + user context
- Standard output format: JSON object
- Error handling with graceful failures

---

## RAG (Knowledge Bases)

Retrieval-Augmented Generation enables agents to search uploaded documents.

### Document Processing Pipeline

**Supported Formats**:

- PDF documents
- Microsoft Word (.docx)
- Plain text
- Markdown
- HTML

**Processing Steps**:

1. **Text Extraction**: Format-specific parsers extract text
2. **Chunking**: Text split into manageable segments
3. **Embedding Generation**: OpenAI/Cohere creates vector representations
4. **Storage**: Vectors stored in PostgreSQL with pgvector

### Chunking Strategies

**1. Recursive Chunking** (Recommended):

- Respects document structure (paragraphs, sentences)
- Hierarchical separators: `\n\n`, `\n`, `. `, ` `
- Preserves semantic coherence

**2. Fixed-Size Chunking**:

- Simple, predictable chunks
- Fixed character count with overlap

**3. Sliding Window**:

- Overlapping chunks for context preservation
- Higher overlap = more redundancy but better context

**Configuration Parameters**:

- `chunkSize`: Target chunk size (typically 512 characters)
- `chunkOverlap`: Overlap between chunks (typically 50-128 characters)
- `strategy`: chunking method selection

### Query Pipeline

**Semantic Search Process**:

1. Generate embedding for user query
2. Perform cosine similarity search in vector database
3. Filter by knowledge base and user IDs
4. Apply minimum similarity threshold (typically 0.7)
5. Return top K results (typically 5)
6. Inject into LLM context as additional knowledge

---

## Observability & Tracing

OpenTelemetry integration provides comprehensive execution visibility.

### Setup

**SDK Configuration**:

- Service name identification
- OTLP exporter for trace data
- Auto-instrumentation for common libraries
- HTTP endpoint configuration (default: localhost:4318)

### Tracing Patterns

**Agent Execution Traces**:

- Span per agent execution
- Attributes: execution_id, agent_name
- Status codes: OK, ERROR
- Exception recording on failures

**LLM Call Traces**:

- Span per LLM API call
- Attributes: model, provider, duration
- Token usage metrics (prompt, completion, total)
- Latency measurement

**Nested Spans**: Tool calls, memory operations, and sub-operations create child spans

### Jaeger Visualization

**Setup**: Docker Compose service with OTLP receiver

**Access**: http://localhost:16686

**Features**:

- Visual trace timelines
- Execution flow diagrams
- Performance bottleneck identification
- Error propagation tracking
- Token usage and cost analysis

---

## Agent Builder UI

React components for visual agent configuration.

### Agent Configuration Form

**Settings Available**:

- **Basic**: Name, description
- **LLM**: Provider, model selection
- **Parameters**: Temperature, max tokens, max iterations
- **Memory**: Type selection (buffer/summary/vector), configuration
- **System Prompt**: Custom instructions

**Interactive Elements**:

- Temperature slider (0-2 range)
- Model dropdown (filtered by provider)
- Memory type selector with configuration panels
- Real-time validation

### Tool Management UI

**Features**:

- List of configured tools with descriptions
- Add/remove tools
- Tool type indicators
- Configuration dialogs per tool type

**Tool Types**:

- Workflow tools: Select from user's workflows
- Function tools: Choose from built-in functions
- Knowledge base tools: Select knowledge base
- MCP tools: Configure server connection

### Streaming Chat Interface

**Components**:

- Message history display
- Real-time response rendering
- Typing indicator during streaming
- Tool execution indicators
- Error display
- Input form with send button

**State Management**:

- Zustand store for messages
- Streaming state tracking
- Connection status

---

## MCP Integration

Model Context Protocol support for external tool servers.

### MCP Client

**Capabilities**:

- Connect to external MCP servers
- Discover available tools
- Execute tools with arguments
- Handle authentication (API key, bearer token, basic auth)

**Protocol Support**:

- RESTful endpoints (preferred)
- JSON-RPC 2.0 fallback
- Configurable timeouts
- Error handling

**Tool Discovery**: Automatic enumeration of server capabilities on connection

---

## Workflows as MCP Tools

FlowMaestro exposes workflows as MCP-compatible tools for external agents.

### MCP Server Implementation

**Endpoints**:

- `GET /mcp/tools`: List available workflow tools
- `POST /mcp/tools/:toolName/execute`: Execute workflow
- `POST /mcp/rpc`: JSON-RPC interface

**Tool Schema Generation**:

- Extracts input nodes from workflow definition
- Generates JSON schema from node configurations
- Maps workflow variables to tool parameters

**Execution**:

- Tool calls trigger Temporal workflows
- Returns workflow outputs as tool results
- Execution tracking via workflow IDs

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

1. **Comprehensive Memory Management**: Three strategies for different conversation lengths and patterns
2. **Real-time Streaming**: Token-by-token response delivery with unified provider interface
3. **Multi-Provider Support**: Seamless integration with major LLM providers
4. **Rich Tool Ecosystem**: Four tool types covering workflows, functions, knowledge, and external servers
5. **Production-Grade RAG**: Complete document processing and semantic search pipeline
6. **Full Observability**: OpenTelemetry tracing with visual debugging
7. **Intuitive UI**: Visual agent builder and chat interface
8. **MCP Compatibility**: Both client and server implementations

The architecture cleanly separates concerns while providing a unified developer experience for building sophisticated AI agents without complex infrastructure management.
