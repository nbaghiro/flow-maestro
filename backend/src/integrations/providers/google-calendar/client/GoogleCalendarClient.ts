import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface GoogleCalendarClientConfig {
    accessToken: string;
}

interface GoogleCalendarErrorResponse {
    error: {
        code: number;
        message: string;
        status?: string;
        errors?: Array<{
            domain: string;
            reason: string;
            message: string;
        }>;
    };
}

/**
 * Google Calendar API Client
 *
 * Provides methods to interact with Google Calendar API v3
 * https://developers.google.com/calendar/api/v3/reference
 */
export class GoogleCalendarClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: GoogleCalendarClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://www.googleapis.com/calendar/v3",
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
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Google Calendar API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Google Calendar errors
            if (status === 401) {
                throw new Error("Google Calendar authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GoogleCalendarErrorResponse;
                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Calendar or event not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Google Calendar rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GoogleCalendarErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            // Handle structured error response
            if ((data as GoogleCalendarErrorResponse)?.error) {
                const errorData = data as GoogleCalendarErrorResponse;
                throw new Error(`Google Calendar API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    /**
     * Events API Methods
     */

    /**
     * List events from a calendar
     * GET /calendars/{calendarId}/events
     */
    async listEvents(params: {
        calendarId: string;
        timeMin?: string;
        timeMax?: string;
        maxResults?: number;
        orderBy?: "startTime" | "updated";
        q?: string;
        singleEvents?: boolean;
        pageToken?: string;
    }): Promise<unknown> {
        const { calendarId, ...queryParams } = params;
        return await this.get(`/calendars/${encodeURIComponent(calendarId)}/events`, {
            params: queryParams
        });
    }

    /**
     * Get a single event
     * GET /calendars/{calendarId}/events/{eventId}
     */
    async getEvent(calendarId: string, eventId: string): Promise<unknown> {
        return await this.get(
            `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
        );
    }

    /**
     * Create a new event
     * POST /calendars/{calendarId}/events
     */
    async createEvent(
        calendarId: string,
        event: {
            summary: string;
            description?: string;
            location?: string;
            start: {
                dateTime?: string;
                date?: string;
                timeZone?: string;
            };
            end: {
                dateTime?: string;
                date?: string;
                timeZone?: string;
            };
            attendees?: Array<{
                email: string;
                displayName?: string;
                optional?: boolean;
            }>;
            conferenceData?: unknown;
            reminders?: {
                useDefault?: boolean;
                overrides?: Array<{
                    method: "email" | "popup";
                    minutes: number;
                }>;
            };
        }
    ): Promise<unknown> {
        return await this.post(`/calendars/${encodeURIComponent(calendarId)}/events`, event);
    }

    /**
     * Update an event (full replacement)
     * PUT /calendars/{calendarId}/events/{eventId}
     */
    async updateEvent(calendarId: string, eventId: string, event: unknown): Promise<unknown> {
        return await this.put(
            `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            event
        );
    }

    /**
     * Patch an event (partial update)
     * PATCH /calendars/{calendarId}/events/{eventId}
     */
    async patchEvent(calendarId: string, eventId: string, event: unknown): Promise<unknown> {
        return await this.patch(
            `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            event
        );
    }

    /**
     * Delete an event
     * DELETE /calendars/{calendarId}/events/{eventId}
     */
    async deleteEvent(
        calendarId: string,
        eventId: string,
        params?: {
            sendUpdates?: "all" | "externalOnly" | "none";
        }
    ): Promise<void> {
        let url = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
        if (params?.sendUpdates) {
            url += `?sendUpdates=${params.sendUpdates}`;
        }
        await this.delete(url);
    }

    /**
     * Quick add - create event from natural language text
     * POST /calendars/{calendarId}/events/quickAdd
     */
    async quickAdd(calendarId: string, text: string): Promise<unknown> {
        return await this.post(
            `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd?text=${encodeURIComponent(text)}`
        );
    }

    /**
     * Calendar API Methods
     */

    /**
     * List user's calendars
     * GET /users/me/calendarList
     */
    async listCalendars(params?: { maxResults?: number; pageToken?: string }): Promise<unknown> {
        return await this.get("/users/me/calendarList", { params });
    }

    /**
     * Get calendar metadata
     * GET /calendars/{calendarId}
     */
    async getCalendar(calendarId: string): Promise<unknown> {
        return await this.get(`/calendars/${encodeURIComponent(calendarId)}`);
    }

    /**
     * Create a secondary calendar
     * POST /calendars
     */
    async createCalendar(calendar: {
        summary: string;
        description?: string;
        location?: string;
        timeZone?: string;
    }): Promise<unknown> {
        return await this.post("/calendars", calendar);
    }

    /**
     * Free/Busy API Methods
     */

    /**
     * Query free/busy information for calendars
     * POST /freeBusy
     */
    async getFreeBusy(params: {
        timeMin: string;
        timeMax: string;
        items: Array<{ id: string }>;
        timeZone?: string;
    }): Promise<unknown> {
        return await this.post("/freeBusy", params);
    }
}
