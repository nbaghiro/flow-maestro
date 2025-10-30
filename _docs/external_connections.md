# External Connections System

## Overview

The Connections system in FlowMaestro provides a unified interface for managing all external service integrations. It consolidates what were previously two separate systems (Credentials and Integrations) into a single, cohesive architecture that supports three primary connection methods:

1. **API Key Authentication** - Direct API key/secret storage for services like OpenAI, Anthropic, etc.
2. **OAuth 2.0** - Token-based authentication with automatic refresh for services like Slack, Google, Notion
3. **Model Context Protocol (MCP)** - JSON-RPC 2.0 connections to tool servers for extended functionality

This unified approach allows users to manage all their external service connections in one place, regardless of the authentication method, while maintaining clear distinctions between connection types through badges and filtering.

---

## Architecture

### Database Model

The connections system is built around a single `connections` table that replaced both the `credentials` and `integrations` tables:

```sql
CREATE TABLE flowmaestro.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    connection_method VARCHAR(50) NOT NULL,  -- 'api_key', 'oauth2', 'mcp', 'basic_auth', 'custom'
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
    deleted_at TIMESTAMP
);
```

**Key Design Decisions:**

- **Single Table**: One provider (e.g., GitHub) can have multiple connection types (API key, OAuth, MCP server)
- **Encrypted Data**: The `data` field stores sensitive information (tokens, keys) encrypted with AES-256-GCM
- **Soft Deletes**: `deleted_at` allows data recovery and maintains audit trails
- **MCP Integration**: MCP-specific fields are nullable and only used for MCP connections
- **Multi-tenancy**: `user_id` ensures complete data isolation between users

---

## Connection Methods

### 1. API Key Authentication

**Use Case**: Direct API key/secret authentication for AI providers and REST APIs.

**Providers**: OpenAI, Anthropic, Google AI, GitHub (token), custom APIs

**Data Structure**:
```typescript
{
    api_key: string;        // Primary API key
    api_secret?: string;    // Optional secret (e.g., OpenAI organization key)
    base_url?: string;      // Optional custom endpoint
}
```

**Flow**:
1. User enters API key through AddConnectionDialog
2. Frontend calls `testConnectionBeforeSave()` to validate the key
3. Backend encrypts and stores the key in the `data` field
4. When executing workflows, the key is decrypted and used directly in API calls

**Example Usage in Workflow**:
```typescript
// LLM Node configuration
{
    provider: "openai",
    model: "gpt-4",
    connectionId: "uuid-of-connection",  // References the connection
    prompt: "Analyze this text..."
}

// At execution time:
const connection = await connectionRepo.findByIdWithData(connectionId);
const apiKey = connection.data.api_key;
// Make OpenAI API call with apiKey
```

### 2. OAuth 2.0

**Use Case**: Secure delegated access with automatic token refresh for integrated services.

**Providers**: Slack, Google, Notion, GitHub (OAuth App)

**Data Structure**:
```typescript
{
    access_token: string;
    refresh_token?: string;
    token_type: "Bearer";
    expires_at?: number;    // Timestamp for token expiry
    scope: string[];
}
```

**Flow**:

1. **Authorization Initiation**:
   - User clicks "Connect" in AddConnectionDialog
   - Frontend calls `/api/oauth/{provider}/authorize`
   - Backend generates OAuth URL with state parameter
   - Popup window opens with provider's authorization page

2. **OAuth Callback**:
   - User grants permissions on provider's page
   - Provider redirects to `/api/oauth/{provider}/callback?code=XXX&state=YYY`
   - Backend exchanges code for tokens
   - Tokens are encrypted and stored as a connection
   - Callback page posts message to parent window with connection data
   - Popup closes, parent window receives connection

