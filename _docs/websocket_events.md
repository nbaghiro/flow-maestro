# WebSocket Events Documentation

This document provides a comprehensive reference for all WebSocket events in FlowMaestro, including their purpose, data structures, emission points, and consumption patterns.

---

## Architecture Overview

### Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Event Sources:                                                │
│  ├─ Temporal Workflows (orchestrator-workflow.ts)              │
│  ├─ Temporal Activities (node executors)                       │
│  └─ Background Jobs (document processing)                      │
│                │                                                │
│                ▼                                                │
│  globalEventEmitter (WorkflowEventEmitter)                     │
│                │                                                │
│                ▼                                                │
│  EventBridge (routes to WebSocket)                             │
│                │                                                │
│                ▼                                                │
│  WebSocketManager (manages connections & subscriptions)        │
│                │                                                │
└────────────────┼───────────────────────────────────────────────┘
                 │
                 │ WebSocket Protocol (JSON messages)
                 │
┌────────────────▼───────────────────────────────────────────────┐
│                       FRONTEND LAYER                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  WebSocketClient (lib/websocket.ts)                           │
│                │                                               │
│                ▼                                               │
│  useWebSocket / useExecutionEvents hooks                      │
│                │                                               │
│                ▼                                               │
│  React Components:                                            │
│  ├─ ExecutionTab (displays logs)                             │
│  ├─ TriggerCard (initiates executions)                       │
│  └─ WorkflowCanvas (visualizes execution state)              │
│                │                                               │
│                ▼                                               │
│  Zustand Store (workflowStore.ts)                            │
│  └─ currentExecution state                                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Key Components

#### Backend

| Component | Location | Purpose |
|-----------|----------|---------|
| **WorkflowEventEmitter** | `backend/src/shared/events/EventEmitter.ts` | Singleton event emitter with convenience methods |
| **EventBridge** | `backend/src/shared/websocket/EventBridge.ts` | Subscribes to all events and forwards to WebSocket |
| **WebSocketManager** | `backend/src/shared/websocket/WebSocketManager.ts` | Manages connections, subscriptions, and broadcasting |
| **WebSocket Route** | `backend/src/api/routes/websocket.ts` | HTTP upgrade endpoint with JWT authentication |

#### Frontend

| Component | Location | Purpose |
|-----------|----------|---------|
| **WebSocketClient** | `frontend/src/lib/websocket.ts` | Singleton client with auto-reconnect |
| **useWebSocket** | `frontend/src/hooks/useWebSocket.ts` | React hook for connection management |
| **useExecutionEvents** | `frontend/src/hooks/useWebSocket.ts` | Hook for subscribing to execution events |
| **workflowStore** | `frontend/src/stores/workflowStore.ts` | Zustand store for execution state |

#### Shared

| Component | Location | Purpose |
|-----------|----------|---------|
| **Type Definitions** | `shared/src/types.ts` | WebSocketEventType and WebSocketEvent interfaces |

---

## Connection & Authentication

### WebSocket Endpoint

**URL**: `ws://localhost:3001/ws` (or `wss://` for production)

**Authentication**: JWT token via query parameter or header

```typescript
// Option 1: Query parameter
ws://localhost:3001/ws?token=<jwt_token>

// Option 2: Authorization header
const ws = new WebSocket("ws://localhost:3001/ws");
// Send Authorization header during upgrade
```

### Connection Flow

1. Client initiates WebSocket connection with JWT token
2. Server validates JWT (returns 1008 error if invalid)
3. Server generates unique `connectionId` (UUID v4)
4. Server registers connection in `WebSocketManager`
5. Server sends welcome message

**Welcome Message**:
```json
{
    "type": "connected",
    "connectionId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Connected to FlowMaestro WebSocket"
}
```

### Multi-tenancy

All connections are scoped to a `userId` extracted from the JWT token. Events are only broadcast to connections belonging to the relevant user.

---

## Subscription Management

### Client-to-Server Messages

#### Subscribe to Execution

```json
{
    "type": "subscribe",
    "executionId": "exec_abc123"
}
```

**Response**:
```json
{
    "type": "subscribed",
    "executionId": "exec_abc123"
}
```

#### Unsubscribe from Execution

