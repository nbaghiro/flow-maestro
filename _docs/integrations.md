# FlowMaestro Integrations System

Complete guide to FlowMaestro's connections system for managing external service integrations, including OAuth, API keys, and Model Context Protocol (MCP) connections.

---

## Table of Contents

1. [Overview](#overview)
2. [Connection Methods](#connection-methods)
3. [API Key Authentication](#api-key-authentication)
4. [OAuth 2.0 Integration](#oauth-20-integration)
5. [Model Context Protocol (MCP)](#model-context-protocol-mcp)
6. [Using Connections in Workflows](#using-connections-in-workflows)
7. [Using Connections in Agents](#using-connections-in-agents)
8. [Backend Implementation](#backend-implementation)
9. [Frontend Implementation](#frontend-implementation)
10. [Security](#security)

---

## Overview

FlowMaestro's Connections system provides a unified interface for managing all external service integrations, consolidating multiple authentication methods into a single, cohesive architecture.

### Connection Types

1. **API Key Authentication**: Direct API key/secret storage for AI providers and REST APIs
2. **OAuth 2.0**: Token-based authentication with automatic refresh for integrated services
3. **Model Context Protocol (MCP)**: JSON-RPC 2.0 connections to tool servers

### Key Features

- **Unified Management**: One interface for all connection types
- **Encryption at Rest**: AES-256-GCM encryption for sensitive data
- **Automatic Token Refresh**: OAuth tokens refresh without user intervention
- **Multi-Tenancy**: Complete user isolation
- **Connection Testing**: Validate connections before and after creation
- **Tool Discovery**: MCP servers automatically expose available tools

---

## Connection Methods

### Database Schema

```sql
CREATE TABLE flowmaestro.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    connection_method VARCHAR(50) NOT NULL,  -- 'api_key', 'oauth2', 'mcp'
    provider VARCHAR(100) NOT NULL,          -- 'openai', 'slack', 'postgres', etc.
    status VARCHAR(50) DEFAULT 'active',     -- 'active', 'invalid', 'expired', 'revoked'
    data JSONB NOT NULL,                     -- Encrypted connection data

    -- MCP-specific fields
    mcp_server_url TEXT,
    mcp_tools JSONB,                         -- Array of discovered tools
    capabilities JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',
    last_used_at TIMESTAMP,
    last_tested_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP                     -- Soft delete
);

CREATE INDEX idx_connections_user_provider
ON flowmaestro.connections(user_id, provider);

CREATE INDEX idx_connections_method
ON flowmaestro.connections(connection_method);
```

### Design Decisions

- **Single Table**: One provider (e.g., GitHub) can have multiple connection types
- **Encrypted Data**: Sensitive information stored encrypted with AES-256-GCM
- **Soft Deletes**: `deleted_at` allows data recovery and audit trails
- **MCP Fields**: Nullable, only used for MCP connections
- **Multi-Tenancy**: `user_id` ensures complete user isolation

---

## API Key Authentication

Direct API key/secret authentication for AI providers and REST APIs.

### Supported Providers

- **OpenAI**: GPT models
- **Anthropic**: Claude models
- **Google AI**: Gemini models
- **Cohere**: Command models
- **GitHub**: Personal access tokens
- **Custom APIs**: Any REST API accepting API keys

### Data Structure

```typescript
{
    api_key: string;        // Primary API key
    api_secret?: string;    // Optional secret (e.g., OpenAI org key)
    base_url?: string;      // Optional custom endpoint
}
```

### Creating an API Key Connection

**Frontend**:
```typescript
const handleCreateConnection = async () => {
    const connection = await connectionStore.addConnection({
        name: "My OpenAI API",
        connection_method: "api_key",
        provider: "openai",
        data: {
            api_key: "sk-..."
        }
    });
};
```

**Backend API**:
```http
POST /api/connections
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "My OpenAI API",
    "connection_method": "api_key",
    "provider": "openai",
    "data": {
        "api_key": "sk-..."
    }
}

# Response:
{
    "success": true,
    "data": {
        "id": "uuid",
        "name": "My OpenAI API",
        "connection_method": "api_key",
        "provider": "openai",
        "status": "active",
        "created_at": "2025-01-15T10:30:00Z"
    }
}
```

### Testing Before Save

```typescript
// Frontend validation
const isValid = await connectionStore.testConnectionBeforeSaving({
    connection_method: "api_key",
    provider: "openai",
    data: { api_key: "sk-..." }
});

if (!isValid) {
    alert("Invalid API key");
    return;
}
```

**Backend Test Endpoint**:
```http
POST /api/connections/test
Authorization: Bearer <token>

{
    "connection_method": "api_key",
    "provider": "openai",
    "data": { "api_key": "sk-..." }
}

# Response:
{
    "success": true,
    "test_result": {
        "success": true,
        "message": "Successfully connected to OpenAI",
        "tested_at": "2025-01-15T10:30:00Z"
    }
}
```

---

## OAuth 2.0 Integration

Secure delegated access with automatic token refresh for integrated services.

### Supported Providers

- **Slack**: Workspace integrations and messaging
- **Google**: Gmail, Calendar, Drive, Sheets
- **Notion**: Database and page access
- **GitHub**: Repository and issue management

### Data Structure

```typescript
{
    access_token: string;
    refresh_token?: string;
    token_type: "Bearer";
    expires_at?: number;    // Unix timestamp
    scope: string[];
}
```

### OAuth Flow

**1. Authorization Initiation**:
```typescript
// Frontend
const { initiateOAuth } = useOAuth();

const handleConnect = async () => {
    try {
        const connection = await initiateOAuth("slack");
        console.log("Connected:", connection);
    } catch (error) {
        console.error("OAuth failed:", error);
    }
};
```

**2. Backend Authorization Endpoint**:
```http
GET /api/oauth/slack/authorize
Authorization: Bearer <token>

# Response:
{
    "success": true,
    "data": {
        "authUrl": "https://slack.com/oauth/v2/authorize?client_id=...&state=...&redirect_uri=..."
    }
}
```

**3. OAuth Callback**:
```
User authorizes on provider's page
↓
Provider redirects to: /api/oauth/slack/callback?code=XXX&state=YYY
↓
Backend exchanges code for tokens
↓
Tokens encrypted and stored
↓
Callback page posts message to parent window: { type: 'oauth_success', connection: {...} }
↓
Popup closes, parent receives connection
```

### Automatic Token Refresh

```typescript
export async function getAccessToken(connectionId: string): Promise<string> {
    const connection = await connectionRepo.findByIdWithData(connectionId);

    // Check if token expired or expires in < 5 minutes
    if (connection.data.expires_at && Date.now() + 5*60*1000 > connection.data.expires_at) {
        // Refresh the token
        const newTokens = await refreshOAuthToken(connection);
        await connectionRepo.updateConnectionData(connectionId, newTokens);
        return newTokens.access_token;
    }

    return connection.data.access_token;
}
```

**Token refresh is automatic** - workflows and agents don't need to handle expired tokens manually.

### Configuring OAuth Providers

Add client credentials to environment variables:

```env
SLACK_CLIENT_ID=xxxxx.yyyyy
SLACK_CLIENT_SECRET=aaaabbbbccccdddd
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
NOTION_CLIENT_ID=xxxxx-xxxxx-xxxxx
NOTION_CLIENT_SECRET=secret_xxxxxxxxxxxxxxx
```

**Provider Configuration** (`backend/src/services/oauth/OAuthService.ts`):
```typescript
const OAUTH_PROVIDERS = {
    slack: {
        authUrl: "https://slack.com/oauth/v2/authorize",
        tokenUrl: "https://slack.com/api/oauth.v2.access",
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        scopes: ["chat:write", "channels:read"],
        refreshable: true
    },
    google: {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
        refreshable: true
    },
    // ... more providers
};
```

---

## Model Context Protocol (MCP)

Connect to MCP servers that expose tools for filesystem access, database queries, git operations, etc.

### Important Note

**MCP connections are NOT for AI providers** (OpenAI, Anthropic). Those use API key or OAuth. MCP is for tool servers.

### Supported MCP Servers

- **Filesystem MCP**: Read/write files, list directories
- **PostgreSQL MCP**: Execute SQL queries
- **MongoDB MCP**: Database operations
- **GitHub MCP**: Repository and PR management
- **Custom MCP Servers**: Any server implementing MCP protocol

### Data Structure

```typescript
{
    server_url: string;              // "http://localhost:3100"
    protocol: "http" | "https" | "ws" | "wss";
    auth_type: "none" | "api_key" | "bearer" | "basic";

    // Auth data based on type
    api_key?: string;
    bearer_token?: string;
    username?: string;
    password?: string;

    timeout?: number;                // Connection timeout
}
```

### MCP Tool Discovery

When connecting to an MCP server, FlowMaestro automatically discovers available tools:

```http
POST /api/connections/mcp/discover
Authorization: Bearer <token>

{
    "server_url": "http://localhost:3100",
    "auth": {
        "auth_type": "bearer",
        "bearer_token": "secret"
    }
}

# Response:
{
    "success": true,
    "data": {
        "server_info": {
            "name": "Filesystem MCP",
            "version": "1.0.0",
            "protocol_version": "2024-11-05"
        },
        "tools": [
            {
                "name": "read_file",
                "description": "Read contents of a file",
                "parameters": [
                    { "name": "path", "type": "string", "required": true }
                ]
            },
            {
                "name": "list_directory",
                "description": "List files in a directory",
                "parameters": [
                    { "name": "path", "type": "string", "required": true }
                ]
            }
        ]
    }
}
```

Discovered tools are stored in the `mcp_tools` JSONB column.

### Refreshing MCP Tools

```http
POST /api/connections/:id/refresh-tools
Authorization: Bearer <token>

# Response:
{
    "success": true,
    "data": {
        "tools_count": 15,
        "tools": [...]
    }
}
```

### Predefined MCP Providers

FlowMaestro includes a registry of known MCP servers:

```typescript
// backend/src/services/mcp/MCPProviderRegistry.ts

export const MCP_PROVIDERS = {
    "filesystem": {
        name: "filesystem",
        displayName: "Filesystem MCP",
        defaultServerUrl: process.env.MCP_FILESYSTEM_URL || "http://localhost:3100",
        authType: "none",
        category: "filesystem"
    },
    "postgres": {
        name: "postgres",
        displayName: "PostgreSQL MCP",
        defaultServerUrl: process.env.MCP_POSTGRES_URL || "http://localhost:3101",
        authType: "basic",
        category: "database"
    },
    "github": {
        name: "github",
        displayName: "GitHub MCP",
        defaultServerUrl: process.env.MCP_GITHUB_URL || "http://localhost:3102",
        authType: "bearer",
        category: "development"
    }
    // ... more providers
};
```

**Get Provider Registry**:
```http
GET /api/connections/mcp/providers

# Response:
{
    "success": true,
    "data": [
        { "name": "filesystem", "displayName": "Filesystem MCP", ... },
        { "name": "postgres", "displayName": "PostgreSQL MCP", ... }
    ]
}
```

### Executing MCP Tools

```typescript
const connection = await connectionRepo.findByIdWithData(connectionId);
const result = await mcpService.executeTool(
    connection,
    "read_file",
    { path: "/app/data.json" }
);

// Result:
{
    success: true,
    data: {
        content: "{ ... file contents ... }"
    }
}
```

**MCP Protocol**:
- **RESTful Endpoint**: `POST /tools/{toolName}/execute`
- **JSON-RPC Fallback**: `POST /rpc` with `{"method": "tools.execute"}`

---

## Using Connections in Workflows

Connections are referenced by ID in workflow node configurations.

### LLM Node Example

```json
{
  "type": "llm",
  "label": "Generate Summary",
  "config": {
    "provider": "openai",
    "model": "gpt-4",
    "connectionId": "550e8400-e29b-41d4-a716-446655440000",
    "prompt": "Summarize: ${previous_step_output}",
    "temperature": 0.7
  }
}
```

**Execution** (`backend/src/temporal/activities/node-executors/llm-executor.ts`):
```typescript
export async function executeLLMNode(config: LLMNodeConfig, context: ActivityContext) {
    // Get connection with decrypted API key
    const connection = await connectionRepo.findByIdWithData(config.connectionId);

    if (!connection || connection.status !== 'active') {
        throw new Error('Invalid or inactive connection');
    }

    const apiKey = connection.data.api_key;

    // Make LLM API call
    const response = await openai.chat.completions.create({
        model: config.model,
        messages: [
            { role: "user", content: interpolateVariables(config.prompt, context) }
        ],
        temperature: config.temperature
    }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable || 'llmOutput']: response.choices[0].message.content
        }
    };
}
```

### Integration Node Example (Slack with OAuth)

```json
{
  "type": "integration",
  "label": "Send Slack Notification",
  "config": {
    "service": "slack",
    "operation": "send_message",
    "connectionId": "660e8400-e29b-41d4-a716-446655440001",
    "config": {
      "channel": "#notifications",
      "text": "Workflow completed: ${workflow.name}"
    }
  }
}
```

**Execution**:
```typescript
export async function executeSlackIntegration(config: IntegrationNodeConfig, context: ActivityContext) {
    // Get OAuth token (auto-refreshes if expired!)
    const token = await getAccessToken(config.connectionId);

    const text = interpolateVariables(config.config.text, context);

    await axios.post('https://slack.com/api/chat.postMessage', {
        channel: config.config.channel,
        text: text
    }, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    return context;
}
```

### MCP Tool Node Example

```json
{
  "type": "mcp_tool",
  "label": "Read Config File",
  "config": {
    "connectionId": "770e8400-e29b-41d4-a716-446655440002",
    "tool": "read_file",
    "parameters": {
      "path": "/app/config/${environment}.json"
    },
    "outputVariable": "config"
  }
}
```

**Execution**:
```typescript
export async function executeMCPToolNode(config: MCPToolNodeConfig, context: ActivityContext) {
    const connection = await connectionRepo.findByIdWithData(config.connectionId);

    const parameters = interpolateObject(config.parameters, context);

    const result = await mcpService.executeTool(
        connection,
        config.tool,
        parameters
    );

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: result.data
        }
    };
}
```

---

## Using Connections in Agents

Agents use connections for LLM calls and tool execution.

### LLM Provider Connections

Agents are configured with a default LLM provider connection:

```typescript
// Agent configuration
{
    name: "Research Assistant",
    model: "gpt-4",
    provider: "openai",
    connectionId: "550e8400-e29b-41d4-a716-446655440000"  // OpenAI API key connection
}
```

**Agent Execution**:
```typescript
export async function callLLM(input: CallLLMInput): Promise<LLMResponse> {
    const connection = await connectionRepo.findByIdWithData(input.agent.connectionId);
    const apiKey = connection.data.api_key;

    const response = await openai.chat.completions.create({
        model: input.agent.model,
        messages: input.messages
    }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return {
        content: response.choices[0].message.content,
        usage: response.usage
    };
}
```

### Agent Tools with Connections

Agents can use tools that require connections:

**Workflow Tool** (executes FlowMaestro workflow):
```typescript
{
    type: "workflow",
    name: "send_email",
    description: "Send an email",
    config: {
        workflowId: "email-workflow-uuid"
    }
}
// Workflow internally uses email provider connection
```

**MCP Tool** (calls external MCP server):
```typescript
{
    type: "mcp",
    name: "query_database",
    description: "Query production database",
    config: {
        connectionId: "postgres-mcp-connection-uuid"
    }
}
```

**Tool Execution**:
```typescript
export async function executeToolCall(input: ExecuteToolCallInput) {
    const { toolCall, availableTools, userId } = input;
    const tool = availableTools.find(t => t.name === toolCall.name);

    if (tool.type === "mcp") {
        const connection = await connectionRepo.findByIdWithData(tool.config.connectionId);
        return await mcpService.executeTool(
            connection,
            toolCall.name,
            toolCall.arguments
        );
    }

    // ... other tool types
}
```

---

## Backend Implementation

### Repository Layer

**ConnectionRepository** (`backend/src/storage/repositories/ConnectionRepository.ts`):

```typescript
export class ConnectionRepository {
    // Create connection (encrypts data automatically)
    async create(input: CreateConnectionInput): Promise<ConnectionSummary> {
        const encryptedData = encryptionService.encrypt(input.data);

        const result = await pool.query<Connection>(
            `INSERT INTO connections (user_id, name, connection_method, provider, data, mcp_server_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [input.userId, input.name, input.connection_method, input.provider, encryptedData, input.mcp_server_url]
        );

        return this.toSummary(result.rows[0]);
    }

    // Get connection summary (without decrypted data)
    async findById(id: string, userId: string): Promise<ConnectionSummary | null> {
        const result = await pool.query<Connection>(
            `SELECT * FROM connections
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );

        return result.rows[0] ? this.toSummary(result.rows[0]) : null;
    }

    // Get connection with decrypted data (for execution)
    async findByIdWithData(id: string, userId: string): Promise<ConnectionWithData | null> {
        const result = await pool.query<Connection>(
            `SELECT * FROM connections
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );

        if (!result.rows[0]) return null;

        const connection = result.rows[0];
        return {
            ...connection,
            data: encryptionService.decrypt(connection.data)
        };
    }

    // Update MCP tools
    async updateMCPTools(id: string, tools: MCPTool[]): Promise<void> {
        await pool.query(
            `UPDATE connections
             SET mcp_tools = $1, updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(tools), id]
        );
    }

    // Filter connections
    async findAll(userId: string, filters?: ConnectionFilters): Promise<ConnectionSummary[]> {
        let query = `SELECT * FROM connections WHERE user_id = $1 AND deleted_at IS NULL`;
        const params: any[] = [userId];

        if (filters?.provider) {
            params.push(filters.provider);
            query += ` AND provider = $${params.length}`;
        }

        if (filters?.connection_method) {
            params.push(filters.connection_method);
            query += ` AND connection_method = $${params.length}`;
        }

        const result = await pool.query<Connection>(query, params);
        return result.rows.map(row => this.toSummary(row));
    }

    // Soft delete
    async softDelete(id: string, userId: string): Promise<boolean> {
        const result = await pool.query(
            `UPDATE connections
             SET deleted_at = NOW()
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );

        return result.rowCount > 0;
    }

    private toSummary(connection: Connection): ConnectionSummary {
        return {
            id: connection.id,
            user_id: connection.user_id,
            name: connection.name,
            connection_method: connection.connection_method,
            provider: connection.provider,
            status: connection.status,
            mcp_server_url: connection.mcp_server_url,
            mcp_tools: connection.mcp_tools,
            last_used_at: connection.last_used_at,
            last_tested_at: connection.last_tested_at,
            created_at: connection.created_at,
            updated_at: connection.updated_at
            // Note: 'data' field excluded (encrypted, only in findByIdWithData)
        };
    }
}
```

### Encryption Service

**EncryptionService** (`backend/src/services/encryption/EncryptionService.ts`):

```typescript
export class EncryptionService {
    private key: Buffer;

    constructor() {
        const keyBase64 = process.env.ENCRYPTION_KEY;
        if (!keyBase64) {
            throw new Error("ENCRYPTION_KEY environment variable required");
        }
        this.key = Buffer.from(keyBase64, 'base64');
        if (this.key.length !== 32) {
            throw new Error("Encryption key must be 32 bytes");
        }
    }

    encrypt(data: any): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

        const encrypted = Buffer.concat([
            cipher.update(JSON.stringify(data), 'utf8'),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();

        return JSON.stringify({
            iv: iv.toString('hex'),
            data: encrypted.toString('hex'),
            authTag: authTag.toString('hex')
        });
    }

    decrypt(encryptedString: string): any {
        const { iv, data, authTag } = JSON.parse(encryptedString);
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            this.key,
            Buffer.from(iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(data, 'hex')),
            decipher.final()
        ]);

        return JSON.parse(decrypted.toString('utf8'));
    }
}
```

### Connection Testing Service

**ConnectionTestService** (`backend/src/services/ConnectionTestService.ts`):

```typescript
export class ConnectionTestService {
    async testConnection(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        if (connection.connection_method === "mcp") {
            return await this.testMCP(connection);
        }

        switch (connection.provider) {
            case "openai":
                return await this.testOpenAI(connection);
            case "anthropic":
                return await this.testAnthropic(connection);
            case "slack":
                return await this.testSlack(connection);
            default:
                throw new Error(`Provider ${connection.provider} testing not implemented`);
        }
    }

    private async testOpenAI(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        try {
            const response = await axios.get('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${connection.data.api_key}` },
                timeout: 10000
            });

            return {
                success: true,
                message: "Successfully connected to OpenAI",
                tested_at: new Date().toISOString()
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.error?.message || "Failed to connect to OpenAI",
                tested_at: new Date().toISOString()
            };
        }
    }

    private async testMCP(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        try {
            const serverInfo = await mcpService.testConnection(
                connection.mcp_server_url!,
                connection.data
            );

            return {
                success: true,
                message: `Connected to ${serverInfo.name} v${serverInfo.version}`,
                tested_at: new Date().toISOString(),
                metadata: { server_info: serverInfo }
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || "Failed to connect to MCP server",
                tested_at: new Date().toISOString()
            };
        }
    }
}
```

### API Endpoints

**All connection endpoints** (`backend/src/api/routes/connections/`):

```http
# List connections
GET /api/connections
Query: ?provider=slack&connection_method=oauth2&status=active

# Get single connection
GET /api/connections/:id

# Create connection
POST /api/connections
Body: { name, connection_method, provider, data, mcp_server_url? }

# Update connection
PUT /api/connections/:id
Body: { name?, data?, ... }

# Delete connection
DELETE /api/connections/:id

# Test connection
POST /api/connections/:id/test

# Test before saving
POST /api/connections/test
Body: { connection_method, provider, data }

# MCP: Discover tools
POST /api/connections/mcp/discover
Body: { server_url, auth? }

# MCP: Get provider registry
GET /api/connections/mcp/providers

# MCP: Refresh connection tools
POST /api/connections/:id/refresh-tools
```

---

## Frontend Implementation

### State Management

**ConnectionStore** (`frontend/src/stores/connectionStore.ts`):

```typescript
import { create } from "zustand";

interface ConnectionStore {
    connections: Connection[];
    loading: boolean;
    error: string | null;

    // CRUD
    fetchConnections: (params?: FilterParams) => Promise<void>;
    addConnection: (input: CreateConnectionInput) => Promise<Connection>;
    updateConnectionById: (id: string, input: Partial<Connection>) => Promise<void>;
    deleteConnectionById: (id: string) => Promise<void>;

    // Testing
    testConnectionById: (id: string) => Promise<boolean>;
    testConnectionBeforeSaving: (input: CreateConnectionInput) => Promise<boolean>;

    // Filtering
    getByProvider: (provider: string) => Connection[];
    getByMethod: (method: ConnectionMethod) => Connection[];

    // MCP
    discoverMCPTools: (request: MCPDiscoveryRequest) => Promise<MCPToolsResponse>;
    refreshMCPToolsById: (id: string) => Promise<void>;

    clearError: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
    connections: [],
    loading: false,
    error: null,

    fetchConnections: async (params) => {
        set({ loading: true });
        try {
            const connections = await api.getConnections(params);
            set({ connections, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    addConnection: async (input) => {
        const connection = await api.createConnection(input);
        set(state => ({
            connections: [...state.connections, connection]
        }));
        return connection;
    },

    testConnectionBeforeSaving: async (input) => {
        const result = await api.testConnection(input);
        return result.test_result.success;
    },

    getByProvider: (provider) => {
        return get().connections.filter(c => c.provider === provider);
    },

    getByMethod: (method) => {
        return get().connections.filter(c => c.connection_method === method);
    }
}));
```

### UI Components

#### ConnectionPicker

Used in node configurations to select a connection:

```typescript
// frontend/src/components/connections/ConnectionPicker.tsx

export function ConnectionPicker({
    provider,
    value,
    onChange,
    label = "Connection",
    description,
    required = false,
    allowedMethods = ["api_key", "oauth2"]
}: ConnectionPickerProps) {
    const connections = useConnectionStore(state =>
        state.connections.filter(c =>
            c.provider === provider &&
            allowedMethods.includes(c.connection_method)
        )
    );

    return (
        <div className="space-y-2">
            <label>{label} {required && <span className="text-red-500">*</span>}</label>
            {description && <p className="text-sm text-gray-600">{description}</p>}

            <select value={value} onChange={e => onChange(e.target.value)} required={required}>
                <option value="">Select connection</option>
                {connections.map(conn => (
                    <option key={conn.id} value={conn.id}>
                        {conn.name} ({conn.connection_method})
                    </option>
                ))}
            </select>

            {connections.length === 0 && (
                <div className="text-sm text-gray-500">
                    No connections available.
                    <Link to="/connections" className="text-blue-600 ml-2">Add connection</Link>
                </div>
            )}
        </div>
    );
}
```

**Usage in Node Config**:
```typescript
<ConnectionPicker
    provider="openai"
    value={config.connectionId}
    onChange={setConnectionId}
    label="OpenAI API Connection"
    description="Select the API key connection to use"
    required={true}
    allowedMethods={["api_key"]}
/>
```

#### AddConnectionDialog

Multi-step wizard for creating connections:

```typescript
export function AddConnectionDialog({ isOpen, onClose }: AddConnectionDialogProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [method, setMethod] = useState<ConnectionMethod | null>(null);
    const [provider, setProvider] = useState<string | null>(null);
    const [formData, setFormData] = useState({});

    const handleSave = async () => {
        const isValid = await testConnectionBeforeSaving({ connection_method: method, provider, data: formData });
        if (!isValid) {
            alert("Connection test failed");
            return;
        }

        await addConnection({ name: `${provider} Connection`, connection_method: method, provider, data: formData });
        onClose();
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            {step === 1 && (
                <SelectMethodStep
                    onSelect={(m) => { setMethod(m); setStep(2); }}
                />
            )}
            {step === 2 && (
                <SelectProviderStep
                    method={method}
                    onSelect={(p) => { setProvider(p); setStep(3); }}
                    onBack={() => setStep(1)}
                />
            )}
            {step === 3 && (
                <ConfigureStep
                    method={method}
                    provider={provider}
                    formData={formData}
                    onChange={setFormData}
                    onBack={() => setStep(2)}
                    onSave={handleSave}
                />
            )}
        </Dialog>
    );
}
```

---

## Security

### Encryption at Rest

All sensitive connection data is encrypted with AES-256-GCM:

```typescript
// Before saving
const encryptedData = encryptionService.encrypt({
    api_key: "sk-...",
    api_secret: "org-..."
});

await pool.query(
    'INSERT INTO connections (data) VALUES ($1)',
    [encryptedData]
);
```

**Encryption Key Management**:
- Store in `ENCRYPTION_KEY` environment variable
- 32-byte base64-encoded string
- Rotate periodically
- Never commit to version control

### Multi-Tenancy Isolation

All operations enforce user ID matching:

```typescript
async findByIdWithData(id: string, userId: string) {
    const result = await pool.query(
        'SELECT * FROM connections WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, userId]
    );
    // User can only access their own connections
}
```

### OAuth Security

- **State Parameter**: Prevents CSRF attacks
- **Short-Lived Tokens**: Access tokens expire, requiring refresh
- **Encrypted Storage**: Tokens encrypted at rest
- **Automatic Refresh**: Tokens refresh before expiry without user intervention

### MCP Server Trust

- Only connect to trusted MCP servers
- Use authentication when available
- Implement timeout limits (default: 30 seconds)
- Validate tool schemas before execution

---

## Related Documentation

- **[workflows.md](./workflows.md)**: Using connections in workflow nodes
- **[agents.md](./agents.md)**: Using connections for agent LLM calls and tools
- **[temporal.md](./temporal.md)**: Connection usage in durable executions

---

## Summary

FlowMaestro's Integrations system provides:

1. **Unified Interface**: One place to manage API keys, OAuth, and MCP connections
2. **Security First**: AES-256-GCM encryption, multi-tenancy isolation, secure token handling
3. **Automatic Token Refresh**: OAuth tokens refresh seamlessly in the background
4. **Tool Discovery**: MCP servers automatically expose available tools
5. **Type Safety**: Full TypeScript typing throughout backend and frontend
6. **Extensible**: Easy to add new providers and authentication methods

This architecture scales with FlowMaestro's growth, supporting new services and connection methods while maintaining consistent user experience and robust security.
