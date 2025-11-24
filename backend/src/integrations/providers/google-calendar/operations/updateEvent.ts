import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * Event time schema (either dateTime or date, not both)
 */
const eventTimeSchema = z.object({
    dateTime: z
        .string()
        .optional()
        .describe("Date-time in RFC3339 format (e.g., 2024-12-25T10:00:00-07:00)"),
    date: z.string().optional().describe("Date in YYYY-MM-DD format for all-day events"),
    timeZone: z.string().optional().describe("Time zone (e.g., America/Los_Angeles)")
});

/**
 * Update event input schema
 */
export const updateEventSchema = z.object({
    calendarId: z
        .string()
        .min(1)
        .default("primary")
        .describe("Calendar identifier (use 'primary' for main calendar)"),
    eventId: z.string().min(1).describe("Event identifier"),
    summary: z.string().min(1).max(1024).optional().describe("Event title"),
    description: z.string().optional().describe("Event description"),
    location: z.string().optional().describe("Event location"),
    start: eventTimeSchema.optional().describe("Start time of the event"),
    end: eventTimeSchema.optional().describe("End time of the event"),
    attendees: z
        .array(
            z.object({
                email: z.string().email().describe("Attendee email address"),
                displayName: z.string().optional().describe("Attendee display name"),
                optional: z.boolean().optional().describe("Whether attendance is optional")
            })
        )
        .optional()
        .describe("List of attendees"),
    reminders: z
        .object({
            useDefault: z.boolean().optional().describe("Use default reminders"),
            overrides: z
                .array(
                    z.object({
                        method: z.enum(["email", "popup"]).describe("Reminder method"),
                        minutes: z.number().int().min(0).describe("Minutes before event")
                    })
                )
                .optional()
                .describe("Custom reminder overrides")
        })
        .optional()
        .describe("Reminder settings")
});

export type UpdateEventParams = z.infer<typeof updateEventSchema>;

/**
 * Update event operation definition
 */
export const updateEventOperation: OperationDefinition = {
    id: "updateEvent",
    name: "Update Event",
    description: "Update an existing calendar event (partial update supported)",
    category: "events",
    retryable: true,
    inputSchema: updateEventSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            calendarId: {
                type: "string",
                description: "Calendar identifier (use 'primary' for main calendar)",
                default: "primary"
            },
            eventId: {
                type: "string",
                description: "Event identifier"
            },
            summary: {
                type: "string",
                description: "Event title"
            },
            description: {
                type: "string",
                description: "Event description"
            },
            location: {
                type: "string",
                description: "Event location"
            },
            start: {
                type: "object",
                properties: {
                    dateTime: {
                        type: "string",
                        description: "Date-time in RFC3339 format (e.g., 2024-12-25T10:00:00-07:00)"
                    },
                    date: {
                        type: "string",
                        description: "Date in YYYY-MM-DD format for all-day events"
                    },
                    timeZone: {
                        type: "string",
                        description: "Time zone (e.g., America/Los_Angeles)"
                    }
                },
                description: "Start time of the event"
            },
            end: {
                type: "object",
                properties: {
                    dateTime: {
                        type: "string",
                        description: "Date-time in RFC3339 format (e.g., 2024-12-25T10:00:00-07:00)"
                    },
                    date: {
                        type: "string",
                        description: "Date in YYYY-MM-DD format for all-day events"
                    },
                    timeZone: {
                        type: "string",
                        description: "Time zone (e.g., America/Los_Angeles)"
                    }
                },
                description: "End time of the event"
            },
            attendees: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        email: {
                            type: "string",
                            description: "Attendee email address"
                        },
                        displayName: {
                            type: "string",
                            description: "Attendee display name"
                        },
                        optional: {
                            type: "boolean",
                            description: "Whether attendance is optional"
                        }
                    },
                    required: ["email"]
                },
                description: "List of attendees"
            },
            reminders: {
                type: "object",
                properties: {
                    useDefault: {
                        type: "boolean",
                        description: "Use default reminders"
                    },
                    overrides: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                method: {
                                    type: "string",
                                    enum: ["email", "popup"],
                                    description: "Reminder method"
                                },
                                minutes: {
                                    type: "number",
                                    description: "Minutes before event"
                                }
                            },
                            required: ["method", "minutes"]
                        },
                        description: "Custom reminder overrides"
                    }
                },
                description: "Reminder settings"
            }
        },
        required: ["eventId"]
    }
};

/**
 * Execute update event operation
 */
export async function executeUpdateEvent(
    client: GoogleCalendarClient,
    params: UpdateEventParams
): Promise<OperationResult> {
    try {
        const { calendarId, eventId, ...eventData } = params;

        const response = await client.patchEvent(calendarId, eventId, eventData);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update event",
                retryable: true
            }
        };
    }
}
