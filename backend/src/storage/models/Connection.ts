/**
 * Connection Model
 * Represents stored connections for external services (API keys, OAuth tokens, MCP servers, etc.)
 */

import type {
    ConnectionMethod,
    ConnectionStatus,
    OAuth2TokenData,
    ApiKeyData,
    BasicAuthData,
    CustomHeaderData,
    MCPAuthData,
    MCPToolParameter,
    MCPTool,
    MCPConnectionData,
    TelnyxConnectionData,
    DatabaseConnectionData,
    ConnectionData,
    ConnectionMetadata,
    ConnectionCapabilities
} from "@flowmaestro/shared";
import {
    isMCPConnectionData,
    isOAuth2TokenData,
    isApiKeyData,
    isBasicAuthData,
    isTelnyxConnectionData,
    isDatabaseConnectionData
} from "@flowmaestro/shared";

// Re-export for convenience
export type {
    ConnectionMethod,
    ConnectionStatus,
    OAuth2TokenData,
    ApiKeyData,
    BasicAuthData,
    CustomHeaderData,
    MCPAuthData,
    MCPToolParameter,
    MCPTool,
    MCPConnectionData,
    TelnyxConnectionData,
    DatabaseConnectionData,
    ConnectionData,
    ConnectionMetadata,
    ConnectionCapabilities
};

export {
    isMCPConnectionData,
    isOAuth2TokenData,
    isApiKeyData,
    isBasicAuthData,
    isTelnyxConnectionData,
    isDatabaseConnectionData
};

/**
 * Connection model as stored in database
 */
export interface ConnectionModel {
    id: string;
    user_id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    encrypted_data: string; // Encrypted JSON string
    metadata: ConnectionMetadata;
    status: ConnectionStatus;
    mcp_server_url: string | null; // Only for MCP connections
    mcp_tools: MCPTool[] | null; // Discovered MCP tools
    capabilities: ConnectionCapabilities;
    last_tested_at: Date | null;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Connection with decrypted data (only used in memory, never stored)
 */
export interface ConnectionWithData extends Omit<ConnectionModel, "encrypted_data"> {
    data: ConnectionData;
}

/**
 * Input for creating a new connection
 */
export interface CreateConnectionInput {
    user_id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    data: ConnectionData; // Will be encrypted before storage
    metadata?: ConnectionMetadata;
    status?: ConnectionStatus;
    mcp_server_url?: string; // Required if connection_method === 'mcp'
    mcp_tools?: MCPTool[];
    capabilities?: ConnectionCapabilities;
}

/**
 * Input for updating a connection
 */
export interface UpdateConnectionInput {
    name?: string;
    data?: ConnectionData; // Will be encrypted before storage
    metadata?: ConnectionMetadata;
    status?: ConnectionStatus;
    mcp_tools?: MCPTool[]; // Can update discovered tools
    capabilities?: ConnectionCapabilities;
}

/**
 * Connection summary (safe to send to frontend, no sensitive data)
 */
export interface ConnectionSummary {
    id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
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
