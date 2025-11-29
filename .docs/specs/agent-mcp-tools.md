# Agent MCP Tools: Integration Operations as Agent Tools

## Overview

This spec defines how integration provider operations are exposed as MCP (Model Context Protocol) tools for agents to use during conversations.

**What this enables:**

- Agents can send Slack messages, create Notion pages, query databases, etc.
- Users select which integrations/operations to give each agent access to
- All 24+ existing integration providers (Slack, Notion, GitHub, Airtable, etc.) become available as agent tools

**How it works:**

- Frontend UI allows users to browse connections and select operations to add as tools
- Backend stores tool definitions in the agent's `available_tools` array
- During execution, when LLM requests a tool call, the agent runner executes the integration operation via the existing `ExecutionRouter`

**Current Status:**

- ✅ Frontend UI complete
- ✅ Integration infrastructure complete (providers, MCP adapters, ExecutionRouter)
- ❌ Backend needs 4 small changes to accept and execute `type: "mcp"` tools

## Current Implementation Status

### Already Implemented ✅

1. **Frontend UI** (`AddMCPIntegrationDialog.tsx`):
    - Provider selection with search and category filtering
    - Connection selection for chosen provider
    - MCP tools discovery and multi-selection
    - Integration with agent builder

2. **MCP Tools Discovery API**:
    - `GET /api/connections/:id/mcp-tools` - Returns available MCP tools for a connection
    - Backend route: `backend/src/api/routes/connections/mcp-tools.ts`

3. **Provider Infrastructure**:
    - 24+ integration providers with operation definitions
    - MCP adapters for each provider
    - ExecutionRouter for context-aware execution
    - Connection management with encryption

4. **Frontend API Client**:
    - `getConnectionMCPTools()` - Fetch MCP tools for a connection
    - `addAgentTool()` - Add tool to agent
    - Type definitions for `MCPTool` and `AddToolRequest`

### Needs Implementation ❌

1. **Backend Tool Type Support**:
    - `backend/src/api/routes/agents/add-tool.ts` - Add `"mcp"` to enum (currently only has workflow, function, knowledge_base)
    - Update Zod schema to accept `connectionId` and `provider` in config

2. **Agent Execution**:
    - `backend/src/temporal/activities/agent/agent-activities.ts` - Add `case "mcp"` to `executeToolCall()`
    - Create `backend/src/temporal/activities/agent/mcp-tool-executor.ts` - New executor for MCP tools

3. **Type Definitions**:
    - `shared/src/agents.ts` - Add `"mcp"` to `ToolType` union
    - Update `ToolConfig` interface to include `connectionId` and `provider`

## Architecture Components

### Tool Type: "mcp"

The frontend already sends tools with `type: "mcp"`, but the backend needs to be updated to handle them.

```typescript
export interface Tool {
    id: string;
    name: string; // e.g., "slack_sendMessage"
    description: string;
    type: ToolType; // Add "mcp" to existing types
    schema: JsonObject; // MCP JSON Schema
    config: ToolConfig;
}

export type ToolType = "workflow" | "function" | "knowledge_base" | "agent" | "mcp"; // NEW - already used by frontend

export interface ToolConfig {
    workflowId?: string;
    functionName?: string;
    knowledgeBaseId?: string;
    agentId?: string;
    agentName?: string;
    // NEW: MCP tool config (already sent by frontend)
    connectionId?: string; // Links to connections table
    provider?: string; // e.g., "slack", "notion"
}
```

## Data Model

### Tool Storage

No database schema changes needed. Tools are stored in the `agents.available_tools` JSONB column.

**Example agent record with MCP tools:**

```json
{
    "id": "agent_123",
    "name": "Support Agent",
    "available_tools": [
        {
            "id": "tool_slack_send",
            "name": "slack_sendMessage",
            "description": "Send a message to a Slack channel or DM",
            "type": "mcp",
            "schema": {
                "type": "object",
                "properties": {
                    "channel": { "type": "string", "description": "Channel ID or name" },
                    "text": { "type": "string", "description": "Message text" },
                    "thread_ts": { "type": "string", "description": "Thread timestamp" }
                },
                "required": ["channel", "text"]
            },
            "config": {
                "connectionId": "conn_abc123",
                "provider": "slack"
            }
        },
        {
            "id": "tool_notion_create",
            "name": "notion_createPage",
            "description": "Create a new page in Notion",
            "type": "mcp",
            "schema": {
                /* ... */
            },
            "config": {
                "connectionId": "conn_def456",
                "provider": "notion"
            }
        }
    ]
}
```

