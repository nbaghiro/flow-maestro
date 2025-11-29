# FlowMaestro Public API & SDK Implementation Plan

## Overview

This plan outlines the implementation of a public API with API key authentication and official JavaScript/Python SDKs for FlowMaestro, focusing on workflow execution as the primary use case.

## Key Design Decisions

| Decision       | Choice                | Rationale                                          |
| -------------- | --------------------- | -------------------------------------------------- |
| Authentication | API Keys only         | Simple, stateless, ideal for server-to-server      |
| Versioning     | URL path (`/api/v1/`) | Clear, cacheable, easy to manage                   |
| Rate Limiting  | Per-key with Redis    | Scalable, configurable per customer                |
| SDK Location   | Monorepo `/sdks/`     | Shared types, coordinated releases                 |
| Agent APIs     | Thread-based in v1    | Stateful conversations via threads + SSE streaming |
| Workflow CRUD  | Execution only        | Create/edit workflows in UI; API for running them  |
| Monitoring     | Polling + SSE         | Both options for maximum flexibility               |

---

## 1. API Key Infrastructure

### 1.1 Database Schema

**New Migration**: `backend/migrations/XXXXXX_create-api-keys-table.sql`

```sql
CREATE TABLE IF NOT EXISTS flowmaestro.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(12) NOT NULL,      -- "fm_live_xxxx" for display
    key_hash VARCHAR(255) NOT NULL,        -- SHA-256 hash of full key
    scopes TEXT[] NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS flowmaestro.api_key_usage (
    id BIGSERIAL PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES flowmaestro.api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_api_keys_key_hash ON flowmaestro.api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON flowmaestro.api_keys(user_id);
CREATE INDEX idx_api_key_usage_key_id_created ON flowmaestro.api_key_usage(api_key_id, created_at DESC);
```

### 1.2 Key Format

- **Format**: `fm_live_<32-char-random-base62>`
- **Example**: `fm_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- **Storage**: Only SHA-256 hash stored; key shown once at creation
- **Prefix**: First 12 chars stored for identification in UI

### 1.3 Scopes Model

```typescript
const API_KEY_SCOPES = {
    "workflows:read": "View workflow definitions",
    "workflows:execute": "Execute workflows",
    "executions:read": "View execution status and results",
    "executions:cancel": "Cancel running executions",
    "triggers:read": "View triggers",
    "triggers:execute": "Execute triggers manually",
    "agents:read": "View agent configurations",
    "agents:execute": "Execute agent conversations",
    "threads:read": "View conversation threads",
    "threads:write": "Create and manage threads"
};

// Predefined bundles
const SCOPE_BUNDLES = {
    "workflow-executor": [
        "workflows:read",
        "workflows:execute",
        "executions:read",
        "executions:cancel",
        "triggers:read",
        "triggers:execute"
    ],
    "agent-executor": ["agents:read", "agents:execute", "threads:read", "threads:write"],
    "full-access": [
        "workflows:read",
        "workflows:execute",
        "executions:read",
        "executions:cancel",
        "triggers:read",
        "triggers:execute",
        "agents:read",
        "agents:execute",
        "threads:read",
        "threads:write"
    ],
    "read-only": [
        "workflows:read",
        "executions:read",
        "triggers:read",
        "agents:read",
        "threads:read"
    ]
};
```

---

## 2. Public API Design

### 2.1 Endpoint Structure

Base URL: `/api/v1/`

**Workflows** (read + execute only, no CRUD):
| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/workflows` | workflows:read | List user's workflows |
| GET | `/workflows/:id` | workflows:read | Get workflow details |
| POST | `/workflows/:id/execute` | workflows:execute | Execute workflow |

**Executions** (polling + SSE):
| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/executions` | executions:read | List executions (filterable) |
| GET | `/executions/:id` | executions:read | Get execution status (polling) |
| GET | `/executions/:id/events` | executions:read | SSE event stream (real-time) |
| POST | `/executions/:id/cancel` | executions:cancel | Cancel running execution |

**Triggers**:
| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/triggers` | triggers:read | List triggers |
| POST | `/triggers/:id/execute` | triggers:execute | Execute trigger manually |

