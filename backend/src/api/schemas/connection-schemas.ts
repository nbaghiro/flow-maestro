import { z } from "zod";

// Connection method enum (renamed from type)
export const connectionMethodSchema = z.enum(["api_key", "oauth2", "mcp", "basic_auth", "custom"]);

// Connection status enum
export const connectionStatusSchema = z.enum(["active", "invalid", "expired", "revoked"]);

// API Key data schema
const apiKeyDataSchema = z.object({
    api_key: z.string(),
    api_secret: z.string().optional()
});

// OAuth2 token data schema
const oauth2TokenDataSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    token_type: z.string(),
    expires_in: z.number().optional(),
    scope: z.string().optional()
});

// Basic auth data schema
const basicAuthDataSchema = z.object({
    username: z.string(),
    password: z.string()
});

// Custom header data schema
const customHeaderDataSchema = z.object({
    headers: z.record(z.string())
});

// MCP auth type schema
const mcpAuthTypeSchema = z.enum(["none", "api_key", "bearer", "basic", "custom"]);

// MCP connection data schema
const mcpConnectionDataSchema = z.object({
    server_url: z.string().url(),
    auth_type: mcpAuthTypeSchema,
    api_key: z.string().optional(),
    bearer_token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    custom_headers: z.record(z.string()).optional(),
    protocol: z.enum(["http", "https", "ws", "wss"]).optional(),
    timeout: z.number().positive().optional()
});

// Union of all connection data types
const connectionDataSchema = z.union([
    apiKeyDataSchema,
    oauth2TokenDataSchema,
    basicAuthDataSchema,
    customHeaderDataSchema,
    mcpConnectionDataSchema
]);

// MCP tool parameter schema
const mcpToolParameterSchema = z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    default: z.any().optional(),
    schema: z.record(z.any()).optional()
});

// MCP tool schema
const mcpToolSchema = z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.array(mcpToolParameterSchema),
    returns: z
        .object({
            type: z.string(),
            description: z.string().optional(),
            schema: z.record(z.any()).optional()
        })
        .optional()
});

// Connection metadata schema
const connectionMetadataSchema = z
    .object({
        scopes: z.array(z.string()).optional(),
        expires_at: z.number().optional(),
        account_info: z
            .object({
                email: z.string().optional(),
                username: z.string().optional(),
                workspace: z.string().optional()
            })
            .catchall(z.any())
            .optional(),
        provider_config: z.record(z.any()).optional(),
        // MCP-specific metadata
        mcp_version: z.string().optional(),
        mcp_server_info: z.record(z.any()).optional()
    })
    .optional();

// Connection capabilities schema
const connectionCapabilitiesSchema = z
    .object({
        permissions: z.array(z.string()).optional(),
        operations: z.array(z.string()).optional(),
        rate_limit: z
            .object({
                requests_per_second: z.number().optional(),
                requests_per_day: z.number().optional()
            })
            .optional()
    })
    .catchall(z.any())
    .optional();

// Create connection request
export const createConnectionSchema = z.object({
    name: z.string().min(1).max(255),
    connection_method: connectionMethodSchema,
    provider: z.string().min(1).max(100),
    data: connectionDataSchema,
    metadata: connectionMetadataSchema,
    status: connectionStatusSchema.optional(),
    mcp_server_url: z.string().url().optional(),
    mcp_tools: z.array(mcpToolSchema).optional(),
    capabilities: connectionCapabilitiesSchema
});

// Update connection request
export const updateConnectionSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    data: connectionDataSchema.optional(),
    metadata: connectionMetadataSchema,
    status: connectionStatusSchema.optional(),
    mcp_tools: z.array(mcpToolSchema).optional(),
    capabilities: connectionCapabilitiesSchema
});

// Query parameters for listing connections
export const listConnectionsQuerySchema = z.object({
    provider: z.string().optional(),
    connection_method: connectionMethodSchema.optional(),
    status: connectionStatusSchema.optional(),
    limit: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1).max(100))
        .optional(),
    offset: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(0))
        .optional()
});

// URL parameters
export const connectionIdParamSchema = z.object({
    id: z.string().uuid()
});

// Test connection request
export const testConnectionSchema = z.object({
    test_endpoint: z.string().url().optional() // Optional custom endpoint to test against
});

// MCP discovery request (test before saving)
export const mcpDiscoverySchema = z.object({
    server_url: z.string().url(),
    auth_type: mcpAuthTypeSchema,
    api_key: z.string().optional(),
    bearer_token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    custom_headers: z.record(z.string()).optional(),
    timeout: z.number().positive().optional()
});

// MCP tool execution request
export const mcpToolExecutionSchema = z.object({
    tool: z.string(),
    parameters: z.record(z.any())
});

export type CreateConnectionRequest = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionRequest = z.infer<typeof updateConnectionSchema>;
export type ListConnectionsQuery = z.infer<typeof listConnectionsQuerySchema>;
export type ConnectionIdParam = z.infer<typeof connectionIdParamSchema>;
export type TestConnectionRequest = z.infer<typeof testConnectionSchema>;
export type MCPDiscoveryRequest = z.infer<typeof mcpDiscoverySchema>;
export type MCPToolExecutionRequest = z.infer<typeof mcpToolExecutionSchema>;
