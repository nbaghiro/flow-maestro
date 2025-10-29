# FlowMaestro Architecture - Executive Summary

## Quick Reference

### 1. Project Structure
- **Monorepo** with 3 workspaces: frontend, backend, shared
- **Frontend**: React 18 + TypeScript + Vite (port 3000)
- **Backend**: Fastify + Node.js 20 + TypeScript (port 3001)
- **Orchestration**: Temporal for durable workflow execution
- **Data**: PostgreSQL 15 + Redis 7

### 2. Frontend Architecture

**Directory Structure**:
- `pages/` - Route-level components
- `components/` - Reusable UI components with custom dialog system
- `canvas/` - React Flow integration for visual workflows
- `stores/` - Zustand state management (workflows, executions, credentials)
- `lib/` - API clients, WebSocket, utilities

**Key Patterns**:
- **State Management**: Zustand for client state, TanStack Query for server state
- **Dialog System**: Custom implementation instead of browser dialogs
  - Base Dialog with Escape key, backdrop dismiss, scroll lock
  - ConfirmDialog for two-button actions
  - Form dialogs with validation and error handling
- **Component Types**: Pages, Layouts, Reusable Components, Custom Hooks
- **Styling**: Tailwind CSS utility-first approach

**Dialog File Locations**:
- `/components/common/Dialog.tsx` - Base dialog component
- `/components/common/ConfirmDialog.tsx` - Confirmation dialog
- `/components/CreateWorkflowDialog.tsx` - Form dialog example
- `/components/triggers/CreateTriggerDialog.tsx`
- `/components/ErrorDialog.tsx`

### 3. Backend Architecture

**Directory Structure**:
- `api/` - REST API routes with middleware
- `temporal/` - Workflow definitions and activity executors (20+ node types)
- `storage/` - Database repositories and models
- `shared/` - Configuration, registry, utilities

**API Patterns**:
- **Route Organization**: Each resource has its own directory with CRUD operations
- **Middleware Stack**: Auth → Validation → Handler
- **Response Format**: `{ success: boolean, data?: T, error?: string }`
- **Error Handling**: Custom AppError classes (ValidationError, NotFoundError, etc.)
- **Repositories**: Type-safe database access with prepared statements

**HTTP Methods**:
- Workflows: GET /list, POST /create, GET /:id, PUT /:id, DELETE /:id, POST /:id/execute
- Executions: GET /list, GET /:id, GET /:id/logs, POST /:id/cancel
- Credentials, Integrations, Knowledge Bases follow similar patterns

### 4. Temporal Workflow Orchestration

**Key Concept**: Durable execution of DAG workflows

**Process**:
1. User submits workflow definition (nodes + edges)
2. API stores in PostgreSQL
3. API calls Temporal to start `orchestratorWorkflow`
4. Temporal queues on `flowmaestro-orchestrator` task queue
5. Worker picks up and executes
6. Topological sort determines execution order
7. Independent nodes execute in parallel
8. Each node is an activity with retry/timeout policies
9. WebSocket events stream real-time updates to frontend

**Workflow File**: `/backend/src/temporal/workflows/orchestrator-workflow.ts`

### 5. Real-Time Communication

**WebSocket**: Socket.IO for bidirectional communication
- Frontend connects with JWT token
- Backend manages connection map by user_id
- Events: execution:started, node:completed, node:stream, execution:completed
- Frontend stores listeners in Map<string, Set<Function>>

### 6. Testing Patterns

**Integration Tests**:
- Step-by-step node execution
- Mock external APIs (HTTP, LLM, PDF)
- Context accumulation between steps
- Error scenario validation

**Commands**:
```bash
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:coverage     # Coverage report
```

### 7. Build & Deployment

**Development**:
```bash
npm run docker:up        # Start PostgreSQL, Redis, Temporal
npm run dev              # Start frontend + backend
npm run db:migrate       # Apply migrations
```

