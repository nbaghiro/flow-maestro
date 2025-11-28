# Agent-Workflow Connection Specification

This document outlines the comprehensive plan for connecting workflows and agents in FlowMaestro, enabling bidirectional integration and MCP tool exposure.

---

## Current State Summary

| Integration               | Status                 | Details                                                  |
| ------------------------- | ---------------------- | -------------------------------------------------------- |
| Agent → Workflow Tool     | ✅ **Implemented**     | `executeWorkflowTool()` in `agent-activities.ts:420-501` |
| Agent → Agent Tool        | ✅ **Implemented**     | `executeAgentTool()` + `agent-tool-generator.ts`         |
| Workflow → Agent Node     | ❌ **Not Implemented** | No agent executor or node registration                   |
| Workflows as External MCP | ❌ **Not Implemented** | Documented as "Future" in docs                           |

---

## Phase 1: Agent Node for Workflows

**Goal**: Allow workflows to call agents as nodes on the canvas

### 1.1 Create Agent Node Executor

**File**: `backend/src/temporal/activities/node-executors/agent-executor.ts`

```typescript
// Key components:
interface AgentNodeConfig {
    agentId: string;
    message: string; // Template with ${variables}
    contextVariables?: string[]; // Variables to pass as context
    waitForCompletion: boolean; // Sync vs async execution
    timeout?: number; // Execution timeout (ms)
    outputVariable?: string; // Where to store result
}

interface AgentNodeResult {
    success: boolean;
    response: string;
    executionId: string;
    iterations: number;
    toolCalls?: Array<{ name: string; result: unknown }>;
}
```

**Implementation approach**:

- Start agent orchestrator workflow via Temporal
- Wait for completion (sync) or return immediately (async)
- Merge agent response into workflow context
- Handle timeout and error scenarios

### 1.2 Register Agent Node Type

**File**: `backend/src/shared/registry/register-nodes.ts`

Add registration:

```typescript
nodeRegistry.register("agent", {
    type: "agent",
    displayName: "Agent",
    description: "Call an AI agent with tools and memory",
    icon: "🤖",
    category: "ai",
    inputs: {
        message: { type: "string", description: "Message to send to agent" },
        context: { type: "object", description: "Context variables", required: false }
    },
    outputs: {
        response: { type: "string", description: "Agent's final response" },
        executionId: { type: "string", description: "Agent execution ID" },
        success: { type: "boolean", description: "Whether agent completed successfully" }
    },
    configForm: [
        {
            field: "agentId",
            type: "dropdown",
            label: "Agent",
            fetch: "/api/agents",
            required: true
        },
        {
            field: "message",
            type: "textarea",
            label: "Message",
            supportsVariables: true,
            required: true
        },
        {
            field: "waitForCompletion",
            type: "checkbox",
            label: "Wait for completion",
            default: true
        },
        { field: "timeout", type: "number", label: "Timeout (ms)", default: 300000 }
    ]
});
```

### 1.3 Add Router Entry

**File**: `backend/src/temporal/activities/node-executors/index.ts`

Add case in `executeNode()`:

```typescript
case "agent":
    return await executeAgentNode(nodeConfig, context);
```

### 1.4 Frontend Agent Node Component

**Files to create/modify**:

- `frontend/src/components/canvas/nodes/AgentNode.tsx` - React component
- `frontend/src/components/canvas/panels/AgentConfigPanel.tsx` - Config panel
- `frontend/src/lib/api.ts` - Add `listAgents()` for dropdown

---

## Phase 2: Workflow Tool Generator

**Goal**: Auto-generate tool definitions from workflows for agents

### 2.1 Create Workflow Tool Generator

**File**: `backend/src/temporal/activities/agent/workflow-tool-generator.ts`

```typescript
// Key functions:
function generateWorkflowTool(workflow: WorkflowModel): Tool {
    // 1. Find input nodes in workflow definition
    // 2. Extract parameter schema from input node configs
    // 3. Find output nodes and extract return schema
    // 4. Generate tool definition
}

function generateWorkflowToolName(workflowName: string): string {
    // Convert to valid tool name: "run_workflow_name"
}

async function generateWorkflowToolsForUser(userId: string): Promise<Tool[]> {
    // Generate tools for all user's workflows
}
```

### 2.2 Schema Generation from Workflow Definition

Extract from `input` nodes:

```typescript
interface InputNodeConfig {
    variableName: string;
    type: "string" | "number" | "boolean" | "object" | "array";
    description?: string;
    required?: boolean;
    default?: unknown;
}
```

Convert to JSON Schema:

```typescript
{
    type: "object",
    properties: {
        [variableName]: {
            type: inputType,
            description: inputDescription
        }
    },
    required: requiredInputs
}
```

### 2.3 Improve executeWorkflowTool

**Current**: Schema is empty `{}`
**Enhancement**: Use generated schema for validation

---

## Phase 3: MCP Server for External Access

**Goal**: Expose workflows as MCP tools for Claude Desktop, Cursor, etc.

### 3.1 MCP Server Endpoint

**File**: `backend/src/api/routes/mcp/index.ts`

```typescript
// Endpoints:
GET  /api/mcp/tools              // List available workflow tools
POST /api/mcp/tools/:name/call   // Execute a workflow tool
GET  /api/mcp/resources          // List available resources (optional)
```

### 3.2 MCP Tool Listing

```typescript
interface MCPToolListing {
    name: string; // e.g., "run_customer_onboarding"
    description: string; // Workflow description
    inputSchema: JSONSchema; // Generated from input nodes
    annotations?: {
        workflowId: string;
        version: number;
    };
}

async function listMCPTools(userId: string): Promise<MCPToolListing[]> {
    const workflows = await workflowRepo.findByUserId(userId);
    return workflows.map((w) => ({
        name: generateWorkflowToolName(w.name),
        description: w.description || `Execute workflow: ${w.name}`,
        inputSchema: extractWorkflowInputSchema(w.definition),
        annotations: { workflowId: w.id, version: w.version }
    }));
}
```

### 3.3 MCP Tool Execution

```typescript
async function executeMCPTool(
    toolName: string,
    arguments: JsonObject,
    userId: string
): Promise<MCPToolResult> {
    // 1. Find workflow by tool name
    // 2. Validate arguments against schema
    // 3. Start Temporal workflow
    // 4. Wait for completion
    // 5. Return outputs
}
```

### 3.4 Authentication for MCP

Options:

1. **API Key**: Simple `X-API-Key` header for personal use
2. **OAuth2**: For third-party integrations
3. **JWT**: For session-based access

**File**: `backend/src/api/middleware/mcp-auth.ts`

---

## Phase 4: Agent as MCP Tool

**Goal**: Expose agents as MCP tools for external access

### 4.1 Agent MCP Adapter

**File**: `backend/src/api/routes/mcp/agents.ts`

```typescript
// Endpoints:
GET  /api/mcp/agents              // List available agent tools
POST /api/mcp/agents/:id/call     // Execute an agent

// Schema
interface AgentMCPTool {
    name: string;                    // "call_customer_support_agent"
    description: string;             // Agent description
    inputSchema: {
        type: "object",
        properties: {
            message: { type: "string", description: "Message to send" },
            context: { type: "object", additionalProperties: true }
        },
        required: ["message"]
    };
}
```

---

## Phase 5: Frontend Integration

### 5.1 Add Workflows Dialog for Agents

**Current**: `handleAddWorkflows()` in `AgentBuilder.tsx:181-208` exists but schema is empty

**Enhancement**:

- Fetch workflow input schema via API
- Display workflow inputs/outputs in selection UI
- Generate proper schema for tool definition

### 5.2 Add Agents Selection for Agents

**File**: `frontend/src/components/agents/AddAgentToolDialog.tsx`

- List available agents (excluding current agent)
- Show agent capabilities and tools
- Add as tool type "agent"

### 5.3 Agent Node on Workflow Canvas

**File**: `frontend/src/components/canvas/nodes/AgentNode.tsx`

- Agent selection dropdown
- Message template with variable interpolation
- Execution status indicator
- Output preview

### 5.4 Node Palette Update

**File**: `frontend/src/components/canvas/NodePalette.tsx`

Add "Agent" to AI category:

```typescript
{ type: "agent", label: "Agent", icon: "🤖", category: "ai" }
```

---

## Phase 6: API Enhancements

### 6.1 Workflow Schema Endpoint

**File**: `backend/src/api/routes/workflows/schema.ts`

```typescript
GET /api/workflows/:id/schema

Response:
{
    inputs: { [name]: JSONSchema },
    outputs: { [name]: JSONSchema }
}
```

### 6.2 Agent Tools List Endpoint

**File**: `backend/src/api/routes/agents/available-agents.ts`