3. **Automatic Token Refresh**:
   ```typescript
   export async function getAccessToken(connectionId: string): Promise<string> {
       const connection = await connectionRepo.findByIdWithData(connectionId);

       // Check if token is expired or about to expire (5 min buffer)
       if (connection.data.expires_at && Date.now() + 5*60*1000 > connection.data.expires_at) {
           // Refresh the token
           const newTokens = await refreshOAuthToken(connection);
           await connectionRepo.updateConnectionData(connectionId, newTokens);
           return newTokens.access_token;
       }

       return connection.data.access_token;
   }
   ```

4. **Usage in Workflows**:
   ```typescript
   // Integration Node (Slack message)
   {
       service: "slack",
       operation: "send_message",
       connectionId: "uuid-of-slack-oauth-connection",
       config: {
           channel: "#general",
           text: "Hello from workflow!"
       }
   }

   // At execution time:
   const token = await getAccessToken(connectionId);  // Auto-refreshes if needed!
   await axios.post('https://slack.com/api/chat.postMessage', data, {
       headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

**OAuth Providers Configuration**:

Each provider requires client credentials in environment variables:

```env
SLACK_CLIENT_ID=xxxxx
SLACK_CLIENT_SECRET=xxxxx
GOOGLE_CLIENT_ID=xxxxx
GOOGLE_CLIENT_SECRET=xxxxx
NOTION_CLIENT_ID=xxxxx
NOTION_CLIENT_SECRET=xxxxx
```

The OAuth service (`backend/src/services/oauth/OAuthService.ts`) manages provider-specific configurations and token refresh logic.

### 3. Model Context Protocol (MCP)

**Use Case**: Connect to MCP servers that expose tools for filesystem access, database queries, git operations, etc.

**Important**: MCP connections are NOT for AI providers (OpenAI, Anthropic). Those use API key or OAuth methods. MCP is for tool servers.

**Providers**: Filesystem MCP, PostgreSQL MCP, MongoDB MCP, GitHub MCP, custom MCP servers

**Data Structure**:
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

**MCP Tool Discovery**:

When a connection to an MCP server is created, FlowMaestro automatically discovers available tools:

```typescript
// POST /api/connections/mcp/discover
{
    server_url: "http://localhost:3100",
    auth?: {
        auth_type: "bearer",
        bearer_token: "secret"
    }
}

// Response:
{
    success: true,
    data: {
        server_info: {
            name: "Filesystem MCP",
            version: "1.0.0",
            protocol_version: "2024-11-05"
        },
        tools: [
            {
                name: "read_file",
                description: "Read contents of a file",
                parameters: [
                    { name: "path", type: "string", required: true }
                ]
            },
            {
                name: "list_directory",
                description: "List files in a directory",
                parameters: [
                    { name: "path", type: "string", required: true }
                ]
            }
        ]
    }
}
```

These tools are stored in the `mcp_tools` JSONB column and can be refreshed via:
```http
POST /api/connections/:id/refresh-tools
```

**MCP Tool Execution**:

In workflows, MCP tools can be invoked through dedicated nodes or via the MCP executor:

```typescript
// Execute MCP tool
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

**Predefined MCP Providers**:

FlowMaestro includes a registry of known MCP servers (`backend/src/services/mcp/MCPProviderRegistry.ts`):

```typescript
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
    // ... more providers
};
```

Users can also add custom MCP servers by providing their own server URL.

---

## Backend Implementation

### Repository Layer

**ConnectionRepository** (`backend/src/storage/repositories/ConnectionRepository.ts`)

The repository provides type-safe database access with automatic encryption/decryption:

```typescript
class ConnectionRepository {
    // Create new connection (encrypts data automatically)
    async create(input: CreateConnectionInput): Promise<ConnectionSummary>

    // Get connection summary (without decrypted data)
    async findById(id: string, userId: string): Promise<ConnectionSummary | null>

    // Get connection with decrypted data (for execution)
    async findByIdWithData(id: string, userId: string): Promise<ConnectionWithData | null>

    // Update connection
    async update(id: string, userId: string, input: Partial<ConnectionModel>): Promise<ConnectionSummary | null>

    // Update MCP tools after discovery
    async updateMCPTools(id: string, tools: MCPTool[]): Promise<void>

    // Filter connections
    async findAll(userId: string, filters?: ConnectionFilters): Promise<ConnectionSummary[]>
    async findByProvider(userId: string, provider: string): Promise<ConnectionSummary[]>
    async findByMethod(userId: string, method: ConnectionMethod): Promise<ConnectionSummary[]>

    // Soft delete
    async softDelete(id: string, userId: string): Promise<boolean>
}
```