### Type Definitions

**File**: `shared/src/agents.ts`

```typescript
// Update ToolType to include "mcp"
export type ToolType = "workflow" | "function" | "knowledge_base" | "agent" | "mcp";

// Update ToolConfig to include MCP fields
export interface ToolConfig {
    workflowId?: string;
    functionName?: string;
    knowledgeBaseId?: string;
    agentId?: string;
    agentName?: string;
    connectionId?: string; // For MCP tools
    provider?: string; // For MCP tools
}

// MCP-specific helper type
export interface MCPToolConfig {
    connectionId: string; // UUID of connection
    provider: string; // Provider name (e.g., "slack")
}

export interface MCPTool extends Tool {
    type: "mcp";
    config: MCPToolConfig;
}
```

## User Flow

### 1. Discovery: List Available Operations ✅ (Already Implemented)

**UI Component**: `AddMCPIntegrationDialog.tsx`

**User Actions**:

1. Click "Add an MCP integration" button in agent builder
2. Search and select provider (e.g., Slack, Notion, GitHub)
3. Select existing connection or create new one
4. View available MCP tools for that connection
5. Select one or more tools to add
6. Click "Add Selected (N)" button

**API Endpoint**: `GET /api/connections/:connectionId/mcp-tools`

**Request**:

```http
GET /api/connections/conn_abc123/mcp-tools
Authorization: Bearer <jwt_token>
```

**Response**:

```json
{
    "success": true,
    "data": {
        "connectionId": "conn_abc123",
        "connectionName": "Slack - Team Workspace",
        "provider": "slack",
        "tools": [
            {
                "name": "slack_sendMessage",
                "description": "Send a message to a Slack channel or DM",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "channel": { "type": "string", "description": "Channel ID or name" },
                        "text": { "type": "string", "description": "Message text" }
                    },
                    "required": ["channel", "text"]
                },
                "executeRef": "sendMessage"
            }
            // ... more tools
        ]
    }
}
```

**Implementation**: `backend/src/api/routes/connections/mcp-tools.ts`

### 2. Configuration: Add Tools to Agent ⚠️ (Partially Implemented)

**UI**: Already sends correct data format with full tool schema
**Backend**: Needs to be updated to accept `type: "mcp"`

**Frontend Request** (already working):

```typescript
// From AddMCPIntegrationDialog.tsx (lines 187-198)
// Note: Frontend sends the FULL tool definition including schema
// Backend just needs to store it - no need to re-fetch from provider
const toolsToAdd: AddToolRequest[] = availableTools
    .filter((tool) => selectedTools.has(tool.name))
    .map((tool) => ({
        type: "mcp" as const,
        name: tool.name, // e.g., "slack_sendMessage"
        description: tool.description, // Human-readable description
        schema: tool.inputSchema, // JSON Schema for LLM
        config: {
            connectionId: selectedConnection.id, // Which connection to use
            provider: selectedConnection.provider // Which provider (for validation)
        }
    }));

await onAddTools(toolsToAdd);
```

**Backend Processing** (needs update):

1. ✅ Verify user owns the agent
2. ❌ Accept `type: "mcp"` in Zod schema (currently rejects it)
3. ❌ Accept `connectionId` and `provider` in config
4. ✅ Generate unique tool ID
5. ✅ Add to `agent.available_tools` array
6. ✅ Update agent record

**Expected Response**:

```json
{
    "success": true,
    "data": {
        "tool": {
            /* tool object */
        },
        "agent": {
            /* updated agent */
        }
    }
}
```

### 3. Execution: Agent Calls Integration Tool

During agent execution, when the LLM requests a tool call:

```json
{
    "role": "assistant",
    "content": null,
    "tool_calls": [
        {
            "id": "call_abc123",
            "type": "function",
            "function": {
                "name": "slack_sendMessage",
                "arguments": "{\"channel\":\"#support\",\"text\":\"Hello from agent!\"}"
            }
        }
    ]
}
```

The agent runner:

1. Parses tool call from LLM
2. Finds tool definition in `agent.available_tools` by matching `tool.name`
3. Identifies `type: "mcp"`
4. Routes to MCP tool executor
5. Loads connection from database (with decryption)
6. Validates connection ownership and status
7. Calls `ExecutionRouter.executeMCPTool()` which:
    - Extracts operation ID from tool name (e.g., "slack_sendMessage" → "sendMessage")
    - Loads the provider and its MCP adapter
    - Executes the operation with the connection credentials
8. Returns result to LLM as JSON

## Implementation Details