```json
{
    "type": "unsubscribe",
    "executionId": "exec_abc123"
}
```

**Response**:
```json
{
    "type": "unsubscribed",
    "executionId": "exec_abc123"
}
```

### Subscription Strategy

- Clients subscribe to specific `executionId` values
- Events with a matching `executionId` are only sent to subscribed clients
- Events without `executionId` are broadcast to all connected clients
- Subscriptions are automatically cleaned up on disconnect

---

## Event Types Reference

### 1. System Events

#### `connection:established`

**Purpose**: Confirms WebSocket connection is established

**Emitted By**: WebSocket route handler
**Location**: `backend/src/api/routes/websocket.ts:40-46`

**Payload**:
```typescript
{
    type: "connected",
    connectionId: string,
    message: string
}
```

**Example**:
```json
{
    "type": "connected",
    "connectionId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Connected to FlowMaestro WebSocket"
}
```

**Consumed By**: `WebSocketClient` (logs confirmation)
**Frontend Location**: `frontend/src/lib/websocket.ts:120-123`

---

### 2. Execution Events

#### `execution:started`

**Purpose**: Notifies that a workflow execution has started

**Emitted By**: `globalEventEmitter.emitExecutionStarted()`
**Backend Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts:53` (after implementation)

**Payload**:
```typescript
{
    type: "execution:started",
    timestamp: number,
    executionId: string,
    workflowName: string,
    totalNodes: number
}
```

**Example**:
```json
{
    "type": "execution:started",
    "timestamp": 1698765432000,
    "executionId": "exec_abc123",
    "workflowName": "Customer Onboarding",
    "totalNodes": 8
}
```

**Consumed By**: `useExecutionEvents` hook → `onStart` callback
**Frontend Location**: `frontend/src/hooks/useWebSocket.ts:67-145`

**Store Action**: `workflowStore.startExecution(executionId)`

---

#### `execution:progress`

**Purpose**: Reports progress of workflow execution

**Emitted By**: `globalEventEmitter.emitExecutionProgress()`
**Backend Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts` (after implementation)

**Payload**:
```typescript
{
    type: "execution:progress",
    timestamp: number,
    executionId: string,
    completed: number,
    total: number,
    percentage: number
}
```

**Example**:
```json
{
    "type": "execution:progress",
    "timestamp": 1698765435000,
    "executionId": "exec_abc123",
    "completed": 3,
    "total": 8,
    "percentage": 37.5
}
```

**Consumed By**: `useExecutionEvents` hook → `onProgress` callback

**Typical Usage**:
```typescript
onProgress: (event) => {
    updateProgressBar(event.percentage);
    setStatusText(`${event.completed} of ${event.total} nodes completed`);
}
```

---

#### `execution:completed`

**Purpose**: Signals successful completion of workflow execution

**Emitted By**: `globalEventEmitter.emitExecutionCompleted()`
**Backend Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts:162` (after implementation)

**Payload**:
```typescript
{
    type: "execution:completed",
    timestamp: number,
    executionId: string,
    status: "completed",
    outputs: Record<string, any>,
    duration: number  // milliseconds
}
```

**Example**:
```json
{
    "type": "execution:completed",
    "timestamp": 1698765450000,
    "executionId": "exec_abc123",
    "status": "completed",
    "outputs": {
        "customerEmail": "john@example.com",
        "accountId": "acc_xyz789",
        "welcomeEmailSent": true
    },
    "duration": 18000
}
```

**Consumed By**: `useExecutionEvents` hook → `onComplete` callback
**Frontend Location**: `frontend/src/hooks/useWebSocket.ts:67-145`

**Store Action**: `workflowStore.updateExecutionStatus("completed")`

---

#### `execution:failed`

**Purpose**: Reports workflow execution failure

**Emitted By**: `globalEventEmitter.emitExecutionFailed()`
**Backend Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts:168` (after implementation)

**Payload**:
```typescript
{
    type: "execution:failed",
    timestamp: number,
    executionId: string,
    status: "failed",
    error: string,
    failedNodeId?: string
}
```

**Example**:
```json
{
    "type": "execution:failed",
    "timestamp": 1698765445000,
    "executionId": "exec_abc123",
    "status": "failed",
    "error": "API request failed: 429 Rate Limit Exceeded",
    "failedNodeId": "node_5"
}
```

