/**
 * MCP (Model Context Protocol) Provider Configuration
 * Registry of known MCP servers that users can connect to
 *
 * Note: This is for MCP tool servers, NOT AI providers.
 * AI providers like OpenAI/Anthropic use API keys or OAuth, not MCP.
 */

export type MCPAuthType = "none" | "api_key" | "bearer" | "basic";

/**
 * MCP Provider configuration
 */
export interface MCPProvider {
    name: string;
    displayName: string;
    description: string;
    defaultServerUrl: string;
    authType: MCPAuthType;
    category: "filesystem" | "database" | "api" | "custom";

    // Optional customizations
    protocol?: "http" | "https" | "ws" | "wss";
    timeout?: number; // milliseconds
    requiresAuth?: boolean;

    // Environment variable names for default config
    envVars?: {
        serverUrl?: string;
        apiKey?: string;
        username?: string;
        password?: string;
    };
}

/**
 * Registry of known MCP servers
 * Users can also add custom MCP servers by providing a URL
 */
export const MCP_PROVIDERS: Record<string, MCPProvider> = {
    filesystem: {
        name: "filesystem",
        displayName: "Filesystem MCP",
        description: "Access and manipulate files and directories on the local filesystem",
        defaultServerUrl: process.env.MCP_FILESYSTEM_URL || "http://localhost:3100",
        authType: "none",
        category: "filesystem",
        protocol: "http",
        requiresAuth: false
    },

    postgres: {
        name: "postgres",
        displayName: "PostgreSQL MCP",
        description: "Query and manage PostgreSQL databases",
        defaultServerUrl: process.env.MCP_POSTGRES_URL || "http://localhost:3101",
        authType: "basic",
        category: "database",
        protocol: "http",
        requiresAuth: true,
        envVars: {
            serverUrl: "MCP_POSTGRES_URL",
            username: "MCP_POSTGRES_USER",
            password: "MCP_POSTGRES_PASSWORD"
        }
    },

    mongodb: {
        name: "mongodb",
        displayName: "MongoDB MCP",
        description: "Query and manage MongoDB databases",
        defaultServerUrl: process.env.MCP_MONGODB_URL || "http://localhost:3102",
        authType: "api_key",
        category: "database",
        protocol: "http",
        requiresAuth: true,
        envVars: {
            serverUrl: "MCP_MONGODB_URL",
            apiKey: "MCP_MONGODB_API_KEY"
        }
    },

    github: {
        name: "github",
        displayName: "GitHub MCP",
        description: "Interact with GitHub repositories, issues, and pull requests",
        defaultServerUrl: "https://mcp.github.com",
        authType: "bearer",
        category: "api",
        protocol: "https",
        requiresAuth: true,
        envVars: {
            apiKey: "GITHUB_TOKEN"
        }
    }
};

/**
 * Get MCP provider configuration by name
 * @throws Error if provider not found
 */
export function getMCPProvider(provider: string): MCPProvider {
    const config = MCP_PROVIDERS[provider];

    if (!config) {
        throw new Error(`Unknown MCP provider: ${provider}`);
    }

    return config;
}

/**
 * List all available MCP providers
 */
export function listMCPProviders(): Array<{
    name: string;
    displayName: string;
    description: string;
    category: string;
    requiresAuth: boolean;
    configured: boolean;
}> {
    return Object.values(MCP_PROVIDERS).map((provider) => ({
        name: provider.name,
        displayName: provider.displayName,
        description: provider.description,
        category: provider.category,
        requiresAuth: provider.requiresAuth || false,
        configured: !!provider.defaultServerUrl
    }));
}

/**
 * Check if a provider is configured (has default server URL)
 */
export function isProviderConfigured(provider: string): boolean {
    const config = MCP_PROVIDERS[provider];
    if (!config) return false;
    return !!config.defaultServerUrl;
}

/**
 * Validate MCP server URL format
 */
export function validateServerUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ["http:", "https:", "ws:", "wss:"].includes(parsed.protocol);
    } catch {
        return false;
    }
}
