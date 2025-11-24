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
 * Create event input schema
 */
export const createEventSchema = z.object({
    calendarId: z
        .string()
        .min(1)
        .default("primary")
        .describe("Calendar identifier (use 'primary' for main calendar)"),
    summary: z.string().min(1).max(1024).describe("Event title"),
    description: z.string().optional().describe("Event description"),
    location: z.string().optional().describe("Event location"),
    start: eventTimeSchema.describe("Start time of the event"),
    end: eventTimeSchema.describe("End time of the event"),
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

export type CreateEventParams = z.infer<typeof createEventSchema>;

/**
 * Create event operation definition
 */
export const createEventOperation: OperationDefinition = {
    id: "createEvent",
    name: "Create Event",
    description: "Create a new calendar event",
    category: "events",
    retryable: true,
    inputSchema: createEventSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            calendarId: {
                type: "string",
                description: "Calendar identifier (use 'primary' for main calendar)",
                default: "primary"
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
        required: ["summary", "start", "end"]
    }
};

/**
 * Execute create event operation
 */
export async function executeCreateEvent(
    client: GoogleCalendarClient,
    params: CreateEventParams
): Promise<OperationResult> {
    try {
        const { calendarId, ...eventData } = params;

        const response = await client.createEvent(calendarId, eventData);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create event",
                retryable: true
            }
        };
    }
}
