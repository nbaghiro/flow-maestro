# Temporal Orchestration in FlowMaestro

## Overview

FlowMaestro uses Temporal as a **workflow orchestration engine** to execute node-based workflow definitions with reliability, retry logic, and state persistence.

---

## 1. Core Architecture

### Temporal Worker
**backend/src/temporal/workers/orchestrator-worker.ts**

- **Task Queue:** `flowmaestro-orchestrator`
- **Connection:** localhost:7233 (configurable via `TEMPORAL_ADDRESS`)
- **Capacity:** 10 concurrent workflows, 10 concurrent activities
- **Workflow Bundling:** Ignores `@flowmaestro/shared`, `uuid`, `pg`, `redis`, `fastify` to keep workflows deterministic

### Temporal Client (Singleton)
**backend/src/temporal/client.ts**

Provides shared connection to Temporal server used by API routes and services.

---

## 2. Workflows (4 Types)

### A. **Orchestrator Workflow** (Main)
**backend/src/temporal/workflows/orchestrator-workflow.ts**

The core workflow that executes node-based workflow definitions:

**Flow:**
1. Accepts `WorkflowDefinition` (nodes + edges) and inputs
2. Builds execution graph with topological ordering
3. Executes nodes sequentially based on dependencies
4. Each node runs via `executeNode` activity (10min timeout, 3 retries)
5. Results stored in execution context
6. Returns outputs from all nodes

**Key Features:**
- Dependency management (waits for parent nodes)
- Error handling (skips dependent nodes if parent fails)
- Variable interpolation across nodes

### B. **Triggered Workflow**
**backend/src/temporal/workflows/triggered-workflow.ts**

Wrapper for scheduled/webhook executions:

**Flow:**
1. `prepareTriggeredExecution` activity → fetches workflow definition, creates execution record
2. Runs `orchestratorWorkflow` with prepared data
3. `completeTriggeredExecution` activity → updates execution status

### C. **User Input Workflow**
**backend/src/temporal/workflows/user-input-workflow.ts**

Human-in-the-loop functionality:
- Pauses execution waiting for user input via Temporal signals
- 5-minute timeout (configurable)
- Query handler to check input status

### D. **Long-Running Task Workflow**
**backend/src/temporal/workflows/long-running-task-workflow.ts**

For tasks exceeding 5 minutes:
- Executes node batches via `executeNodeBatch` activity
- Heartbeat support (30s intervals)
- Enhanced retry (5 attempts)

---

## 3. Activities (Node Executors)

### Central Router
**backend/src/temporal/activities/node-executors/index.ts**

Dispatches to 20+ node type executors:

**Categories:**
- **AI/ML:** `llm`, `vision`, `audio`, `embeddings`
- **HTTP:** `http` (full REST client)
- **Data:** `transform`, `variable`, `input`, `output`, `fileOperations`
- **Logic:** `conditional`, `switch`, `loop`, `code`, `wait`
- **Integration:** `database`, `integration`

### Key Executors

**HTTP Executor** (backend/src/temporal/activities/node-executors/http-executor.ts):
- All HTTP methods, auth types (Basic, Bearer, API Key)
- Variable interpolation in URLs/headers/body
- Configurable retries with exponential backoff

**LLM Executor** (backend/src/temporal/activities/node-executors/llm-executor.ts):
- Providers: OpenAI, Anthropic, Google, Cohere
- Credential management from database
- Auto-retry on rate limits (429/503/529)
- Token tracking

**Transform Executor** (backend/src/temporal/activities/node-executors/transform-executor.ts):
- Operations: map, filter, reduce, sort, merge, extract
- JSONata expressions
- XML/JSON parsing

**Trigger Execution Activities** (backend/src/temporal/activities/trigger-execution.ts):
- `prepareTriggeredExecution`: Setup for scheduled/webhook runs
- `completeTriggeredExecution`: Update execution status

---

## 4. Execution Triggers (3 Methods)

### A. **Manual Execution (API)**
**backend/src/api/routes/workflows/execute.ts**

```typescript
POST /api/workflows/execute
→ Convert frontend format to backend format
→ Start orchestratorWorkflow via Temporal client
→ Wait for result and return
```

### B. **Scheduled Execution**
**backend/src/temporal/services/SchedulerService.ts**