**Encryption Service** (`backend/src/services/encryption/EncryptionService.ts`)

All sensitive connection data is encrypted using AES-256-GCM:

```typescript
class EncryptionService {
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
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(data, 'hex')),
            decipher.final()
        ]);

        return JSON.parse(decrypted.toString('utf8'));
    }
}
```

The encryption key is derived from `process.env.ENCRYPTION_KEY` (32-byte base64-encoded string).

### API Endpoints

All connection endpoints are under `/api/connections`:

```http
# List connections
GET /api/connections
Query params: ?provider=slack&connection_method=oauth2&status=active

# Get single connection
GET /api/connections/:id

# Create connection
POST /api/connections
Body: {
    name: "My OpenAI API",
    connection_method: "api_key",
    provider: "openai",
    data: { api_key: "sk-..." }
}

# Update connection
PUT /api/connections/:id
Body: { name: "Updated Name", ... }

# Delete connection
DELETE /api/connections/:id

# Test connection
POST /api/connections/:id/test
Response: { success: true, test_result: { success: true, ... } }

# Test before saving (validates without creating)
POST /api/connections/test
Body: { connection_method: "api_key", provider: "openai", data: { api_key: "sk-..." } }

# MCP: Discover tools
POST /api/connections/mcp/discover
Body: { server_url: "http://localhost:3100", auth: {...} }

# MCP: Get provider registry
GET /api/connections/mcp/providers

# MCP: Refresh connection tools
POST /api/connections/:id/refresh-tools
```

### Testing Connections

**ConnectionTestService** (`backend/src/services/ConnectionTestService.ts`)

Validates connections before saving and on-demand:

```typescript
class ConnectionTestService {
    async testConnection(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        // Route to appropriate test method based on connection_method and provider
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
            // ... more providers
        }
    }

    private async testOpenAI(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        try {
            const response = await axios.get('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${connection.data.api_key}` }
            });

            return {
                success: true,
                message: "Successfully connected to OpenAI",
                tested_at: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.error?.message || "Failed to connect",
                tested_at: new Date().toISOString()
            };
        }
    }

    private async testMCP(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        try {
            const serverInfo = await mcpService.testConnection(
                connection.mcp_server_url,
                connection.data
            );

            return {
                success: true,
                message: `Connected to ${serverInfo.name} v${serverInfo.version}`,
                tested_at: new Date().toISOString(),
                metadata: { server_info: serverInfo }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                tested_at: new Date().toISOString()
            };
        }
    }
}
```

---

## Frontend Implementation

### State Management

**ConnectionStore** (`frontend/src/stores/connectionStore.ts`)

Zustand store managing connection state:

```typescript
interface ConnectionStore {
    connections: Connection[];
    loading: boolean;
    error: string | null;

    // CRUD operations
    fetchConnections: (params?: FilterParams) => Promise<void>;
    addConnection: (input: CreateConnectionInput) => Promise<Connection>;
    updateConnectionById: (id: string, input: Partial<Connection>) => Promise<void>;
    deleteConnectionById: (id: string) => Promise<void>;

    // Testing
    testConnectionById: (id: string) => Promise<boolean>;
    testConnectionBeforeSaving: (input: CreateConnectionInput) => Promise<boolean>;

    // Filtering helpers
    getByProvider: (provider: string) => Connection[];
    getByMethod: (method: ConnectionMethod) => Connection[];