**Agents** (read only, no CRUD):
| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/agents` | agents:read | List user's agents |
| GET | `/agents/:id` | agents:read | Get agent details |

**Threads** (conversation management):
| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| POST | `/agents/:id/threads` | threads:write | Create new thread for agent |
| GET | `/agents/:id/threads` | threads:read | List threads for agent |
| GET | `/threads/:id` | threads:read | Get thread with messages |
| DELETE | `/threads/:id` | threads:write | Delete thread |
| POST | `/threads/:id/messages` | agents:execute | Send message to agent |
| GET | `/threads/:id/messages` | threads:read | List messages in thread |
| GET | `/threads/:id/events` | agents:execute | SSE stream for real-time responses |

### 2.2 Response Format

**Success**:

```json
{
    "data": { ... },
    "meta": { "request_id": "req_xxx", "timestamp": "2024-..." }
}
```

**Paginated**:

```json
{
    "data": [...],
    "pagination": { "total": 100, "page": 1, "per_page": 20, "has_more": true },
    "meta": { ... }
}
```

**Error**:

```json
{
    "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} },
    "meta": { ... }
}
```

### 2.3 Rate Limiting Headers

```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 45
X-RateLimit-Limit-Day: 10000
X-RateLimit-Remaining-Day: 9500
```

---

## 3. SDK Architecture

### 3.1 Directory Structure

```
/sdks/
├── shared/
│   └── types/
│       └── api-types.ts          # Shared TypeScript types
├── javascript/
│   ├── package.json              # @flowmaestro/sdk
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── resources/
│   │   │   ├── workflows.ts
│   │   │   ├── executions.ts
│   │   │   └── triggers.ts
│   │   └── errors.ts
│   └── tests/
└── python/
    ├── pyproject.toml            # flowmaestro
    ├── flowmaestro/
    │   ├── __init__.py
    │   ├── client.py
    │   ├── resources/
    │   │   ├── workflows.py
    │   │   ├── executions.py
    │   │   └── triggers.py
    │   └── errors.py
    └── tests/
```

### 3.2 JavaScript SDK Usage

```typescript
import { FlowMaestroClient } from "@flowmaestro/sdk";

const client = new FlowMaestroClient({ apiKey: "fm_live_..." });

// === WORKFLOW EXECUTION ===

// Execute workflow
const { execution_id } = await client.workflows.execute("wf_123", {
    inputs: { name: "John" }
});

// Wait for completion with progress
const result = await client.executions.waitForCompletion(execution_id, {
    pollInterval: 2000,
    onProgress: (exec) => console.log(exec.status)
});

// Or stream events (SSE)
client.executions.streamEvents(execution_id, {
    onNodeCompleted: (data) => console.log(`Node ${data.node_id} done`),
    onCompleted: (data) => console.log("Done!", data.outputs)
});

// === AGENT CONVERSATIONS ===

// Create a new thread
const thread = await client.agents.createThread("agent_123");

// Send message and stream response
await client.threads.sendMessage(thread.id, {
    content: "What's the weather in NYC?",
    stream: true,
    onToken: (token) => process.stdout.write(token),
    onToolCall: (tool) => console.log(`\nCalling: ${tool.name}`),
    onComplete: (msg) => console.log("\nDone:", msg.message_id)
});

// Continue conversation
await client.threads.sendMessage(thread.id, {
    content: "And what about tomorrow?",
    stream: true,
    onToken: (token) => process.stdout.write(token)
});

// Get conversation history
const messages = await client.threads.getMessages(thread.id);
```

### 3.3 Python SDK Usage

```python
from flowmaestro import FlowMaestroClient

with FlowMaestroClient(api_key="fm_live_...") as client:
    # === WORKFLOW EXECUTION ===

    # Execute workflow
    result = client.workflows.execute("wf_123", inputs={"name": "John"})

    # Wait for completion
    final = client.executions.wait_for_completion(
        result["execution_id"],
        poll_interval=2.0,
        on_progress=lambda e: print(f"Status: {e['status']}")
    )
    print(f"Outputs: {final['outputs']}")

    # === AGENT CONVERSATIONS ===

    # Create a new thread
    thread = client.agents.create_thread("agent_123")

    # Send message and stream response
    for event in client.threads.send_message_stream(
        thread["id"],
        content="What's the weather in NYC?"
    ):
        if event["type"] == "token":
            print(event["content"], end="", flush=True)
        elif event["type"] == "tool_call":
            print(f"\n[Calling: {event['name']}]")
        elif event["type"] == "message_complete":
            print(f"\n[Done: {event['message_id']}]")

    # Get conversation history
    messages = client.threads.get_messages(thread["id"])
```

---

## 4. Agent API Design

### 4.1 Thread-Based Conversation Model

Agents use a **thread-based** model for stateful conversations:

```
Agent (read-only)
  └── Threads (many)
        └── Messages (many)
              └── Tool Calls (embedded)
