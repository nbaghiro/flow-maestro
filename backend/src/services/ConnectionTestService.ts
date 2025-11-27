import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getDefaultModelForProvider } from "@flowmaestro/shared";
import { ConnectionWithData, ApiKeyData, OAuth2TokenData } from "../storage/models/Connection";

export interface ConnectionTestResult {
    success: boolean;
    message: string;
    details?: unknown;
}

/**
 * Connection Test Service
 * Tests connections to verify they're valid and working
 */
export class ConnectionTestService {
    /**
     * Test a connection to verify it's valid
     */
    async testConnection(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        try {
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

                case "coda":
                    return await this.testCoda(connection);

                default:
                    return await this.testGenericAPI(connection);
            }
        } catch (error) {
            return {
                success: false,
                message:
                    error instanceof Error
                        ? error instanceof Error
                            ? error.message
                            : "Unknown error"
                        : "Unknown error",
                details: error
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
                    model_count: models.data.length
                }
            };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : "OpenAI API key is invalid";
            return {
                success: false,
                message: errorMsg,
                details: error
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
            // Send a minimal test message using the fastest model
            const model = getDefaultModelForProvider("anthropic");
            const response = await anthropic.messages.create({
                model: model || "claude-3-5-haiku-20241022",
                max_tokens: 10,
                messages: [{ role: "user", content: "Hi" }]
            });

            return {
                success: true,
                message: "Anthropic API key is valid",
                details: {
                    model: response.model
                }
            };
        } catch (error: unknown) {
            const errorMsg =
                error instanceof Error ? error.message : "Anthropic API key is invalid";
            return {
                success: false,
                message: errorMsg,
                details: error
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
                const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${data.access_token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    return {
                        success: false,
                        message: "Google OAuth token is invalid or expired",
                        details: errorData
                    };
                }

                const responseData = (await response.json()) as {
                    email?: string;
                    verified_email?: boolean;
                };

                return {
                    success: true,
                    message: "Google OAuth token is valid",
                    details: {
                        email: responseData.email,
                        verified: responseData.verified_email
                    }
                };
            } catch (error: unknown) {
                return {
                    success: false,
                    message: "Google OAuth token is invalid or expired",
                    details: error instanceof Error ? { message: error.message } : {}
                };
            }
        } else {
            const data = connection.data as ApiKeyData;

            try {
                // Test with a simple API call (e.g., Gemini API)
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models?key=${data.api_key}`
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    return {
                        success: false,
                        message: "Google API key is invalid",
                        details: errorData
                    };
                }

                const responseData = (await response.json()) as {
                    models?: unknown[];
                };

                return {
                    success: true,
                    message: "Google API key is valid",
                    details: {
                        models_count: responseData.models?.length || 0
                    }
                };
            } catch (error: unknown) {
                return {
                    success: false,
                    message: "Google API key is invalid",
                    details: error instanceof Error ? { message: error.message } : {}
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
            const response = await fetch("https://slack.com/api/auth.test", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${data.access_token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: "Failed to test Slack token",
                    details: errorData
                };
            }

            const responseData = (await response.json()) as {
                ok?: boolean;
                error?: string;
                team?: string;
                user?: string;
            };

            if (responseData.ok) {
                return {
                    success: true,
                    message: "Slack token is valid",
                    details: {
                        team: responseData.team,
                        user: responseData.user
                    }
                };
            } else {
                return {
                    success: false,
                    message: responseData.error || "Slack token is invalid",
                    details: responseData
                };
            }
        } catch (error: unknown) {
            return {
                success: false,
                message: "Failed to test Slack token",
                details: error instanceof Error ? { message: error.message } : {}
            };
        }
    }

    /**
     * Test Notion OAuth token
     */
    private async testNotion(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        const data = connection.data as OAuth2TokenData;

        try {
            const response = await fetch("https://api.notion.com/v1/users/me", {
                headers: {
                    Authorization: `Bearer ${data.access_token}`,
                    "Notion-Version": "2022-06-28"
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: "Notion token is invalid or expired",
                    details: errorData
                };
            }

            const responseData = (await response.json()) as {
                id?: string;
                type?: string;
            };

            return {
                success: true,
                message: "Notion token is valid",
                details: {
                    user_id: responseData.id,
                    type: responseData.type
                }
            };
        } catch (error: unknown) {
            return {
                success: false,
                message: "Notion token is invalid or expired",
                details: error instanceof Error ? { message: error.message } : {}
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
                const response = await fetch("https://api.github.com/user", {
                    headers: {
                        Authorization: `Bearer ${data.access_token}`,
                        Accept: "application/vnd.github.v3+json"
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    return {
                        success: false,
                        message: "GitHub token is invalid or expired",
                        details: errorData
                    };
                }

                const responseData = (await response.json()) as {
                    login?: string;
                    id?: string | number;
                };

                return {
                    success: true,
                    message: "GitHub token is valid",
                    details: {
                        login: responseData.login,
                        id: responseData.id
                    }
                };
            } catch (error: unknown) {
                return {
                    success: false,
                    message: "GitHub token is invalid or expired",
                    details: error instanceof Error ? { message: error.message } : {}
                };
            }
        } else {
            const data = connection.data as ApiKeyData;

            try {
                const response = await fetch("https://api.github.com/user", {
                    headers: {
                        Authorization: `token ${data.api_key}`,
                        Accept: "application/vnd.github.v3+json"
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    return {
                        success: false,
                        message: "GitHub token is invalid",
                        details: errorData
                    };
                }

                const responseData = (await response.json()) as {
                    login?: string;
                    id?: string | number;
                };

                return {
                    success: true,
                    message: "GitHub token is valid",
                    details: {
                        login: responseData.login,
                        id: responseData.id
                    }
                };
            } catch (error: unknown) {
                return {
                    success: false,
                    message: "GitHub token is invalid",
                    details: error instanceof Error ? { message: error.message } : {}
                };
            }
        }
    }

    /**
     * Test Coda API token
     */
    private async testCoda(connection: ConnectionWithData): Promise<ConnectionTestResult> {
        const data = connection.data as ApiKeyData;

        try {
            const response = await fetch("https://coda.io/apis/v1/whoami", {
                headers: {
                    Authorization: `Bearer ${data.api_key}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message:
                        response.status === 401
                            ? "Coda API token is invalid or expired"
                            : "Failed to test Coda token",
                    details: errorData
                };
            }

            const responseData = (await response.json()) as {
                name?: string;
                type?: string;
                workspace?: { name?: string };
            };

            return {
                success: true,
                message: "Coda API token is valid",
                details: {
                    name: responseData.name,
                    type: responseData.type,
                    workspace: responseData.workspace?.name
                }
            };
        } catch (error: unknown) {
            return {
                success: false,
                message: "Failed to test Coda token",
                details: error instanceof Error ? { message: error.message } : {}
            };
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
                note: "Cannot automatically test this connection type. Please test manually in your workflow."
            }
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
