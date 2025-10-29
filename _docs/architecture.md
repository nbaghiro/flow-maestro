# FlowMaestro Codebase Architecture Summary

A comprehensive guide to the FlowMaestro project structure, patterns, and architectural decisions.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Technology Stack](#technology-stack)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Dialog/Modal Patterns](#dialogmodal-patterns)
7. [API Structure & Patterns](#api-structure--patterns)
8. [Testing Strategy](#testing-strategy)
9. [Build & Configuration](#build--configuration)
10. [Key Architectural Patterns](#key-architectural-patterns)

---

## Project Overview

**FlowMaestro** is an enterprise-grade LLM agent orchestration system that enables users to:
- Visually build complex AI workflows using a React Flow canvas
- Execute workflows durably using Temporal as the orchestration engine
- Integrate with multiple LLM providers (OpenAI, Anthropic, Google, Cohere)
- Monitor real-time execution through WebSocket connections
- Manage credentials, integrations, and knowledge bases

The platform emphasizes **durable execution** - workflows survive system failures through Temporal's persistent execution model.

---

## Monorepo Structure

FlowMaestro is organized as an **npm workspaces monorepo** with three main packages:

```
flowmaestro/
├── frontend/                 # React SPA (port 3000)
├── backend/                  # Fastify API + Temporal workflows (port 3001)
├── shared/                   # Shared TypeScript types and utilities
├── docker-compose.yml        # Development infrastructure
├── package.json             # Root workspace config
└── tsconfig.base.json       # Shared TypeScript config
```

### Workspace Configuration
- **Root `package.json`**: Defines workspace commands and shared dev dependencies
- **Individual `tsconfig.json`**: Each package extends `tsconfig.base.json`
- **Package references**: Backend and frontend both reference the shared package

**Key Scripts**:
```bash
npm run dev                  # Run frontend + backend concurrently
npm run build              # Build all workspaces
npm run test               # Test all workspaces
npm run lint               # Lint all packages
npm run docker:up          # Start infrastructure (PostgreSQL, Redis, Temporal)
npm run db:migrate         # Run database migrations
```

---

## Technology Stack

### Frontend
| Category | Technology | Version |
|----------|-----------|---------|
| **Core** | React | 18.2.0 |
| **Language** | TypeScript | 5.3.3 |
| **Build Tool** | Vite | 5.1.0 |
| **Canvas** | React Flow | 11.10.4 |
| **UI Components** | Radix UI | Latest |
| **Styling** | Tailwind CSS | 3.4.1 |
| **State Management** | Zustand | 4.5.0 |
| **Server State** | TanStack Query | 5.18.0 |
| **Icons** | Lucide React | 0.323.0 |
| **Routing** | React Router | 6.22.0 |
| **WebSocket** | Socket.IO Client | 4.7.4 |
| **HTTP Client** | Axios | 1.6.7 |
| **Testing** | Vitest, Playwright | Latest |

### Backend
| Category | Technology | Version |
|----------|-----------|---------|
| **Core** | Node.js | 20+ |
| **Language** | TypeScript | 5.3.3 |
| **Framework** | Fastify | 5.6.1 |
| **Database** | PostgreSQL | 15 |
| **Cache** | Redis | 7 |
| **Orchestration** | Temporal | 1.23.0 |
| **LLM SDKs** | OpenAI, Anthropic, Google, Cohere | Latest |
| **Validation** | Zod | 3.22.4 |
| **HTTP Client** | Axios | 1.12.2 |
| **Job Queue** | BullMQ | 5.3.0 |
| **Testing** | Jest, Supertest | Latest |

### Infrastructure
- **Docker**: Development containerization (PostgreSQL, Redis, Temporal)
- **Docker Compose**: Multi-container orchestration
- **AWS (Production)**: ECS, RDS, ElastiCache, CloudFront, S3, ALB

---

## Frontend Architecture

### Directory Structure
```
frontend/src/
├── pages/                   # Page-level components (routed)
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Workflows.tsx
│   ├── FlowBuilder.tsx
│   ├── Credentials.tsx
│   ├── Integrations.tsx
│   └── KnowledgeBases/
├── components/              # Reusable UI components
│   ├── common/             # Generic components (Dialog, ConfirmDialog)
│   ├── layout/             # Layout components (AppLayout, Headers)
│   ├── execution/          # Execution-related components
│   ├── triggers/           # Trigger management components
│   ├── credentials/        # Credential management components
│   └── integrations/       # Integration components
├── canvas/                  # React Flow integration
│   ├── nodes/              # Custom node type components
│   ├── edges/              # Custom edge components
│   └── controls/           # Canvas controls (zoom, pan, etc.)
├── stores/                  # Zustand state management
│   ├── workflowStore.ts    # Workflow + execution state
│   ├── credentialStore.ts  # Credentials state
│   ├── triggerStore.ts     # Triggers state
│   └── knowledgeBaseStore.ts # Knowledge base state
├── lib/                     # Utility functions and API clients
│   ├── api.ts              # REST API client
│   ├── websocket.ts        # WebSocket client
│   └── *.ts                # Helper functions
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript type definitions
└── styles/                  # Global styles and Tailwind config
```

### State Management Pattern

**Zustand Stores** for client-side state:
```typescript
// Example: workflowStore.ts
export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
    // State
    nodes: [],
    edges: [],
    selectedNode: null,
    
    // Actions
    setNodes: (nodes) => set({ nodes }),
    updateNode: (nodeId, data) => set(state => ({
        nodes: state.nodes.map(n => n.id === nodeId ? {...n, data} : n)
    })),
    
    // Async actions
    executeWorkflow: async (inputs) => {
        set({ isExecuting: true });
        try {
            const result = await executeWorkflowAPI(...);
            set({ executionResult: result });
        } finally {
            set({ isExecuting: false });
        }
    }
}));

// Usage in components
const { nodes, setNodes, executeWorkflow } = useWorkflowStore();
```

**TanStack Query** for server state:
- Used for caching API responses
- Automatic refetching and synchronization
- Error boundary handling

### Component Patterns

#### Basic Functional Component
```typescript
interface ComponentProps {
    title: string;
    onAction?: () => void;
}

export function MyComponent({ title, onAction }: ComponentProps) {
    const [state, setState] = useState(false);
    
    return (
        <div className="space-y-4">
            <h2>{title}</h2>
            {/* content */}
        </div>
    );
}
```

#### Page Component Pattern
```typescript
export function MyPage() {
    const navigate = useNavigate();
    const { data, isLoading, error } = useQuery({
        queryKey: ['resource'],
        queryFn: fetchResource
    });
    
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;
    
    return (
        <div>
            {/* page content */}
        </div>
    );
}
```

---

## Dialog/Modal Patterns

The frontend uses **custom dialog implementations** instead of browser dialogs. Here are the established patterns:

### 1. Base Dialog Component
**File**: `/frontend/src/components/common/Dialog.tsx`

```typescript
interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children?: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg";
}

export function Dialog({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = "md",
}: DialogProps) {
    // Handles:
    // - Escape key to close
    // - Body scroll lock
    // - Backdrop dismiss
    // - Flexible sizing
}
```

**Features**:
- Custom implementation with Tailwind styling
- Backdrop with blur effect
- Escape key handler
- Body scroll prevention
- Smooth animations (fade-in, zoom-in)
- Three size variants: sm, md, lg

### 2. Confirmation Dialog
**File**: `/frontend/src/components/common/ConfirmDialog.tsx`

```typescript
interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "default";
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
}: ConfirmDialogProps)
```

**Features**:
- Two-button action dialog
- Danger variant with red styling and warning icon
- Prevents action while processing
- Built on top of base Dialog

### 3. Form Dialog Pattern
**File**: `/frontend/src/components/CreateWorkflowDialog.tsx`

```typescript
interface CreateWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description?: string) => Promise<void>;
}

export function CreateWorkflowDialog({
    isOpen,
    onClose,
    onCreate,
}: CreateWorkflowDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!name.trim()) {
            setError("Name is required");
            return;
        }
        
        setIsCreating(true);
        try {
            await onCreate(name.trim(), description.trim() || undefined);
            setName("");
            setDescription("");
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };
}
```

**Features**:
- Form validation
- Async operation handling with loading state
- Error messaging
- Input character counters
- Disabled state while processing
- Automatic form reset on success

### 4. Dialog Usage Pattern

**In parent component**:
```typescript
export function WorkflowLibrary() {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const createWorkflow = useCreateWorkflow();
    
    const handleCreate = async (name: string, description?: string) => {
        await createWorkflow.mutateAsync({ name, description });
    };
    
    return (
        <div>
            <button onClick={() => setShowCreateDialog(true)}>
                New Workflow
            </button>
            
            <CreateWorkflowDialog
                isOpen={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onCreate={handleCreate}
            />
        </div>
    );
}
```

### 5. Other Dialog Implementations

- **ErrorDialog**: Display error messages
- **VariableDialog**: Variable reference picker
- **AIGenerateDialog**: AI workflow generation
- **CreateTriggerDialog**: Trigger creation form
- **AddCredentialDialog**: Credential management
- **NodeExecutionModal**: Node execution details

### Dialog Styling Approach

All dialogs use:
- **Tailwind CSS** utility classes
- **Fixed positioning** for overlay
- **z-50** for stacking context
- **Backdrop blur** with dark overlay
- **Smooth animations** with Tailwind's `animate-in` classes
- **Responsive padding** (mx-4 for mobile, full on desktop)

---

## Backend Architecture

### Directory Structure
```
backend/src/
├── api/                     # REST API Layer
│   ├── routes/             # Endpoint implementations
│   │   ├── auth/
│   │   ├── workflows/
│   │   ├── executions/
│   │   ├── integrations/
│   │   ├── credentials/
│   │   ├── triggers/
│   │   ├── knowledge-bases/
│   │   └── ...
│   ├── middleware/         # Auth, validation, error handling
│   ├── schemas/            # Zod validation schemas
│   └── server.ts           # Fastify setup
├── temporal/                # Workflow Orchestration
│   ├── workflows/          # Workflow definitions
│   ├── activities/         # Activity implementations
│   │   └── node-executors/ # 20+ node type executors
│   ├── workers/            # Worker processes
│   └── client.ts           # Temporal client
├── storage/                 # Data Access Layer
│   ├── database.ts         # PostgreSQL connection pool
│   ├── redis.ts            # Redis client
│   ├── models/             # TypeScript interfaces
│   └── repositories/       # Database query implementations
├── shared/                  # Shared utilities
│   ├── config/             # Environment configuration
│   ├── registry/           # Node type registry
│   ├── websocket/          # WebSocket management
│   ├── events/             # Event emission
│   └── utils/              # Helper functions
└── index.ts                # Server entry point
```

### API Route Pattern

**File**: `/backend/src/api/routes/workflows/create.ts`

```typescript
import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import { createWorkflowSchema } from "../../schemas/workflow-schemas";
import { authMiddleware, validateRequest } from "../../middleware";

export async function createWorkflowRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware, validateRequest(createWorkflowSchema)]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const body = request.body as any;

            const workflow = await workflowRepository.create({
                name: body.name,
                description: body.description,
                definition: body.definition,
                user_id: request.user!.id,
            });

            return reply.status(201).send({
                success: true,
                data: workflow
            });
        }
    );
}
```

**Route Registration Pattern**:

**File**: `/backend/src/api/routes/workflows/index.ts`

```typescript
import { FastifyInstance } from "fastify";
import { createWorkflowRoute } from "./create";
import { getWorkflowRoute } from "./get";
import { listWorkflowsRoute } from "./list";
import { updateWorkflowRoute } from "./update";
import { deleteWorkflowRoute } from "./delete";

export async function workflowRoutes(fastify: FastifyInstance) {
    await listWorkflowsRoute(fastify);
    await createWorkflowRoute(fastify);
    await getWorkflowRoute(fastify);
    await updateWorkflowRoute(fastify);
    await deleteWorkflowRoute(fastify);
}
```

**Response Format**:
```typescript
// Success
{
    success: true,
    data: { /* resource */ }
}

// Error
{
    success: false,
    error: "Error message",
    details?: { /* validation or error details */ }
}
```

### Error Handling Pattern

**File**: `/backend/src/api/middleware/error-handler.ts`

```typescript
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public details?: any
    ) {
        super(message);
        this.name = "AppError";
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(400, message, details);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(404, message);
    }
}

// Usage in route
export async function getWorkflowRoute(fastify: FastifyInstance) {
    fastify.get("/:id", async (request, reply) => {
        const workflow = await repository.findById(request.params.id);
        
        if (!workflow) {
            throw new NotFoundError("Workflow not found");
        }
        
        return { success: true, data: workflow };
    });
}
```

### Repository Pattern

**File**: `/backend/src/storage/repositories/workflowRepository.ts`

```typescript
export class WorkflowRepository {
    async create(input: CreateWorkflowInput): Promise<WorkflowModel> {
        const query = `
            INSERT INTO flowmaestro.workflows (name, description, definition, user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const result = await db.query<WorkflowModel>(query, [
            input.name,
            input.description || null,
            JSON.stringify(input.definition),
            input.user_id
        ]);
        
        return this.mapRow(result.rows[0]);
    }
    
    async findById(id: string): Promise<WorkflowModel | null> {
        const result = await db.query<WorkflowModel>(
            `SELECT * FROM flowmaestro.workflows WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }
    
    private mapRow(row: any): WorkflowModel {
        return {
            ...row,
            definition: typeof row.definition === 'string' 
                ? JSON.parse(row.definition) 
                : row.definition
        };
    }
}
```

**Key Features**:
- Prepared statements for SQL injection protection
- Type-safe queries with TypeScript generics
- Soft deletes (deleted_at timestamp)
- JSONB parsing for complex columns
- Pagination support with limit/offset

### Temporal Workflow Orchestration

**File**: `/backend/src/temporal/workflows/orchestrator-workflow.ts`

```typescript
export interface WorkflowDefinition {
    nodes: Record<string, WorkflowNode>;
    edges: WorkflowEdge[];
}

export async function orchestratorWorkflow(
    input: OrchestratorInput
): Promise<OrchestratorResult> {
    const { workflowDefinition, inputs = {} } = input;
    const { nodes, edges } = workflowDefinition;
    
    // Build execution graph
    const nodeMap = new Map<string, WorkflowNode>();
    const outgoingEdges = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();
    
    // Initialize maps from node definitions
    Object.entries(nodes).forEach(([nodeId, node]) => {
        nodeMap.set(nodeId, node);
        outgoingEdges.set(nodeId, []);
        incomingEdges.set(nodeId, []);
    });
    
    // Build edge map for dependency tracking
    edges.forEach(edge => {
        outgoingEdges.get(edge.source)?.push(edge.target);
        incomingEdges.get(edge.target)?.push(edge.source);
    });
    
    // Find start nodes (no incoming edges or input type)
    const startNodes = Object.entries(nodes).filter(
        ([nodeId, node]) => 
            node.type === 'input' || incomingEdges.get(nodeId)?.length === 0
    );
    
    // Execution context stores all node outputs
    const context: Record<string, any> = { ...inputs };
    const executed = new Set<string>();
    
    // Topological execution - process nodes in dependency order
    while (executed.size < nodeMap.size) {
        const readyNodes = Object.entries(nodes).filter(
            ([nodeId]) => {
                if (executed.has(nodeId)) return false;
                const deps = incomingEdges.get(nodeId) || [];
                return deps.every(dep => executed.has(dep));
            }
        );
        
        if (readyNodes.length === 0) break; // Cycle detection
        
        // Execute all ready nodes in parallel
        const results = await Promise.all(
            readyNodes.map(([nodeId, node]) => 
                executeNode(nodeId, node, context)
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

**Key Features**:
- **Topological sorting**: Respects node dependencies
- **Parallel execution**: Independent nodes run concurrently
- **Context management**: All node outputs available to downstream nodes
- **Durable execution**: Temporal handles retries and recovery
- **Activity-based**: Each node is an activity with timeout/retry policies

### Middleware Pattern

**Authentication Middleware**:
```typescript
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        throw new UnauthorizedError("Invalid or missing token");
    }
}
```

**Validation Middleware**:
```typescript
export function validateRequest(schema: ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = schema.parse(request.body);
            request.body = result;
        } catch (error: any) {
            throw new ValidationError("Validation failed", error.errors);
        }
    };
}
```

**Usage**:
```typescript
fastify.post("/", {
    preHandler: [authMiddleware, validateRequest(mySchema)]
}, async (request, reply) => {
    // request.user and request.body are validated
});
```

---

## API Structure & Patterns

### API Client (Frontend)

**File**: `/frontend/src/lib/api.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
}

// Auth endpoints
export async function login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return handleResponse(response);
}

export async function register(
    email: string,
    password: string,
    name?: string
): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
    });
    return handleResponse(response);
}

