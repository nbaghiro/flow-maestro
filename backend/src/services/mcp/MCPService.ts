import axios, { type AxiosInstance, type AxiosRequestConfig, isAxiosError } from "axios";
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
     * Create an axios instance configured for MCP server communication
     */
    private createClient(serverUrl: string, auth?: MCPConnectionData): AxiosInstance {
        const config: AxiosRequestConfig = {
            baseURL: serverUrl,
            timeout: auth?.timeout || 10000,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            }
        };

        // Add authentication headers based on auth type
        if (auth) {
            switch (auth.auth_type) {
                case "api_key":
                    if (auth.api_key) {
                        config.headers!["X-API-Key"] = auth.api_key;
                    }
                    break;
                case "bearer":
                    if (auth.bearer_token) {
                        config.headers!["Authorization"] = `Bearer ${auth.bearer_token}`;
                    }
                    break;
                case "basic":
                    if (auth.username && auth.password) {
                        const credentials = Buffer.from(
                            `${auth.username}:${auth.password}`
                        ).toString("base64");
                        config.headers!["Authorization"] = `Basic ${credentials}`;
                    }
                    break;
                case "custom":
                    if (auth.custom_headers) {
                        Object.assign(config.headers!, auth.custom_headers);
                    }
                    break;
            }
        }

        return axios.create(config);
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

        const client = this.createClient(serverUrl, auth);

        try {
            // MCP servers should respond to a GET /info or POST /rpc with method "server.info"
            // Try the info endpoint first
            try {
                const response = await client.get<MCPServerInfo>("/info");
                return response.data;
            } catch (_infoError) {
                // If /info fails, try JSON-RPC method
                const response = await client.post<{ result: MCPServerInfo }>("/rpc", {
                    jsonrpc: "2.0",
                    method: "server.info",
                    params: {},
                    id: 1
                });

                if (response.data.result) {
                    return response.data.result;
                }

                throw new Error("Server did not return info");
            }
        } catch (error) {
            if (isAxiosError(error)) {
                if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                    throw new Error(`Cannot connect to MCP server at ${serverUrl}`);
                } else if (error.response?.status === 401 || error.response?.status === 403) {
                    throw new Error("Authentication failed. Please check your credentials.");
                } else if (error.response) {
                    throw new Error(
                        `MCP server returned error: ${error.response.status} ${error.response.statusText}`
                    );
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
        const client = this.createClient(serverUrl, auth);

        try {
            // Try REST endpoint first
            try {
                const response = await client.get<MCPToolsResponse>("/tools");
                return response.data;
            } catch (_restError) {
                // If REST fails, try JSON-RPC
                const response = await client.post<{ result: MCPToolsResponse }>("/rpc", {
                    jsonrpc: "2.0",
                    method: "tools.list",
                    params: {},
                    id: 2
                });

                if (response.data.result) {
                    return response.data.result;
                }

                throw new Error("Server did not return tools list");
            }
        } catch (error) {
            if (isAxiosError(error)) {
                if (error.code === "ECONNREFUSED") {
                    throw new Error(`Cannot connect to MCP server at ${serverUrl}`);
                } else if (error.response?.status === 401 || error.response?.status === 403) {
                    throw new Error("Authentication failed. Cannot discover tools.");
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
        const client = this.createClient(serverUrl, auth);

        try {
            // Try REST endpoint
            try {
                const response = await client.get<MCPTool>(`/tools/${toolName}`);
                return response.data;
            } catch (_restError) {
                // Try JSON-RPC
                const response = await client.post<{ result: MCPTool }>("/rpc", {
                    jsonrpc: "2.0",
                    method: "tools.get",
                    params: { tool: toolName },
                    id: 3
                });

                if (response.data.result) {
                    return response.data.result;
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
        const client = this.createClient(connection.mcp_server_url, auth);

        try {
            // Try REST endpoint
            try {
                const response = await client.post<MCPToolExecutionResponse>(
                    `/tools/${toolName}/execute`,
                    { parameters }
                );
                return response.data;
            } catch (_restError) {
                // Try JSON-RPC
                const response = await client.post<{
                    result: unknown;
                    error?: { message?: string };
                }>("/rpc", {
                    jsonrpc: "2.0",
                    method: "tools.execute",
                    params: {
                        tool: toolName,
                        parameters
                    },
                    id: 4
                });

                if (response.data.error) {
                    return {
                        success: false,
                        error: response.data.error.message || "Tool execution failed"
                    };
                }

                return {
                    success: true,
                    result: response.data.result
                };
            }
        } catch (error) {
            if (isAxiosError(error)) {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw new Error("Authentication failed during tool execution.");
                } else if (error.response?.data?.error) {
                    throw new Error(error.response.data.error);
                }
            }
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
