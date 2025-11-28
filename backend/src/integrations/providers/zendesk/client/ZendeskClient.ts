import { BaseAPIClient } from "../../../core/BaseAPIClient";

export interface ZendeskClientConfig {
    subdomain: string;
    accessToken: string;
    connectionId?: string;
}

/**
 * Zendesk API Client
 *
 * Handles HTTP communication with Zendesk API v2
 * Base URL: https://{subdomain}.zendesk.com/api/v2
 *
 * Rate Limits:
 * - 700 requests/minute for Enterprise plans
 * - 200-400 requests/minute for lower tiers
 * - Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining
 */
export class ZendeskClient extends BaseAPIClient {
    private subdomain: string;

    constructor(config: ZendeskClientConfig) {
        super({
            baseURL: `https://${config.subdomain}.zendesk.com/api/v2`,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 30000
            }
        });

        this.subdomain = config.subdomain;

        // Add authorization header via interceptor
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Get the subdomain for this client
     */
    getSubdomain(): string {
        return this.subdomain;
    }

    /**
     * Get Help Center base URL (different from main API)
     */
    getHelpCenterUrl(path: string): string {
        // Help Center API uses the same base URL structure
        return `/help_center${path}`;
    }
}