// Workflow endpoints
export async function getWorkflows(
    page: number = 1,
    limit: number = 20
): Promise<WorkflowListResponse> {
    const token = getAuthToken();
    const response = await fetch(
        `${API_BASE_URL}/api/workflows?page=${page}&limit=${limit}`,
        {
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );
    return handleResponse(response);
}

export async function createWorkflow(
    name: string,
    description?: string,
    definition?: any
): Promise<WorkflowResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/workflows`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ name, description, definition })
    });
    return handleResponse(response);
}

// Helper for response handling
async function handleResponse(response: Response) {
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }
    
    return data;
}
```

### WebSocket Integration (Frontend)

**File**: `/frontend/src/lib/websocket.ts`

```typescript
import io, { Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

class WebSocketClient {
    private socket: Socket | null = null;
    private listeners = new Map<string, Set<Function>>();
    
    connect(token: string) {
        this.socket = io(WS_URL, {
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });
        
        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.emit('connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            this.emit('disconnected');
        });
        
        // Forward all server events to listeners
        this.socket.onAny((event, ...args) => {
            this.emit(event, ...args);
        });
    }
    
    subscribe(executionId: string) {
        if (this.socket) {
            this.socket.emit('subscribe', { execution_id: executionId });
        }
    }
    
    unsubscribe(executionId: string) {
        if (this.socket) {
            this.socket.emit('unsubscribe', { execution_id: executionId });
        }
    }
    
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }
    
    off(event: string, callback: Function) {
        this.listeners.get(event)?.delete(callback);
    }
    
    private emit(event: string, ...args: any[]) {
        this.listeners.get(event)?.forEach(cb => cb(...args));
    }
}

export const webSocketClient = new WebSocketClient();
```

### HTTP Methods by Resource

**Workflows**:
- `GET /api/workflows` - List workflows (paginated)
- `POST /api/workflows` - Create new workflow
- `GET /api/workflows/:id` - Get workflow details
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow (soft delete)
- `POST /api/workflows/:id/execute` - Execute workflow

**Executions**:
- `GET /api/executions` - List executions (filtered by workflow)
- `GET /api/executions/:id` - Get execution details
- `GET /api/executions/:id/logs` - Get execution logs
- `POST /api/executions/:id/cancel` - Cancel execution

**Credentials**:
- `GET /api/credentials` - List credentials
- `POST /api/credentials` - Create credential
- `GET /api/credentials/:id` - Get credential details
- `PUT /api/credentials/:id` - Update credential
- `DELETE /api/credentials/:id` - Delete credential

**Integrations**:
- `GET /api/integrations` - List integrations
- `POST /api/integrations` - Create integration
- `GET /api/integrations/:id` - Get integration
- `PUT /api/integrations/:id` - Update integration
- `DELETE /api/integrations/:id` - Delete integration

**Knowledge Bases**:
- `GET /api/knowledge-bases` - List knowledge bases
- `POST /api/knowledge-bases` - Create knowledge base
- `GET /api/knowledge-bases/:id` - Get knowledge base
- `POST /api/knowledge-bases/:id/upload-document` - Upload document
- `POST /api/knowledge-bases/:id/query` - Query knowledge base

---

## Testing Strategy

### Test Structure

```
backend/
├── tests/
│   ├── unit/               # Unit tests for individual functions
│   ├── integration/        # Integration tests for workflows
│   ├── fixtures/           # Mock data and test workflows
│   └── helpers/            # Test utilities and mock APIs
```

### Integration Testing Pattern

**File**: `/backend/tests/integration/workflows/arxiv-researcher.test.ts`

```typescript
describe('ArXiv Paper Research Assistant Workflow', () => {
    beforeAll(() => {
        process.env.ANTHROPIC_API_KEY = 'test-api-key';
        process.env.OPENAI_API_KEY = 'test-api-key';
    });
    
    beforeEach(() => {
        // Setup mocks for HTTP calls
        MockAPIs.mockHTTP(
            'http://export.arxiv.org/api/query?...',
            'GET',
            arxivMockData.response
        );
    });
    
    describe('Full workflow execution', () => {
        test('should successfully research and summarize papers', async () => {
            const context: Record<string, any> = {
                topic: arxivMockData.topic
            };
            
            // Step 1: Execute HTTP node
            const httpResult = await executeNode({
                nodeType: 'http',
                nodeConfig: workflowDefinition.nodes[1].data,
                context
            });
            
            expect(httpResult).toHaveProperty('data');
            context.arxivResponse = httpResult;
            
            // Step 2: Parse XML
            const parseResult = await executeNode({
                nodeType: 'transform',
                nodeConfig: workflowDefinition.nodes[2].data,
                context
            });
            
            expect(parseResult).toHaveProperty('parsed');
            // ... continue testing remaining steps
        });
    });
});
```

**Key Testing Principles**:
1. **Step-by-step validation**: Test each node execution independently
2. **Context accumulation**: Each step adds to execution context
3. **Mock external APIs**: Use MockAPIs helper for HTTP, LLM, PDF calls
4. **Error scenarios**: Test API failures, timeouts, malformed data
5. **Edge cases**: Empty results, missing fields, invalid inputs

### Testing Commands

```bash
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage     # Generate coverage report
npm run test              # All tests
```

### Frontend Testing

**Vitest** for unit tests:
```bash
cd frontend
npm run test:unit
```

**Playwright** for E2E tests:
```bash
npm run test:e2e
```

---

## Build & Configuration

### Frontend Build (Vite)

**File**: `/frontend/vite.config.ts`

```typescript
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3000,
        proxy: {
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
        },
    },
});
```

**Build Output**:
- `frontend/dist/` - Optimized React SPA
- Used by CloudFront + S3 in production
- Includes source maps for debugging

**Development Features**:
- Hot Module Replacement (HMR) enabled
- API proxy to avoid CORS in development
- Fast build times with Vite

### Backend Build (TypeScript)

**Compilation**:
```bash
npm run build    # Outputs to backend/dist/
npm run dev      # Watch mode with tsx
```

**Process Structure**:
- **API Server** (`dist/index.ts`): Fastify HTTP server on port 3001
- **Temporal Worker** (`dist/temporal/workers/orchestrator-worker.ts`): Polls for tasks

### Environment Configuration

**Development** (`.env`):
```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=flowmaestro
POSTGRES_USER=flowmaestro
POSTGRES_PASSWORD=flowmaestro_dev_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Temporal
TEMPORAL_ADDRESS=localhost:7233

# Backend
BACKEND_PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-key

# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# LLM Keys
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

**Production** (AWS Secrets Manager):
- Database credentials
- JWT secret
- LLM API keys
- Service credentials

### TypeScript Configuration

**Base Config** (`tsconfig.base.json`):
- Target: ES2020
- Module: ESNext
- Strict mode enabled
- Source maps enabled

**Workspace References**:
```json
{
    "references": [
        { "path": "../shared" }
    ]
}
```

This ensures shared types are properly resolved across workspaces.

---

## Key Architectural Patterns

### 1. Dependency Injection

**Repository Pattern** for database access:
```typescript
// In route handler
const workflowRepository = new WorkflowRepository();
const workflow = await workflowRepository.findById(id);
```

Benefits:
- Easy to test (mock repositories)
- Separation of concerns
- Type-safe queries

### 2. Request/Response Standardization

All API responses follow a consistent envelope:
```typescript
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    details?: any;
}
```

### 3. Middleware Chain

Fastify middleware chain for request processing:
```typescript
fastify.post("/endpoint", {
    preHandler: [
        authMiddleware,      // Verify JWT
        validateRequest(schema),  // Validate body
        // Custom middleware
    ]
}, async (request, reply) => {
    // Handler has validated request
});
```

### 4. Zustand Store Pattern

Immutable state updates with predictable actions:
```typescript
const store = create((set, get) => ({
    state: initialValue,
    updateState: (newValue) => set({ state: newValue }),
    // Or with immer
    updateNested: (path, value) => set(
        (state) => {
            state[path] = value;
        },
        false,
        'updateNested'
    )
}));
```

### 5. TanStack Query Integration

Server state caching and synchronization:
```typescript
const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => fetchResource(id),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000      // Cache for 10 minutes
});
```

### 6. Temporal Activity Pattern

Activities wrapped with retry and timeout policies:
```typescript
const { executeNode } = proxyActivities<typeof activities>({
    startToCloseTimeout: '10 minutes',
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2,
    },
});

