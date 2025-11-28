# Audit Logging Implementation Specification

## Overview

Implement a comprehensive audit logging system to track all user actions across FlowMaestro with a real-time activity feed UI. This specification targets full Phase 1-3 scope covering workflows, agents, connections, knowledge bases, triggers, templates, and checkpoints.

## Scope Summary

**Features:**

- Action-based audit logging (create, update, delete, execute, etc.)
- Real-time updates via WebSocket
- Dedicated audit logs page with filters
- Support for all major resource types
- Performance-optimized with proper indexing

**Out of Scope (Future):**

- Field-level change tracking (old vs new values)
- Resource-specific history tabs
- Dashboard activity widget
- Export functionality
- Advanced analytics

---

## 1. Database Schema

### Migration: `backend/migrations/1730000000024_create-audit-logs-table.sql`

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS flowmaestro.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,

    -- Action classification
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'create', 'update', 'delete', 'execute',
        'archive', 'restore', 'share', 'copy',
        'invite', 'revoke', 'connect', 'disconnect',
        'upload', 'download', 'query', 'test'
    )),

    -- Resource identification
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN (
        'workflow', 'agent', 'connection', 'credential',
        'knowledge_base', 'document', 'execution',
        'agent_execution', 'thread', 'trigger',
        'template', 'checkpoint', 'user'
    )),
    resource_id UUID NOT NULL,
    resource_name VARCHAR(255), -- Denormalized for display

    -- Action details
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Request context
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_audit_logs_user_created ON flowmaestro.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON flowmaestro.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action_type ON flowmaestro.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON flowmaestro.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_metadata ON flowmaestro.audit_logs USING GIN(metadata);

COMMIT;
```

**Key Design Decisions:**

- No soft deletes (audit logs are permanent)
- Denormalized `resource_name` for quick display
- JSONB `metadata` for action-specific context
- Heavy indexing for read performance
- Status field to track failed actions

---

## 2. Shared Types

### File: `shared/src/audit-logs.ts` (NEW)

```typescript
export type AuditActionType =
    | "create"
    | "update"
    | "delete"
    | "execute"
    | "archive"
    | "restore"
    | "share"
    | "copy"
    | "invite"
    | "revoke"
    | "connect"
    | "disconnect"
    | "upload"
    | "download"
    | "query"
    | "test";

export type AuditResourceType =
    | "workflow"
    | "agent"
    | "connection"
    | "credential"
    | "knowledge_base"
    | "document"
    | "execution"
    | "agent_execution"
    | "thread"
    | "trigger"
    | "template"
    | "checkpoint"
    | "user";

export type AuditStatus = "success" | "failure" | "pending";

export interface AuditLog {
    id: string;
    user_id: string;
    action_type: AuditActionType;
    resource_type: AuditResourceType;
    resource_id: string;
    resource_name: string | null;
    description: string | null;
    status: AuditStatus;
    metadata: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
}

export interface CreateAuditLogInput {
    user_id: string;
    action_type: AuditActionType;
    resource_type: AuditResourceType;
    resource_id: string;
    resource_name?: string;
    description?: string;
    status?: AuditStatus;
    metadata?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
}

export interface AuditLogFilters {
    user_id?: string;
    action_type?: AuditActionType;
    resource_type?: AuditResourceType;
    resource_id?: string;
    status?: AuditStatus;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    offset?: number;
    search?: string;
}

export interface AuditLogListResponse {
    logs: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
```

### File: `shared/src/index.ts` (MODIFY)

Add: `export * from "./audit-logs";`

---

## 3. Backend Implementation

### 3.1 Repository: `backend/src/storage/repositories/AuditLogRepository.ts` (NEW)

Key methods:

- `create(input: CreateAuditLogInput): Promise<AuditLog>`
- `find(filters: AuditLogFilters): Promise<AuditLogListResponse>`
- `findByResource(resourceType, resourceId): Promise<AuditLog[]>`
- `findByUser(userId, limit): Promise<AuditLog[]>`
- `getStats(userId, days): Promise<{...}>`

Implementation pattern: Follow `SafetyLogRepository.ts` pattern with proper pagination and filtering.

### 3.2 Audit Logger Utility: `backend/src/shared/utils/audit-logger.ts` (NEW)

Central logging service with helper methods:

```typescript
export class AuditLogger {
    async log(params: {
        userId: string;
        action: AuditActionType;
        resourceType: AuditResourceType;
        resourceId: string;
        resourceName?: string;
        description?: string;
        status?: AuditStatus;
        metadata?: Record<string, unknown>;
        request?: FastifyRequest;
    }): Promise<void>