```typescript
GET /api/agents/available-as-tools

Response: Tool[]  // Pre-generated tool definitions
```

---

## Implementation Order

| Phase                           | Priority | Effort | Dependencies  |
| ------------------------------- | -------- | ------ | ------------- |
| 1.1-1.3 Agent Executor          | High     | Medium | None          |
| 2.1-2.3 Workflow Tool Generator | High     | Low    | None          |
| 1.4 Frontend Agent Node         | High     | Medium | Phase 1.1-1.3 |
| 5.1 Improve Add Workflows       | Medium   | Low    | Phase 2       |
| 5.2-5.4 Agent Selection UI      | Medium   | Medium | Phase 1       |
| 3.1-3.4 MCP Server              | Low      | High   | Phase 2       |
| 4.1 Agent MCP Adapter           | Low      | Medium | Phase 3       |
| 6.1-6.2 API Enhancements        | Low      | Low    | Phases 1-2    |

---

## File Summary

### New Files to Create

```
backend/src/temporal/activities/node-executors/
└── agent-executor.ts                    # Agent node executor

backend/src/temporal/activities/agent/
└── workflow-tool-generator.ts           # Generate tools from workflows

backend/src/api/routes/mcp/
├── index.ts                             # MCP server router
├── tools.ts                             # Workflow tools listing/execution
├── agents.ts                            # Agent tools listing/execution
└── auth.ts                              # MCP authentication

backend/src/api/routes/workflows/
└── schema.ts                            # Workflow input/output schema

frontend/src/components/canvas/nodes/
└── AgentNode.tsx                        # Agent node component

frontend/src/components/canvas/panels/
└── AgentConfigPanel.tsx                 # Agent node configuration

frontend/src/components/agents/
└── AddAgentToolDialog.tsx               # Add agent as tool dialog
```

### Files to Modify

```
backend/src/shared/registry/register-nodes.ts    # Register agent node
backend/src/temporal/activities/node-executors/index.ts  # Route to agent executor
backend/src/api/server.ts                        # Mount MCP routes
frontend/src/pages/AgentBuilder.tsx              # Improve workflow tool adding
frontend/src/components/canvas/NodePalette.tsx   # Add agent to palette
frontend/src/lib/api.ts                          # Add new API methods
```

---

## Key Design Decisions

1. **Synchronous vs Asynchronous Agent Execution**: Agent nodes should support both - wait for completion (default) or fire-and-forget with callback

2. **Schema Generation**: Automatically derive tool schemas from workflow input/output nodes rather than requiring manual configuration

3. **Recursive Prevention**: Prevent workflows from calling themselves or creating infinite loops (agent → workflow → same workflow)

4. **Timeout Handling**: Agent executions within workflows need configurable timeouts (default 5 minutes)

5. **Error Propagation**: Agent failures should propagate to workflow error handling (continue/fallback/fail strategies)

6. **Authentication**: MCP endpoints should support API keys for simplicity, with OAuth2 as future enhancement

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FlowMaestro                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │     Workflows    │◄────────►│      Agents      │         │
│  │                  │          │                  │         │
│  │  ┌────────────┐  │          │  ┌────────────┐  │         │
│  │  │ Agent Node │──┼──────────┼─►│  Executor  │  │         │
│  │  └────────────┘  │          │  └────────────┘  │         │
│  │                  │          │                  │         │
│  │  ┌────────────┐  │          │  ┌────────────┐  │         │
│  │  │   Output   │◄─┼──────────┼──│ Workflow   │  │         │
│  │  └────────────┘  │          │  │   Tool     │  │         │
│  │                  │          │  └────────────┘  │         │
│  └──────────────────┘          └──────────────────┘         │
│           │                             │                   │
│           ▼                             ▼                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    MCP Server                        │   │
│  │  ┌─────────────────┐    ┌─────────────────┐          │   │
│  │  │ Workflow Tools  │    │  Agent Tools    │          │   │
│  │  └─────────────────┘    └─────────────────┘          │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │  External Clients   │
                    │  - Claude Desktop   │
                    │  - Cursor           │
                    │  - Custom Apps      │
                    └─────────────────────┘
```

---

## Related Documentation

- [Agent Architecture](./../agent-architecture.md) - Full agent system documentation
- [Workflow System](./../workflow-system.md) - Workflow execution details
- [Integrations System](./../integrations-system.md) - Provider SDK and MCP adapters
