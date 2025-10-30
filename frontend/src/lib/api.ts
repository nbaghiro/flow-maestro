/**
 * API Client for FlowMaestro Backend
 */

import type {
    WorkflowTrigger,
    TriggerWithScheduleInfo,
    CreateTriggerInput,
    UpdateTriggerInput,
} from '../types/trigger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ExecuteWorkflowRequest {
    workflowDefinition: {
        nodes: any[];
        edges: any[];
    };
    inputs?: Record<string, any>;
}

interface ExecuteWorkflowResponse {
    success: boolean;
    data?: {
        workflowId: string;
        result: {
            success: boolean;
            outputs: Record<string, any>;
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
    return localStorage.getItem('auth_token');
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
    nodes: any[],
    edges: any[],
    inputs: Record<string, any> = {}
): Promise<ExecuteWorkflowResponse> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
            workflowDefinition: { nodes, edges },
            inputs,
        } as ExecuteWorkflowRequest),
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
    localStorage.setItem('auth_token', token);
}

/**
 * Remove auth token from localStorage
 */
export function clearAuthToken(): void {
    localStorage.removeItem('auth_token');
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password } as LoginRequest),
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
export async function register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name } as RegisterRequest),
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
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
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

    const response = await fetch(
        `${API_BASE_URL}/api/workflows?limit=${limit}&offset=${offset}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
        }
    );

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
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a new workflow
 */
export async function createWorkflow(name: string, description?: string) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
            name,
            description,
            definition: {
                name,
                nodes: {},
                edges: [],
                entryPoint: '',
            },
        }),
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
            nodes: Record<string, any>;
            edges: any[];
            entryPoint: string;
        };
    }
) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(updates),
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
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
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
export async function createTrigger(input: CreateTriggerInput): Promise<{ success: boolean; data: WorkflowTrigger; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(input),
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
export async function getTriggers(workflowId: string): Promise<{ success: boolean; data: WorkflowTrigger[]; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers?workflowId=${workflowId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
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
export async function getTrigger(triggerId: string): Promise<{ success: boolean; data: TriggerWithScheduleInfo; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
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
export async function updateTrigger(triggerId: string, input: UpdateTriggerInput): Promise<{ success: boolean; data: WorkflowTrigger; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(input),
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
export async function deleteTrigger(triggerId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
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
export async function executeTrigger(triggerId: string, inputs?: Record<string, any>): Promise<{
    success: boolean;
    data?: {
        executionId: string;
        workflowId: string;
        triggerId: string;
        status: string;
        inputs: Record<string, any>;
    };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ inputs }),
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
    inputs: Record<string, any> | null;
    outputs: Record<string, any> | null;
    current_state: any | null;
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
    if (workflowId) queryParams.append('workflowId', workflowId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(
        `${API_BASE_URL}/api/executions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
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
export async function getExecution(executionId: string): Promise<{ success: boolean; data: Execution; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/executions/${executionId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Connection API Functions =====

export type ConnectionMethod = 'api_key' | 'oauth2' | 'mcp' | 'basic_auth' | 'custom';
export type ConnectionStatus = 'active' | 'invalid' | 'expired' | 'revoked';

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
        mcp_server_info?: Record<string, any>;
    };
    mcp_server_url: string | null;
    mcp_tools: MCPTool[] | null;
    capabilities: Record<string, any>;
    last_tested_at: string | null;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateConnectionInput {
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    data: {
        api_key?: string;
        api_secret?: string;
        server_url?: string;
        auth_type?: string;
        bearer_token?: string;
        username?: string;
        password?: string;
        [key: string]: any;
    };
    metadata?: Record<string, any>;
    mcp_server_url?: string;
    mcp_tools?: MCPTool[];
    capabilities?: Record<string, any>;
}

/**
 * Create a new connection
 */
export async function createConnection(input: CreateConnectionInput): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(input),
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
}): Promise<{ success: boolean; data: Connection[]; pagination: { total: number; limit: number; offset: number }; error?: string }> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.provider) queryParams.append('provider', params.provider);
    if (params?.connection_method) queryParams.append('connection_method', params.connection_method);
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(
        `${API_BASE_URL}/api/connections${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
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
export async function getConnection(connectionId: string): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
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
export async function testConnectionBeforeSave(input: CreateConnectionInput): Promise<{ success: boolean; data: { test_result: any; connection_valid: boolean }; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(input),
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
export async function testConnection(connectionId: string): Promise<{ success: boolean; data: { connection_id: string; test_result: any }; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
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
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(input),
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
export async function deleteConnection(connectionId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
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
    auth_type: 'none' | 'api_key' | 'bearer' | 'basic';
    api_key?: string;
    bearer_token?: string;
    username?: string;
    password?: string;
    timeout?: number;
}

/**
 * Get list of known MCP providers
 */
export async function getMCPProviders(): Promise<{ success: boolean; data: MCPProvider[]; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/connections/mcp/providers`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
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
    data: { server_info: any; tools: MCPTool[]; tool_count: number };
    error?: string
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/mcp/discover`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(request),
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
    error?: string
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/refresh-tools`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
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
}

export interface GeneratedWorkflow {
    nodes: Array<{
        id: string;
        type: string;
        label: string;
        config: Record<string, any>;
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
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}
