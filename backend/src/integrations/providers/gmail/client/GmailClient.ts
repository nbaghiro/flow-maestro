import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface GmailClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface GmailErrorResponse {
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

// Gmail API Response Types
export interface GmailProfile {
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
    historyId: string;
}

export interface GmailMessageHeader {
    name: string;
    value: string;
}

export interface GmailMessagePart {
    partId: string;
    mimeType: string;
    filename: string;
    headers: GmailMessageHeader[];
    body: {
        attachmentId?: string;
        size: number;
        data?: string;
    };
    parts?: GmailMessagePart[];
}

export interface GmailMessage {
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet?: string;
    historyId?: string;
    internalDate?: string;
    payload?: GmailMessagePart;
    sizeEstimate?: number;
    raw?: string;
}

export interface GmailMessageListResponse {
    messages?: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
    resultSizeEstimate?: number;
}

export interface GmailThread {
    id: string;
    historyId?: string;
    messages?: GmailMessage[];
    snippet?: string;
}

export interface GmailThreadListResponse {
    threads?: Array<{ id: string; historyId?: string; snippet?: string }>;
    nextPageToken?: string;
    resultSizeEstimate?: number;
}

export interface GmailLabel {
    id: string;
    name: string;
    messageListVisibility?: "show" | "hide";
    labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
    type?: "system" | "user";
    messagesTotal?: number;
    messagesUnread?: number;
    threadsTotal?: number;
    threadsUnread?: number;
    color?: {
        textColor?: string;
        backgroundColor?: string;
    };
}

export interface GmailLabelsListResponse {
    labels: GmailLabel[];
}

export interface GmailAttachment {
    size: number;
    data: string; // base64url encoded
}

/**
 * Gmail API v1 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/gmail/api/reference/rest
 * Base URL: https://gmail.googleapis.com
 */
export class GmailClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: GmailClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://gmail.googleapis.com",
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
     * Handle Gmail API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Gmail errors
            if (status === 401) {
                throw new Error(
                    "Gmail authentication failed. Please reconnect your Gmail account."
                );
            }

            if (status === 403) {
                const errorData = data as GmailErrorResponse;
                const reason = errorData?.error?.errors?.[0]?.reason;

                if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded") {
                    throw new Error("Gmail rate limit exceeded. Please try again later.");
                }

                if (reason === "insufficientPermissions") {
                    throw new Error(
                        "Insufficient Gmail permissions. Please reconnect with the required scopes."
                    );
                }

                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to perform this action."}`
                );
            }

            if (status === 404) {
                throw new Error("Message, thread, or label not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Gmail rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GmailErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            // Handle structured error response
            if ((data as GmailErrorResponse)?.error) {
                const errorData = data as GmailErrorResponse;
                throw new Error(`Gmail API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Profile Operations ====================

    /**
     * Get user's Gmail profile (for testing connection)
     */
    async getProfile(): Promise<GmailProfile> {
        return this.get("/gmail/v1/users/me/profile");
    }

    // ==================== Message Operations ====================

    /**
     * List messages in the user's mailbox
     */
    async listMessages(params: {
        q?: string;
        maxResults?: number;
        pageToken?: string;
        labelIds?: string[];
        includeSpamTrash?: boolean;
    }): Promise<GmailMessageListResponse> {
        const queryParams: Record<string, string> = {};

        if (params.q) queryParams.q = params.q;
        if (params.maxResults) queryParams.maxResults = params.maxResults.toString();
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.labelIds) queryParams.labelIds = params.labelIds.join(",");
        if (params.includeSpamTrash) queryParams.includeSpamTrash = "true";

        return this.get("/gmail/v1/users/me/messages", { params: queryParams });
    }

    /**
     * Get a specific message by ID
     */
    async getMessage(
        messageId: string,
        format: "full" | "metadata" | "minimal" | "raw" = "full",
        metadataHeaders?: string[]
    ): Promise<GmailMessage> {
        const params: Record<string, string> = { format };
        if (metadataHeaders) {
            params.metadataHeaders = metadataHeaders.join(",");
        }

        return this.get(`/gmail/v1/users/me/messages/${messageId}`, { params });
    }

    /**
     * Send a message (raw RFC 2822 format, base64url encoded)
     */
    async sendMessage(raw: string, threadId?: string): Promise<GmailMessage> {
        const body: { raw: string; threadId?: string } = { raw };
        if (threadId) {
            body.threadId = threadId;
        }

        return this.post("/gmail/v1/users/me/messages/send", body);
    }

    /**
     * Modify message labels
     */
    async modifyMessage(
        messageId: string,
        addLabelIds?: string[],
        removeLabelIds?: string[]
    ): Promise<GmailMessage> {
        return this.post(`/gmail/v1/users/me/messages/${messageId}/modify`, {
            addLabelIds: addLabelIds || [],
            removeLabelIds: removeLabelIds || []
        });
    }

    /**
     * Move message to trash
     */
    async trashMessage(messageId: string): Promise<GmailMessage> {
        return this.post(`/gmail/v1/users/me/messages/${messageId}/trash`, {});
    }

    /**
     * Remove message from trash
     */
    async untrashMessage(messageId: string): Promise<GmailMessage> {
        return this.post(`/gmail/v1/users/me/messages/${messageId}/untrash`, {});
    }

    /**
     * Permanently delete a message (use with caution)
     */
    async deleteMessage(messageId: string): Promise<void> {
        await this.delete(`/gmail/v1/users/me/messages/${messageId}`);
    }

    // ==================== Thread Operations ====================

    /**
     * List threads in the user's mailbox
     */
    async listThreads(params: {
        q?: string;
        maxResults?: number;
        pageToken?: string;
        labelIds?: string[];
        includeSpamTrash?: boolean;
    }): Promise<GmailThreadListResponse> {
        const queryParams: Record<string, string> = {};

        if (params.q) queryParams.q = params.q;
        if (params.maxResults) queryParams.maxResults = params.maxResults.toString();
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.labelIds) queryParams.labelIds = params.labelIds.join(",");
        if (params.includeSpamTrash) queryParams.includeSpamTrash = "true";

        return this.get("/gmail/v1/users/me/threads", { params: queryParams });
    }

    /**
     * Get a specific thread by ID
     */
    async getThread(
        threadId: string,
        format: "full" | "metadata" | "minimal" = "full",
        metadataHeaders?: string[]
    ): Promise<GmailThread> {
        const params: Record<string, string> = { format };
        if (metadataHeaders) {
            params.metadataHeaders = metadataHeaders.join(",");
        }

        return this.get(`/gmail/v1/users/me/threads/${threadId}`, { params });
    }

    /**
     * Modify thread labels
     */
    async modifyThread(
        threadId: string,
        addLabelIds?: string[],
        removeLabelIds?: string[]
    ): Promise<GmailThread> {
        return this.post(`/gmail/v1/users/me/threads/${threadId}/modify`, {
            addLabelIds: addLabelIds || [],
            removeLabelIds: removeLabelIds || []
        });
    }

    /**
     * Move thread to trash
     */
    async trashThread(threadId: string): Promise<GmailThread> {
        return this.post(`/gmail/v1/users/me/threads/${threadId}/trash`, {});
    }

    /**
     * Remove thread from trash
     */
    async untrashThread(threadId: string): Promise<GmailThread> {
        return this.post(`/gmail/v1/users/me/threads/${threadId}/untrash`, {});
    }

    // ==================== Label Operations ====================

    /**
     * List all labels
     */
    async listLabels(): Promise<GmailLabelsListResponse> {
        return this.get("/gmail/v1/users/me/labels");
    }

    /**
     * Get a specific label
     */
    async getLabel(labelId: string): Promise<GmailLabel> {
        return this.get(`/gmail/v1/users/me/labels/${labelId}`);
    }

    /**
     * Create a new label
     */
    async createLabel(label: {
        name: string;
        messageListVisibility?: "show" | "hide";
        labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
        color?: {
            textColor?: string;
            backgroundColor?: string;
        };
    }): Promise<GmailLabel> {
        return this.post("/gmail/v1/users/me/labels", label);
    }

    /**
     * Update a label
     */
    async updateLabel(
        labelId: string,
        label: Partial<{
            name: string;
            messageListVisibility: "show" | "hide";
            labelListVisibility: "labelShow" | "labelShowIfUnread" | "labelHide";
            color: {
                textColor?: string;
                backgroundColor?: string;
            };
        }>
    ): Promise<GmailLabel> {
        return this.patch(`/gmail/v1/users/me/labels/${labelId}`, label);
    }

    /**
     * Delete a label
     */
    async deleteLabel(labelId: string): Promise<void> {
        await this.delete(`/gmail/v1/users/me/labels/${labelId}`);
    }

    // ==================== Attachment Operations ====================

    /**
     * Get a message attachment
     */
    async getAttachment(messageId: string, attachmentId: string): Promise<GmailAttachment> {
        return this.get(`/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`);
    }
}
