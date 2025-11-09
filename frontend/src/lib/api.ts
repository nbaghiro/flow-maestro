/**
 * API Client for FlowMaestro Backend
 */

import type { JsonObject, JsonValue, WorkflowNode, WorkflowEdge } from "@flowmaestro/shared";
import type {
    WorkflowTrigger,
    TriggerWithScheduleInfo,
    CreateTriggerInput,
    UpdateTriggerInput
} from "../types/trigger";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ===== Knowledge Base Types =====

export interface KnowledgeBase {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    config: {
        embeddingModel: string;
        embeddingProvider: string;
        chunkSize: number;
        chunkOverlap: number;
        embeddingDimensions: number;
    };
    created_at: string;
    updated_at: string;
}

export interface KnowledgeDocument {
    id: string;
    knowledge_base_id: string;
    name: string;
    source_type: "file" | "url";
    source_url: string | null;
    file_path: string | null;
    file_type: string;
    file_size: bigint | null;
    content: string | null;
    metadata: Record<string, unknown>;
    status: "pending" | "processing" | "ready" | "failed";
    error_message: string | null;
    processing_started_at: string | null;
    processing_completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface KnowledgeBaseStats {
    id: string;
    name: string;
    document_count: number;
    chunk_count: number;
    total_size_bytes: number;
    last_updated: string;
}

export interface ChunkSearchResult {
    id: string;
    document_id: string;
    document_name: string;
    chunk_index: number;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
}

export interface CreateKnowledgeBaseInput {
    name: string;
    description?: string;
    config?: Partial<KnowledgeBase["config"]>;
}

export interface UpdateKnowledgeBaseInput {
    name?: string;
    description?: string;
    config?: Partial<KnowledgeBase["config"]>;
}

export interface QueryKnowledgeBaseInput {
    query: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

interface ExecuteWorkflowRequest {
    workflowDefinition: {
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
    };
    inputs?: JsonObject;
}

interface ExecuteWorkflowResponse {
    success: boolean;
    data?: {
        workflowId: string;
        result: {
            success: boolean;
            outputs: JsonObject;
            error?: string;
        };
    };
    error?: string;
}

interface AuthResponse {
    success: boolean;
    data?: {
        user: {
            id: string;
            email: string;
            name?: string;
        };
        token: string;
    };
    error?: string;
}

interface LoginRequest {
    email: string;
    password: string;
}

interface RegisterRequest {
    email: string;
    password: string;
    name?: string;
}

interface UserResponse {
    success: boolean;
    data?: {
        user: {
            id: string;
            email: string;
            name?: string;
        };
    };
    error?: string;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
    return localStorage.getItem("auth_token");
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    inputs: JsonObject = {}
): Promise<ExecuteWorkflowResponse> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
            workflowDefinition: { nodes, edges },
            inputs
        } as ExecuteWorkflowRequest)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Save auth token to localStorage
 */
export function setAuthToken(token: string): void {
    localStorage.setItem("auth_token", token);
}

/**
 * Remove auth token from localStorage
 */
export function clearAuthToken(): void {
    localStorage.removeItem("auth_token");
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password } as LoginRequest)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Register a new user
 */
export async function register(
    email: string,
    password: string,
    name?: string
): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, name } as RegisterRequest)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get current user info (validates token)
 */
export async function getCurrentUser(): Promise<UserResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get list of workflows for current user
 */
export async function getWorkflows(limit = 50, offset = 0) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows?limit=${limit}&offset=${offset}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific workflow by ID
 */
export async function getWorkflow(workflowId: string) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export interface WorkflowDefinition {
    name?: string;
    description?: string;
    nodes: Record<string, WorkflowNode>;
    edges: WorkflowEdge[];
    entryPoint: string;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
    name: string,
    description?: string,
    definition?: WorkflowDefinition
) {
    const token = getAuthToken();

    const workflowDefinition: WorkflowDefinition = definition || {
        name,
        nodes: {},
        edges: [],
        entryPoint: ""
    };

    const requestBody = {
        name,
        description,
        definition: workflowDefinition
    };

    const response = await fetch(`${API_BASE_URL}/api/workflows`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
    workflowId: string,
    updates: {
        name?: string;
        description?: string;
        definition?: {
            name: string;
            nodes: Record<string, WorkflowNode>;
            edges: WorkflowEdge[];
            entryPoint: string;
        };
    }
) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(updates)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // 204 No Content means successful deletion
    return { success: true };
}

// ===== Trigger API Functions =====

/**
 * Create a new trigger for a workflow
 */