```

### 4.2 Conversation Flow

```
1. Create thread:      POST /agents/:id/threads
2. Send message:       POST /threads/:id/messages
3. Stream response:    GET  /threads/:id/events (SSE)
4. Continue chat:      Repeat steps 2-3
5. Get history:        GET  /threads/:id/messages
```

### 4.3 SSE Event Types for Agent Streaming

```typescript
// Token-by-token streaming
event: token
data: {"content": "Hello", "index": 0}

// Tool call started
event: tool_call
data: {"id": "tc_123", "name": "search", "arguments": {...}}

// Tool result
event: tool_result
data: {"id": "tc_123", "result": {...}}

// Thinking/reasoning (optional)
event: thinking
data: {"content": "Let me search for..."}

// Message complete
event: message_complete
data: {"message_id": "msg_123", "content": "...", "tool_calls": [...]}

// Error
event: error
data: {"code": "AGENT_ERROR", "message": "..."}
```

### 4.4 Send Message Request/Response

**Request**: `POST /threads/:id/messages`

```json
{
    "content": "What's the weather in NYC?",
    "stream": true
}
```

**Response** (if `stream: false`):

```json
{
    "data": {
        "message_id": "msg_456",
        "role": "assistant",
        "content": "The weather in NYC is...",
        "tool_calls": [
            {"id": "tc_1", "name": "get_weather", "arguments": {"city": "NYC"}, "result": {...}}
        ],
        "created_at": "2024-..."
    }
}
```

**Response** (if `stream: true`):

```
HTTP/1.1 200 OK
Content-Type: text/event-stream

event: token
data: {"content": "The"}

event: token
data: {"content": " weather"}

...