    // MCP-specific
    discoverMCPTools: (request: MCPDiscoveryRequest) => Promise<MCPToolsResponse>;
    refreshMCPToolsById: (id: string) => Promise<void>;

    clearError: () => void;
}
```

Usage in components:

```typescript
function MyComponent() {
    const { connections, fetchConnections, addConnection } = useConnectionStore();

    useEffect(() => {
        fetchConnections({ provider: "openai" });
    }, []);

    const handleAdd = async (data) => {
        await addConnection(data);
    };

    return <div>...</div>;
}
```

### UI Components

#### 1. Connections Page

**Location**: `frontend/src/pages/Connections.tsx`

Main page displaying all connections with:
- Search bar for filtering by name/provider
- Dropdown filter for connection method (All, API Keys, OAuth, MCP, etc.)
- Grid layout of ConnectionCard components
- "Add Connection" button
- Empty state when no connections exist
- Stats footer showing total, active, and MCP count

Features:
- Grouped display by provider when viewing all methods
- Flat list when filtering by specific method
- Real-time updates after adding/deleting connections
- Error handling with dismissible error banner

#### 2. ConnectionCard Component

**Location**: `frontend/src/components/connections/ConnectionCard.tsx`

Displays individual connection with:
- Provider icon and name
- Connection method badge (API Key, OAuth, MCP)
- Status badge (active, expired, invalid, revoked)
- MCP tool count badge (for MCP connections)
- OAuth expiry warning (for expired OAuth tokens)
- Account info (email/username if available)
- MCP server URL (for MCP connections)
- Last used timestamp
- Action buttons:
  - Test: Validates the connection
  - Refresh Tools: Re-discovers MCP tools (MCP only)
  - Delete: Removes the connection

Supports optional `onSelect` for picker mode.

#### 3. AddConnectionDialog Component

**Location**: `frontend/src/components/connections/AddConnectionDialog.tsx`

Multi-step wizard for adding connections:

**Step 1: Select Method**
- API Key
- OAuth
- MCP Server

**Step 2: Select Provider**
- Shows providers filtered by selected method
- Predefined providers (OpenAI, Slack, etc.)
- Custom option

**Step 3: Configure**
- Connection name (auto-populated)
- Method-specific configuration fields:
  - **API Key**: API Key field, optional API Secret
  - **OAuth**: Redirects to Integrations page message
  - **MCP**: Server URL, Auth Type dropdown, auth credentials based on type

**Actions**:
- Back navigation between steps
- Test Connection button (validates before saving)
- Save Connection button
- Error display

#### 4. ConnectionPicker Component

**Location**: `frontend/src/components/connections/ConnectionPicker.tsx`

Dropdown selector for choosing connections in node configs:

```typescript
<ConnectionPicker
    provider="openai"
    value={connectionId}
    onChange={setConnectionId}
    label="API Connection"
    description="Select the API connection to use for authentication"
    required={true}
    allowedMethods={["api_key", "oauth2"]}  // Optional filter
/>
```

Features:
- Filters connections by provider
- Optional filtering by connection method(s)
- Shows connection method badge for selected connection
- Shows MCP tool count for MCP connections
- OAuth expiry warning for expired tokens
- "Add new connection" quick link
- Empty state with "Add connection" button

Used in:
- LLM Node Config
- Integration Node Config
- Database Node Config
- Any node requiring external service authentication

### OAuth Flow in Frontend

**useOAuth Hook** (`frontend/src/hooks/useOAuth.ts`)

```typescript
const { initiateOAuth, loading } = useOAuth();

const handleConnect = async () => {
    try {
        const connection = await initiateOAuth("slack");
        // Connection created successfully
        console.log("Connected:", connection);
    } catch (error) {
        console.error("OAuth failed:", error);
    }
};
```

Flow:
1. `initiateOAuth()` calls `/api/oauth/{provider}/authorize`
2. Opens popup with OAuth URL
3. User authorizes on provider's page
4. Provider redirects to callback
5. Callback page posts message to parent: `{ type: 'oauth_success', connection: {...} }`
6. Hook resolves with connection data
7. Popup closes automatically

---

## Usage in Workflows

### LLM Node Example

```typescript
// User configures LLM node:
{
    label: "Generate Summary",
    type: "llm",
    config: {
        provider: "openai",
        model: "gpt-4",
        connectionId: "550e8400-e29b-41d4-a716-446655440000",  // References OpenAI connection
        prompt: "Summarize: ${previous_step_output}",
        temperature: 0.7
    }
}

