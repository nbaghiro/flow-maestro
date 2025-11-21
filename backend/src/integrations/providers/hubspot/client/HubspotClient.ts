import { BaseAPIClient } from "../../../core/BaseAPIClient";

export interface HubspotClientConfig {
    accessToken: string;
    connectionId: string;
}

/**
 * HubSpot API Client
 *
 * Handles HTTP communication with HubSpot API v3
 * Base URL: https://api.hubapi.com
 *
 * Rate Limits:
 * - 100 requests per 10 seconds (600/minute) for standard accounts
 * - Burst allowance for brief spikes
 */
export class HubspotClient extends BaseAPIClient {
    constructor(config: HubspotClientConfig) {
        super({
            baseURL: "https://api.hubapi.com",
            timeout: 30000
        });

        // Add authorization header via interceptor
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }
}
