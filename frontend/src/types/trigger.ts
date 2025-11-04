/**
 * Trigger Types and Interfaces
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";

export type TriggerType = "schedule" | "webhook" | "event" | "manual" | "phone_call";

export interface ScheduleTriggerConfig {
    cronExpression: string;
    timezone?: string;
    enabled?: boolean;
    description?: string;
}

export interface WebhookTriggerConfig {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY";
    authType?: "none" | "api_key" | "hmac" | "bearer";
    requireSignature?: boolean;
    allowedOrigins?: string[];
    responseFormat?: "json" | "text";
    customHeaders?: Record<string, string>;
}

export interface EventTriggerConfig {
    eventType: string;
    filters?: JsonObject;
    source?: string;
}

export interface ManualTriggerConfig {
    requireInputs?: boolean;
    inputSchema?: JsonObject;
    inputs?: JsonObject; // Actual input values for the trigger
    description?: string;
}

export interface PhoneCallTriggerConfig {
    phoneNumber: string; // E.164 format: +15551234567
    sipProvider: "telnyx";
    connectionId: string;
    greetingMessage?: string;
    language?: string;
    maxCallDuration?: number;
    enableRecording?: boolean;
    businessHoursEnabled?: boolean;
    businessHoursSchedule?: {
        monday?: string; // "9-17"
        tuesday?: string;
        wednesday?: string;
        thursday?: string;
        friday?: string;
        saturday?: string;
        sunday?: string;
        timezone?: string; // "America/New_York"
    };
    voiceProvider?: "elevenlabs" | "openai";
    voiceId?: string;
    sttProvider?: "deepgram" | "openai";
}

export type TriggerConfig =
    | ScheduleTriggerConfig
    | WebhookTriggerConfig
    | EventTriggerConfig
    | ManualTriggerConfig
    | PhoneCallTriggerConfig;

export interface WorkflowTrigger {
    id: string;
    workflow_id: string;
    name: string;
    trigger_type: TriggerType;
    config: TriggerConfig;
    enabled: boolean;
    last_triggered_at: string | null;
    next_scheduled_at: string | null;
    trigger_count: number;
    temporal_schedule_id: string | null;
    webhook_secret: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CreateTriggerInput {
    workflowId: string;
    name: string;
    triggerType: TriggerType;
    config: TriggerConfig;
    enabled?: boolean;
}

export interface UpdateTriggerInput {
    name?: string;
    config?: TriggerConfig;
    enabled?: boolean;
}

export interface TriggerExecution {
    id: string;
    trigger_id: string;
    execution_id: string;
    trigger_payload: JsonObject | null;
    created_at: string;
}

export interface ScheduleInfo {
    scheduleId: string;
    state: JsonValue;
    spec: JsonValue;
    info: JsonValue;
    nextRunTime?: string;
}

export interface TriggerWithScheduleInfo extends WorkflowTrigger {
    scheduleInfo?: ScheduleInfo;
}