**Consumed By**: `useExecutionEvents` hook → `onFail` callback

**Store Action**: `workflowStore.updateExecutionStatus("failed")`

---

### 3. Node Events

#### `node:started`

**Purpose**: Indicates an individual node has started execution

**Emitted By**: `globalEventEmitter.emitNodeStarted()`
**Backend Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts:112` (after implementation)

**Payload**:
```typescript
{
    type: "node:started",
    timestamp: number,
    executionId: string,
    nodeId: string,
    nodeName: string,
    nodeType: string
}
```

**Example**:
```json
{
    "type": "node:started",
    "timestamp": 1698765433000,
    "executionId": "exec_abc123",
    "nodeId": "node_3",
    "nodeName": "Send Welcome Email",
    "nodeType": "email"
}
```

**Consumed By**: `useExecutionEvents` hook → `onNodeStart` callback

**Store Action**: `workflowStore.updateNodeState(nodeId, { status: "running" })`

---

#### `node:completed`

**Purpose**: Reports successful completion of a node with its output

**Emitted By**: `globalEventEmitter.emitNodeCompleted()`
**Backend Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts:131` (after implementation)

**Payload**:
```typescript
{
    type: "node:completed",
    timestamp: number,
    executionId: string,
    nodeId: string,
    output: any,
    duration: number,  // milliseconds
    metadata?: any
}
```

**Example**:
```json
{
    "type": "node:completed",
    "timestamp": 1698765435000,
    "executionId": "exec_abc123",
    "nodeId": "node_3",
    "output": {
        "emailId": "msg_xyz123",
        "status": "sent",
        "recipient": "john@example.com"
    },
    "duration": 2500,
    "metadata": {
        "provider": "sendgrid",
        "retryCount": 0
    }
}
```

**Consumed By**: `useExecutionEvents` hook → `onNodeComplete` callback

**Store Actions**:
```typescript
workflowStore.updateNodeState(nodeId, {
    status: "completed",
    output: event.output
});
workflowStore.addExecutionLog({
    level: "info",
    message: `Node ${nodeId} completed`,
    nodeId: nodeId
});
```

---

#### `node:failed`

**Purpose**: Indicates a node execution has failed

