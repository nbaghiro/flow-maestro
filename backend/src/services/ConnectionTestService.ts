import axios from "axios";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
    ConnectionWithData,
    ApiKeyData,
    OAuth2TokenData,
    MCPConnectionData,
    isMCPConnectionData,
    isOAuth2TokenData,
    isApiKeyData,
} from "../storage/models/Connection";
import { getMCPService } from "./mcp/MCPService";

export interface ConnectionTestResult {
    success: boolean;
    message: string;
    details?: any;
}

/**
 * Connection Test Service
 * Tests connections to verify they're valid and working
 */
export class ConnectionTestService {
    private mcpService = getMCPService();

    /**
     * Test a connection to verify it's valid
     */
    async testConnection(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        try {
            // Handle MCP connections
            if (connection.connection_method === "mcp") {
                return await this.testMCP(connection);
            }

            // Handle provider-specific tests
            switch (connection.provider) {
                case "openai":
                    return await this.testOpenAI(connection);

                case "anthropic":
                    return await this.testAnthropic(connection);

                case "google":
                    return await this.testGoogle(connection);

                case "slack":
                    return await this.testSlack(connection);

                case "notion":
                    return await this.testNotion(connection);

                case "github":
                    return await this.testGitHub(connection);

                default:
                    return await this.testGenericAPI(connection);
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Unknown error",
                details: error,
            };
        }
    }

    /**
     * Test MCP connection
     */
    private async testMCP(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        if (!connection.mcp_server_url) {
            return {
                success: false,
                message: "MCP server URL is missing",
            };
        }

        const auth = connection.data as MCPConnectionData;

        try {
            const serverInfo = await this.mcpService.testConnection(
                connection.mcp_server_url,
                auth
            );

            return {
                success: true,
                message: `MCP server connected successfully`,
                details: {
                    server_name: serverInfo.name,
                    server_version: serverInfo.version,
                    protocol_version: serverInfo.protocol_version,
                    capabilities: serverInfo.capabilities,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "MCP connection failed",
                details: error,
            };
        }
    }

    /**
     * Test OpenAI API key
     */
    private async testOpenAI(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        const data = connection.data as ApiKeyData;
        const openai = new OpenAI({ apiKey: data.api_key });

        try {
            // List models as a simple test
            const models = await openai.models.list();

            return {
                success: true,
                message: "OpenAI API key is valid",
                details: {
                    model_count: models.data.length,
                },
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || "OpenAI API key is invalid",
                details: error,
            };
        }
    }

    /**
     * Test Anthropic API key
     */
    private async testAnthropic(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        const data = connection.data as ApiKeyData;
        const anthropic = new Anthropic({ apiKey: data.api_key });

        try {
            // Send a minimal test message
            const response = await anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 10,
                messages: [{ role: "user", content: "Hi" }],
            });

            return {
                success: true,
                message: "Anthropic API key is valid",
                details: {
                    model: response.model,
                },
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || "Anthropic API key is invalid",
                details: error,
            };
        }
    }

    /**
     * Test Google API key or OAuth token
     */
    private async testGoogle(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        if (connection.connection_method === "oauth2") {
            const data = connection.data as OAuth2TokenData;

            try {
                // Test with userinfo endpoint
                const response = await axios.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    {
                        headers: {
                            Authorization: `Bearer ${data.access_token}`,
                        },
                    }
                );

                return {
                    success: true,
                    message: "Google OAuth token is valid",
                    details: {
                        email: response.data.email,
                        verified: response.data.verified_email,
                    },
                };
            } catch (error: any) {
                return {
                    success: false,
                    message: "Google OAuth token is invalid or expired",
                    details: error.response?.data,
                };
            }
        } else {
            const data = connection.data as ApiKeyData;

            try {
                // Test with a simple API call (e.g., Gemini API)
                const response = await axios.get(
                    `https://generativelanguage.googleapis.com/v1beta/models?key=${data.api_key}`
                );

                return {
                    success: true,
                    message: "Google API key is valid",
                    details: {
                        models_count: response.data.models?.length || 0,
                    },
                };
            } catch (error: any) {
                return {
                    success: false,
                    message: "Google API key is invalid",
                    details: error.response?.data,
                };
            }
        }
    }

    /**
     * Test Slack OAuth token
     */
    private async testSlack(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        const data = connection.data as OAuth2TokenData;

        try {
            const response = await axios.post(
                "https://slack.com/api/auth.test",
                {},
                {
                    headers: {
                        Authorization: `Bearer ${data.access_token}`,
                    },
                }
            );

            if (response.data.ok) {
                return {
                    success: true,
                    message: "Slack token is valid",
                    details: {
                        team: response.data.team,
                        user: response.data.user,
                    },
                };
            } else {
                return {
                    success: false,
                    message: response.data.error || "Slack token is invalid",
                    details: response.data,
                };
            }
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to test Slack token",
                details: error.response?.data,
            };
        }
    }

    /**
     * Test Notion OAuth token
     */
    private async testNotion(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        const data = connection.data as OAuth2TokenData;

        try {
            const response = await axios.get("https://api.notion.com/v1/users/me", {
                headers: {
                    Authorization: `Bearer ${data.access_token}`,
                    "Notion-Version": "2022-06-28",
                },
            });

            return {
                success: true,
                message: "Notion token is valid",
                details: {
                    user_id: response.data.id,
                    type: response.data.type,
                },
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Notion token is invalid or expired",
                details: error.response?.data,
            };
        }
    }

    /**
     * Test GitHub OAuth token or personal access token
     */
    private async testGitHub(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        if (connection.connection_method === "oauth2") {
            const data = connection.data as OAuth2TokenData;

            try {
                const response = await axios.get("https://api.github.com/user", {
                    headers: {
                        Authorization: `Bearer ${data.access_token}`,
                        Accept: "application/vnd.github.v3+json",
                    },
                });

                return {
                    success: true,
                    message: "GitHub token is valid",
                    details: {
                        login: response.data.login,
                        id: response.data.id,
                    },
                };
            } catch (error: any) {
                return {
                    success: false,
                    message: "GitHub token is invalid or expired",
                    details: error.response?.data,
                };
            }
        } else {
            const data = connection.data as ApiKeyData;

            try {
                const response = await axios.get("https://api.github.com/user", {
                    headers: {
                        Authorization: `token ${data.api_key}`,
                        Accept: "application/vnd.github.v3+json",
                    },
                });

                return {
                    success: true,
                    message: "GitHub token is valid",
                    details: {
                        login: response.data.login,
                        id: response.data.id,
                    },
                };
            } catch (error: any) {
                return {
                    success: false,
                    message: "GitHub token is invalid",
                    details: error.response?.data,
                };
            }
        }
    }

    /**
     * Generic API test (just check if we can make a HEAD request)
     */
    private async testGenericAPI(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        // For generic connections, we don't have a specific endpoint to test
        // Just return success if the connection exists
        return {
            success: true,
            message: `${connection.provider} connection stored successfully`,
            details: {
                note: "Cannot automatically test this connection type. Please test manually in your workflow.",
            },
        };
    }
}

// Singleton instance
let connectionTestServiceInstance: ConnectionTestService | null = null;

/**
 * Get the connection test service singleton instance
 */
export function getConnectionTestService(): ConnectionTestService {
    if (!connectionTestServiceInstance) {
        connectionTestServiceInstance = new ConnectionTestService();
    }
    return connectionTestServiceInstance;
}
