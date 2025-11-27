/**
 * Microsoft Word Client
 *
 * REST API client for Microsoft Graph Word document endpoints.
 * Uses Microsoft Graph API v1.0 for document operations.
 *
 * Note: Word documents in Microsoft Graph are accessed through the Drive API
 * since they are stored as files in OneDrive/SharePoint.
 */

export interface WordClientConfig {
    accessToken: string;
}

export interface DriveItemInfo {
    id: string;
    name: string;
    size: number;
    file?: {
        mimeType: string;
        hashes?: {
            quickXorHash?: string;
            sha1Hash?: string;
            sha256Hash?: string;
        };
    };
    folder?: {
        childCount: number;
    };
    parentReference?: {
        driveId: string;
        driveType: string;
        id: string;
        path: string;
    };
    createdDateTime: string;
    lastModifiedDateTime: string;
    webUrl: string;
    createdBy?: {
        user?: {
            displayName: string;
            id: string;
        };
    };
    lastModifiedBy?: {
        user?: {
            displayName: string;
            id: string;
        };
    };
}

export interface SearchResult {
    value: DriveItemInfo[];
    "@odata.nextLink"?: string;
}

export class MicrosoftWordClient {
    private readonly baseUrl = "https://graph.microsoft.com/v1.0";
    private readonly accessToken: string;

    constructor(config: WordClientConfig) {
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
            isBlob?: boolean;
        } = {}
    ): Promise<T> {
        const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
        const { method = "GET", body, headers = {}, isBlob = false } = options;

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

        if (response.status === 204) {
            return {} as T;
        }

        if (isBlob) {
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer).toString("base64") as unknown as T;
        }

        return (await response.json()) as T;
    }

    /**
     * Get document metadata
     */
    async getDocument(itemId: string): Promise<DriveItemInfo> {
        return this.request(`/me/drive/items/${itemId}`);
    }

    /**
     * Get document by path
     */
    async getDocumentByPath(path: string): Promise<DriveItemInfo> {
        const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
        return this.request(`/me/drive/root:/${encodedPath}`);
    }

    /**
     * Download document content as base64
     */
    async downloadDocument(itemId: string): Promise<string> {
        return this.request(`/me/drive/items/${itemId}/content`, { isBlob: true });
    }

    /**
     * Convert document to another format (PDF or HTML)
     */
    async convertDocument(itemId: string, format: "pdf" | "html"): Promise<string> {
        return this.request(`/me/drive/items/${itemId}/content?format=${format}`, {
            isBlob: true
        });
    }

    /**
     * Upload a new Word document
     */
    async uploadDocument(
        fileName: string,
        content: Buffer | string,
        folderId?: string,
        conflictBehavior: "rename" | "replace" | "fail" = "rename"
    ): Promise<DriveItemInfo> {
        const contentBuffer =
            typeof content === "string" ? Buffer.from(content, "base64") : content;

        let uploadUrl: string;
        if (folderId) {
            uploadUrl = `/me/drive/items/${folderId}:/${fileName}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;
        } else {
            uploadUrl = `/me/drive/root:/${fileName}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;
        }

        const url = `${this.baseUrl}${uploadUrl}`;
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            },
            body: contentBuffer
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

        return (await response.json()) as DriveItemInfo;
    }

    /**
     * Replace document content
     */
    async replaceDocument(itemId: string, content: Buffer | string): Promise<DriveItemInfo> {
        const contentBuffer =
            typeof content === "string" ? Buffer.from(content, "base64") : content;

        const url = `${this.baseUrl}/me/drive/items/${itemId}/content`;
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            },
            body: contentBuffer
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

        return (await response.json()) as DriveItemInfo;
    }

    /**
     * Search for Word documents
     */
    async searchDocuments(query: string, top?: number): Promise<SearchResult> {
        // Search for .docx files
        const searchQuery = `${query} AND filetype:docx`;
        let url = `/me/drive/root/search(q='${encodeURIComponent(searchQuery)}')`;

        if (top) {
            url += `?$top=${top}`;
        }

        return this.request(url);
    }

    /**
     * Create a copy of a document
     */
    async copyDocument(
        itemId: string,
        newName: string,
        destinationFolderId?: string
    ): Promise<{ location: string }> {
        const body: Record<string, unknown> = {
            name: newName
        };

        if (destinationFolderId) {
            body.parentReference = { id: destinationFolderId };
        }

        // Copy is an async operation, returns a location header to monitor
        const url = `${this.baseUrl}/me/drive/items/${itemId}/copy`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok && response.status !== 202) {
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

        // Return the monitoring URL
        const location = response.headers.get("Location") || "";
        return { location };
    }

    /**
     * Delete a document
     */
    async deleteDocument(itemId: string): Promise<void> {
        await this.request(`/me/drive/items/${itemId}`, { method: "DELETE" });
    }

    /**
     * Create a sharing link for a document
     */
    async createSharingLink(
        itemId: string,
        type: "view" | "edit" | "embed",
        scope?: "anonymous" | "organization"
    ): Promise<{ link: { webUrl: string; type: string; scope: string } }> {
        const body: Record<string, unknown> = { type };
        if (scope) {
            body.scope = scope;
        }

        return this.request(`/me/drive/items/${itemId}/createLink`, {
            method: "POST",
            body
        });
    }

    /**
     * Get document preview URL
     */
    async getPreviewUrl(itemId: string): Promise<{ getUrl: string }> {
        return this.request(`/me/drive/items/${itemId}/preview`, {
            method: "POST",
            body: {}
        });
    }
}