**Emitted By**: `globalEventEmitter.emitNodeFailed()`
**Backend Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts:142` (after implementation)

**Payload**:
```typescript
{
    type: "node:failed",
    timestamp: number,
    executionId: string,
    nodeId: string,
    error: string
}
```

**Example**:
```json
{
    "type": "node:failed",
    "timestamp": 1698765437000,
    "executionId": "exec_abc123",
    "nodeId": "node_5",
    "error": "API request failed: 401 Unauthorized"
}
```

**Consumed By**: `useExecutionEvents` hook → `onNodeFail` callback

**Store Actions**:
```typescript
workflowStore.updateNodeState(nodeId, {
    status: "failed",
    error: event.error
});
workflowStore.addExecutionLog({
    level: "error",
    message: `Node ${nodeId} failed: ${event.error}`,
    nodeId: nodeId
});
```

---

#### `node:retry`

**Purpose**: Notifies that a node is being retried after failure

**Emitted By**: `globalEventEmitter.emitNodeRetry()`
**Backend Location**: Future implementation in activity retry logic

**Payload**:
```typescript
{
    type: "node:retry",
    timestamp: number,
    executionId: string,
    nodeId: string,
    attempt: number,
    nextRetryIn: number,  // milliseconds
    error: string
}
```

**Example**:
```json
{
    "type": "node:retry",
    "timestamp": 1698765438000,
    "executionId": "exec_abc123",
    "nodeId": "node_5",
    "attempt": 2,
    "nextRetryIn": 4000,
    "error": "Connection timeout"
}
```

**Consumed By**: `useExecutionEvents` hook (optional handler)

**Typical Usage**:
```typescript
onNodeRetry: (event) => {
    showNotification({
        type: "warning",
        message: `Retrying ${event.nodeId} (attempt ${event.attempt})`
    });
}
```

---

#### `node:stream`

**Purpose**: Streams real-time data from long-running nodes (e.g., LLM token generation)

**Emitted By**: `globalEventEmitter.emitNodeStream()`
**Backend Location**: Future implementation in LLM node executors

**Payload**:
```typescript
{
    type: "node:stream",
    timestamp: number,
    executionId: string,
    nodeId: string,
    chunk: string
}
```

**Example**:
```json
{
    "type": "node:stream",
    "timestamp": 1698765440000,
    "executionId": "exec_abc123",
    "nodeId": "node_7",
    "chunk": "The customer's inquiry has been "
}
```

**Consumed By**: Custom event handler in components displaying streaming output

**Typical Usage**:
```typescript
useExecutionEvents(executionId, {
    onNodeStream: (event) => {
        if (event.nodeId === streamingNodeId) {
            appendToStreamingOutput(event.chunk);
        }
    }
});
```

---

### 4. User Input Events

#### `user:input:required`

**Purpose**: Pauses workflow execution and prompts user for input

**Emitted By**: `globalEventEmitter.emitUserInputRequired()`
**Backend Location**: Future implementation in user input node executor

**Payload**:
```typescript
{
    type: "user:input:required",
    timestamp: number,
    executionId: string,
    nodeId: string,
    prompt: string,
    inputType: string,
    validation?: any
}
```

**Example**:
```json
{
    "type": "user:input:required",
    "timestamp": 1698765442000,
    "executionId": "exec_abc123",
    "nodeId": "node_6",
    "prompt": "Please review the generated email and approve or reject",
    "inputType": "approval",
    "validation": {
        "options": ["approve", "reject", "edit"]
    }
}
```

**Consumed By**: Modal dialog components that display user input forms

**Typical Usage**:
```typescript
useExecutionEvents(executionId, {
    onUserInputRequired: (event) => {
        showUserInputDialog({
            prompt: event.prompt,
            inputType: event.inputType,
            onSubmit: (value) => {
                submitUserInput(event.executionId, event.nodeId, value);
            }
        });
    }
});
```

---

#### `user:input:response`

**Purpose**: Sends user's input back to resume workflow execution

**Emitted By**: Client-side (sent to server)
**Frontend Location**: User input submission handlers

**Payload**:
```typescript
{
    type: "user:input:response",
    timestamp: number,
    executionId: string,
    nodeId: string,
    value: any
}
```

**Example**:
```json
{
    "type": "user:input:response",
    "timestamp": 1698765445000,
    "executionId": "exec_abc123",
    "nodeId": "node_6",
    "value": "approve"
}
```

**Note**: This event is sent from client to server (opposite direction from other events)

---

### 5. Knowledge Base Events

#### `kb:document:processing`

**Purpose**: Indicates a document is being processed (text extraction, chunking, embedding generation)

**Emitted By**: `globalEventEmitter.emitDocumentProcessing()`
**Backend Location**: `backend/src/temporal/activities/process-document.ts:53-57`

**Payload**:
```typescript
{
    type: "kb:document:processing",
    timestamp: number,
    knowledgeBaseId: string,
    documentId: string,
    documentName: string
}
```

**Example**:
```json
{
    "type": "kb:document:processing",
    "timestamp": 1698765430000,
    "knowledgeBaseId": "kb_123",
    "documentId": "doc_456",
    "documentName": "product_manual.pdf"
}
```

**Consumed By**: Knowledge base UI components showing document status

**Frontend Location**: Components in `frontend/src/components/knowledge-base/`

---

#### `kb:document:completed`

**Purpose**: Document processing completed successfully

**Emitted By**: `globalEventEmitter.emitDocumentCompleted()`
**Backend Location**: `backend/src/temporal/activities/process-document.ts:257-261`

**Payload**:
```typescript
{
    type: "kb:document:completed",
    timestamp: number,
    knowledgeBaseId: string,
    documentId: string,
    chunkCount: number
}
```

**Example**:
```json
{
    "type": "kb:document:completed",
    "timestamp": 1698765460000,
    "knowledgeBaseId": "kb_123",
    "documentId": "doc_456",
    "chunkCount": 47
}
```

**Store Action**: Update document status in knowledge base store

---

#### `kb:document:failed`

**Purpose**: Document processing failed

**Emitted By**: `globalEventEmitter.emitDocumentFailed()`
**Backend Location**: Multiple catch blocks in `backend/src/temporal/activities/process-document.ts`

**Payload**:
```typescript
{
    type: "kb:document:failed",
    timestamp: number,
    knowledgeBaseId: string,
    documentId: string,
    error: string
}
```

**Example**:
```json
{
    "type": "kb:document:failed",
    "timestamp": 1698765455000,
    "knowledgeBaseId": "kb_123",
    "documentId": "doc_456",
    "error": "Failed to extract text from PDF: corrupted file"
}
```

**Store Action**: Update document status to failed and display error

---

## Frontend Implementation Patterns

### Basic Setup (App-Level)

```typescript
// In your root App component or layout
import { useWebSocket } from "../hooks/useWebSocket";
import { useAuth } from "../contexts/AuthContext";

