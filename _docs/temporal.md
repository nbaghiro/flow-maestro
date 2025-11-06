# FlowMaestro Temporal Orchestration

Complete guide to Temporal orchestration in FlowMaestro for durable workflow and agent execution.

---

## Table of Contents

1. [Overview](#overview)
2. [Worker Configuration](#worker-configuration)
3. [Workflow Types](#workflow-types)
4. [Activity Patterns](#activity-patterns)
5. [Execution Methods](#execution-methods)
6. [Management](#management)
7. [Best Practices](#best-practices)

---

## Overview

FlowMaestro uses [Temporal](https://temporal.io) as its workflow orchestration engine to execute both workflows and agents with:

- **Reliability**: Automatic retries, state persistence, crash recovery
- **Scalability**: Horizontal worker scaling, concurrent execution control
- **Observability**: Complete execution history and real-time monitoring
- **Durability**: Workflows survive process crashes and restarts
- **Determinism**: Reproducible execution through workflow bundling

### Why Temporal?

Traditional workflow systems fail when processes crash. Temporal ensures:
- Workflows continue from where they left off after crashes
- Activities retry automatically with exponential backoff
- State persists across restarts
- Complex multi-step processes complete reliably

---

## Worker Configuration

### Orchestrator Worker

**Location**: `backend/src/temporal/workers/orchestrator-worker.ts`

```typescript
import { Worker } from "@temporalio/worker";
import * as activities from "../activities";

const worker = await Worker.create({
    workflowsPath: require.resolve("../workflows"),
    activities,
    taskQueue: "flowmaestro-orchestrator",
    connection: await getTemporalConnection(),

    // Concurrency control
    maxConcurrentWorkflowTaskExecutions: 10,
    maxConcurrentActivityTaskExecutions: 10,

    // Workflow bundling
    bundlerOptions: {
        ignoreModules: [
            "@flowmaestro/shared",
            "uuid",
            "pg",
            "redis",
            "fastify"
        ]
    }
});

await worker.run();
```

### Configuration

- **Task Queue**: `flowmaestro-orchestrator`
- **Connection**: `TEMPORAL_ADDRESS` (default: localhost:7233)
- **Max Concurrent Workflows**: 10
- **Max Concurrent Activities**: 10
- **Ignored Modules**: External dependencies excluded from workflows to maintain determinism

### Starting the Worker

**Development**:
```bash
npm run worker:orchestrator:dev
```

**Production**:
```bash
npm run worker:orchestrator
```

**Docker Compose**:
```yaml
services:
  worker-orchestrator:
    build: ./backend
    command: npm run worker:orchestrator
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
    depends_on:
      - temporal
```

---

## Workflow Types

FlowMaestro implements four Temporal workflows:

### 1. Orchestrator Workflow (Main)

**Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts`

**Purpose**: Execute node-based workflow definitions

**Input**:
```typescript
interface OrchestratorInput {
    workflowDefinition: {
        nodes: Record<string, WorkflowNode>;
        edges: WorkflowEdge[];
    };
    inputs?: Record<string, any>;
    executionId?: string;
}
```

**Flow**:
1. Build execution graph from nodes and edges
2. Perform topological sort to determine execution order
3. Execute nodes in dependency order
4. Independent nodes run in parallel
5. Each node outputs update context for downstream nodes
6. Return complete execution outputs

**Implementation**:
```typescript
export async function orchestratorWorkflow(
    input: OrchestratorInput
): Promise<OrchestratorResult> {
    const { workflowDefinition, inputs = {} } = input;
    const { nodes, edges } = workflowDefinition;

    // Build dependency graph
    const nodeMap = new Map<string, WorkflowNode>();
    const outgoingEdges = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();

    Object.entries(nodes).forEach(([nodeId, node]) => {
        nodeMap.set(nodeId, node);
        outgoingEdges.set(nodeId, []);
        incomingEdges.set(nodeId, []);
    });

    edges.forEach(edge => {
        outgoingEdges.get(edge.source)?.push(edge.target);
        incomingEdges.get(edge.target)?.push(edge.source);
    });

    // Execution context
    const context: Record<string, any> = { ...inputs };
    const executed = new Set<string>();

    // Topological execution
    while (executed.size < nodeMap.size) {
        // Find ready nodes (all dependencies executed)
        const readyNodes = Object.entries(nodes).filter(([nodeId]) => {
            if (executed.has(nodeId)) return false;
            const deps = incomingEdges.get(nodeId) || [];
            return deps.every(dep => executed.has(dep));
        });

        if (readyNodes.length === 0) break; // Cycle or error

        // Execute all ready nodes in parallel
        const results = await Promise.all(
            readyNodes.map(([nodeId, node]) =>
                proxyActivities<typeof activities>({
                    startToCloseTimeout: "10 minutes",
                    retry: {
                        maximumAttempts: 3,
                        backoffCoefficient: 2
                    }
                }).executeNode(nodeId, node, context)
            )
        );

        // Update context with results
        readyNodes.forEach(([nodeId], idx) => {
            context[nodeId] = results[idx];
            executed.add(nodeId);
        });
    }

    return {
        success: true,
        outputs: context
    };
}
```

---

### 2. Triggered Workflow

**Location**: `backend/src/temporal/workflows/triggered-workflow.ts`

**Purpose**: Wrapper for scheduled/webhook executions

**Flow**:
1. `prepareTriggeredExecution` activity → Fetch workflow definition, create execution record
2. Run `orchestratorWorkflow` with prepared data
3. `completeTriggeredExecution` activity → Update execution status

**Implementation**:
```typescript
export async function triggeredWorkflow(
    input: TriggeredWorkflowInput
): Promise<TriggeredWorkflowResult> {
    const { prepareTriggeredExecution, completeTriggeredExecution } =
        proxyActivities<typeof activities>({ startToCloseTimeout: "5 minutes" });

    // Prepare execution
    const { execution, workflowDefinition } = await prepareTriggeredExecution({
        triggerId: input.triggerId,
        payload: input.payload
    });

    // Execute workflow
    const result = await orchestratorWorkflow({
        workflowDefinition,
        inputs: input.payload,
        executionId: execution.id
    });

    // Complete execution
    await completeTriggeredExecution({
        executionId: execution.id,
        result
    });

    return {
        success: true,
        executionId: execution.id,
        outputs: result.outputs
    };
}
```

---

### 3. User Input Workflow

**Location**: `backend/src/temporal/workflows/user-input-workflow.ts`

**Purpose**: Human-in-the-loop functionality - pause workflows waiting for user input

**Features**:
- Pauses execution until user provides input
- 5-minute timeout (configurable)
- Query handler to check input status
- Signal handler to receive user input

**Implementation**:
```typescript
export async function userInputWorkflow(
    input: UserInputWorkflowInput
): Promise<UserInputWorkflowResult> {
    let userInput: any = null;
    let completed = false;

    // Signal handler for receiving user input
    setHandler(userInputSignal, (data: any) => {
        userInput = data;
        completed = true;
    });

    // Query handler for checking status
    setHandler(inputStatusQuery, () => ({
        received: completed,
        value: userInput
    }));

    // Wait for input or timeout
    await condition(() => completed, "5 minutes");

    if (!completed) {
        throw new ApplicationFailure("User input timeout");
    }

    return {
        success: true,
        userInput
    };
}
```

**Usage**:
```typescript
// Start workflow
const handle = await client.workflow.start(userInputWorkflow, {
    args: [{ prompt: "Enter your name" }],
    taskQueue: "flowmaestro-orchestrator",
    workflowId: `user-input-${Date.now()}`
});

// Check status
const status = await handle.query(inputStatusQuery);

// Provide input
await handle.signal(userInputSignal, { name: "John Doe" });

// Wait for result
const result = await handle.result();
```

---

### 4. Long-Running Task Workflow

**Location**: `backend/src/temporal/workflows/long-running-task-workflow.ts`

**Purpose**: Execute tasks exceeding 5 minutes with heartbeat support

**Features**:
- Executes node batches via `executeNodeBatch` activity
- Heartbeat every 30 seconds
- Enhanced retry (5 attempts)
- Supports large datasets and complex processing

**Implementation**:
```typescript
export async function longRunningTaskWorkflow(
    input: LongRunningTaskInput
): Promise<LongRunningTaskResult> {
    const { executeNodeBatch } = proxyActivities<typeof activities>({
        startToCloseTimeout: "60 minutes",
        heartbeatTimeout: "30 seconds",
        retry: {
            maximumAttempts: 5,
            backoffCoefficient: 2
        }
    });

    const results = [];

    for (const batch of input.nodeBatches) {
        const batchResult = await executeNodeBatch({
            nodes: batch,
            context: input.context
        });
        results.push(batchResult);
    }

    return {
        success: true,
        results
    };
}
```

---

## Activity Patterns

### Activity Definition

Activities are side-effecting functions executed by Temporal workers.

**Location**: `backend/src/temporal/activities/node-executors/`

**Key Principles**:
1. **Idempotent**: Safe to retry multiple times
2. **Timeout-aware**: Complete within configured timeout
3. **Heartbeat-enabled**: For long-running tasks
4. **Error-handled**: Graceful failure handling

### Central Activity Router

**Location**: `backend/src/temporal/activities/node-executors/index.ts`

```typescript
export async function executeNode(
    nodeId: string,
    node: WorkflowNode,
    context: Record<string, any>
): Promise<any> {
    switch (node.type) {
        case "llm":
            return await executeLLMNode(node.config, context);
        case "http":
            return await executeHTTPNode(node.config, context);
        case "transform":
            return await executeTransformNode(node.config, context);
        case "conditional":
            return await executeConditionalNode(node.config, context);
        case "loop":
            return await executeLoopNode(node.config, context);
        case "agent":
            return await executeAgentNode(node.config, context);
        // ... 20+ more node types
        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }
}
```

### Activity Configuration

**Timeouts**:
```typescript
const activities = proxyActivities<typeof activityFunctions>({
    startToCloseTimeout: "10 minutes",  // Max execution time
    scheduleToCloseTimeout: "15 minutes",  // Max time including queue wait
    heartbeatTimeout: "30 seconds",  // For long-running activities
    retry: {
        maximumAttempts: 3,
        initialInterval: "1 second",
        backoffCoefficient: 2,
        maximumInterval: "1 minute"
    }
});
```

### Key Activity Executors

**LLM Executor**:
```typescript
export async function executeLLMNode(
    config: LLMNodeConfig,
    context: ActivityContext
): Promise<ActivityContext> {
    const connection = await connectionRepo.findByIdWithData(config.connectionId);
    const apiKey = connection.data.api_key;

    const prompt = interpolateVariables(config.prompt, context);

    const response = await openai.chat.completions.create({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: config.temperature || 0.7
    }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable || 'llmOutput']: response.choices[0].message.content
        }
    };
}
```

**HTTP Executor**:
```typescript
export async function executeHTTPNode(
    config: HTTPNodeConfig,
    context: ActivityContext
): Promise<ActivityContext> {
    const url = interpolateVariables(config.url, context);
    const headers = interpolateObject(config.headers || {}, context);
    const body = config.body ? interpolateObject(config.body, context) : undefined;

    const response = await axios({
        method: config.method,
        url,
        headers,
        data: body,
        timeout: config.timeout || 30000
    });

    return {
        ...context,
        variables: {
            ...context.variables,
            httpResponse: response.data,
            httpStatus: response.status
        }
    };
}
```

---

## Execution Methods

### 1. Manual Execution (API)

**Endpoint**: `POST /api/workflows/:id/execute`

```typescript
// backend/src/api/routes/workflows/execute.ts

export async function executeWorkflowHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const { id: workflowId } = request.params as { id: string };
    const { inputs = {} } = request.body as { inputs?: Record<string, any> };
    const userId = request.user!.id;

    // Fetch workflow
    const workflow = await workflowRepo.findById(workflowId, userId);
    if (!workflow) {
        throw new NotFoundError("Workflow not found");
    }

    // Create execution record
    const execution = await executionRepo.create({
        workflowId,
        userId,
        status: "running",
        inputs
    });

    // Start Temporal workflow
    const temporal = await getTemporalClient();
    const handle = await temporal.workflow.start(orchestratorWorkflow, {
        args: [{
            workflowDefinition: workflow.definition,
            inputs,
            executionId: execution.id
        }],
        taskQueue: "flowmaestro-orchestrator",
        workflowId: `workflow-${execution.id}`
    });

    // Wait for result
    const result = await handle.result();

    // Update execution
    await executionRepo.update(execution.id, userId, {
        status: "completed",
        outputs: result.outputs,
        completedAt: new Date()
    });

    reply.send({
        success: true,
        data: {
            executionId: execution.id,
            outputs: result.outputs
        }
    });
}
```

### 2. Scheduled Execution

**Service**: `backend/src/temporal/services/SchedulerService.ts`

```typescript
export class SchedulerService {
    async createSchedule(trigger: WorkflowTrigger): Promise<ScheduleHandle> {
        const temporal = await getTemporalClient();

        const handle = await temporal.schedule.create({
            scheduleId: `schedule-${trigger.id}`,
            spec: {
                cronExpressions: [trigger.config.cronExpression],
                timezone: trigger.config.timezone || "UTC"
            },
            action: {
                type: "startWorkflow",
                workflowType: triggeredWorkflow,
                args: [{
                    triggerId: trigger.id,
                    payload: {}
                }],
                taskQueue: "flowmaestro-orchestrator"
            },
            policies: {
                overlap: ScheduleOverlapPolicy.BUFFER_ONE,  // Prevent concurrent runs
                catchupWindow: "1 minute"  // Trigger missed runs within 1 min
            }
        });

        return handle;
    }

    async triggerNow(scheduleId: string): Promise<void> {
        const handle = temporal.schedule.getHandle(scheduleId);
        await handle.trigger();
    }

    async pause(scheduleId: string): Promise<void> {
        const handle = temporal.schedule.getHandle(scheduleId);
        await handle.pause();
    }

    async resume(scheduleId: string): Promise<void> {
        const handle = temporal.schedule.getHandle(scheduleId);
        await handle.unpause();
    }

    async delete(scheduleId: string): Promise<void> {
        const handle = temporal.schedule.getHandle(scheduleId);
        await handle.delete();
    }
}
```

**Initialization**:
```typescript
// backend/src/server.ts

// On server startup, sync all schedules
await initializeScheduledTriggers();

async function initializeScheduledTriggers() {
    const scheduleTriggers = await triggerRepo.findByType("schedule");
    const scheduler = new SchedulerService();

    for (const trigger of scheduleTriggers) {
        if (trigger.enabled) {
            await scheduler.createSchedule(trigger);
        }
    }
}
```

### 3. Webhook Execution

**Service**: `backend/src/temporal/services/WebhookService.ts`

```typescript
export class WebhookService {
    async handleWebhook(
        triggerId: string,
        payload: any,
        signature?: string
    ): Promise<{ success: boolean; executionId: string }> {
        // Validate trigger
        const trigger = await triggerRepo.findById(triggerId);
        if (!trigger || !trigger.enabled) {
            throw new Error("Trigger not found or disabled");
        }

        // Validate HMAC signature if required
        if (trigger.config.requireSignature && signature) {
            const isValid = this.validateHMAC(
                payload,
                signature,
                trigger.webhook_secret
            );
            if (!isValid) {
                throw new Error("Invalid webhook signature");
            }
        }

        // Start workflow
        const temporal = await getTemporalClient();
        const handle = await temporal.workflow.start(triggeredWorkflow, {
            args: [{
                triggerId: trigger.id,
                payload
            }],
            taskQueue: "flowmaestro-orchestrator",
            workflowId: `webhook-${Date.now()}-${triggerId}`
        });

        return {
            success: true,
            executionId: await handle.workflowId()
        };
    }

    private validateHMAC(payload: any, signature: string, secret: string): boolean {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        const expected = hmac.digest('hex');
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        );
    }
}
```

---

## Management

### Temporal UI

Access the Temporal web UI for monitoring and debugging:

**URL**: http://localhost:8088 (if using docker-compose)

**Features**:
- View workflow execution history
- Inspect workflow state and variables
- Cancel or terminate workflows
- Retry failed workflows
- View activity logs and errors

### Management Scripts

**Cancel Workflow**:
```typescript
const handle = temporal.workflow.getHandle(workflowId);
await handle.cancel();
```

**Terminate Workflow**:
```typescript
const handle = temporal.workflow.getHandle(workflowId);
await handle.terminate("User requested termination");
```

**Get Workflow Status**:
```typescript
const handle = temporal.workflow.getHandle(workflowId);
const description = await handle.describe();

console.log({
    status: description.status.name,  // RUNNING, COMPLETED, FAILED, etc.
    startTime: description.startTime,
    closeTime: description.closeTime,
    executionTime: description.executionTime
});
```

**Query Workflow State**:
```typescript
const handle = temporal.workflow.getHandle(workflowId);
const state = await handle.query("getState");
```

### Worker Monitoring

**Worker Health Check**:
```bash
curl http://localhost:3001/health/worker
```

**Worker Metrics** (if using Prometheus):
```
temporal_workflow_task_execution_count
temporal_activity_execution_count
temporal_worker_task_slots_used
```

---

## Best Practices

### Workflow Design

**DO**:
- Keep workflows deterministic (no random values, timestamps, or I/O)
- Use activities for all external calls (HTTP, database, file system)
- Keep workflow state small (use references to large data)
- Design for idempotency (safe to replay)

**DON'T**:
- Don't call external APIs directly from workflows
- Don't use `Date.now()` or `Math.random()` in workflows
- Don't store large payloads in workflow state
- Don't use non-deterministic libraries

### Activity Design

**DO**:
- Make activities idempotent
- Implement proper timeout and retry strategies
- Use heartbeats for long-running activities (>30s)
- Handle errors gracefully with meaningful messages

**DON'T**:
- Don't assume activities run only once
- Don't rely on activity execution order within parallel groups
- Don't ignore timeout configurations

### Error Handling

**DO**:
- Log errors to database for debugging
- Design for partial success scenarios
- Use workflow cancellation for user-initiated stops
- Set appropriate retry policies per activity

**DON'T**:
- Don't silently swallow errors
- Don't retry indefinitely without backoff
- Don't block workflows on unrecoverable errors

---

## Related Documentation

- **[workflows.md](./workflows.md)**: Workflow node types and execution
- **[agents.md](./agents.md)**: Agent execution via Temporal
- **[integrations.md](./integrations.md)**: Using connections in activities

---

## Summary

Temporal provides FlowMaestro with:

1. **Durable Execution**: Workflows survive crashes and continue from checkpoints
2. **Automatic Retries**: Activities retry with exponential backoff
3. **State Persistence**: Complete execution history stored
4. **Scalability**: Horizontal worker scaling for high throughput
5. **Observability**: Rich monitoring and debugging capabilities
6. **Flexibility**: Multiple trigger methods and execution patterns

This architecture cleanly separates deterministic workflow logic from side-effecting activities, making the system robust and maintainable at scale.
