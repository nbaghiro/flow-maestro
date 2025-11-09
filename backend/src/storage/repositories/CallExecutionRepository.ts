import { db } from "../database";
import {
    CallExecution,
    CreateCallExecutionInput,
    UpdateCallExecutionInput,
    CallTranscript,
    CreateCallTranscriptInput,
    CallEvent,
    CreateCallEventInput,
    CallStatus,
    CallDirection,
    Speaker,
    EventSeverity,
    AudioQualityMetrics
} from "../models/CallExecution";

// Database row interfaces matching the PostgreSQL table structure
interface CallExecutionRow {
    id: string;
    trigger_id: string;
    execution_id: string | null;
    user_id: string;
    call_sid: string;
    livekit_room_name: string | null;
    caller_number: string;
    called_number: string;
    direction: CallDirection;
    call_status: CallStatus;
    initiated_at: string | Date;
    answered_at: string | Date | null;
    ended_at: string | Date | null;
    call_duration_seconds: number | null;
    caller_name: string | null;
    caller_location: string | null;
    caller_carrier: string | null;
    recording_enabled: boolean;
    recording_url: string | null;
    recording_duration_seconds: number | null;
    hangup_cause: string | null;
    error_message: string | null;
    audio_quality_metrics: AudioQualityMetrics | string | null;
    cost_amount: number | null;
    cost_currency: string;
    created_at: string | Date;
    updated_at: string | Date;
}

interface CallTranscriptRow {
    id: string;
    call_execution_id: string;
    speaker: Speaker;
    text: string;
    confidence: number | null;
    language: string;
    started_at: string | Date;
    ended_at: string | Date | null;
    duration_ms: number | null;
    audio_segment_url: string | null;
    is_final: boolean;
    interrupted: boolean;
    node_id: string | null;
    created_at: string | Date;
}

interface CallEventRow {
    id: string;
    call_execution_id: string;
    event_type: string;
    event_data: string | Record<string, unknown> | null;
    severity: EventSeverity;
    timestamp: string | Date;
    node_id: string | null;
    activity_id: string | null;
}

export class CallExecutionRepository {
    /**
     * Create a new call execution record
     */
    async create(input: CreateCallExecutionInput): Promise<CallExecution> {
        const query = `
            INSERT INTO flowmaestro.call_executions
                (trigger_id, user_id, call_sid, caller_number, called_number,
                 direction, call_status, caller_name, caller_location, caller_carrier,
                 recording_enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            input.trigger_id,
            input.user_id,
            input.call_sid,
            input.caller_number,
            input.called_number,
            input.direction || "inbound",
            input.call_status || "initiated",
            input.caller_name || null,
            input.caller_location || null,
            input.caller_carrier || null,
            input.recording_enabled !== undefined ? input.recording_enabled : false
        ];

        const result = await db.query(query, values);
        return this.mapCallExecutionRow(result.rows[0] as CallExecutionRow);
    }

    /**
     * Find call execution by ID
     */
    async findById(id: string): Promise<CallExecution | null> {
        const query = `
            SELECT * FROM flowmaestro.call_executions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0
            ? this.mapCallExecutionRow(result.rows[0] as CallExecutionRow)
            : null;
    }

    /**
     * Find call execution by call SID
     */
    async findByCallSid(callSid: string): Promise<CallExecution | null> {
        const query = `
            SELECT * FROM flowmaestro.call_executions
            WHERE call_sid = $1
        `;

        const result = await db.query(query, [callSid]);
        return result.rows.length > 0
            ? this.mapCallExecutionRow(result.rows[0] as CallExecutionRow)
            : null;
    }

