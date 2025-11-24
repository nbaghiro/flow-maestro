import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface FigmaClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Figma REST API Client with connection pooling and error handling
 */
export class FigmaClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: FigmaClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.figma.com/v1",
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

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            config.headers["X-Figma-Token"] = this.accessToken;
            return config;
        });
    }

    /**
     * Handle Figma-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data, headers } = error.response;

            if (status === 401) {
                throw new Error("Figma authentication failed. Please reconnect.");
            }

            if (status === 403) {
                throw new Error("You don't have permission to access this Figma resource.");
            }

            if (status === 404) {
                throw new Error("Figma resource not found.");
            }

            if (status === 429) {
                const retryAfter = headers?.["retry-after"] || "unknown";
                const rateLimitType = headers?.["x-figma-rate-limit-type"];
                throw new Error(
                    `Figma rate limit exceeded${rateLimitType ? ` (${rateLimitType})` : ""}. Retry after ${retryAfter} seconds.`
                );
            }

            // Handle Figma error responses
            if (typeof data === "object" && data !== null) {
                const errorData = data as { err?: string; error?: string };
                if (errorData.err || errorData.error) {
                    throw new Error(`Figma API error: ${errorData.err || errorData.error}`);
                }
            }
        }

        throw error;
    }

    /**
     * Get complete file data including document tree
     */
    async getFile(
        fileKey: string,
        options?: {
            version?: string;
            ids?: string[];
            depth?: number;
            geometry?: "paths";
            plugin_data?: string;
            branch_data?: boolean;
        }
    ): Promise<unknown> {
        const params: Record<string, unknown> = {};
        if (options?.version) params.version = options.version;
        if (options?.ids) params.ids = options.ids.join(",");
        if (options?.depth) params.depth = options.depth;
        if (options?.geometry) params.geometry = options.geometry;
        if (options?.plugin_data) params.plugin_data = options.plugin_data;
        if (options?.branch_data) params.branch_data = options.branch_data;

        return this.get(`/files/${fileKey}`, params);
    }

    /**
     * Get specific nodes from a file
     */
    async getFileNodes(
        fileKey: string,
        nodeIds: string[],
        options?: {
            version?: string;
            depth?: number;
            geometry?: "paths";
            plugin_data?: string;
        }
    ): Promise<unknown> {
        const params: Record<string, unknown> = {
            ids: nodeIds.join(",")
        };
        if (options?.version) params.version = options.version;
        if (options?.depth) params.depth = options.depth;
        if (options?.geometry) params.geometry = options.geometry;
        if (options?.plugin_data) params.plugin_data = options.plugin_data;

        return this.get(`/files/${fileKey}/nodes`, params);
    }

    /**
     * Get file version history
     */
    async getFileVersions(fileKey: string): Promise<unknown> {
        return this.get(`/files/${fileKey}/versions`);
    }

    /**
     * Export nodes as images
     */
    async exportImages(
        fileKey: string,
        nodeIds: string[],
        options?: {
            format?: "png" | "jpg" | "svg" | "pdf";
            scale?: number;
            svg_include_id?: boolean;
            svg_simplify_stroke?: boolean;
            use_absolute_bounds?: boolean;
        }
    ): Promise<unknown> {
        const params: Record<string, unknown> = {
            ids: nodeIds.join(","),
            format: options?.format || "png"
        };
        if (options?.scale) params.scale = options.scale;
        if (options?.svg_include_id !== undefined) params.svg_include_id = options.svg_include_id;
        if (options?.svg_simplify_stroke !== undefined)
            params.svg_simplify_stroke = options.svg_simplify_stroke;
        if (options?.use_absolute_bounds !== undefined)
            params.use_absolute_bounds = options.use_absolute_bounds;

        return this.get(`/images/${fileKey}`, params);
    }

    /**
     * Get image fills from a file
     */
    async getImageFills(fileKey: string): Promise<unknown> {
        return this.get(`/files/${fileKey}/images`);
    }

    /**
     * Get comments on a file
     */
    async getComments(fileKey: string): Promise<unknown> {
        return this.get(`/files/${fileKey}/comments`);
    }

    /**
     * Create a comment on a file
     */
    async createComment(
        fileKey: string,
        params: {
            message: string;
            client_meta?: { x: number; y: number; node_id?: string };
            parent_id?: string;
        }
    ): Promise<unknown> {
        return this.post(`/files/${fileKey}/comments`, params);
    }

    /**
     * Delete a comment
     */
    async deleteComment(commentId: string): Promise<unknown> {
        return this.delete(`/comments/${commentId}`);
    }

    /**
     * Get team projects (requires projects:read scope and approval)
     */
    async getTeamProjects(teamId: string): Promise<unknown> {
        return this.get(`/teams/${teamId}/projects`);
    }

    /**
     * Get files in a project (requires projects:read scope and approval)
     */
    async getProjectFiles(projectId: string, branchData: boolean = false): Promise<unknown> {
        return this.get(`/projects/${projectId}/files`, { branch_data: branchData });
    }

    /**
     * Create a webhook (V2 API)
     */
    async createWebhook(params: {
        event_type:
            | "FILE_UPDATE"
            | "FILE_VERSION_UPDATE"
            | "FILE_COMMENT"
            | "FILE_DELETE"
            | "LIBRARY_PUBLISH";
        team_id?: string;
        file_key?: string;
        project_id?: string;
        passcode: string;
        endpoint: string;
        description?: string;
    }): Promise<unknown> {
        // Note: Webhooks use /v2/ endpoint, not /v1/
        return this.request({
            method: "POST",
            url: "https://api.figma.com/v2/webhooks",
            data: params
        });
    }

    /**
     * List webhooks
     */
    async listWebhooks(params?: { team_id?: string }): Promise<unknown> {
        return this.request({
            method: "GET",
            url: "https://api.figma.com/v2/webhooks",
            params
        });
    }

    /**
     * Delete a webhook
     */
    async deleteWebhook(webhookId: string): Promise<unknown> {
        return this.request({
            method: "DELETE",
            url: `https://api.figma.com/v2/webhooks/${webhookId}`
        });
    }
}