### Required Backend Changes

The frontend UI is fully implemented. Only backend changes are needed to complete the feature.

#### 1. Update Shared Types

**File**: `shared/src/agents.ts`

Add "mcp" to ToolType and update ToolConfig:

```typescript
export type ToolType = "workflow" | "function" | "knowledge_base" | "agent" | "mcp";

export interface ToolConfig {
    workflowId?: string;
    functionName?: string;
    knowledgeBaseId?: string;
    agentId?: string;
    agentName?: string;
    connectionId?: string; // For MCP tools
    provider?: string; // For MCP tools
}
```

#### 2. Update Add Tool Route

**File**: `backend/src/api/routes/agents/add-tool.ts`

Update Zod schema to accept MCP tools:

```typescript
const addToolSchema = z.object({
    type: z.enum(["workflow", "function", "knowledge_base", "mcp"]), // Add "mcp"
    name: z.string().min(1).max(100),
    description: z.string(),
    schema: z.record(z.any()),
    config: z.object({
        workflowId: z.string().optional(),
        functionName: z.string().optional(),
        knowledgeBaseId: z.string().optional(),
        connectionId: z.string().optional(), // For MCP tools
        provider: z.string().optional() // For MCP tools
    })
});
```

No other changes needed - the rest of the handler already works correctly.

#### 3. Update Agent Tool Execution Activity

**File**: `backend/src/temporal/activities/agent/agent-activities.ts`

Add import for MCP executor:

```typescript
import { executeMCPTool } from "./mcp-tool-executor";
```

Add MCP case to the switch statement in `executeToolCall()`:

```typescript
switch (tool.type) {
    case "workflow":
        return await executeWorkflowTool({ tool, arguments: validatedArgs, userId });
    case "function":
        return await executeFunctionTool({
            tool,
            arguments: validatedArgs,
            userId,
            agentId,
            executionId
        });
    case "knowledge_base":
        return await executeKnowledgeBaseTool({ tool, arguments: validatedArgs, userId });
    case "agent":
        return await executeAgentTool({ tool, arguments: validatedArgs, userId });
    case "mcp": // NEW
        return await executeMCPTool({ tool, arguments: validatedArgs, userId, executionId });
    default:
        throw new Error(`Unknown tool type: ${(tool as Tool).type}`);
}
```

#### 4. Implement MCP Tool Executor

**File**: `backend/src/temporal/activities/agent/mcp-tool-executor.ts` (NEW)

```typescript
import type { Tool } from "@flowmaestro/shared";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { ProviderRegistry } from "../../../integrations/core/ProviderRegistry";
import { AppError } from "../../../shared/errors";

interface ExecuteMCPToolInput {
    tool: Tool;
    arguments: Record<string, unknown>;
    userId: string;
    executionId: string;
}

export async function executeMCPTool(input: ExecuteMCPToolInput): Promise<Record<string, unknown>> {
    const { tool, arguments: args, userId } = input;

    // Validate tool config
    if (!tool.config.connectionId) {
        throw new AppError("MCP tool missing connectionId in config", 500);
    }
    if (!tool.config.provider) {
        throw new AppError("MCP tool missing provider in config", 500);
    }

    // Load and verify connection ownership
    const connectionRepo = new ConnectionRepository();
    const connection = await connectionRepo.findByIdWithData(tool.config.connectionId, userId);

    if (!connection) {
        throw new AppError(
            `Connection ${tool.config.connectionId} not found or access denied`,
            403
        );
    }

    if (connection.provider !== tool.config.provider) {
        throw new AppError(
            `Connection provider mismatch: expected ${tool.config.provider}, got ${connection.provider}`,
            500
        );
    }

    // Verify connection is active
    if (connection.status !== "active") {
        throw new AppError(
            `Connection ${connection.name} is ${connection.status}. Please reconnect.`,
            400
        );
    }

    // Execute via ExecutionRouter
    // The ExecutionRouter will:
    // 1. Extract operation ID from tool.name (e.g., "slack_sendMessage" → "sendMessage")
    // 2. Load the provider's MCP adapter
    // 3. Execute the operation with the connection's decrypted credentials
    const providerRegistry = ProviderRegistry.getInstance();
    const executionRouter = new ExecutionRouter(providerRegistry);

    const result = await executionRouter.executeMCPTool(
        tool.config.provider, // e.g., "slack"
        tool.name, // e.g., "slack_sendMessage"
        args, // Validated arguments from LLM
        connection // Connection with decrypted credentials
    );

    // Update connection last_used_at timestamp
    await connectionRepo.updateLastUsed(connection.id);

    return result as Record<string, unknown>;
}
```