function AppLayout() {
    const { user } = useAuth();
    const token = localStorage.getItem("auth_token");

    // Connect WebSocket with authentication
    const { isConnected } = useWebSocket(token);

    return (
        <>
            {isConnected && <ConnectionIndicator />}
            {children}
        </>
    );
}
```

### Subscribing to Execution Events

```typescript
import { useExecutionEvents } from "../hooks/useWebSocket";
import { useWorkflowStore } from "../stores/workflowStore";

function ExecutionMonitor({ executionId }: { executionId: string }) {
    const { startExecution, updateNodeState, addExecutionLog } = useWorkflowStore();

    useExecutionEvents(executionId, {
        onStart: (event) => {
            startExecution(event.executionId);
            addExecutionLog({
                level: "info",
                message: `Workflow started: ${event.workflowName}`,
            });
        },

        onProgress: (event) => {
            addExecutionLog({
                level: "info",
                message: `Progress: ${event.completed}/${event.total} nodes (${event.percentage}%)`,
            });
        },

        onNodeStart: (event) => {
            updateNodeState(event.nodeId, {
                status: "running",
                startedAt: new Date(event.timestamp),
            });
        },

        onNodeComplete: (event) => {
            updateNodeState(event.nodeId, {
                status: "completed",
                output: event.output,
                completedAt: new Date(event.timestamp),
            });
            addExecutionLog({
                level: "success",
                message: `Node ${event.nodeId} completed`,
                nodeId: event.nodeId,
            });
        },

        onNodeFail: (event) => {
            updateNodeState(event.nodeId, {
                status: "failed",
                error: event.error,
            });
            addExecutionLog({
                level: "error",
                message: `Node ${event.nodeId} failed: ${event.error}`,
                nodeId: event.nodeId,
            });
        },

        onComplete: (event) => {
            addExecutionLog({
                level: "success",
                message: `Workflow completed in ${event.duration}ms`,
            });
        },

        onFail: (event) => {
            addExecutionLog({
                level: "error",
                message: `Workflow failed: ${event.error}`,
            });
        },
    });

    return <div>{/* Render execution UI */}</div>;
}
```

### Manual Event Subscription

```typescript
import { websocket } from "../lib/websocket";

// Subscribe to specific event types
useEffect(() => {
    const handleNodeComplete = (event: WebSocketEvent) => {
        console.log("Node completed:", event);
    };

    websocket.on("node:completed", handleNodeComplete);

    return () => {
        websocket.off("node:completed", handleNodeComplete);
    };
}, []);
```

### Subscribing/Unsubscribing to Executions

```typescript
import { websocket } from "../lib/websocket";

function ExecutionViewer({ executionId }: { executionId: string }) {
    useEffect(() => {
        // Subscribe when component mounts
        websocket.subscribeToExecution(executionId);

        return () => {
            // Unsubscribe when component unmounts
            websocket.unsubscribeFromExecution(executionId);
        };
    }, [executionId]);

    return <div>{/* Render execution details */}</div>;
}
```

---

## Backend Implementation Patterns

### Emitting Events from Workflows

```typescript
import { globalEventEmitter } from "../../shared/events/EventEmitter";

