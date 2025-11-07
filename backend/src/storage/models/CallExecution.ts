/**
 * Phone Call Execution Models
 * Tracks phone call lifecycle and associated data
 */

import type { JsonValue } from "@flowmaestro/shared";

/**
 * Call status values throughout the call lifecycle
 */
export type CallStatus =
    | "initiated" // Call has been initiated but not yet answered
    | "ringing" // Phone is ringing
    | "active" // Call is active and agent is connected
    | "completed" // Call ended normally
    | "failed" // Call failed due to error
    | "no_answer" // Call was not answered
    | "busy" // Called party was busy
    | "cancelled"; // Call was cancelled before being answered

/**
 * Call direction
 */
export type CallDirection = "inbound" | "outbound";

/**
 * Speaker identification in transcripts
 */
export type Speaker = "user" | "agent" | "system";

/**
 * Event severity levels
 */
export type EventSeverity = "debug" | "info" | "warning" | "error" | "critical";

/**
 * Audio quality metrics
 */
export interface AudioQualityMetrics {
    packetLoss?: number; // Percentage (0-100)
    jitter?: number; // Milliseconds
    latency?: number; // Milliseconds
    avgMos?: number; // Mean Opinion Score (1-5)
}

/**
 * Call Execution Model
 * Tracks the entire lifecycle of a phone call
 */
export interface CallExecution {
    id: string;

    // Links to trigger and execution
    trigger_id: string;
    execution_id: string | null;
    user_id: string;

    // Call identification
    call_sid: string; // Unique call ID from SIP provider
    livekit_room_name: string | null;

    // Phone numbers (E.164 format)
    caller_number: string; // +15551234567
    called_number: string; // +15559876543

    // Call metadata
    direction: CallDirection;
    call_status: CallStatus;

    // Timing information
    initiated_at: Date;
    answered_at: Date | null;
    ended_at: Date | null;
    call_duration_seconds: number | null;

    // Caller information
    caller_name: string | null;
    caller_location: string | null;
    caller_carrier: string | null;

    // Recording and transcript
    recording_enabled: boolean;
    recording_url: string | null;
    recording_duration_seconds: number | null;

    // Final state
    hangup_cause: string | null; // normal, user_hangup, timeout, error, etc.
    error_message: string | null;

    // Audio quality metrics
    audio_quality_metrics: AudioQualityMetrics;

    // Billing
    cost_amount: number | null;
    cost_currency: string;

    created_at: Date;
    updated_at: Date;
}

/**
 * Create Call Execution Input
 */
export interface CreateCallExecutionInput {
    trigger_id: string;
    user_id: string;
    call_sid: string;
    caller_number: string;
    called_number: string;
    direction?: CallDirection;
    call_status?: CallStatus;
    caller_name?: string;
    caller_location?: string;
    caller_carrier?: string;
    recording_enabled?: boolean;
}

/**
 * Update Call Execution Input
 */
export interface UpdateCallExecutionInput {
    execution_id?: string;
    livekit_room_name?: string;
    call_status?: CallStatus;
    answered_at?: Date;
    ended_at?: Date;
    call_duration_seconds?: number;
    recording_url?: string;
    recording_duration_seconds?: number;
    hangup_cause?: string;
    error_message?: string;
    audio_quality_metrics?: AudioQualityMetrics;
    cost_amount?: number;
    cost_currency?: string;
}

/**
 * Call Transcript Model
 * Stores conversation history (user speech + AI responses)
 */
export interface CallTranscript {
    id: string;
    call_execution_id: string;

    // Speaker identification
    speaker: Speaker;

    // Transcript content
    text: string;
    confidence: number | null; // 0.0 to 1.0
    language: string;

    // Timing
    started_at: Date;
    ended_at: Date | null;
    duration_ms: number | null;

    // Audio segment reference
    audio_segment_url: string | null;

    // Metadata
    is_final: boolean;
    interrupted: boolean; // true if user barged in
    node_id: string | null; // which workflow node generated this

    created_at: Date;
}

/**
 * Create Call Transcript Input
 */
export interface CreateCallTranscriptInput {
    call_execution_id: string;
    speaker: Speaker;
    text: string;
    confidence?: number;
    language?: string;
    started_at: Date;
    ended_at?: Date;
    duration_ms?: number;
    audio_segment_url?: string;
    is_final?: boolean;
    interrupted?: boolean;
    node_id?: string;
}

/**
 * Call Event Model
 * Detailed event log for debugging and monitoring
 */
export interface CallEvent {
    id: string;
    call_execution_id: string;

    // Event details
    event_type: string; // agent_joined, speech_started, tts_complete, error, etc.
    event_data: Record<string, JsonValue> | null;
    severity: EventSeverity;

    // Timing
    timestamp: Date;

    // Context
    node_id: string | null;
    activity_id: string | null;
}

/**
 * Create Call Event Input
 */
export interface CreateCallEventInput {
    call_execution_id: string;
    event_type: string;
    event_data?: Record<string, JsonValue>;
    severity?: EventSeverity;
    node_id?: string;
    activity_id?: string;
    timestamp?: Date;
}
