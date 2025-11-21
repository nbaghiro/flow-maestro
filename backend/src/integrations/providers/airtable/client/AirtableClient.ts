import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface AirtableClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Airtable HTTP Client
 *
 * Handles all HTTP communication with the Airtable API v0.
 * Features:
 * - Automatic authentication header injection
 * - Connection pooling for performance (10-50x faster)
 * - Automatic retry on rate limits (429) and server errors
 * - Request timeout handling
 */
export class AirtableClient extends BaseAPIClient {
    private accessToken: string;
    private connectionId?: string;

    constructor(config: AirtableClientConfig) {
        const baseAPIConfig: BaseAPIClientConfig = {
            baseURL: "https://api.airtable.com/v0",
            timeout: 30000, // 30 second timeout
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 30000 // Airtable rate limit retry delay is 30 seconds
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true,
                keepAliveMsecs: 60000
            }
        };

        super(baseAPIConfig);

        this.accessToken = config.accessToken;
        this.connectionId = config.connectionId;

        // Add request interceptor for authentication
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }

            // Add OAuth bearer token
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;

            // Add connection ID for tracking (optional)
            if (this.connectionId) {
                requestConfig.headers["X-Connection-ID"] = this.connectionId;
            }

            return requestConfig;
        });
    }

    /**
     * Handle Airtable-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        // Let the base class handle standard HTTP errors
        throw error;
    }

    /**
     * Update access token (for token refresh)
     */
    updateAccessToken(newToken: string): void {
        this.accessToken = newToken;
    }
}