export async function orchestratorWorkflow(input: OrchestratorInput) {
    const executionId = "exec_" + Date.now();
    const startTime = Date.now();

    // Emit execution started
    globalEventEmitter.emitExecutionStarted(
        executionId,
        workflowDefinition.name,
        nodeCount
    );

    try {
        // Execute nodes...
        for (const [nodeId, node] of nodeEntries) {
            // Emit node started
            globalEventEmitter.emitNodeStarted(
                executionId,
                nodeId,
                node.name,
                node.type
            );

            const nodeStartTime = Date.now();
            const result = await executeNode(nodeId, node);
            const nodeDuration = Date.now() - nodeStartTime;

            // Emit node completed
            globalEventEmitter.emitNodeCompleted(
                executionId,
                nodeId,
                result,
                nodeDuration
            );
        }

        // Emit execution completed
        globalEventEmitter.emitExecutionCompleted(
            executionId,
            outputs,
            Date.now() - startTime
        );

        return { success: true, outputs };
    } catch (error) {
        // Emit execution failed
        globalEventEmitter.emitExecutionFailed(
            executionId,
            error.message,
            failedNodeId
        );

        throw error;
    }
}
```

### Emitting Events from Activities

```typescript
import { globalEventEmitter } from "../../shared/events/EventEmitter";

export async function processDocumentActivity(params: ProcessDocumentParams) {
    const { knowledgeBaseId, documentId, documentName } = params;

    // Emit processing started
    globalEventEmitter.emitDocumentProcessing(
        knowledgeBaseId,
        documentId,
        documentName
    );

    try {
        const chunks = await extractAndChunk(documentId);

        // Emit processing completed
        globalEventEmitter.emitDocumentCompleted(
            knowledgeBaseId,
            documentId,
            chunks.length
        );

        return { success: true, chunkCount: chunks.length };
    } catch (error) {
        // Emit processing failed
        globalEventEmitter.emitDocumentFailed(
            knowledgeBaseId,
            documentId,
            error.message
        );

        throw error;
    }
}
```

### Streaming Events (LLM Nodes)

```typescript
import { globalEventEmitter } from "../../shared/events/EventEmitter";

export async function executeLLMNode(
    executionId: string,
    nodeId: string,
    prompt: string
) {
    const stream = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";

        if (content) {
            fullResponse += content;

            // Emit streaming chunk
            globalEventEmitter.emitNodeStream(
                executionId,
                nodeId,
                content
            );
        }
    }

    return fullResponse;
}
```

---

## Error Handling & Resilience

### Backend Error Handling

```typescript
// WebSocketManager handles message parsing errors gracefully
socket.on("message", (message: Buffer) => {
    try {
        const data = JSON.parse(message.toString());
        this.handleMessage(connectionId, data);
    } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        // Don't crash - just log and continue
    }
});
```

### Frontend Reconnection

The WebSocketClient implements automatic reconnection with exponential backoff:

```typescript
// Reconnection parameters
maxReconnectAttempts: 5
initialDelay: 1000ms
backoffMultiplier: 2

// Retry delays:
// Attempt 1: 1000ms
// Attempt 2: 2000ms
// Attempt 3: 4000ms
// Attempt 4: 8000ms
// Attempt 5: 16000ms
```

**Location**: `frontend/src/lib/websocket.ts:143-159`

### Subscription Cleanup

Subscriptions are automatically cleaned up when:
- Client disconnects (expected or unexpected)
- Component unmounts (via `useEffect` cleanup)
- Execution completes

---

## Performance Considerations

### Event Filtering

Events with `executionId` are only sent to subscribed clients:

```typescript
// Only clients subscribed to "exec_123" receive this event
globalEventEmitter.emitNodeCompleted("exec_123", "node_5", result, 1200);
```

### Connection Limits

The `WorkflowEventEmitter` supports up to 100 concurrent listeners per event type:

```typescript
this.emitter.setMaxListeners(100); // Supports many concurrent executions
```

### Message Size

Consider payload size for streaming events:
- Chunk size should be reasonable (100-500 chars for LLM tokens)
- Large outputs should be truncated or summarized
- Binary data should be base64 encoded or sent via separate endpoint

---

## Security

### Authentication

All WebSocket connections require valid JWT tokens. Tokens are verified on connection:

```typescript
// Reject connection if token is missing or invalid
if (!token) {
    socket.close(1008, "Authentication required");
    return;
}