- Creates Temporal Schedules with cron expressions
- Overlap policy: BUFFER_ONE (prevents concurrent runs)
- Operations: create, update, pause, resume, delete, triggerNow
- Starts `triggeredWorkflow` on schedule

**Initialization:** `initializeScheduledTriggers()` syncs all schedules on startup

### C. **Webhook Execution**
**backend/src/temporal/services/WebhookService.ts**

```
POST /api/webhooks/{triggerId}
→ Validate trigger + HMAC signature
→ Start triggeredWorkflow with request payload
→ Return 202 Accepted immediately
```

---

## 5. Workflow Execution Flow

```
┌─────────────────┐
│  Trigger Entry  │  (Manual API / Schedule / Webhook)
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────┐
│  Temporal Client                            │
│  - Generates unique workflow ID             │
│  - Starts workflow on task queue            │
└────────┬────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  Orchestrator Worker                        │
│  - Polls task queue                         │
│  - Executes workflow code                   │
└────────┬────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  orchestratorWorkflow                       │
│  1. Build execution graph (topological)     │
│  2. Find start nodes (no dependencies)      │
│  3. For each node:                          │
│     - Wait for dependencies                 │
│     - Execute via executeNode activity      │
│     - Store result in context               │
│     - Trigger dependent nodes               │
│  4. Return outputs                          │
└────────┬────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  Activities (Node Executors)                │
│  - HTTP calls, LLM inference, transforms    │
│  - Database operations, file ops            │
│  - Each activity is retryable & idempotent  │
└─────────────────────────────────────────────┘
```

---

## 6. Special Features

### **Workflow Converter**
**backend/src/shared/utils/workflow-converter.ts**

Converts between formats:
- **Frontend:** React Flow format (array of nodes with `data` property)
- **Backend:** Temporal format (record of nodes with `config` property)

### **Variable Interpolation**
**backend/src/temporal/activities/node-executors/utils.ts**

Supports `${variable}` syntax with:
- Nested paths: `${user.profile.name}`
- Array indices: `${items[0].id}`
- Complex JSON construction

### **Error Handling**
- Activity retries with exponential backoff
- Timeouts at activity level (10min default)
- Graceful degradation (partial success supported)
- Execution logs stored in database

### **Real-time Updates**
- Event bridge connects Temporal events to WebSocket
- Frontend receives execution progress in real-time

---

## 7. Key Files Reference

| Component | File Path |
|-----------|-----------|
| Worker Config | `backend/src/temporal/workers/orchestrator-worker.ts` |
| Main Workflow | `backend/src/temporal/workflows/orchestrator-workflow.ts` |
| Temporal Client | `backend/src/temporal/client.ts` |
| Activity Router | `backend/src/temporal/activities/node-executors/index.ts` |
| Scheduler Service | `backend/src/temporal/services/SchedulerService.ts` |
| Webhook Service | `backend/src/temporal/services/WebhookService.ts` |
| Manual Execution API | `backend/src/api/routes/workflows/execute.ts` |
| Format Converter | `backend/src/shared/utils/workflow-converter.ts` |

---

## 8. Development Workflow

### Starting the Worker

**Development mode:**
```bash
npm run worker:orchestrator:dev
```

**Production mode:**
```bash
npm run worker:orchestrator
```

### Testing

Test environment setup available at:
- `backend/tests/helpers/test-temporal.ts` - In-memory Temporal for testing
- Test fixtures in `backend/tests/fixtures/workflows/`

---

## 9. Best Practices

### Workflow Design
- Keep workflows **deterministic** - no random values, timestamps, or I/O
- Use activities for all external calls (HTTP, database, file system)
- Avoid large payloads in workflow state (use references instead)

### Activity Design
- Make activities **idempotent** - safe to retry multiple times
- Implement proper timeout and retry strategies
- Use heartbeats for long-running activities (>30s)

### Error Handling
- Design for partial success scenarios
- Log errors to database for debugging
- Use workflow cancellation for user-initiated stops

---

## Summary

Temporal provides FlowMaestro with:
- **Reliability:** Automatic retries, state persistence, crash recovery
- **Scalability:** Horizontal worker scaling, concurrent execution control
- **Observability:** Execution history, logging, real-time monitoring
- **Flexibility:** Multiple trigger methods, human-in-the-loop support
- **Determinism:** Workflow bundling ensures reproducible executions

The architecture cleanly separates **deterministic workflow logic** from **side-effecting activities**, making the system robust and maintainable.
