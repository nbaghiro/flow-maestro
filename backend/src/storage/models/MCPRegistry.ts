/**
 * MCP Registry Types
 * Types for the Model Context Protocol public registry
 */

import type { JsonValue } from "@flowmaestro/shared";

export interface MCPRegistryServer {
    id: string; // e.g., "@modelcontextprotocol/slack"
    name: string;
    description: string;
    serverUrl: string;
    authType: "none" | "api_key" | "bearer" | "oauth2" | "basic";
    capabilities?: string[];
    version?: string;
    provider?: string; // Mapped to our internal provider names
}

export interface MCPRegistryServerDetails extends MCPRegistryServer {
    documentation?: string;
    repository?: string;
    author?: string;
    license?: string;
    tools?: MCPTool[];
}

export interface MCPTool {
    name: string;
    description: string;
    parameters?: Record<string, JsonValue>;
}

export interface MCPRegistryResponse {
    servers: MCPRegistryServer[];
    total?: number;
    page?: number;
    limit?: number;
    nextCursor?: string; // Cursor for pagination
    count?: number; // Number of items in current page
}