const decoded = await request.jwtVerify({ onlyCookie: false });
```

### Authorization

Events are scoped by `userId`:
- Users only receive events for their own workflows
- Multi-tenant isolation via `userId` in connection metadata
- No cross-user event leakage

### Input Validation

Client messages are validated before processing:

```typescript
if (data.type === "subscribe" && typeof data.executionId === "string") {
    // Valid subscription request
} else {
    // Ignore invalid messages
}
```

---

## Debugging & Monitoring

### Server-Side Logging

```typescript
// Connection events
fastify.log.info({ userId, connectionId }, "WebSocket connection established");

// Subscription events
console.log(`Client ${connectionId} subscribed to execution ${executionId}`);

// Broadcast events
console.log(`Broadcasting event ${event.type} to ${subscriberCount} clients`);
```

### Client-Side Logging

```typescript
// Connection status
console.log("WebSocket connected");
console.log("WebSocket connection confirmed:", data);

// Event received
console.log("Received event:", event.type, event);

// Subscription status
console.log("Subscribed to execution:", executionId);
```

### Monitoring Metrics

```typescript
// Get connection statistics
const totalConnections = wsManager.getConnectionCount();
const executionSubscribers = wsManager.getExecutionSubscriberCount("exec_123");
```

---

## Common Patterns & Best Practices

### ✅ DO

- Always clean up event listeners in `useEffect` return functions
- Subscribe to executions when component mounts
- Use the convenience hooks (`useExecutionEvents`) when possible
- Handle all event types gracefully (some may be undefined)
- Log unexpected events for debugging

### ❌ DON'T

- Don't create new WebSocket connections per component (use the singleton)
- Don't forget to unsubscribe when component unmounts
- Don't assume events arrive in perfect order (network delays)
- Don't emit events synchronously in tight loops (batch if needed)
- Don't send sensitive data in event payloads (use IDs and fetch separately)

---

## Future Enhancements

### Planned Features

1. **Event Acknowledgment**: Client confirms receipt of critical events
2. **Event Replay**: Request recent events for an execution
3. **Batch Events**: Group multiple events into single message
4. **Compression**: GZip large payloads
5. **Presence**: Track active users viewing executions
6. **Rooms**: Group executions by project/workspace

### API Extensions

```typescript
// Proposed: Request event history
{
    type: "replay",
    executionId: "exec_123",
    since: 1698765430000
}

// Proposed: Acknowledge receipt
{
    type: "ack",
    eventId: "evt_xyz"
}
```

---

## Quick Reference

### Event Summary Table

| Event Type | Direction | Requires Subscription | Scope |
|------------|-----------|----------------------|-------|
| `connection:established` | Server → Client | No | Per connection |
| `execution:started` | Server → Client | Yes | Per execution |
| `execution:progress` | Server → Client | Yes | Per execution |
| `execution:completed` | Server → Client | Yes | Per execution |
| `execution:failed` | Server → Client | Yes | Per execution |
| `node:started` | Server → Client | Yes | Per execution |
| `node:completed` | Server → Client | Yes | Per execution |
| `node:failed` | Server → Client | Yes | Per execution |
| `node:retry` | Server → Client | Yes | Per execution |
| `node:stream` | Server → Client | Yes | Per execution |
| `user:input:required` | Server → Client | Yes | Per execution |
| `user:input:response` | Client → Server | N/A | Per execution |
| `kb:document:processing` | Server → Client | No | Per user |
| `kb:document:completed` | Server → Client | No | Per user |
| `kb:document:failed` | Server → Client | No | Per user |

### File Quick Reference

| Task | Backend File | Frontend File |
|------|-------------|---------------|
| Emit events | `backend/src/shared/events/EventEmitter.ts` | N/A |
| Connect to WebSocket | `backend/src/api/routes/websocket.ts` | `frontend/src/lib/websocket.ts` |
| Subscribe to execution | N/A | `frontend/src/hooks/useWebSocket.ts` |
| Handle events | `backend/src/shared/websocket/EventBridge.ts` | `frontend/src/components/**/*.tsx` |
| Store execution state | N/A | `frontend/src/stores/workflowStore.ts` |

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
