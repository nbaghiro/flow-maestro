// Workflow DSL Types
export interface WorkflowDefinition {
    id?: string;
    name: string;
    description?: string;
    version?: number;
    nodes: Record<string, WorkflowNode>;
    edges: WorkflowEdge[];
    entryPoint: string;
    settings?: WorkflowSettings;
}

export interface WorkflowNode {
    type: string;
    name: string;
    config: Record<string, any>;
    position: { x: number; y: number };
    onError?: ErrorHandlingConfig;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
}

export interface WorkflowSettings {
    timeout?: number;
    maxConcurrentNodes?: number;
    enableCache?: boolean;
}

export interface ErrorHandlingConfig {
    strategy: "continue" | "fallback" | "goto" | "fail";
    fallbackValue?: any;
    gotoNode?: string;
}

// Execution Types
export type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type NodeStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface Execution {
    id: string;
    workflowId: string;
    status: ExecutionStatus;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    currentState?: any;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
}

export interface ExecutionContext {
    executionId: string;
    workflowId: string;
    userId: string;
    variables: Record<string, any>;
    nodeStatus: Record<string, NodeStatus>;
    metadata: Record<string, any>;
}

// Node Types
export interface NodeExecutionResult {
    success: boolean;
    output?: any;
    error?: string;
    metadata?: Record<string, any>;
}

export interface NodeMetadata {
    type: string;
    displayName: string;
    description: string;
    icon?: string;
    category: string;
    inputs: Record<string, NodeFieldSchema>;
    outputs: Record<string, NodeFieldSchema>;
    configForm: NodeConfigField[];
}

export interface NodeFieldSchema {
    type: "string" | "number" | "boolean" | "object" | "array";
    required?: boolean;
    description?: string;
}

export interface NodeConfigField {
    field: string;
    label: string;
    type: "text" | "textarea" | "number" | "dropdown" | "checkbox";
    placeholder?: string;
    required?: boolean;
    supportsVariables?: boolean;
    fetch?: string;
    options?: Array<{ label: string; value: string }>;
}

// Integration Types
export interface Integration {
    id: string;
    name: string;
    type: string;
    config: Record<string, any>;
    credentials: Record<string, any>;
    userId: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IntegrationConfig {
    name: string;
    displayName: string;
    description: string;
    icon: string;
    version: string;
    author: string;
    authType: "api-key" | "oauth2" | "basic" | "none";
    authConfig?: {
        oauth?: {
            authUrl: string;
            tokenUrl: string;
            scopes: string[];
        };
        apiKey?: {
            headerName: string;
            valuePrefix?: string;
        };
    };
    nodeTypes: NodeMetadata[];
    configSchema: Record<string, any>;
}

// API Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T = any> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// WebSocket Event Types
export type WebSocketEventType =
    | "connection:established"
    | "execution:started"
    | "execution:progress"
    | "execution:completed"
    | "execution:failed"
    | "node:started"
    | "node:completed"
    | "node:failed"
    | "node:retry"
    | "node:stream"
    | "user:input:required"
    | "user:input:response";

export interface WebSocketEvent {
    type: WebSocketEventType;
    timestamp: number;
    [key: string]: any;
}