event: message_complete
data: {"message_id": "msg_456", ...}
```

---

## 5. Implementation Phases

### Phase 1: API Key Infrastructure

- Database migration for api_keys table
- ApiKeyRepository implementation
- API key management endpoints (internal, for dashboard)
- Frontend UI for key management
- API key authentication middleware

### Phase 2: Public API Core

- Public API router at `/api/v1/`
- Rate limiting middleware with Redis
- Standardized request/response formatting
- Error handling middleware
- Workflow endpoints (list, get, execute)

### Phase 3: Execution Monitoring

- Execution list/get/cancel endpoints
- SSE events endpoint (`/executions/:id/events`)
- Trigger endpoints
- Webhook callback support for async completion

### Phase 4: Agent & Thread APIs

- Agent list/get endpoints
- Thread CRUD endpoints
- Message send endpoint with streaming support
- Thread events SSE endpoint
- Integration with existing agent execution infrastructure

### Phase 5: JavaScript SDK

- Package setup with TypeScript
- FlowMaestroClient class
- Resource classes (workflows, executions, triggers, agents, threads)
- Polling and SSE streaming helpers
- Unit tests and documentation

### Phase 6: Python SDK

- Package setup with pyproject.toml
- FlowMaestroClient with type hints
- Resource classes with async support
- Sync and async client options
- Unit tests and documentation

### Phase 7: Documentation

- API reference (OpenAPI spec)
- SDK getting started guides
- Code examples for workflows and agents

---

## 6. Files to Create/Modify

### New Files

| Path                                                   | Purpose                     |
| ------------------------------------------------------ | --------------------------- |
| `backend/migrations/XXXXXX_create-api-keys-table.sql`  | API keys schema             |
| `backend/src/storage/models/ApiKey.ts`                 | ApiKey model                |
| `backend/src/storage/repositories/ApiKeyRepository.ts` | Key CRUD operations         |
| `backend/src/api/public/middleware/api-key-auth.ts`    | API key auth middleware     |
| `backend/src/api/public/middleware/rate-limit.ts`      | Rate limiting               |
| `backend/src/api/public/routes/v1/workflows/*.ts`      | Workflow endpoints          |
| `backend/src/api/public/routes/v1/executions/*.ts`     | Execution endpoints         |
| `backend/src/api/public/routes/v1/triggers/*.ts`       | Trigger endpoints           |
| `backend/src/api/public/routes/v1/agents/*.ts`         | Agent endpoints             |
| `backend/src/api/public/routes/v1/threads/*.ts`        | Thread/message endpoints    |
| `backend/src/api/routes/api-keys/*.ts`                 | Key management (internal)   |
| `shared/src/api-types.ts`                              | Public API type definitions |
| `sdks/javascript/*`                                    | JavaScript SDK              |
| `sdks/python/*`                                        | Python SDK                  |

### Reference Files (Patterns to Follow)

| File                                                     | Pattern                    |
| -------------------------------------------------------- | -------------------------- |
| `backend/src/api/middleware/auth.ts`                     | Auth middleware structure  |
| `backend/src/api/routes/triggers/execute.ts`             | Workflow execution pattern |
| `backend/src/api/routes/agents/stream.ts`                | SSE streaming for agents   |
| `backend/src/api/routes/agents/execute.ts`               | Agent execution pattern    |
| `backend/src/storage/repositories/WorkflowRepository.ts` | Repository pattern         |
| `backend/src/storage/repositories/ThreadRepository.ts`   | Thread/message storage     |
| `backend/src/storage/repositories/AgentRepository.ts`    | Agent data access          |
| `shared/src/types.ts`                                    | Type definitions           |

---

## 7. Key Technical Details

### API Key Authentication Flow

1. Extract `Authorization: Bearer fm_live_xxx` header
2. Hash key with SHA-256
3. Lookup in `api_keys` table by hash
4. Verify not revoked/expired
5. Check required scopes
6. Update `last_used_at` asynchronously
7. Attach `request.apiKey = { id, userId, scopes }` for handlers

### Rate Limiting Flow (Redis)

1. Get minute/day window keys: `ratelimit:{keyId}:minute:{window}`
2. INCR counters with TTL
3. Compare against key's limits
4. Set headers, return 429 if exceeded

### Execution Events (SSE)

1. Subscribe to Redis channel `execution:events:{executionId}`
2. Format as SSE: `data: {...}\n\n`
3. Handle client disconnect (Redis unsubscribe)
4. Support event filtering via query params

---

## 8. Error Codes

### Authentication Errors (4xx)

| Code                 | HTTP | Description                                     |
| -------------------- | ---- | ----------------------------------------------- |
| `UNAUTHORIZED`       | 401  | Missing or invalid Authorization header         |
| `INVALID_API_KEY`    | 401  | API key is invalid, expired, or revoked         |
| `INSUFFICIENT_SCOPE` | 403  | API key lacks required scope for this operation |
| `FORBIDDEN`          | 403  | User doesn't have access to this resource       |

### Validation Errors (4xx)

| Code                     | HTTP | Description                                               |
| ------------------------ | ---- | --------------------------------------------------------- |
| `VALIDATION_ERROR`       | 400  | Request body failed validation (details in error.details) |
| `INVALID_PARAMETER`      | 400  | Invalid query parameter or path parameter                 |
| `MISSING_REQUIRED_FIELD` | 400  | Required field is missing from request                    |

### Resource Errors (4xx)

| Code                  | HTTP | Description                                  |
| --------------------- | ---- | -------------------------------------------- |
| `WORKFLOW_NOT_FOUND`  | 404  | Workflow doesn't exist or user lacks access  |
| `EXECUTION_NOT_FOUND` | 404  | Execution doesn't exist or user lacks access |
| `AGENT_NOT_FOUND`     | 404  | Agent doesn't exist or user lacks access     |
| `THREAD_NOT_FOUND`    | 404  | Thread doesn't exist or user lacks access    |
| `TRIGGER_NOT_FOUND`   | 404  | Trigger doesn't exist or user lacks access   |

### Rate Limiting Errors (4xx)

| Code                   | HTTP | Description                                            |
| ---------------------- | ---- | ------------------------------------------------------ |
| `RATE_LIMIT_EXCEEDED`  | 429  | Per-minute rate limit exceeded (retry after X seconds) |
| `DAILY_LIMIT_EXCEEDED` | 429  | Daily API quota exceeded (resets at midnight UTC)      |

### Execution Errors (4xx/5xx)

| Code                  | HTTP | Description                                          |
| --------------------- | ---- | ---------------------------------------------------- |
| `EXECUTION_FAILED`    | 500  | Workflow execution failed (details in error.details) |
| `EXECUTION_TIMEOUT`   | 408  | Synchronous execution timed out (use async mode)     |
| `EXECUTION_CANCELLED` | 409  | Execution was cancelled                              |
| `AGENT_ERROR`         | 500  | Agent execution failed                               |

### Server Errors (5xx)

| Code                  | HTTP | Description                                |
| --------------------- | ---- | ------------------------------------------ |
| `INTERNAL_ERROR`      | 500  | Unexpected server error                    |
| `SERVICE_UNAVAILABLE` | 503  | Service temporarily unavailable            |
| `TEMPORAL_ERROR`      | 503  | Workflow orchestration service unavailable |

### Error Response Examples

```json
// Authentication error
{
    "error": {
        "code": "INVALID_API_KEY",
        "message": "API key is invalid, expired, or revoked"
    },
    "meta": { "request_id": "req_abc123" }
}

// Validation error with details
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed",
        "details": [
            { "field": "inputs.email", "message": "must be a valid email address" },
            { "field": "inputs.count", "message": "must be a positive integer" }
        ]
    },
    "meta": { "request_id": "req_abc123" }
}

// Rate limit error with retry info
{
    "error": {
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "Rate limit exceeded. Please slow down.",
        "retry_after": 45
    },
    "meta": { "request_id": "req_abc123" }
}

// Scope error with helpful info
{
    "error": {
        "code": "INSUFFICIENT_SCOPE",
        "message": "This operation requires scopes: workflows:execute",
        "required_scopes": ["workflows:execute"],
        "your_scopes": ["workflows:read", "executions:read"]
    },
    "meta": { "request_id": "req_abc123" }
}
```

---

## 9. OpenAPI Specification Structure

The public API will be documented using OpenAPI 3.1. The spec will be generated from code annotations and maintained at `backend/src/api/public/openapi.yaml`.

### Spec Organization

```yaml
openapi: 3.1.0
info:
    title: FlowMaestro Public API
    version: 1.0.0
    description: API for executing workflows and interacting with agents

servers:
    - url: https://api.flowmaestro.com/api/v1
      description: Production
    - url: http://localhost:3001/api/v1
      description: Development

security:
    - ApiKeyAuth: []

components:
    securitySchemes:
        ApiKeyAuth:
            type: http
            scheme: bearer
            bearerFormat: API Key
            description: "Use your API key: Bearer fm_live_xxx"

    schemas:
        # Shared schemas
        Meta:
            type: object
            properties:
                request_id: { type: string }
                timestamp: { type: string, format: date-time }

        Pagination:
            type: object
            properties:
                total: { type: integer }
                page: { type: integer }
                per_page: { type: integer }
                has_more: { type: boolean }

        Error:
            type: object
            required: [code, message]
            properties:
                code: { type: string }
                message: { type: string }
                details: { type: object }
                retry_after: { type: integer }

        # Resource schemas
        Workflow:
            type: object
            properties:
                id: { type: string, format: uuid }
                name: { type: string }
                description: { type: string }
                created_at: { type: string, format: date-time }
                updated_at: { type: string, format: date-time }

        Execution:
            type: object
            properties:
                id: { type: string, format: uuid }
                workflow_id: { type: string, format: uuid }
                status: { type: string, enum: [pending, running, completed, failed, cancelled] }
                inputs: { type: object }
                outputs: { type: object }
                started_at: { type: string, format: date-time }
                completed_at: { type: string, format: date-time }

        Agent:
            type: object
            properties:
                id: { type: string, format: uuid }
                name: { type: string }
                description: { type: string }
                model: { type: string }

        Thread:
            type: object
            properties:
                id: { type: string, format: uuid }
                agent_id: { type: string, format: uuid }
                created_at: { type: string, format: date-time }

        Message:
            type: object
            properties:
                id: { type: string, format: uuid }
                role: { type: string, enum: [user, assistant] }
                content: { type: string }
                tool_calls: { type: array }
                created_at: { type: string, format: date-time }

paths:
    /workflows:
        get:
            summary: List workflows
            tags: [Workflows]
            # ...

    /workflows/{id}:
        get:
            summary: Get workflow
            tags: [Workflows]
            # ...

    /workflows/{id}/execute:
        post:
            summary: Execute workflow
            tags: [Workflows]
            # ...

    # ... additional paths for executions, triggers, agents, threads
```

### Auto-Generation Strategy

1. **Route annotations**: Use `@fastify/swagger` decorators on route handlers
2. **Zod-to-OpenAPI**: Convert Zod schemas to OpenAPI using `zod-to-openapi`
3. **Build step**: Generate `openapi.yaml` during build
4. **Validation**: Validate spec with `@redocly/cli` in CI
5. **Documentation**: Host interactive docs with Redoc or Swagger UI

### Documentation Hosting

```
/docs/api              → Interactive API docs (Swagger UI)
/docs/api/openapi.json → OpenAPI spec (JSON)
/docs/api/openapi.yaml → OpenAPI spec (YAML)
```