// Within workflow
const result = await executeNode(nodeId, nodeConfig, context);
```

### 7. Error Boundary Pattern (Frontend)

```typescript
try {
    const result = await apiCall();
    setState(result);
} catch (error) {
    setError(error.message);
    // Show error dialog
}
```

### 8. Soft Delete Pattern (Backend)

```typescript
// Delete (soft)
const query = `
    UPDATE flowmaestro.workflows
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = $1
`;

// Query (excludes soft-deleted)
const query = `
    SELECT * FROM flowmaestro.workflows
    WHERE id = $1 AND deleted_at IS NULL
`;
```

---

## Database Patterns

### Connection Pooling

**File**: `/backend/src/storage/database.ts`

```typescript
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,           // Max connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

export const db = {
    query: async <T>(text: string, values?: any[]): Promise<QueryResult<T>> => {
        return pool.query<T>(text, values);
    }
};
```

### Query Patterns

**Prepared Statements** (prevent SQL injection):
```typescript
// Good
const result = await db.query(
    "SELECT * FROM workflows WHERE id = $1",
    [workflowId]
);

// Bad
const result = await db.query(
    `SELECT * FROM workflows WHERE id = '${workflowId}'`
);
```

### Schema Design

**Multi-tenant setup**:
- All tables in `flowmaestro` schema
- Foreign keys to `users` table for isolation
- Indexes on frequently queried columns
- JSONB columns for flexible data (definitions, configs)

---

## Development Workflow

### Common Development Tasks

**Start development environment**:
```bash
npm run docker:up              # Start PostgreSQL, Redis, Temporal
npm run dev                    # Start frontend + backend
```

**Database operations**:
```bash
npm run db:migrate            # Apply pending migrations
npm run db:seed               # Load seed data
npm run db:reset              # Drop and recreate schema
```

**Formatting and linting**:
```bash
npm run lint                  # Check for errors
npm run lint:fix              # Auto-fix issues
npm run format                # Format code with Prettier
npm run typecheck             # Type checking across workspaces
```

**Testing**:
```bash
npm run test                  # Run all tests
npm run test:coverage         # Generate coverage report
```

### Debugging

**Backend**:
- Use VSCode debugger with Node.js configuration
- Temporal UI at http://localhost:8088 for workflow inspection
- Application logs in console

**Frontend**:
- Browser DevTools (React DevTools, Network, Console)
- Vite dev server with HMR
- Zustand dev tools extension

---

## Performance Considerations

### Frontend Optimizations
- **Code splitting**: Vite automatically splits vendor and app code
- **Asset optimization**: Minification, compression via Vite
- **Component memoization**: React.memo for expensive renders
- **Lazy loading**: React.lazy for route-based code splitting

### Backend Optimizations
- **Database indexing**: GIN indexes for JSONB, B-tree for common fields
- **Connection pooling**: Reuse PostgreSQL connections
- **Caching**: Redis for frequently accessed data
- **Pagination**: Limit/offset for large result sets
- **Prepared statements**: Reuse query plans

### Temporal Optimization
- **Activity timeout tuning**: Balance between quick failure detection and real operations
- **Retry backoff**: Exponential backoff prevents thundering herd
- **Parallel execution**: Independent nodes run concurrently
- **Task queue segmentation**: Different worker types handle different node types

---

## Deployment Patterns

### Docker Development Stack

**File**: `/docker-compose.yml`

```yaml
services:
    postgres:
        image: postgres:15
        ports:
            - "5432:5432"
    
    redis:
        image: redis:7-alpine
        ports:
            - "6379:6379"
    
    temporal:
        image: temporalio/auto-setup:latest
        ports:
            - "7233:7233"
            - "8088:8088"
```

### Production Deployment (AWS)

- **ECS Fargate**: Runs backend API and worker containers
- **RDS**: Managed PostgreSQL with Multi-AZ failover
- **ElastiCache**: Managed Redis cluster
- **CloudFront + S3**: Frontend distribution
- **ALB**: Load balancing with SSL termination

---

## Summary

FlowMaestro is a well-architected system with:

1. **Clear separation of concerns**: Frontend (UI), Backend (API + orchestration), Infrastructure (data)
2. **Scalable design**: Temporal for durable workflows, Database/Redis for state, Fastify for high-throughput API
3. **Type safety**: TypeScript throughout, Zod validation, shared type definitions
4. **Testing coverage**: Unit, integration, and E2E test strategies
5. **Extensibility**: Plugin-based node system, easy to add new node types
6. **User experience**: Custom dialogs, real-time updates via WebSocket, responsive UI

The monorepo structure enables code sharing and consistent patterns across frontend/backend while maintaining clear boundaries and independent scalability.

