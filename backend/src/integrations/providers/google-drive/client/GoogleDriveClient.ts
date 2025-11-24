import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface GoogleDriveClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface GoogleDriveErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        errors?: Array<{
            domain?: string;
            reason?: string;
            message?: string;
        }>;
    };
}

/**
 * Google Drive API v3 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/drive/api/reference/rest/v3
 * Base URL: https://www.googleapis.com
 */
export class GoogleDriveClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: GoogleDriveClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://www.googleapis.com",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
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
            return config;
        });
    }

    /**
     * Handle Google Drive API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Google Drive errors
            if (status === 401) {
                throw new Error("Google Drive authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GoogleDriveErrorResponse;
                const reason = errorData?.error?.errors?.[0]?.reason;

                if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded") {
                    throw new Error("Google Drive rate limit exceeded. Please try again later.");
                }

                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("File or folder not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Google Drive rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GoogleDriveErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            // Handle structured error response
            if ((data as GoogleDriveErrorResponse)?.error) {
                const errorData = data as GoogleDriveErrorResponse;
                throw new Error(`Google Drive API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== File Operations ====================

    /**
     * Get file metadata
     */
    async getFile(fileId: string, fields?: string): Promise<unknown> {
        const params: Record<string, string> = {};
        if (fields) {
            params.fields = fields;
        }

        return this.get(`/drive/v3/files/${fileId}`, { params });
    }

    /**
     * List files with optional query
     */
    async listFiles(params: {
        q?: string;
        pageSize?: number;
        pageToken?: string;
        orderBy?: string;
        fields?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};

        if (params.q) queryParams.q = params.q;
        if (params.pageSize) queryParams.pageSize = params.pageSize.toString();
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.orderBy) queryParams.orderBy = params.orderBy;
        if (params.fields) queryParams.fields = params.fields;

        return this.get("/drive/v3/files", { params: queryParams });
    }

    /**
     * Create file (metadata only or folder)
     */
    async createFile(metadata: {
        name: string;
        mimeType?: string;
        parents?: string[];
        description?: string;
    }): Promise<unknown> {
        return this.post("/drive/v3/files", metadata);
    }

    /**
     * Update file metadata
     */
    async updateFile(
        fileId: string,
        metadata: {
            name?: string;
            description?: string;
            trashed?: boolean;
        }
    ): Promise<unknown> {
        return this.patch(`/drive/v3/files/${fileId}`, metadata);
    }

    /**
     * Delete file permanently
     */
    async deleteFile(fileId: string): Promise<void> {
        await this.delete(`/drive/v3/files/${fileId}`);
    }

    /**
     * Copy file
     */
    async copyFile(
        fileId: string,
        metadata: {
            name?: string;
            parents?: string[];
        }
    ): Promise<unknown> {
        return this.post(`/drive/v3/files/${fileId}/copy`, metadata);
    }

    /**
     * Move file (change parents)
     */
    async moveFile(fileId: string, addParents: string, removeParents: string): Promise<unknown> {
        const url = `/drive/v3/files/${fileId}?addParents=${encodeURIComponent(addParents)}&removeParents=${encodeURIComponent(removeParents)}`;
        return this.patch(url, {});
    }

    /**
     * Download file content
     * Note: Only works for binary files, not Google Workspace documents
     */
    async downloadFile(fileId: string): Promise<Blob> {
        const response = (await this.client.get(`/drive/v3/files/${fileId}`, {
            params: { alt: "media" }
        })) as { data: Blob };

        // Return the response data as-is (it will be binary content)
        return response.data as Blob;
    }

    /**
     * Export Google Workspace document to another format
     */
    async exportDocument(fileId: string, mimeType: string): Promise<Blob> {
        const response = (await this.client.get(`/drive/v3/files/${fileId}/export`, {
            params: { mimeType }
        })) as { data: Blob };

        return response.data as Blob;
    }

    /**
     * Upload file (multipart upload for files < 5MB)
     */
    async uploadFile(params: {
        fileName: string;
        fileContent: string; // Base64 encoded or raw content
        mimeType: string;
        folderId?: string;
        description?: string;
    }): Promise<unknown> {
        const metadata = {
            name: params.fileName,
            mimeType: params.mimeType,
            ...(params.folderId && { parents: [params.folderId] }),
            ...(params.description && { description: params.description })
        };

        // Create multipart body
        const boundary = "boundary_string_" + Date.now();
        const metadataPart = JSON.stringify(metadata);

        // Decode base64 content if needed
        let fileContent = params.fileContent;
        if (params.fileContent.includes("base64,")) {
            fileContent = params.fileContent.split("base64,")[1];
        }

        const multipartBody = [
            `--${boundary}`,
            "Content-Type: application/json; charset=UTF-8",
            "",
            metadataPart,
            "",
            `--${boundary}`,
            `Content-Type: ${params.mimeType}`,
            "Content-Transfer-Encoding: base64",
            "",
            fileContent,
            `--${boundary}--`
        ].join("\r\n");

        // Use the underlying fetch client directly for multipart upload
        const url = "/upload/drive/v3/files?uploadType=multipart";
        const response = await this.client.request({
            method: "POST",
            url,
            data: multipartBody,
            headers: {
                "Content-Type": `multipart/related; boundary=${boundary}`
            }
        });

        return response as unknown;
    }

    // ==================== Permission Operations ====================

    /**
     * Create permission (share file/folder)
     */
    async createPermission(
        fileId: string,
        permission: {
            type: "user" | "group" | "domain" | "anyone";
            role: "owner" | "organizer" | "fileOrganizer" | "writer" | "commenter" | "reader";
            emailAddress?: string;
            domain?: string;
        }
    ): Promise<unknown> {
        return this.post(`/drive/v3/files/${fileId}/permissions`, permission);
    }

    /**
     * List permissions for a file
     */
    async listPermissions(fileId: string): Promise<unknown> {
        return this.get(`/drive/v3/files/${fileId}/permissions`);
    }

    /**
     * Delete permission (revoke access)
     */
    async deletePermission(fileId: string, permissionId: string): Promise<void> {
        await this.delete(`/drive/v3/files/${fileId}/permissions/${permissionId}`);
    }

    // ==================== About Operations ====================

    /**
     * Get information about the user's Drive
     */
    async getAbout(fields: string = "user,storageQuota"): Promise<unknown> {
        return this.get("/drive/v3/about", {
            params: { fields }
        });
    }
}