    /**
     * Find call executions by trigger ID
     */
    async findByTriggerId(
        triggerId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ executions: CallExecution[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.call_executions
            WHERE trigger_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.call_executions
            WHERE trigger_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [triggerId]),
            db.query(query, [triggerId, limit, offset])
        ]);

        return {
            executions: executionsResult.rows.map((row) =>
                this.mapCallExecutionRow(row as CallExecutionRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Find active calls (not completed/failed/cancelled)
     */
    async findActiveCalls(userId?: string): Promise<CallExecution[]> {
        let query = `
            SELECT * FROM flowmaestro.call_executions
            WHERE call_status IN ('initiated', 'ringing', 'active')
        `;
        const values: unknown[] = [];

        if (userId) {
            query += " AND user_id = $1";
            values.push(userId);
        }

        query += " ORDER BY initiated_at DESC";

        const result = await db.query(query, values);
        return result.rows.map((row) => this.mapCallExecutionRow(row as CallExecutionRow));
    }

    /**
     * Update call execution
     */
    async update(id: string, input: UpdateCallExecutionInput): Promise<CallExecution | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.execution_id !== undefined) {
            updates.push(`execution_id = $${paramIndex++}`);
            values.push(input.execution_id);
        }

        if (input.livekit_room_name !== undefined) {
            updates.push(`livekit_room_name = $${paramIndex++}`);
            values.push(input.livekit_room_name);
        }

        if (input.call_status !== undefined) {
            updates.push(`call_status = $${paramIndex++}`);
            values.push(input.call_status);
        }

        if (input.answered_at !== undefined) {
            updates.push(`answered_at = $${paramIndex++}`);
            values.push(input.answered_at);
        }

        if (input.ended_at !== undefined) {
            updates.push(`ended_at = $${paramIndex++}`);
            values.push(input.ended_at);
        }

        if (input.call_duration_seconds !== undefined) {
            updates.push(`call_duration_seconds = $${paramIndex++}`);
            values.push(input.call_duration_seconds);
        }

        if (input.recording_url !== undefined) {
            updates.push(`recording_url = $${paramIndex++}`);
            values.push(input.recording_url);
        }

        if (input.recording_duration_seconds !== undefined) {
            updates.push(`recording_duration_seconds = $${paramIndex++}`);
            values.push(input.recording_duration_seconds);
        }

        if (input.hangup_cause !== undefined) {
            updates.push(`hangup_cause = $${paramIndex++}`);
            values.push(input.hangup_cause);
        }

        if (input.error_message !== undefined) {
            updates.push(`error_message = $${paramIndex++}`);
            values.push(input.error_message);
        }

        if (input.audio_quality_metrics !== undefined) {
            updates.push(`audio_quality_metrics = $${paramIndex++}`);
            values.push(JSON.stringify(input.audio_quality_metrics));
        }

        if (input.cost_amount !== undefined) {
            updates.push(`cost_amount = $${paramIndex++}`);
            values.push(input.cost_amount);
        }

        if (input.cost_currency !== undefined) {
            updates.push(`cost_currency = $${paramIndex++}`);
            values.push(input.cost_currency);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.call_executions
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0
            ? this.mapCallExecutionRow(result.rows[0] as CallExecutionRow)
            : null;
    }

    /**
     * Update call status
     */
    async updateStatus(id: string, status: CallStatus): Promise<void> {
        const query = `
            UPDATE flowmaestro.call_executions
            SET call_status = $1
            WHERE id = $2
        `;

        await db.query(query, [status, id]);
    }

    // ===== Call Transcript Methods =====

    /**
     * Create a transcript entry
     */
    async createTranscript(input: CreateCallTranscriptInput): Promise<CallTranscript> {
        const query = `
            INSERT INTO flowmaestro.call_transcripts
                (call_execution_id, speaker, text, confidence, language,
                 started_at, ended_at, duration_ms, audio_segment_url,
                 is_final, interrupted, node_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const values = [
            input.call_execution_id,
            input.speaker,
            input.text,
            input.confidence || null,
            input.language || "en-US",
            input.started_at,
            input.ended_at || null,
            input.duration_ms || null,
            input.audio_segment_url || null,
            input.is_final !== undefined ? input.is_final : true,
            input.interrupted !== undefined ? input.interrupted : false,
            input.node_id || null
        ];

        const result = await db.query(query, values);
        return this.mapCallTranscriptRow(result.rows[0] as CallTranscriptRow);
    }

    /**
     * Get all transcripts for a call
     */
    async findTranscriptsByCallExecutionId(callExecutionId: string): Promise<CallTranscript[]> {
        const query = `
            SELECT * FROM flowmaestro.call_transcripts
            WHERE call_execution_id = $1
            ORDER BY started_at ASC
        `;

        const result = await db.query(query, [callExecutionId]);
        return result.rows.map((row) => this.mapCallTranscriptRow(row as CallTranscriptRow));
    }

    // ===== Call Event Methods =====

    /**
     * Create a call event
     */
    async createEvent(input: CreateCallEventInput): Promise<CallEvent> {
        const query = `
            INSERT INTO flowmaestro.call_events
                (call_execution_id, event_type, event_data, severity,
                 timestamp, node_id, activity_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.call_execution_id,
            input.event_type,
            input.event_data ? JSON.stringify(input.event_data) : null,
            input.severity || "info",
            input.timestamp || new Date(),
            input.node_id || null,
            input.activity_id || null
        ];

        const result = await db.query(query, values);
        return this.mapCallEventRow(result.rows[0] as CallEventRow);
    }

    /**
     * Get all events for a call
     */
    async findEventsByCallExecutionId(
        callExecutionId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ events: CallEvent[]; total: number }> {
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.call_events
            WHERE call_execution_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.call_events
            WHERE call_execution_id = $1
            ORDER BY timestamp ASC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, eventsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [callExecutionId]),
            db.query(query, [callExecutionId, limit, offset])
        ]);

        return {
            events: eventsResult.rows.map((row) => this.mapCallEventRow(row as CallEventRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    // ===== Private Helper Methods =====

    /**
     * Map database row to CallExecution model
     */
    private mapCallExecutionRow(row: CallExecutionRow): CallExecution {
        return {
            id: row.id,
            trigger_id: row.trigger_id,
            execution_id: row.execution_id,
            user_id: row.user_id,
            call_sid: row.call_sid,
            livekit_room_name: row.livekit_room_name,
            caller_number: row.caller_number,
            called_number: row.called_number,
            direction: row.direction,
            call_status: row.call_status,
            initiated_at: new Date(row.initiated_at),
            answered_at: row.answered_at ? new Date(row.answered_at) : null,
            ended_at: row.ended_at ? new Date(row.ended_at) : null,
            call_duration_seconds: row.call_duration_seconds,
            caller_name: row.caller_name,
            caller_location: row.caller_location,
            caller_carrier: row.caller_carrier,
            recording_enabled: row.recording_enabled,
            recording_url: row.recording_url,
            recording_duration_seconds: row.recording_duration_seconds,
            hangup_cause: row.hangup_cause,
            error_message: row.error_message,
            audio_quality_metrics:
                typeof row.audio_quality_metrics === "string"
                    ? JSON.parse(row.audio_quality_metrics)
                    : row.audio_quality_metrics || {},
            cost_amount: row.cost_amount,
            cost_currency: row.cost_currency,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }

    /**
     * Map database row to CallTranscript model
     */
    private mapCallTranscriptRow(row: CallTranscriptRow): CallTranscript {
        return {
            id: row.id.toString(),
            call_execution_id: row.call_execution_id,
            speaker: row.speaker,
            text: row.text,
            confidence: row.confidence,
            language: row.language,
            started_at: new Date(row.started_at),
            ended_at: row.ended_at ? new Date(row.ended_at) : null,
            duration_ms: row.duration_ms,
            audio_segment_url: row.audio_segment_url,
            is_final: row.is_final,
            interrupted: row.interrupted,
            node_id: row.node_id,
            created_at: new Date(row.created_at)
        };
    }

    /**
     * Map database row to CallEvent model
     */
    private mapCallEventRow(row: CallEventRow): CallEvent {
        const eventData =
            typeof row.event_data === "string"
                ? (JSON.parse(row.event_data) as Record<string, unknown>)
                : row.event_data;

        return {
            id: row.id.toString(),
            call_execution_id: row.call_execution_id,
            event_type: row.event_type,
            event_data: eventData as Record<string, import("@flowmaestro/shared").JsonValue> | null,
            severity: row.severity,
            timestamp: new Date(row.timestamp),
            node_id: row.node_id,
            activity_id: row.activity_id
        };
    }
}
