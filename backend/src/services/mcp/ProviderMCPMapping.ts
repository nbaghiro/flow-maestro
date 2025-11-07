import type { MCPRegistryServer } from "../../storage/models/MCPRegistry";

/**
 * Provider to MCP Registry Mapping
 * Maps our internal provider names to MCP registry server IDs
 */

/**
 * Map of provider names to their MCP registry server IDs
 * These IDs come from https://registry.modelcontextprotocol.io
 */
export const PROVIDER_MCP_REGISTRY_MAP: Record<string, string> = {
    // Communication
    slack: "@modelcontextprotocol/server-slack",
    discord: "@modelcontextprotocol/server-discord",
    telegram: "@modelcontextprotocol/server-telegram",

    // Productivity
    google: "@modelcontextprotocol/server-gdrive", // Google Drive
    notion: "@modelcontextprotocol/server-notion",

    // Developer Tools
    github: "@modelcontextprotocol/server-github",
    gitlab: "@modelcontextprotocol/server-gitlab",

    // Databases
    postgres: "@modelcontextprotocol/server-postgres",
    mongodb: "@modelcontextprotocol/server-mongodb",
    mysql: "@modelcontextprotocol/server-mysql",

    // File Storage
    dropbox: "@modelcontextprotocol/server-dropbox",

    // Other
    stripe: "@modelcontextprotocol/server-stripe",
    puppeteer: "@modelcontextprotocol/server-puppeteer"
};

/**
 * Get the MCP registry server ID for a given provider
 */
export function getProviderMCPServerId(provider: string): string | null {
    return PROVIDER_MCP_REGISTRY_MAP[provider.toLowerCase()] || null;
}

/**
 * Check if a provider has an MCP server available in the registry
 */
export function hasProviderMCPServer(
    provider: string,
    registryServers: MCPRegistryServer[]
): boolean {
    const mcpId = getProviderMCPServerId(provider);

    if (!mcpId) {
        return false;
    }

    return registryServers.some((server) => server.id === mcpId);
}

/**
 * Get all providers that have MCP servers in the registry
 */
export function getProvidersWithMCPServers(
    providers: string[],
    registryServers: MCPRegistryServer[]
): string[] {
    return providers.filter((provider) => hasProviderMCPServer(provider, registryServers));
}

/**
 * Find the MCP server for a given provider in the registry
 */
export function findMCPServerForProvider(
    provider: string,
    registryServers: MCPRegistryServer[]
): MCPRegistryServer | null {
    const mcpId = getProviderMCPServerId(provider);

    if (!mcpId) {
        return null;
    }

    return registryServers.find((server) => server.id === mcpId) || null;
}
