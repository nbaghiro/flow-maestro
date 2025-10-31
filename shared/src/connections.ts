/**
 * Connection Types for FlowMaestro
 * These types are shared between frontend and backend for external service connections
 */

export type ConnectionMethod = "api_key" | "oauth2" | "mcp" | "basic_auth" | "custom";
export type ConnectionStatus = "active" | "invalid" | "expired" | "revoked";

/**
 * Well-known provider names
 */
export type ConnectionProvider =
    | "openai"
    | "anthropic"
    | "google"
    | "slack"
    | "github"
    | "telnyx"
    | "deepgram"
    | "elevenlabs"
    | string; // Allow custom providers

/**
 * OAuth 2.0 token data
 */
export interface OAuth2TokenData {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
}

/**
 * API key connection data
 */
export interface ApiKeyData {
    api_key: string;
    api_secret?: string; // For providers that need both key and secret
}

/**
 * Basic auth connection data
 */
export interface BasicAuthData {
    username: string;
    password: string;
}

/**
 * Custom header connection data
 */
export interface CustomHeaderData {
    headers: Record<string, string>;
}

/**
 * MCP (Model Context Protocol) server authentication data
 */
export interface MCPAuthData {
    auth_type: "none" | "api_key" | "bearer" | "basic" | "custom";
    api_key?: string;
    bearer_token?: string;
    username?: string;
    password?: string;
    custom_headers?: Record<string, string>;
}

/**
 * MCP tool parameter schema
 */
export interface MCPToolParameter {
    name: string;
    type: string; // "string", "number", "boolean", "object", "array"
    description?: string;
    required?: boolean;
    default?: any;
    schema?: Record<string, any>; // JSON Schema for complex types
}

/**
 * MCP tool definition
 */
export interface MCPTool {
    name: string;
    description: string;
    parameters: MCPToolParameter[];
    returns?: {
        type: string;
        description?: string;
        schema?: Record<string, any>;
    };
}

/**
 * MCP server connection data
 */
export interface MCPConnectionData extends MCPAuthData {
    server_url: string;
    protocol?: "http" | "https" | "ws" | "wss";
    timeout?: number; // Connection timeout in ms
}

/**
 * Telnyx SIP provider connection data
 */
export interface TelnyxConnectionData {
    api_key: string;
    api_secret?: string;
    public_key?: string; // For webhook signature verification
    sip_connection_id?: string;
    messaging_profile_id?: string;
}

/**
 * Union of all connection data types
 */
export type ConnectionData =
    | ApiKeyData
    | OAuth2TokenData
    | BasicAuthData
    | CustomHeaderData
    | MCPConnectionData
    | TelnyxConnectionData;

/**
 * Connection metadata (non-sensitive)
 */
export interface ConnectionMetadata {
    scopes?: string[];
    expires_at?: number; // Unix timestamp for OAuth tokens
    account_info?: {
        email?: string;
        username?: string;
        workspace?: string;
        [key: string]: any;
    };
    provider_config?: Record<string, any>;
    // MCP-specific metadata
    mcp_version?: string;
    mcp_server_info?: {
        name?: string;
        version?: string;
        description?: string;
        [key: string]: any;
    };
}

/**
 * Connection capabilities - what this connection can do
 */
export interface ConnectionCapabilities {
    permissions?: string[]; // List of permissions/scopes
    operations?: string[]; // Available operations (e.g., "read", "write", "execute")
    rate_limit?: {
        requests_per_second?: number;
        requests_per_day?: number;
    };
    [key: string]: any; // Provider-specific capabilities
}

/**
 * Connection summary (safe to send to frontend, no sensitive data)
 */
export interface ConnectionSummary {
    id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: ConnectionProvider;
    status: ConnectionStatus;
    metadata: ConnectionMetadata;
    mcp_server_url: string | null;
    mcp_tools: MCPTool[] | null;
    capabilities: ConnectionCapabilities;
    last_tested_at: Date | null;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Type guard to check if connection data is MCP
 */
export function isMCPConnectionData(data: ConnectionData): data is MCPConnectionData {
    return "server_url" in data;
}

/**
 * Type guard to check if connection data is OAuth2
 */
export function isOAuth2TokenData(data: ConnectionData): data is OAuth2TokenData {
    return "access_token" in data && "token_type" in data;
}

/**
 * Type guard to check if connection data is API key
 */
export function isApiKeyData(data: ConnectionData): data is ApiKeyData {
    return "api_key" in data && !("access_token" in data);
}

/**
 * Type guard to check if connection data is Basic Auth
 */
export function isBasicAuthData(data: ConnectionData): data is BasicAuthData {
    return "username" in data && "password" in data && !("server_url" in data);
}

/**
 * Type guard to check if connection data is Telnyx
 */
export function isTelnyxConnectionData(data: ConnectionData): data is TelnyxConnectionData {
    return "api_key" in data && ("sip_connection_id" in data || "messaging_profile_id" in data);
}
