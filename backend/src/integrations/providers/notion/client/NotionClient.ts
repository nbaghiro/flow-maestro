import { AxiosError } from "axios";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface NotionClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Notion API response format
 */
interface NotionResponse {
    object: string;
    [key: string]: unknown;
}

/**
 * Notion API Client with connection pooling and error handling
 */
export class NotionClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: NotionClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.notion.com/v1",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;

        // Add request interceptor for auth header and Notion-Version
        this.client.interceptors.request.use((config) => {
            config.headers.Authorization = `Bearer ${this.accessToken}`;
            config.headers["Notion-Version"] = "2022-06-28";
            config.headers["Content-Type"] = "application/json";
            return config;
        });
    }

    /**
     * Override request to handle Notion-specific response format
     */
    async request<T = unknown>(config: never): Promise<T> {
        const response = await super.request<NotionResponse>(config);
        return response as T;
    }

    /**
     * Handle Notion-specific errors
     */
    protected async handleError(error: AxiosError): Promise<never> {
        if (error.response) {
            const data = error.response.data as {
                object?: string;
                code?: string;
                message?: string;
            };

            // Map common Notion errors
            if (data.code === "unauthorized" || error.response.status === 401) {
                throw new Error("Notion authentication failed. Please reconnect.");
            }

            if (data.code === "restricted_resource") {
                throw new Error("You don't have access to this Notion resource.");
            }

            if (data.code === "object_not_found" || error.response.status === 404) {
                throw new Error("Notion page or database not found.");
            }

            if (data.code === "validation_error") {
                throw new Error(`Notion validation error: ${data.message || "Invalid input"}`);
            }

            if (data.message) {
                throw new Error(`Notion API error: ${data.message}`);
            }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers["retry-after"];
            throw new Error(`Rate limited. Retry after ${retryAfter || "unknown"} seconds.`);
        }

        throw error;
    }

    /**
     * Helper method for search
     */
    async search(params: {
        query?: string;
        filter?: {
            value: "page" | "database";
            property: "object";
        };
        sort?: {
            direction: "ascending" | "descending";
            timestamp: "last_edited_time";
        };
        start_cursor?: string;
        page_size?: number;
    }): Promise<unknown> {
        return this.post("/search", params);
    }

    /**
     * Helper method for creating a page
     */
    async createPage(params: {
        parent: { page_id?: string; database_id?: string };
        properties: Record<string, unknown>;
        children?: unknown[];
    }): Promise<unknown> {
        return this.post("/pages", params);
    }

    /**
     * Helper method for updating a page
     */
    async updatePage(
        pageId: string,
        params: {
            properties?: Record<string, unknown>;
            archived?: boolean;
        }
    ): Promise<unknown> {
        return this.patch(`/pages/${pageId}`, params);
    }

    /**
     * Helper method for getting a page
     */
    async getPage(pageId: string): Promise<unknown> {
        return this.get(`/pages/${pageId}`);
    }

    /**
     * Helper method for querying a database
     */
    async queryDatabase(
        databaseId: string,
        params?: {
            filter?: unknown;
            sorts?: unknown[];
            start_cursor?: string;
            page_size?: number;
        }
    ): Promise<unknown> {
        return this.post(`/databases/${databaseId}/query`, params);
    }

    /**
     * Helper method for getting a database
     */
    async getDatabase(databaseId: string): Promise<unknown> {
        return this.get(`/databases/${databaseId}`);
    }
}
