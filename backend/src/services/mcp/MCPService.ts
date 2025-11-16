import { validateServerUrl } from "./MCPProviderRegistry";
import type {
    MCPConnectionData,
    MCPTool,
    ConnectionWithData
} from "../../storage/models/Connection";

/**
 * MCP Server Information Response
 */
export interface MCPServerInfo {
    name: string;
    version: string;
    description?: string;
    protocol_version: string;
    capabilities?: string[];
}

/**
 * MCP Tool Discovery Response
 */
export interface MCPToolsResponse {
    tools: MCPTool[];
    server_info?: MCPServerInfo;
}

/**
 * MCP Tool Execution Request
 */
export interface MCPToolExecutionRequest {
    tool: string;
    parameters: Record<string, unknown>;
}

/**
 * MCP Tool Execution Response
 */
export interface MCPToolExecutionResponse {
    success: boolean;
    result?: unknown;
    error?: string;
}

/**
 * MCP Service
 * Handles communication with MCP (Model Context Protocol) servers
 */
export class MCPService {
    /**
     * Create headers for MCP server communication
     */
    private createHeaders(auth?: MCPConnectionData): Record<string, string> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json"
        };

        // Add authentication headers based on auth type
        if (auth) {
            switch (auth.auth_type) {
                case "api_key":
                    if (auth.api_key) {
                        (headers as Record<string, string>)["X-API-Key"] = auth.api_key;
                    }
                    break;
                case "bearer":
                    if (auth.bearer_token) {
                        (headers as Record<string, string>)["Authorization"] =
                            `Bearer ${auth.bearer_token}`;
                    }
                    break;
                case "basic":
                    if (auth.username && auth.password) {
                        const credentials = Buffer.from(
                            `${auth.username}:${auth.password}`
                        ).toString("base64");
                        (headers as Record<string, string>)["Authorization"] =
                            `Basic ${credentials}`;
                    }
                    break;
                case "custom":
                    if (auth.custom_headers) {
                        Object.assign(headers, auth.custom_headers);
                    }
                    break;
            }
        }

        return headers;
    }

    /**
     * Create fetch request with timeout
     */
    private async fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeout: number
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Test connection to an MCP server
     * @returns Server info if connection successful
     */
    async testConnection(serverUrl: string, auth?: MCPConnectionData): Promise<MCPServerInfo> {
        // Validate URL format
        if (!validateServerUrl(serverUrl)) {
            throw new Error("Invalid MCP server URL format");
        }

        const headers = this.createHeaders(auth);
        const timeout = auth?.timeout || 10000;

        try {
            // MCP servers should respond to a GET /info or POST /rpc with method "server.info"
            // Try the info endpoint first
            try {
                const response = await this.fetchWithTimeout(
                    `${serverUrl}/info`,
                    { headers },
                    timeout
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = (await response.json()) as MCPServerInfo;
                return data;
            } catch (_infoError) {
                // If /info fails, try JSON-RPC method
                const response = await this.fetchWithTimeout(
                    `${serverUrl}/rpc`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "server.info",
                            params: {},
                            id: 1
                        })
                    },
                    timeout
                );

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        throw new Error("Authentication failed. Please check your credentials.");
                    }
                    throw new Error(
                        `MCP server returned error: ${response.status} ${response.statusText}`
                    );
                }

                const data = (await response.json()) as { result: MCPServerInfo };

                if (data.result) {
                    return data.result;
                }

                throw new Error("Server did not return info");
            }
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === "AbortError") {
                    throw new Error(`Connection to MCP server at ${serverUrl} timed out`);
                }
                if (
                    error.message.includes("fetch failed") ||
                    error.message.includes("ECONNREFUSED")
                ) {
                    throw new Error(`Cannot connect to MCP server at ${serverUrl}`);
                }
            }
            throw new Error(
                `Failed to test MCP connection: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Discover available tools from an MCP server
     */
    async discoverTools(serverUrl: string, auth?: MCPConnectionData): Promise<MCPToolsResponse> {
        const headers = this.createHeaders(auth);
        const timeout = auth?.timeout || 10000;

        try {
            // Try REST endpoint first
            try {
                const response = await this.fetchWithTimeout(
                    `${serverUrl}/tools`,
                    { headers },
                    timeout
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = (await response.json()) as MCPToolsResponse;
                return data;
            } catch (_restError) {
                // If REST fails, try JSON-RPC
                const response = await this.fetchWithTimeout(
                    `${serverUrl}/rpc`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "tools.list",
                            params: {},
                            id: 2
                        })
                    },
                    timeout
                );

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        throw new Error("Authentication failed. Cannot discover tools.");
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = (await response.json()) as { result: MCPToolsResponse };

                if (data.result) {
                    return data.result;
                }

                throw new Error("Server did not return tools list");
            }
        } catch (error) {
            if (error instanceof Error) {
                if (
                    error.message.includes("fetch failed") ||
                    error.message.includes("ECONNREFUSED")
                ) {
                    throw new Error(`Cannot connect to MCP server at ${serverUrl}`);
                }
            }
            throw new Error(
                `Failed to discover tools: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Get schema for a specific tool
     */
    async getToolSchema(
        serverUrl: string,
        toolName: string,
        auth?: MCPConnectionData
    ): Promise<MCPTool> {
        const headers = this.createHeaders(auth);
        const timeout = auth?.timeout || 10000;

        try {
            // Try REST endpoint
            try {
                const response = await this.fetchWithTimeout(
                    `${serverUrl}/tools/${toolName}`,
                    { headers },
                    timeout
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = (await response.json()) as MCPTool;
                return data;
            } catch (_restError) {
                // Try JSON-RPC
                const response = await this.fetchWithTimeout(
                    `${serverUrl}/rpc`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "tools.get",
                            params: { tool: toolName },
                            id: 3
                        })
                    },
                    timeout
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = (await response.json()) as { result: MCPTool };

                if (data.result) {
                    return data.result;
                }

                throw new Error("Tool not found");
            }
        } catch (error) {
            throw new Error(
                `Failed to get tool schema: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Execute an MCP tool
     */
    async executeTool(
        connection: ConnectionWithData,
        toolName: string,
        parameters: Record<string, unknown>
    ): Promise<MCPToolExecutionResponse> {
        if (!connection.mcp_server_url) {
            throw new Error("Connection does not have an MCP server URL");
        }

        const auth = connection.data as MCPConnectionData;
        const headers = this.createHeaders(auth);
        const timeout = auth?.timeout || 10000;

        try {
            // Try REST endpoint
            try {
                const response = await this.fetchWithTimeout(
                    `${connection.mcp_server_url}/tools/${toolName}/execute`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ parameters })
                    },
                    timeout
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = (await response.json()) as MCPToolExecutionResponse;
                return data;
            } catch (_restError) {
                // Try JSON-RPC
                const response = await this.fetchWithTimeout(
                    `${connection.mcp_server_url}/rpc`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "tools.execute",
                            params: {
                                tool: toolName,
                                parameters
                            },
                            id: 4
                        })
                    },
                    timeout
                );

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        throw new Error("Authentication failed during tool execution.");
                    }
                    const errorData = (await response.json().catch(() => ({}))) as {
                        error?: string;
                    };
                    if (errorData.error) {
                        throw new Error(errorData.error);
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = (await response.json()) as {
                    result: unknown;
                    error?: { message?: string };
                };

                if (data.error) {
                    return {
                        success: false,
                        error: data.error.message || "Tool execution failed"
                    };
                }

                return {
                    success: true,
                    result: data.result
                };
            }
        } catch (error) {
            throw new Error(
                `Failed to execute tool: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Refresh tool list for an existing connection
     */
    async refreshTools(connection: ConnectionWithData): Promise<MCPTool[]> {
        if (!connection.mcp_server_url) {
            throw new Error("Connection does not have an MCP server URL");
        }

        const auth = connection.data as MCPConnectionData;
        const result = await this.discoverTools(connection.mcp_server_url, auth);
        return result.tools;
    }
}

// Singleton instance
let mcpServiceInstance: MCPService | null = null;

/**
 * Get the MCP service singleton instance
 */
export function getMCPService(): MCPService {
    if (!mcpServiceInstance) {
        mcpServiceInstance = new MCPService();
    }
    return mcpServiceInstance;
}