export async function createTrigger(
    input: CreateTriggerInput
): Promise<{ success: boolean; data: WorkflowTrigger; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get list of triggers for a workflow
 */
export async function getTriggers(
    workflowId: string
): Promise<{ success: boolean; data: WorkflowTrigger[]; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers?workflowId=${workflowId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific trigger by ID
 */
export async function getTrigger(
    triggerId: string
): Promise<{ success: boolean; data: TriggerWithScheduleInfo; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a trigger
 */
export async function updateTrigger(
    triggerId: string,
    input: UpdateTriggerInput
): Promise<{ success: boolean; data: WorkflowTrigger; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a trigger
 */
export async function deleteTrigger(
    triggerId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Execute a trigger
 */
export async function executeTrigger(
    triggerId: string,
    inputs?: JsonObject
): Promise<{
    success: boolean;
    data?: {
        executionId: string;
        workflowId: string;
        triggerId: string;
        status: string;
        inputs: JsonObject;
    };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ inputs })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get webhook URL for a trigger
 */
export function getWebhookUrl(triggerId: string): string {
    return `${API_BASE_URL}/api/webhooks/${triggerId}`;
}

// ===== Execution API Functions =====

export interface Execution {
    id: string;
    workflow_id: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    inputs: JsonObject | null;
    outputs: JsonObject | null;
    current_state: JsonValue | null;
    error: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

export interface ListExecutionsResponse {
    success: boolean;
    data: {
        items: Execution[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    };
    error?: string;
}

/**
 * Get list of executions for a workflow
 */
export async function getExecutions(
    workflowId?: string,
    params?: {
        status?: "pending" | "running" | "completed" | "failed" | "cancelled";
        limit?: number;
        offset?: number;
    }
): Promise<ListExecutionsResponse> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (workflowId) queryParams.append("workflowId", workflowId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const response = await fetch(
        `${API_BASE_URL}/api/executions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific execution by ID
 */
export async function getExecution(
    executionId: string
): Promise<{ success: boolean; data: Execution; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/executions/${executionId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Submit user input to a running workflow execution
 */
export async function submitUserInput(
    executionId: string,
    userResponse: string,
    nodeId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/executions/${executionId}/submit-input`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
            userResponse,
            nodeId
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Connection API Functions =====

export type ConnectionMethod = "api_key" | "oauth2" | "mcp" | "basic_auth" | "custom";
export type ConnectionStatus = "active" | "invalid" | "expired" | "revoked";

export interface MCPTool {
    name: string;
    description: string;
    parameters: Array<{
        name: string;
        type: string;
        description?: string;
        required?: boolean;
    }>;
}

export interface Connection {
    id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    status: ConnectionStatus;
    metadata?: {
        scopes?: string[];
        expires_at?: number;
        account_info?: {
            email?: string;
            username?: string;
            workspace?: string;
        };
        mcp_version?: string;
        mcp_server_info?: JsonObject;
    };
    mcp_server_url: string | null;
    mcp_tools: MCPTool[] | null;
    capabilities: JsonObject;
    last_tested_at: string | null;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateConnectionInput {
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    data: JsonObject & {
        api_key?: string;
        api_secret?: string;
        server_url?: string;
        auth_type?: string;
        bearer_token?: string;
        username?: string;
        password?: string;
    };
    metadata?: JsonObject;
    mcp_server_url?: string;
    mcp_tools?: MCPTool[];
    capabilities?: JsonObject;
}

/**
 * Create a new connection
 */
export async function createConnection(
    input: CreateConnectionInput
): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get list of connections
 */
export async function getConnections(params?: {
    provider?: string;
    connection_method?: ConnectionMethod;
    status?: ConnectionStatus;
}): Promise<{
    success: boolean;
    data: Connection[];
    pagination: { total: number; limit: number; offset: number };
    error?: string;
}> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.provider) queryParams.append("provider", params.provider);
    if (params?.connection_method)
        queryParams.append("connection_method", params.connection_method);
    if (params?.status) queryParams.append("status", params.status);

    const response = await fetch(
        `${API_BASE_URL}/api/connections${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific connection by ID
 */
export async function getConnection(
    connectionId: string
): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Test a connection without saving it first
 */
export async function testConnectionBeforeSave(input: CreateConnectionInput): Promise<{
    success: boolean;
    data: { test_result: JsonValue; connection_valid: boolean };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/test`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Test an existing connection
 */
export async function testConnection(connectionId: string): Promise<{
    success: boolean;
    data: { connection_id: string; test_result: JsonValue };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/test`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a connection
 */
export async function updateConnection(
    connectionId: string,
    input: Partial<CreateConnectionInput>
): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a connection
 */
export async function deleteConnection(
    connectionId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== MCP-Specific Connection Functions =====

export interface MCPProvider {
    name: string;
    displayName: string;
    description: string;
    category: string;
    requiresAuth: boolean;
    configured: boolean;
}

export interface MCPDiscoveryRequest {
    server_url: string;
    auth_type: "none" | "api_key" | "bearer" | "basic";
    api_key?: string;
    bearer_token?: string;
    username?: string;
    password?: string;
    timeout?: number;
}

/**
 * Get list of known MCP providers
 */
export async function getMCPProviders(): Promise<{
    success: boolean;
    data: MCPProvider[];
    error?: string;
}> {
    const response = await fetch(`${API_BASE_URL}/api/connections/mcp/providers`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Discover MCP tools from a server before saving
 */
export async function discoverMCPTools(request: MCPDiscoveryRequest): Promise<{
    success: boolean;
    data: { server_info: JsonObject; tools: MCPTool[]; tool_count: number };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/mcp/discover`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Refresh MCP tools for an existing connection
 */
export async function refreshMCPTools(connectionId: string): Promise<{
    success: boolean;
    data: { connection_id: string; tools: MCPTool[]; tool_count: number };
    message?: string;
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/refresh-tools`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== AI Workflow Generation =====

export interface GenerateWorkflowRequest {
    prompt: string;
    connectionId: string;
    model: string;
}

export interface GeneratedWorkflow {
    nodes: Array<{
        id: string;
        type: string;
        label: string;
        config: JsonObject;
        status?: string;
        onError?: {
            strategy: "continue" | "fallback" | "goto" | "fail";
            fallbackValue?: JsonValue;
            gotoNode?: string;
        };
    }>;
    edges: Array<{
        source: string;
        target: string;
        sourceHandle: string;
        targetHandle: string;
    }>;
    metadata: {
        name: string;
        entryNodeId: string;
        description: string;
    };
}

/**
 * Generate workflow from natural language prompt using AI
 */
export async function generateWorkflow(
    request: GenerateWorkflowRequest
): Promise<{ success: boolean; data: GeneratedWorkflow; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error?.message ||
                errorData.error ||
                `HTTP ${response.status}: ${response.statusText}`
        );
    }

    return response.json();
}

// ===== Agent API Functions =====

export interface Tool {
    id: string;
    name: string;
    description: string;
    type: "workflow" | "function" | "knowledge_base";
    schema: JsonObject;
    config: ToolConfig;
}

export interface ToolConfig {
    workflowId?: string;
    functionName?: string;
    knowledgeBaseId?: string;
}

export interface MemoryConfig {
    type: "buffer" | "summary" | "vector";
    max_messages: number;
}

export interface Agent {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    model: string;
    provider: "openai" | "anthropic" | "google" | "cohere";
    connection_id: string | null;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    max_iterations: number;
    available_tools: Tool[];
    memory_config: MemoryConfig;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CreateAgentRequest {
    name: string;
    description?: string;
    model: string;
    provider: "openai" | "anthropic" | "google" | "cohere";
    connection_id?: string | null;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    max_iterations?: number;
    available_tools?: Tool[];
    memory_config?: MemoryConfig;
}

export interface UpdateAgentRequest {
    name?: string;
    description?: string;
    model?: string;
    provider?: "openai" | "anthropic" | "google" | "cohere";
    connection_id?: string | null;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    max_iterations?: number;
    available_tools?: Tool[];
    memory_config?: MemoryConfig;
}

export interface AgentExecution {
    id: string;
    agent_id: string;
    user_id: string;
    status: "running" | "completed" | "failed";
    conversation_history: ConversationMessage[];
    iterations: number;
    error: string | null;
    started_at: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ConversationMessage {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_calls?: Array<{
        id: string;
        name: string;
        arguments: JsonObject;
    }>;
    tool_name?: string;
    tool_call_id?: string;
    timestamp: string;
}

/**
 * Create a new agent
 */
export async function createAgent(
    data: CreateAgentRequest
): Promise<{ success: boolean; data: Agent; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get all agents for the current user
 */
export async function getAgents(): Promise<{
    success: boolean;
    data: { agents: Agent[]; total: number };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific agent by ID
 */
export async function getAgent(
    agentId: string
): Promise<{ success: boolean; data: Agent; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update an agent
 */
export async function updateAgent(
    agentId: string,
    data: UpdateAgentRequest
): Promise<{ success: boolean; data: Agent; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete an agent
 */
export async function deleteAgent(
    agentId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Execute an agent with an initial message
 */
export async function executeAgent(
    agentId: string,
    message: string
): Promise<{
    success: boolean;
    data: { executionId: string; agentId: string; status: string };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ message })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Send a message to a running agent execution
 */
export async function sendAgentMessage(
    agentId: string,
    executionId: string,
    message: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(
        `${API_BASE_URL}/api/agents/${agentId}/executions/${executionId}/message`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ message })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get agent execution details
 */
export async function getAgentExecution(
    agentId: string,
    executionId: string
): Promise<{ success: boolean; data: AgentExecution; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(
        `${API_BASE_URL}/api/agents/${agentId}/executions/${executionId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Add a tool to an agent
 */
export interface AddToolRequest {
    type: "workflow" | "function" | "knowledge_base";
    name: string;
    description: string;
    schema: JsonObject;
    config: ToolConfig;
}

export async function addAgentTool(
    agentId: string,
    data: AddToolRequest
): Promise<{ success: boolean; data: { tool: Tool; agent: Agent }; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/tools`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Remove a tool from an agent
 */
export async function removeAgentTool(
    agentId: string,
    toolId: string
): Promise<{ success: boolean; data: { agent: Agent }; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/tools/${toolId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== MCP Registry API Functions =====

export interface MCPRegistryServer {
    id: string;
    name: string;
    description: string;
    serverUrl: string;
    authType: string;
    capabilities?: string[];
    version?: string;
    provider?: string;
}

export interface MCPRegistryResponse {
    servers: MCPRegistryServer[];
    total: number;
    query?: string;
}

/**
 * Get all MCP servers from the public registry
 */
export async function getMCPRegistryServers(): Promise<MCPRegistryServer[]> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/registry/servers`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.servers || [];
}

/**
 * Search MCP servers in the registry
 */
export async function searchMCPRegistry(query: string): Promise<MCPRegistryServer[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/mcp/registry/search?q=${encodeURIComponent(query)}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.servers || [];
}

// ===== Knowledge Base API Functions =====

/**
 * Get all knowledge bases
 */
export async function getKnowledgeBases(): Promise<ApiResponse<KnowledgeBase[]>> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a knowledge base by ID
 */
export async function getKnowledgeBase(id: string): Promise<ApiResponse<KnowledgeBase>> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a knowledge base
 */
export async function createKnowledgeBase(
    input: CreateKnowledgeBaseInput
): Promise<ApiResponse<KnowledgeBase>> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a knowledge base
 */
export async function updateKnowledgeBase(
    id: string,
    input: UpdateKnowledgeBaseInput
): Promise<ApiResponse<KnowledgeBase>> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a knowledge base
 */
export async function deleteKnowledgeBase(id: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get knowledge base stats
 */
export async function getKnowledgeBaseStats(
    id: string
): Promise<ApiResponse<KnowledgeBaseStats>> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/stats`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get documents in a knowledge base
 */
export async function getKnowledgeDocuments(
    id: string
): Promise<ApiResponse<KnowledgeDocument[]>> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/documents`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Upload a document to a knowledge base
 */
export async function uploadDocument(id: string, file: File): Promise<ApiResponse> {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/documents/upload`, {
        method: "POST",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Download a document from a knowledge base
 * Returns a signed URL that can be used to download the file
 */
export async function downloadDocument(
    kbId: string,
    docId: string
): Promise<
    ApiResponse<{
        url: string;
        expiresAt: string;
        expiresIn: number;
        filename: string;
    }>
> {
    const token = getAuthToken();

    const response = await fetch(
        `${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${docId}/download`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Helper function to trigger browser download using signed URL
 */
export async function triggerDocumentDownload(kbId: string, docId: string): Promise<void> {
    const result = await downloadDocument(kbId, docId);

    if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to get download URL");
    }

    // Open the signed URL in a new window/tab to trigger download
    window.open(result.data.url, "_blank");
}

/**
 * Add a URL to a knowledge base
 */
export async function addUrlToKnowledgeBase(
    id: string,
    url: string,
    name?: string
): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/documents/url`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ url, name })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Query a knowledge base
 */
export async function queryKnowledgeBase(
    id: string,
    input: QueryKnowledgeBaseInput
): Promise<ApiResponse<{ query: string; results: ChunkSearchResult[]; count: number }>> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/query`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a document from a knowledge base
 */
export async function deleteDocument(kbId: string, docId: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${docId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Reprocess a document (retry failed processing or regenerate embeddings)
 */
export async function reprocessDocument(kbId: string, docId: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await fetch(
        `${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${docId}/reprocess`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}