**Production**:
- Frontend: Built to `dist/`, deployed to S3 + CloudFront
- Backend: Docker image deployed to ECS Fargate
- Worker: Separate Docker image for Temporal workers
- RDS PostgreSQL with Multi-AZ failover
- ElastiCache Redis for caching

### 8. Key Architectural Decisions

1. **Custom Dialogs** instead of browser alerts/confirm
   - Better UX control
   - Consistent styling with Tailwind
   - Form validation and error handling
   - Escape key and backdrop dismiss

2. **Repository Pattern** for database access
   - Type-safe with TypeScript generics
   - Easy to test and mock
   - Consistent error handling

3. **Middleware Chain** for request processing
   - Authentication first
   - Then validation
   - Clean handler code

4. **Temporal for durability**
   - Workflows survive failures
   - No message queue complexity
   - Built-in retry logic
   - Execution history for debugging

5. **Zustand over Context API**
   - Simpler API
   - Better performance
   - Easier to test
   - DevTools support

### 9. Common Development Tasks

**Add new dialog**:
1. Create component in `/components/`
2. Use Dialog or ConfirmDialog as base
3. Handle state with useState + async operations
4. Prevent closing while processing
5. Reset form on success

**Add new API endpoint**:
1. Create file in `/api/routes/resource/action.ts`
2. Define route with middleware chain
3. Create repository call
4. Return `{ success: true, data }` response
5. Register in `/api/routes/resource/index.ts`

**Add new node executor**:
1. Create file in `/backend/src/temporal/activities/node-executors/`
2. Implement async function accepting node config and context
3. Register in node registry
4. Create frontend component in `/canvas/nodes/`
5. Add to node palette

### 10. File Locations Quick Reference

**Frontend**:
- API client: `frontend/src/lib/api.ts`
- WebSocket: `frontend/src/lib/websocket.ts`
- Stores: `frontend/src/stores/*.ts`
- Dialogs: `frontend/src/components/common/` and component-specific
- Pages: `frontend/src/pages/`
- Canvas: `frontend/src/canvas/`

**Backend**:
- Routes: `backend/src/api/routes/{resource}/{action}.ts`
- Repositories: `backend/src/storage/repositories/{Resource}Repository.ts`
- Workflows: `backend/src/temporal/workflows/{workflow}.ts`
- Node Executors: `backend/src/temporal/activities/node-executors/{node}.ts`
- Models: `backend/src/storage/models/{Resource}.ts`
- Middleware: `backend/src/api/middleware/*.ts`
- Schemas: `backend/src/api/schemas/*.ts`

### 11. Database Schema Highlights

**Multi-tenant**: All tables have `user_id` foreign key
**Soft deletes**: `deleted_at` timestamp field
**JSONB storage**: `definition`, `config`, `metadata` columns
**Indexes**: On frequently queried columns (email, status, created_at)
**Prepared statements**: All queries use parameterized values

### 12. Environment Variables

**Frontend** (.env):
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

**Backend** (.env):
```
POSTGRES_HOST=localhost
POSTGRES_DB=flowmaestro
REDIS_HOST=localhost
TEMPORAL_ADDRESS=localhost:7233
JWT_SECRET=dev-secret
```

---

## Performance Optimizations

- **Frontend**: Code splitting, asset minification, lazy loading
- **Backend**: Connection pooling, prepared statements, JSONB indexes
- **Temporal**: Parallel node execution, activity timeout tuning, retry backoff
- **Database**: Pagination, filtering, soft deletes for data integrity

---

## Documentation Files

- `/README.md` - Project overview and getting started
- `/_docs/ARCHITECTURE.md` - Comprehensive architecture guide
- `/_docs/workflow-triggers-implementation.md` - Trigger system details
- `/_docs/database-migrations.md` - Database migration guide
- `/_docs/testing-guide.md` - Testing philosophy and examples