    // Helper methods for specific resources
    async logWorkflow(params: {...}): Promise<void>
    async logAgent(params: {...}): Promise<void>
    async logConnection(params: {...}): Promise<void>
    async logKnowledgeBase(params: {...}): Promise<void>
}

export const auditLogger = new AuditLogger();
```

**Critical:** Audit logging must be fire-and-forget (non-blocking). Errors should log to console but never throw.

### 3.3 API Routes

#### File: `backend/src/api/routes/audit-logs/list.ts` (NEW)

- `GET /api/audit-logs` - List with filters and pagination
- Query params: action_type, resource_type, status, start_date, end_date, limit, offset, search
- Always filter by current user's `user_id`

#### File: `backend/src/api/routes/audit-logs/stats.ts` (NEW)

- `GET /api/audit-logs/stats?days=30` - Get statistics

#### File: `backend/src/api/routes/audit-logs/index.ts` (NEW)

Route registration with auth middleware.

#### File: `backend/src/api/server.ts` (MODIFY)

Register routes: `await fastify.register(auditLogRoutes, { prefix: "/api/audit-logs" });`

### 3.4 Integration Points

Add `auditLogger.logWorkflow/logAgent/etc()` calls to these route handlers:

**Workflows** (5 routes):

- `backend/src/api/routes/workflows/create.ts` → create action
- `backend/src/api/routes/workflows/update.ts` → update action
- `backend/src/api/routes/workflows/delete.ts` → delete action
- `backend/src/api/routes/workflows/execute.ts` → execute action
- `backend/src/api/routes/workflows/generate.ts` → create action (AI-generated)

**Agents** (6 routes):

- `backend/src/api/routes/agents/create.ts` → create action
- `backend/src/api/routes/agents/update.ts` → update action
- `backend/src/api/routes/agents/delete.ts` → delete action
- `backend/src/api/routes/agents/execute.ts` → execute action
- `backend/src/api/routes/agents/add-tool.ts` → update action
- `backend/src/api/routes/agents/remove-tool.ts` → update action

**Connections** (4 routes):

- `backend/src/api/routes/connections/create.ts` → create action
- `backend/src/api/routes/connections/update.ts` → update action
- `backend/src/api/routes/connections/delete.ts` → delete action
- `backend/src/api/routes/connections/test.ts` → test action

**Knowledge Bases** (6 routes):

- `backend/src/api/routes/knowledge-bases/create.ts` → create action
- `backend/src/api/routes/knowledge-bases/update.ts` → update action
- `backend/src/api/routes/knowledge-bases/delete.ts` → delete action
- `backend/src/api/routes/knowledge-bases/upload-document.ts` → upload action
- `backend/src/api/routes/knowledge-bases/delete-document.ts` → delete action
- `backend/src/api/routes/knowledge-bases/query.ts` → query action

**Triggers** (3 routes):

- `backend/src/api/routes/triggers/create.ts` → create action
- `backend/src/api/routes/triggers/update.ts` → update action
- `backend/src/api/routes/triggers/delete.ts` → delete action

**Templates** (1 route):

- `backend/src/api/routes/templates/copy.ts` → copy action

**Checkpoints** (3 routes):

- `backend/src/api/routes/checkpoints/create.ts` → create action
- `backend/src/api/routes/checkpoints/revert.ts` → restore action
- `backend/src/api/routes/checkpoints/delete.ts` → delete action

**Pattern Example:**

```typescript
// After successful operation
const workflow = await workflowRepository.create({...});

// Fire-and-forget audit log (don't await)
auditLogger.logWorkflow({
    userId: request.user!.id,
    action: "create",
    workflowId: workflow.id,
    workflowName: workflow.name,
    metadata: { ai_generated: workflow.ai_generated },
    request
});

return reply.status(201).send({...});
```

---

## 4. WebSocket Integration

### 4.1 Backend WebSocket Event

#### File: `backend/src/api/routes/websocket.ts` (MODIFY)

Add new event type to WebSocket handler:

```typescript
// In shared/src/types.ts - Add to WebSocketEventType
export type WebSocketEventType =
    | ... existing types ...
    | "audit:log:created";

// Emit from audit logger after creating log
io.to(`user:${userId}`).emit("audit:log:created", auditLog);
```

#### File: `backend/src/shared/utils/audit-logger.ts` (MODIFY)

After creating audit log in repository, emit WebSocket event:

```typescript
const log = await this.repository.create(input);

// Emit WebSocket event for real-time updates
if (this.io) {
    this.io.to(`user:${params.userId}`).emit("audit:log:created", log);
}
```

### 4.2 Frontend WebSocket Listener

#### File: `frontend/src/lib/websocket.ts` (MODIFY)

Add event listener for audit log updates.

#### File: `frontend/src/pages/AuditLogs.tsx` (MODIFY)

```typescript
useEffect(() => {
    const handler = (log: AuditLog) => {
        // Prepend new log to the list
        queryClient.setQueryData(["audit-logs", filters, page], (old) => ({
            ...old,
            data: {
                ...old.data,
                logs: [log, ...old.data.logs]
            }
        }));
    };

    websocket.on("audit:log:created", handler);
    return () => websocket.off("audit:log:created", handler);
}, [filters, page]);
```

---

## 5. Frontend Implementation

### 5.1 API Client: `frontend/src/lib/api.ts` (MODIFY)

Add functions:

- `getAuditLogs(filters?: AuditLogFilters)`
- `getAuditStats(days?: number)`

### 5.2 Components

#### File: `frontend/src/components/audit/AuditLogItem.tsx` (NEW)

Individual log entry component with:

- Resource icon (FileText, Bot, Database, Key based on type)
- Action icon (Create, Edit, Trash, Play, etc.)
- Status icon (CheckCircle, XCircle, Clock)
- Description and resource name
- Metadata display (e.g., "Status: SUCCESS, Duration: 2.3s")
- Relative timestamp ("5m ago", "2h ago", etc.)

#### File: `frontend/src/components/audit/AuditLogFilters.tsx` (NEW)

Filter controls:

- Action type dropdown (All, Create, Update, Delete, Execute, etc.)
- Resource type dropdown (All, Workflows, Agents, Connections, etc.)
- Status dropdown (All, Success, Failure, Pending)

#### File: `frontend/src/pages/AuditLogs.tsx` (NEW)

Main page with:

- PageHeader: "Audit Logs - Track all actions taken within FlowMaestro"
- Filters component
- Audit log list with pagination
- Empty state
- Loading state
- Real-time WebSocket updates

### 5.3 Navigation

#### File: `frontend/src/App.tsx` (MODIFY)

Add route: `<Route path="/audit-logs" element={<AuditLogsPage />} />`

#### File: `frontend/src/components/Layout.tsx` (MODIFY)

Add navigation link to sidebar with FileText icon.

---

## 6. Security & Privacy

**CRITICAL - Never log:**

- Passwords
- API keys or tokens
- Secret keys
- Full credentials
- PII unless necessary

**Access Control:**

- Users can ONLY see their own logs (enforced via `user_id` filter)
- No cross-tenant access

**IP Extraction:**

- Check `X-Forwarded-For` header (proxy)
- Check `X-Real-IP` header
- Fallback to `request.ip`

---

## 7. Implementation Order

### Phase 1: Foundation (Days 1-2)

1. Create database migration
2. Run migration: `npm run db:migrate`
3. Create shared types (`shared/src/audit-logs.ts`)
4. Create `AuditLogRepository`
5. Create `audit-logger` utility
6. Manual test: insert log via repository

### Phase 2: Backend API (Days 3-5)

7. Create audit log API routes (list, stats)
8. Register routes in server.ts
9. Test API endpoints with Postman/curl
10. Integrate into workflow routes (create, update, delete, execute)
11. Integrate into agent routes
12. Integrate into connection routes
13. Test end-to-end: create workflow → verify log appears

### Phase 3: Frontend (Days 6-8)

14. Add API client methods
15. Create `AuditLogItem` component
16. Create `AuditLogFilters` component
17. Create `AuditLogsPage`
18. Add route and navigation
19. Test UI thoroughly

### Phase 4: Real-Time & Remaining Integrations (Days 9-10)

20. Add WebSocket event emission in audit logger
21. Add WebSocket listener in frontend
22. Test real-time updates
23. Integrate remaining routes (knowledge bases, triggers, templates, checkpoints)
24. Final testing and polish

---

## 8. Testing Strategy

### Manual Testing Checklist

- [ ] Create workflow → Audit log appears
- [ ] Update workflow → Audit log appears
- [ ] Delete workflow → Audit log appears
- [ ] Execute workflow → Audit log with duration appears
- [ ] Create agent → Audit log appears
- [ ] Add connection → Audit log appears
- [ ] Filter by action type works
- [ ] Filter by resource type works
- [ ] Filter by status works
- [ ] Pagination works
- [ ] Search works
- [ ] Real-time update: create workflow in one tab, see log appear in audit logs page without refresh
- [ ] Icons display correctly
- [ ] Timestamps format correctly
- [ ] Metadata displays correctly

### Integration Tests

Create `backend/tests/integration/audit-logs.test.ts`:

- Test repository CRUD operations
- Test filtering
- Test pagination
- Test stats calculation

---

## 9. Critical Files Summary

**Must Create (11 files):**

1. `backend/migrations/1730000000024_create-audit-logs-table.sql`
2. `shared/src/audit-logs.ts`
3. `backend/src/storage/repositories/AuditLogRepository.ts`
4. `backend/src/shared/utils/audit-logger.ts`
5. `backend/src/api/routes/audit-logs/list.ts`
6. `backend/src/api/routes/audit-logs/stats.ts`
7. `backend/src/api/routes/audit-logs/index.ts`
8. `frontend/src/components/audit/AuditLogItem.tsx`
9. `frontend/src/components/audit/AuditLogFilters.tsx`
10. `frontend/src/pages/AuditLogs.tsx`
11. `backend/tests/integration/audit-logs.test.ts`

**Must Modify (7 files):**

1. `shared/src/index.ts` - Export audit types
2. `backend/src/api/server.ts` - Register routes
3. `backend/src/api/routes/websocket.ts` - Add WebSocket event
4. `frontend/src/lib/api.ts` - Add API methods
5. `frontend/src/lib/websocket.ts` - Add event listener
6. `frontend/src/App.tsx` - Add route
7. `frontend/src/components/Layout.tsx` - Add navigation

**Integration points (28 route files):**

- 5 workflow routes
- 6 agent routes
- 4 connection routes
- 6 knowledge base routes
- 3 trigger routes
- 1 template route
- 3 checkpoint routes

---

## 10. Performance Considerations

**Database:**

- Heavy indexing on `user_id`, `created_at`, `resource_type`
- GIN index on JSONB metadata
- Default page size: 50

**Application:**

- Fire-and-forget logging (non-blocking)
- Async operations don't block main request flow
- Errors in audit logging never throw to caller

**Future Optimizations:**

- Table partitioning by month (after 100k+ logs)
- Archiving old logs (after 1 year)
- Cursor-based pagination for large datasets

---

## Success Criteria

✅ All user actions are logged to `audit_logs` table
✅ Audit logs page displays activity feed matching screenshot
✅ Filters work correctly (action, resource, status)
✅ Real-time updates via WebSocket
✅ No sensitive data logged (passwords, keys, etc.)
✅ Multi-tenant isolation enforced
✅ Performance acceptable (< 100ms query time)
✅ All tests pass

---

## Estimated Timeline

**Total: 10 days (2 weeks)**

- Phase 1 (Foundation): 2 days
- Phase 2 (Backend API): 3 days
- Phase 3 (Frontend): 3 days
- Phase 4 (Real-Time & Integration): 2 days

This timeline assumes full-time focus on this feature and can be adjusted based on priority and resource availability.
