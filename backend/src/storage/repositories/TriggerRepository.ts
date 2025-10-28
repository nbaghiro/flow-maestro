import { db } from "../database";
import {
    WorkflowTrigger,
    CreateTriggerInput,
    UpdateTriggerInput,
    TriggerExecution,
    CreateTriggerExecutionInput,
    WebhookLog,
    CreateWebhookLogInput,
    TriggerType
} from "../models/Trigger";
import * as crypto from "crypto";

export class TriggerRepository {
    /**
     * Create a new workflow trigger
     */
    async create(input: CreateTriggerInput): Promise<WorkflowTrigger> {
        const webhookSecret = input.trigger_type === 'webhook'
            ? this.generateWebhookSecret()
            : null;

        const query = `
            INSERT INTO flowmaestro.workflow_triggers
                (workflow_id, name, trigger_type, config, enabled, webhook_secret)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.workflow_id,
            input.name,
            input.trigger_type,
            JSON.stringify(input.config),
            input.enabled !== undefined ? input.enabled : true,
            webhookSecret
        ];

        const result = await db.query<any>(query, values);
        return this.mapTriggerRow(result.rows[0]);
    }

    /**
     * Find trigger by ID
     */
    async findById(id: string): Promise<WorkflowTrigger | null> {
        const query = `
            SELECT * FROM flowmaestro.workflow_triggers
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<any>(query, [id]);
        return result.rows.length > 0 ? this.mapTriggerRow(result.rows[0]) : null;
    }

    /**
     * Find all triggers for a workflow
     */
    async findByWorkflowId(workflowId: string): Promise<WorkflowTrigger[]> {
        const query = `
            SELECT * FROM flowmaestro.workflow_triggers
            WHERE workflow_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
        `;

        const result = await db.query<any>(query, [workflowId]);
        return result.rows.map((row) => this.mapTriggerRow(row));
    }

    /**
     * Find triggers by type
     */
    async findByType(triggerType: TriggerType, enabled?: boolean): Promise<WorkflowTrigger[]> {
        let query = `
            SELECT * FROM flowmaestro.workflow_triggers
            WHERE trigger_type = $1 AND deleted_at IS NULL
        `;
        const values: any[] = [triggerType];

        if (enabled !== undefined) {
            query += ` AND enabled = $2`;
            values.push(enabled);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await db.query<any>(query, values);
        return result.rows.map((row) => this.mapTriggerRow(row));
    }

    /**
     * Find all enabled schedule triggers that need to be processed
     */
    async findScheduledTriggersToProcess(): Promise<WorkflowTrigger[]> {
        const query = `
            SELECT * FROM flowmaestro.workflow_triggers
            WHERE trigger_type = 'schedule'
              AND enabled = true
              AND deleted_at IS NULL
            ORDER BY next_scheduled_at ASC NULLS LAST
        `;

        const result = await db.query<any>(query);
        return result.rows.map((row) => this.mapTriggerRow(row));
    }

    /**
     * Update a trigger
     */
    async update(id: string, input: UpdateTriggerInput): Promise<WorkflowTrigger | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.config !== undefined) {
            updates.push(`config = $${paramIndex++}`);
            values.push(JSON.stringify(input.config));
        }

        if (input.enabled !== undefined) {
            updates.push(`enabled = $${paramIndex++}`);
            values.push(input.enabled);
        }

        if (input.last_triggered_at !== undefined) {
            updates.push(`last_triggered_at = $${paramIndex++}`);
            values.push(input.last_triggered_at);
        }

        if (input.next_scheduled_at !== undefined) {
            updates.push(`next_scheduled_at = $${paramIndex++}`);
            values.push(input.next_scheduled_at);
        }

        if (input.temporal_schedule_id !== undefined) {
            updates.push(`temporal_schedule_id = $${paramIndex++}`);
            values.push(input.temporal_schedule_id);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.workflow_triggers
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<any>(query, values);
        return result.rows.length > 0 ? this.mapTriggerRow(result.rows[0]) : null;
    }