That's all that's needed! The frontend already handles adding and removing tools correctly.

## Summary of Required Changes

Only **4 backend files** need modification to complete this feature:

| File                                                         | Change                                                | Lines of Code |
| ------------------------------------------------------------ | ----------------------------------------------------- | ------------- |
| `shared/src/agents.ts`                                       | Add `"mcp"` to `ToolType`, add fields to `ToolConfig` | ~2 lines      |
| `backend/src/api/routes/agents/add-tool.ts`                  | Update Zod schema enum and config fields              | ~3 lines      |
| `backend/src/temporal/activities/agent/agent-activities.ts`  | Import executor, add `case "mcp"`                     | ~3 lines      |
| `backend/src/temporal/activities/agent/mcp-tool-executor.ts` | Create new executor function (shown above)            | ~50 lines     |

**Total effort:** ~1 hour

**Why so simple?**
All infrastructure already exists:

- ✅ Frontend UI sends correct data format
- ✅ `ExecutionRouter.executeMCPTool()` already implements the execution logic
- ✅ Provider MCP adapters already wrap operations
- ✅ Connection management already handles auth and encryption
- ✅ Agent framework already routes tool calls

The backend just needs to accept `type: "mcp"` and route it to the existing ExecutionRouter.

---

## Security Considerations

### 1. Connection Ownership Verification

Every MCP tool execution MUST verify:

- User owns the agent
- User owns the connection
- Connection is active (not expired/revoked)

```typescript
// In executeMCPTool
const connection = await connectionRepo.findByIdWithData(connectionId, userId);
if (!connection) {
    throw new AppError("Connection not found or access denied", 403);
}
```

### 2. Tool Configuration Validation

Before execution, validate:

- `connectionId` exists
- `provider` matches connection
- Tool name matches available operations

### 3. Rate Limiting

Integration operations inherit rate limits from their provider definitions:

```typescript
// In OperationDefinition
rateLimit: {
    tokensPerMinute: 60,
    tokensPerRequest: 1
}
```

Rate limits are enforced per connection in the ExecutionRouter.

### 4. Sensitive Data Handling

- Never log decrypted connection credentials
- Mask sensitive fields in tool call logs (API keys, tokens)
- Connection data only decrypted in memory, never persisted

---

## Error Handling

### Common Error Scenarios

1. **Connection Not Found**
    - User deleted connection after adding tool
    - Response: "Connection not found or access denied"

2. **Connection Expired**
    - OAuth token expired and refresh failed
    - Response: "Connection {name} is expired. Please reconnect."

3. **Operation Failed**
    - API error from provider (rate limit, validation, etc.)
    - Response: Return provider error message to LLM for handling

4. **Invalid Arguments**
    - LLM provided incorrect parameter types
    - Response: Zod validation error with field-level details

### Error Response Format

```typescript
// Success
{
    success: true,
    data: { /* operation result */ }
}

// Error (thrown as AppError)
throw new AppError("Human-readable error message", 400);
```

---

## Future Enhancements

- **Tool Usage Analytics**: Track which tools are most used (call count, success rate, duration)
- **Smart Tool Recommendations**: Suggest tools based on agent's purpose (e.g., support agents → Slack, Zendesk)
- **Tool Approval Workflow**: Require human approval for sensitive operations before execution

---

## Quick Start Guide

To implement this feature:

1. **Update types**
    - Open `shared/src/agents.ts`
    - Add `"mcp"` to the `ToolType` union
    - Add `connectionId?` and `provider?` to `ToolConfig` interface

2. **Update validation**
    - Open `backend/src/api/routes/agents/add-tool.ts`
    - Update Zod schema: add `"mcp"` to type enum
    - Add `connectionId` and `provider` as optional fields in config validation

3. **Create executor**
    - Create `backend/src/temporal/activities/agent/mcp-tool-executor.ts`
    - Copy the implementation from section "4. Implement MCP Tool Executor" above

4. **Wire up routing**
    - Open `backend/src/temporal/activities/agent/agent-activities.ts`
    - Add import: `import { executeMCPTool } from "./mcp-tool-executor";`
    - Add `case "mcp":` to the switch statement in `executeToolCall()`

5. **Test**
    - Start the app
    - Open agent builder, click "Add an MCP integration"
    - Select a connection (e.g., Slack) and choose operations
    - Save and test by asking the agent to use the integration

**That's it!** Agents can now use all 24+ integration providers as tools.
