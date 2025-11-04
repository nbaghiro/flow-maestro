import axios from "axios";
import type {
    MCPRegistryServer,
    MCPRegistryServerDetails,
    MCPRegistryResponse
} from "../../storage/models/MCPRegistry";

/**
 * Raw API response structure from MCP registry
 */
interface RawMCPServer {
    server: {
        name: string;
        description: string;
        version: string;
        repository?: {
            url: string;
            source: string;
        };
        packages?: Array<{
            registryType: string;
            identifier: string;
            transport?: {
                type: string;
            };
            environmentVariables?: Array<{
                name: string;
                description?: string;
                isSecret?: boolean;
                format?: string;
            }>;
        }>;
        remotes?: Array<{
            type: string;
            url: string;
        }>;
    };
    _meta?: {
        "io.modelcontextprotocol.registry/official"?: {
            status: string;
            publishedAt: string;
            updatedAt: string;
            isLatest: boolean;
        };
    };
}

interface RawMCPResponse {
    servers: RawMCPServer[];
    nextCursor?: string;
    count?: number;
}

/**
 * MCP Registry Client
 * Fetches public MCP servers from the official Model Context Protocol registry
 */
export class MCPRegistryClient {
    private registryUrl = "https://registry.modelcontextprotocol.io/v0";
    private cache = new Map<string, { data: unknown; timestamp: number }>();
    private cacheTTL = 3600000; // 1 hour in milliseconds

    /**
     * Map raw API server to our internal format
     */
    private mapRawServer(raw: RawMCPServer): MCPRegistryServer {
        const server = raw.server;

        // Determine server URL from packages or remotes
        let serverUrl = "";
        if (server.packages && server.packages.length > 0) {
            serverUrl = server.packages[0].identifier;
        } else if (server.remotes && server.remotes.length > 0) {
            serverUrl = server.remotes[0].url;
        }

        // Determine auth type from environment variables
        let authType: MCPRegistryServer["authType"] = "none";
        if (server.packages && server.packages.length > 0) {
            const envVars = server.packages[0].environmentVariables || [];
            const hasApiKey = envVars.some(
                (v) =>
                    v.isSecret ||
                    v.name.toLowerCase().includes("key") ||
                    v.name.toLowerCase().includes("token")
            );
            if (hasApiKey) {
                authType = "api_key";
            }
        }

        return {
            id: server.name,
            name: server.name,
            description: server.description,
            serverUrl,
            authType,
            version: server.version,
            provider: this.extractProvider(server.name)
        };
    }

    /**
     * Extract provider name from server name (e.g., "ai.slack/mcp" -> "slack")
     */
    private extractProvider(serverName: string): string | undefined {
        const parts = serverName.split("/");
        if (parts.length > 1) {
            const domainParts = parts[0].split(".");
            if (domainParts.length > 1) {
                return domainParts[domainParts.length - 1];
            }
        }
        return undefined;
    }

    /**
     * Get all MCP servers from the registry
     * Uses cursor-based pagination to fetch all servers
     */
    async getAllServers(): Promise<MCPRegistryServer[]> {
        const cacheKey = "all_servers";
        const cached = this.getFromCache<MCPRegistryServer[]>(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            let allServers: MCPRegistryServer[] = [];
            let cursor: string | undefined = undefined;
            let hasMore = true;

            // Fetch all pages using cursor-based pagination
            while (hasMore) {
                const params: { cursor?: string } = cursor ? { cursor } : {};

                const response = await axios.get<RawMCPResponse>(`${this.registryUrl}/servers`, {
                    params,
                    timeout: 10000
                });

                const rawServers = response.data.servers || [];
                const mappedServers = rawServers.map((raw: RawMCPServer) => this.mapRawServer(raw));
                allServers = allServers.concat(mappedServers);

                // Check if there are more pages
                cursor = response.data.nextCursor;
                hasMore = !!cursor;

                // Safety limit to prevent infinite loops (max 100 pages)
                if (allServers.length > 3000) {
                    console.warn("MCP registry fetch limit reached (3000 servers)");
                    break;
                }
            }

            this.setCache(cacheKey, allServers);

            return allServers;
        } catch (error) {
            console.error("Failed to fetch MCP registry servers:", error);
            // Return empty array on error to gracefully degrade
            return [];
        }
    }

    /**
     * Search MCP servers by query
     */
    async searchServers(query: string): Promise<MCPRegistryServer[]> {
        const cacheKey = `search_${query}`;
        const cached = this.getFromCache<MCPRegistryServer[]>(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const response = await axios.get<MCPRegistryResponse>(`${this.registryUrl}/servers`, {
                params: {
                    search: query,
                    limit: 100
                },
                timeout: 10000
            });

            const servers = response.data.servers || [];
            this.setCache(cacheKey, servers);

            return servers;
        } catch (error) {
            console.error(`Failed to search MCP registry for "${query}":`, error);
            return [];
        }
    }

    /**
     * Get detailed information about a specific MCP server
     */
    async getServerById(serverId: string): Promise<MCPRegistryServerDetails | null> {
        const cacheKey = `server_${serverId}`;
        const cached = this.getFromCache<MCPRegistryServerDetails>(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const response = await axios.get<MCPRegistryServerDetails>(
                `${this.registryUrl}/servers/${encodeURIComponent(serverId)}`,
                {
                    timeout: 10000
                }
            );

            const server = response.data;
            this.setCache(cacheKey, server);

            return server;
        } catch (error) {
            console.error(`Failed to fetch MCP server "${serverId}":`, error);
            return null;
        }
    }

    /**
     * Clear the cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get data from cache if not expired
     */
    private getFromCache<T>(key: string): T | undefined {
        const cached = this.cache.get(key);

        if (!cached) {
            return undefined;
        }

        const isExpired = Date.now() - cached.timestamp > this.cacheTTL;

        if (isExpired) {
            this.cache.delete(key);
            return undefined;
        }

        return cached.data as T;
    }

    /**
     * Set data in cache with timestamp
     */
    private setCache<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}

// Singleton instance
export const mcpRegistryClient = new MCPRegistryClient();
