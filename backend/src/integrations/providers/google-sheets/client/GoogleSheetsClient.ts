import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface GoogleSheetsClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface GoogleSheetsErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        details?: unknown[];
    };
}

/**
 * Google Sheets API v4 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/sheets/api/reference/rest
 * Base URL: https://sheets.googleapis.com
 */
export class GoogleSheetsClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: GoogleSheetsClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://sheets.googleapis.com",
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
            config.headers["Content-Type"] = "application/json";
            return config;
        });
    }

    /**
     * Handle Google Sheets API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Google Sheets errors
            if (status === 401) {
                throw new Error("Google Sheets authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GoogleSheetsErrorResponse;
                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Spreadsheet or resource not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Google Sheets rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GoogleSheetsErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            // Handle structured error response
            if ((data as GoogleSheetsErrorResponse)?.error) {
                const errorData = data as GoogleSheetsErrorResponse;
                throw new Error(`Google Sheets API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Spreadsheet Operations ====================

    /**
     * Create a new spreadsheet
     */
    async createSpreadsheet(params: {
        title: string;
        sheets?: Array<{ properties: { title: string } }>;
    }): Promise<unknown> {
        return this.post("/v4/spreadsheets", {
            properties: { title: params.title },
            sheets: params.sheets
        });
    }

    /**
     * Get spreadsheet metadata
     */
    async getSpreadsheet(
        spreadsheetId: string,
        includeGridData: boolean = false
    ): Promise<unknown> {
        return this.get(`/v4/spreadsheets/${spreadsheetId}`, {
            params: { includeGridData: includeGridData.toString() }
        });
    }

    /**
     * Batch update spreadsheet (formatting, properties, etc.)
     */
    async batchUpdateSpreadsheet(spreadsheetId: string, requests: unknown[]): Promise<unknown> {
        return this.post(`/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            requests
        });
    }

    // ==================== Values Operations ====================

    /**
     * Get values from a range
     */
    async getValues(
        spreadsheetId: string,
        range: string,
        valueRenderOption: string = "FORMATTED_VALUE"
    ): Promise<unknown> {
        return this.get(`/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
            params: { valueRenderOption }
        });
    }

    /**
     * Get multiple ranges of values
     */
    async batchGetValues(
        spreadsheetId: string,
        ranges: string[],
        valueRenderOption: string = "FORMATTED_VALUE"
    ): Promise<unknown> {
        return this.get(`/v4/spreadsheets/${spreadsheetId}/values:batchGet`, {
            params: {
                ranges: ranges.join(","),
                valueRenderOption
            }
        });
    }

    /**
     * Append values to a range
     */
    async appendValues(
        spreadsheetId: string,
        range: string,
        values: unknown[][],
        valueInputOption: string = "USER_ENTERED"
    ): Promise<unknown> {
        return this.post(
            `/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=${valueInputOption}`,
            {
                range,
                values
            }
        );
    }

    /**
     * Update values in a range
     */
    async updateValues(
        spreadsheetId: string,
        range: string,
        values: unknown[][],
        valueInputOption: string = "USER_ENTERED"
    ): Promise<unknown> {
        return this.put(
            `/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=${valueInputOption}`,
            {
                range,
                values
            }
        );
    }

    /**
     * Batch update multiple ranges
     */
    async batchUpdateValues(
        spreadsheetId: string,
        data: Array<{ range: string; values: unknown[][] }>,
        valueInputOption: string = "USER_ENTERED"
    ): Promise<unknown> {
        return this.post(`/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
            valueInputOption,
            data
        });
    }

    /**
     * Clear values in a range
     */
    async clearValues(spreadsheetId: string, range: string): Promise<unknown> {
        return this.post(`/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {});
    }

    /**
     * Batch clear multiple ranges
     */
    async batchClearValues(spreadsheetId: string, ranges: string[]): Promise<unknown> {
        return this.post(`/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
            ranges
        });
    }
}