    /**
     * Increment trigger count and update last_triggered_at
     */
    async recordTrigger(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.workflow_triggers
            SET
                trigger_count = trigger_count + 1,
                last_triggered_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    /**
     * Soft delete a trigger
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.workflow_triggers
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Hard delete a trigger
     */
    async hardDelete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.workflow_triggers
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    // ===== Trigger Execution Methods =====

    /**
     * Create a trigger execution record
     */
    async createExecution(input: CreateTriggerExecutionInput): Promise<TriggerExecution> {
        const query = `
            INSERT INTO flowmaestro.trigger_executions
                (trigger_id, execution_id, trigger_payload)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const values = [
            input.trigger_id,
            input.execution_id,
            input.trigger_payload ? JSON.stringify(input.trigger_payload) : null
        ];

        const result = await db.query<any>(query, values);
        return this.mapTriggerExecutionRow(result.rows[0]);
    }

    /**
     * Find executions for a trigger
     */
    async findExecutionsByTriggerId(
        triggerId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ executions: TriggerExecution[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.trigger_executions
            WHERE trigger_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.trigger_executions
            WHERE trigger_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [triggerId]),
            db.query<any>(query, [triggerId, limit, offset])
        ]);

        return {
            executions: executionsResult.rows.map((row) => this.mapTriggerExecutionRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    // ===== Webhook Log Methods =====

    /**
     * Create a webhook log entry
     */
    async createWebhookLog(input: CreateWebhookLogInput): Promise<WebhookLog> {
        const query = `
            INSERT INTO flowmaestro.webhook_logs
                (trigger_id, workflow_id, request_method, request_path, request_headers,
                 request_body, request_query, response_status, response_body, error,
                 execution_id, ip_address, user_agent, processing_time_ms)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const values = [
            input.trigger_id || null,
            input.workflow_id || null,
            input.request_method,
            input.request_path || null,
            input.request_headers ? JSON.stringify(input.request_headers) : null,
            input.request_body ? JSON.stringify(input.request_body) : null,
            input.request_query ? JSON.stringify(input.request_query) : null,
            input.response_status || null,
            input.response_body ? JSON.stringify(input.response_body) : null,
            input.error || null,
            input.execution_id || null,
            input.ip_address || null,
            input.user_agent || null,
            input.processing_time_ms || null
        ];

        const result = await db.query<any>(query, values);
        return this.mapWebhookLogRow(result.rows[0]);
    }

    /**
     * Find webhook logs for a trigger
     */
    async findWebhookLogsByTriggerId(
        triggerId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ logs: WebhookLog[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.webhook_logs
            WHERE trigger_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.webhook_logs
            WHERE trigger_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, logsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [triggerId]),
            db.query<any>(query, [triggerId, limit, offset])
        ]);

        return {
            logs: logsResult.rows.map((row) => this.mapWebhookLogRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    // ===== Private Helper Methods =====

    /**
     * Generate a secure webhook secret
     */
    private generateWebhookSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Map database row to WorkflowTrigger model
     */
    private mapTriggerRow(row: any): WorkflowTrigger {
        return {
            id: row.id,
            workflow_id: row.workflow_id,
            name: row.name,
            trigger_type: row.trigger_type as TriggerType,
            config: typeof row.config === "string" ? JSON.parse(row.config) : row.config,
            enabled: row.enabled,
            last_triggered_at: row.last_triggered_at ? new Date(row.last_triggered_at) : null,
            next_scheduled_at: row.next_scheduled_at ? new Date(row.next_scheduled_at) : null,
            trigger_count: parseInt(row.trigger_count) || 0,
            temporal_schedule_id: row.temporal_schedule_id,
            webhook_secret: row.webhook_secret,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }

    /**
     * Map database row to TriggerExecution model
     */
    private mapTriggerExecutionRow(row: any): TriggerExecution {
        return {
            id: row.id,
            trigger_id: row.trigger_id,
            execution_id: row.execution_id,
            trigger_payload: typeof row.trigger_payload === "string"
                ? JSON.parse(row.trigger_payload)
                : row.trigger_payload,
            created_at: new Date(row.created_at)
        };
    }

    /**
     * Map database row to WebhookLog model
     */
    private mapWebhookLogRow(row: any): WebhookLog {
        return {
            id: row.id.toString(),
            trigger_id: row.trigger_id,
            workflow_id: row.workflow_id,
            request_method: row.request_method,
            request_path: row.request_path,
            request_headers: typeof row.request_headers === "string"
                ? JSON.parse(row.request_headers)
                : row.request_headers,
            request_body: typeof row.request_body === "string"
                ? JSON.parse(row.request_body)
                : row.request_body,
            request_query: typeof row.request_query === "string"
                ? JSON.parse(row.request_query)
                : row.request_query,
            response_status: row.response_status,
            response_body: typeof row.response_body === "string"
                ? JSON.parse(row.response_body)
                : row.response_body,
            error: row.error,
            execution_id: row.execution_id,
            ip_address: row.ip_address,
            user_agent: row.user_agent,
            processing_time_ms: row.processing_time_ms,
            created_at: new Date(row.created_at)
        };
    }
}
