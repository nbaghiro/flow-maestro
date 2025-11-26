/**
 * Microsoft OneDrive Client
 *
 * REST API client for Microsoft Graph OneDrive endpoints.
 * Uses Microsoft Graph API v1.0.
 */

export interface OneDriveClientConfig {
    accessToken: string;
}

export interface DriveItem {
    id: string;
    name: string;
    size?: number;
    createdDateTime?: string;
    lastModifiedDateTime?: string;
    webUrl?: string;
    file?: {
        mimeType?: string;
        hashes?: {
            quickXorHash?: string;
            sha1Hash?: string;
        };
    };
    folder?: {
        childCount?: number;
    };
    parentReference?: {
        driveId?: string;
        id?: string;
        path?: string;
    };
}

export interface DriveItemsResponse {
    value: DriveItem[];
    "@odata.nextLink"?: string;
}

export class MicrosoftOneDriveClient {
    private readonly baseUrl = "https://graph.microsoft.com/v1.0";
    private readonly accessToken: string;

    constructor(config: OneDriveClientConfig) {
        this.accessToken = config.accessToken;
    }

    /**
     * Make authenticated request to Microsoft Graph API
     */
    private async request<T>(
        endpoint: string,
        options: {
            method?: string;
            body?: unknown;
            headers?: Record<string, string>;
        } = {}
    ): Promise<T> {
        const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
        const { method = "GET", body, headers = {} } = options;

        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
                ...headers
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Microsoft Graph API error: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText) as {
                    error?: { message?: string; code?: string };
                };
                if (errorJson.error?.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch {
                // Use default error message
            }

            throw new Error(errorMessage);
        }

        // Handle empty responses (204 No Content)
        if (response.status === 204) {
            return {} as T;
        }

        return (await response.json()) as T;
    }

    /**
     * Get current user's drive information
     */
    async getDrive(): Promise<{ id: string; driveType: string; quota: unknown }> {
        return this.request("/me/drive");
    }

    /**
     * List files in a folder
     */
    async listFiles(params: {
        folderId?: string;
        folderPath?: string;
        top?: number;
        orderBy?: string;
    }): Promise<DriveItemsResponse> {
        let endpoint = "/me/drive/root/children";

        if (params.folderId) {
            endpoint = `/me/drive/items/${params.folderId}/children`;
        } else if (params.folderPath) {
            const encodedPath = encodeURIComponent(params.folderPath);
            endpoint = `/me/drive/root:/${encodedPath}:/children`;
        }

        const queryParams: string[] = [];
        if (params.top) {
            queryParams.push(`$top=${params.top}`);
        }
        if (params.orderBy) {
            queryParams.push(`$orderby=${params.orderBy}`);
        }

        if (queryParams.length > 0) {
            endpoint += `?${queryParams.join("&")}`;
        }

        return this.request(endpoint);
    }

    /**
     * Get file metadata by ID
     */
    async getFile(fileId: string): Promise<DriveItem> {
        return this.request(`/me/drive/items/${fileId}`);
    }

    /**
     * Get file metadata by path
     */
    async getFileByPath(filePath: string): Promise<DriveItem> {
        const encodedPath = encodeURIComponent(filePath);
        return this.request(`/me/drive/root:/${encodedPath}`);
    }

    /**
     * Download file content
     */
    async downloadFile(fileId: string): Promise<ArrayBuffer> {
        const url = `${this.baseUrl}/me/drive/items/${fileId}/content`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            },
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status}`);
        }

        return response.arrayBuffer();
    }

    /**
     * Upload file (small files < 4MB)
     */
    async uploadFile(params: {
        fileName: string;
        content: string | Buffer;
        folderId?: string;
        folderPath?: string;
        conflictBehavior?: "rename" | "replace" | "fail";
    }): Promise<DriveItem> {
        let endpoint: string;

        if (params.folderId) {
            endpoint = `/me/drive/items/${params.folderId}:/${encodeURIComponent(params.fileName)}:/content`;
        } else if (params.folderPath) {
            const fullPath = `${params.folderPath}/${params.fileName}`;
            endpoint = `/me/drive/root:/${encodeURIComponent(fullPath)}:/content`;
        } else {
            endpoint = `/me/drive/root:/${encodeURIComponent(params.fileName)}:/content`;
        }

        if (params.conflictBehavior) {
            endpoint += `?@microsoft.graph.conflictBehavior=${params.conflictBehavior}`;
        }

        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/octet-stream"
            },
            body: params.content
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
        }

        return (await response.json()) as DriveItem;
    }

    /**
     * Create a folder
     */
    async createFolder(params: {
        name: string;
        parentFolderId?: string;
        parentFolderPath?: string;
    }): Promise<DriveItem> {
        let endpoint = "/me/drive/root/children";

        if (params.parentFolderId) {
            endpoint = `/me/drive/items/${params.parentFolderId}/children`;
        } else if (params.parentFolderPath) {
            const encodedPath = encodeURIComponent(params.parentFolderPath);
            endpoint = `/me/drive/root:/${encodedPath}:/children`;
        }

        return this.request(endpoint, {
            method: "POST",
            body: {
                name: params.name,
                folder: {},
                "@microsoft.graph.conflictBehavior": "rename"
            }
        });
    }

    /**
     * Delete a file or folder
     */
    async deleteFile(fileId: string): Promise<void> {
        await this.request(`/me/drive/items/${fileId}`, {
            method: "DELETE"
        });
    }

    /**
     * Move a file
     */
    async moveFile(params: {
        fileId: string;
        destinationFolderId: string;
        newName?: string;
    }): Promise<DriveItem> {
        const body: Record<string, unknown> = {
            parentReference: {
                id: params.destinationFolderId
            }
        };

        if (params.newName) {
            body.name = params.newName;
        }

        return this.request(`/me/drive/items/${params.fileId}`, {
            method: "PATCH",
            body
        });
    }

    /**
     * Copy a file
     */
    async copyFile(params: {
        fileId: string;
        destinationFolderId: string;
        newName?: string;
    }): Promise<{ monitorUrl: string }> {
        const body: Record<string, unknown> = {
            parentReference: {
                id: params.destinationFolderId
            }
        };

        if (params.newName) {
            body.name = params.newName;
        }

        // Copy returns 202 Accepted with a Location header for monitoring
        const url = `${this.baseUrl}/me/drive/items/${params.fileId}/copy`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Failed to copy file: ${response.status}`);
        }

        return {
            monitorUrl: response.headers.get("Location") || ""
        };
    }

    /**
     * Create a sharing link
     */
    async createSharingLink(params: {
        fileId: string;
        type: "view" | "edit" | "embed";
        scope?: "anonymous" | "organization";
    }): Promise<{ link: { webUrl: string; type: string; scope: string } }> {
        return this.request(`/me/drive/items/${params.fileId}/createLink`, {
            method: "POST",
            body: {
                type: params.type,
                scope: params.scope || "anonymous"
            }
        });
    }

    /**
     * Search for files
     */
    async searchFiles(query: string, top?: number): Promise<DriveItemsResponse> {
        let endpoint = `/me/drive/root/search(q='${encodeURIComponent(query)}')`;

        if (top) {
            endpoint += `?$top=${top}`;
        }

        return this.request(endpoint);
    }
}
