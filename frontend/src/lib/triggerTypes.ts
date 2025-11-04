/**
 * Trigger Types and Configurations for Test Scenarios
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import type { LucideIcon } from "lucide-react";
import { MessageSquare, Webhook, Code, FileText, Clock, Upload, Zap, Play } from "lucide-react";

/**
 * Available trigger types
 */
export type TriggerType =
    | "manual"
    | "chat"
    | "webhook"
    | "api"
    | "form"
    | "scheduled"
    | "fileUpload"
    | "event";

/**
 * Trigger type metadata
 */
export interface TriggerTypeMetadata {
    value: TriggerType;
    label: string;
    description: string;
    icon: LucideIcon;
}

/**
 * Available trigger types with metadata
 */
export const TRIGGER_TYPES: TriggerTypeMetadata[] = [
    {
        value: "manual",
        label: "Manual",
        description: "Run workflow manually with simple inputs",
        icon: Play
    },
    {
        value: "chat",
        label: "Chat Conversation",
        description: "Test conversational workflows with message exchanges",
        icon: MessageSquare
    },
    {
        value: "webhook",
        label: "Webhook",
        description: "Simulate incoming webhook with HTTP request",
        icon: Webhook
    },
    {
        value: "api",
        label: "API Call",
        description: "Test API endpoint with custom parameters",
        icon: Code
    },
    {
        value: "form",
        label: "Form Submission",
        description: "Submit form data from workflow inputs",
        icon: FileText
    },
    {
        value: "scheduled",
        label: "Scheduled Run",
        description: "Simulate scheduled execution with time context",
        icon: Clock
    },
    {
        value: "fileUpload",
        label: "File Upload",
        description: "Test workflow with uploaded files",
        icon: Upload
    },
    {
        value: "event",
        label: "Event",
        description: "Trigger from external event or system notification",
        icon: Zap
    }
];

/**
 * Chat message in conversation flow
 */
export interface ChatMessage {
    role: "user" | "assistant";
    message: string;
    waitForResponse?: boolean;
}

/**
 * Chat trigger configuration
 */
export interface ChatTriggerConfig {
    conversationFlow: ChatMessage[];
    context?: JsonObject;
}

/**
 * Webhook trigger configuration
 */
export interface WebhookTriggerConfig {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers: Record<string, string>;
    body: JsonValue;
    queryParams?: Record<string, string>;
}

/**
 * API trigger configuration
 */
export interface APITriggerConfig {
    endpoint: string;
    method: string;
    parameters: JsonObject;
    authentication?: {
        type: "none" | "bearer" | "basic" | "api_key";
        token?: string;
        username?: string;
        password?: string;
        apiKey?: string;
        apiKeyHeader?: string;
    };
}

/**
 * Form trigger configuration
 */
export interface FormTriggerConfig {
    fields: JsonObject;
    submissionContext?: JsonObject;
}

/**
 * Scheduled trigger configuration
 */
export interface ScheduledTriggerConfig {
    simulatedTime: string; // ISO date string
    timezone: string;
    mockExternalData?: JsonObject;
}

/**
 * File upload trigger configuration
 */
export interface FileUploadTriggerConfig {
    files: Array<{
        name: string;
        type: string;
        size: number;
        mockContent: string | ArrayBuffer;
    }>;
    metadata?: JsonObject;
}

/**
 * Event trigger configuration
 */
export interface EventTriggerConfig {
    eventType: string;
    payload: JsonValue;
    source: string;
    timestamp?: string;
}

/**
 * Manual trigger configuration
 */
export interface ManualTriggerConfig {
    inputs: JsonObject;
}

/**
 * Union type for all trigger configurations
 */
export interface TriggerConfiguration {
    chat?: ChatTriggerConfig;
    webhook?: WebhookTriggerConfig;
    api?: APITriggerConfig;
    form?: FormTriggerConfig;
    scheduled?: ScheduledTriggerConfig;
    fileUpload?: FileUploadTriggerConfig;
    event?: EventTriggerConfig;
    manual?: ManualTriggerConfig;
}

/**
 * Get default configuration for a trigger type
 */
export function getDefaultTriggerConfig(triggerType: TriggerType): TriggerConfiguration {
    switch (triggerType) {
        case "chat":
            return {
                chat: {
                    conversationFlow: [{ role: "user", message: "", waitForResponse: true }],
                    context: {}
                }
            };

        case "webhook":
            return {
                webhook: {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: {},
                    queryParams: {}
                }
            };

        case "api":
            return {
                api: {
                    endpoint: "",
                    method: "POST",
                    parameters: {},
                    authentication: { type: "none" }
                }
            };

        case "form":
            return {
                form: {
                    fields: {},
                    submissionContext: {}
                }
            };

        case "scheduled":
            return {
                scheduled: {
                    simulatedTime: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    mockExternalData: {}
                }
            };

        case "fileUpload":
            return {
                fileUpload: {
                    files: [],
                    metadata: {}
                }
            };

        case "event":
            return {
                event: {
                    eventType: "",
                    payload: {},
                    source: "",
                    timestamp: new Date().toISOString()
                }
            };

        case "manual":
        default:
            return {
                manual: {
                    inputs: {}
                }
            };
    }
}

/**
 * Get trigger type metadata by value
 */
export function getTriggerTypeMetadata(triggerType: TriggerType): TriggerTypeMetadata {
    return TRIGGER_TYPES.find((t) => t.value === triggerType) || TRIGGER_TYPES[0];
}