// During workflow execution (Temporal activity):
async function executeLLMNode(config, context) {
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
        [config.outputVariable]: response.choices[0].message.content
    };
}
```

### Integration Node Example (Slack with OAuth)

```typescript
// User configures Slack integration:
{
    label: "Send Slack Notification",
    type: "integration",
    config: {
        service: "slack",
        operation: "send_message",
        connectionId: "660e8400-e29b-41d4-a716-446655440001",  // OAuth connection
        config: {
            channel: "#notifications",
            text: "Workflow completed: ${workflow.name}"
        }
    }
}

// During workflow execution:
async function executeSlackIntegration(config, context) {
    // Get OAuth token (auto-refreshes if expired!)
    const token = await getAccessToken(config.connectionId);

    const text = interpolateVariables(config.config.text, context);

    await axios.post('https://slack.com/api/chat.postMessage', {
        channel: config.config.channel,
        text: text
    }, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}
```

### MCP Tool Node Example

```typescript
// User configures MCP tool node:
{
    label: "Read Config File",
    type: "mcp_tool",
    config: {
        connectionId: "770e8400-e29b-41d4-a716-446655440002",  // Filesystem MCP
        tool: "read_file",
        parameters: {
            path: "/app/config/${environment}.json"
        },
        outputVariable: "config"
    }
}

// During workflow execution:
async function executeMCPToolNode(config, context) {
    const connection = await connectionRepo.findByIdWithData(config.connectionId);

    const parameters = interpolateObject(config.parameters, context);

    const result = await mcpService.executeTool(
        connection,
        config.tool,
        parameters
    );

    return {
        ...context,
        [config.outputVariable]: result.data
    };
}
```

---

## Security Considerations

### 1. Encryption at Rest

All sensitive connection data is encrypted before storage:

```typescript
// Before saving to database
const encryptedData = encryptionService.encrypt({
    api_key: "sk-...",
    api_secret: "org-..."
});

await pool.query(
    'INSERT INTO connections (data) VALUES ($1)',
    [encryptedData]
);
```

The encryption key should be:
- Stored in environment variable: `ENCRYPTION_KEY` (32-byte base64 string)
- Rotated periodically
- Backed up securely
- Never committed to version control

### 2. Multi-Tenancy Isolation

All connection operations enforce user ID matching:

```typescript
async findByIdWithData(id: string, userId: string): Promise<ConnectionWithData | null> {
    const result = await pool.query(
        'SELECT * FROM connections WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, userId]
    );
    // User can only access their own connections
}
```

### 3. OAuth Security

- State parameter prevents CSRF attacks
- PKCE (Proof Key for Code Exchange) for public clients
- Short-lived access tokens with automatic refresh
- Tokens encrypted at rest
- Refresh token rotation on use

### 4. MCP Server Trust

MCP connections should be validated:
- Only connect to trusted MCP servers
- Use authentication when available
- Implement timeout limits
- Validate tool schemas before execution
- Sandbox tool execution in production

### 5. Connection Testing

Test connections before use:
```typescript
// In workflow executor, before using a connection
if (!connection.last_tested_at || isOlderThan(connection.last_tested_at, 24 * 60 * 60 * 1000)) {
    const testResult = await testService.testConnection(connection);
    if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.message}`);
    }
}
```

---

## Migration from Old System

The migration from separate Credentials and Integrations tables was handled by database migration `1730000000006_rename-to-connections.sql`:

```sql
-- Rename credentials table
ALTER TABLE flowmaestro.credentials RENAME TO connections;

-- Rename type column to connection_method
ALTER TABLE flowmaestro.connections RENAME COLUMN type TO connection_method;

-- Add MCP fields
ALTER TABLE flowmaestro.connections
    ADD COLUMN mcp_server_url TEXT,
    ADD COLUMN mcp_tools JSONB,
    ADD COLUMN capabilities JSONB DEFAULT '{}';

-- Drop old integrations table
DROP TABLE IF EXISTS flowmaestro.integrations;

-- Update indexes
CREATE INDEX idx_connections_user_provider ON flowmaestro.connections(user_id, provider);
CREATE INDEX idx_connections_method ON flowmaestro.connections(connection_method);
```

Frontend updates included:
1. Renamed `credentialStore` → `connectionStore`
2. Replaced `credentialId` → `connectionId` in all node configs
3. Merged Credentials and Integrations pages into single Connections page
4. Updated all components to use "connection" terminology
5. Removed `/credentials` and `/integrations` routes, added `/connections`

---

## Future Enhancements

### Potential Extensions

1. **Connection Health Monitoring**
   - Background job to test all connections daily
   - Email notifications for expired/failing connections
   - Dashboard showing connection health metrics

2. **Connection Sharing**
   - Team-level connections accessible to all workspace members
   - Role-based access control for connection management

3. **Connection Templates**
   - Pre-configured connection templates for common services
   - Import/export connection configurations (without secrets)

4. **MCP Marketplace**
   - Directory of public MCP servers
   - One-click installation of community MCP tools
   - Rating and review system

5. **Advanced OAuth**
   - Support for OAuth 1.0a
   - Custom OAuth provider configuration
   - Webhook subscriptions for event-driven workflows

6. **Audit Logging**
   - Track all connection usage in workflows
   - Export audit logs for compliance
   - Alert on suspicious connection usage patterns

---

## Troubleshooting

### Common Issues

**1. "Connection test failed" errors**
- Verify API key/credentials are correct
- Check network connectivity to service
- Ensure service is not experiencing downtime
- Review error details in test response

**2. OAuth token expired**
- Automatic refresh should handle this
- If refresh fails, reconnect the OAuth integration
- Check refresh token is still valid with provider

**3. MCP server unreachable**
- Verify server URL is correct and accessible
- Check firewall rules and network policies
- Ensure MCP server is running
- Test with curl: `curl http://localhost:3100/health`

**4. "Permission denied" in workflows**
- Ensure connection is owned by workflow user
- Check connection status is "active"
- Verify OAuth scopes include required permissions

**5. Encryption/decryption errors**
- Ensure ENCRYPTION_KEY environment variable is set
- Verify key hasn't changed (would break existing connections)
- Check key is exactly 32 bytes in base64 encoding

### Debug Mode

Enable connection debug logging:

```env
DEBUG_CONNECTIONS=true
```

This logs all connection operations including:
- Connection retrieval and decryption
- Token refresh attempts
- MCP tool execution
- Test results

---

## Summary

The Connections system provides a unified, secure, and extensible architecture for managing all external service integrations in FlowMaestro. By consolidating API keys, OAuth tokens, and MCP server connections into a single interface, it simplifies the user experience while maintaining robust security through encryption, multi-tenancy isolation, and automatic token management.

Key benefits:
- **Unified Management**: One place to manage all external connections
- **Multiple Auth Methods**: Support for API keys, OAuth, MCP, and custom auth
- **Automatic Token Refresh**: OAuth tokens refresh automatically without user intervention
- **Tool Discovery**: MCP servers automatically expose their available tools
- **Type Safety**: Full TypeScript typing throughout backend and frontend
- **Security First**: Encryption at rest, multi-tenancy isolation, secure token handling
- **Extensible**: Easy to add new providers and connection methods

This architecture is designed to scale with FlowMaestro's growth, supporting new services and authentication methods as they're needed while maintaining a consistent user experience and robust security posture.
