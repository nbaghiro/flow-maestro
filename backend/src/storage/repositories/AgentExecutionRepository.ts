import { db } from "../database";
import {
    AgentExecutionModel,
    AgentMessageModel,
    CreateAgentExecutionInput,
    UpdateAgentExecutionInput,
    CreateAgentMessageInput
} from "../models/AgentExecution";

export class AgentExecutionRepository {
    async create(input: CreateAgentExecutionInput): Promise<AgentExecutionModel> {
        const query = `
            INSERT INTO flowmaestro.agent_executions (
                agent_id, user_id, status, conversation_history,
                iterations, tool_calls_count, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.agent_id,
            input.user_id,
            input.status || "running",
            JSON.stringify(input.conversation_history || []),
            input.iterations || 0,
            input.tool_calls_count || 0,
            JSON.stringify(input.metadata || {})
        ];

        const result = await db.query<AgentExecutionModel>(query, values);
        return this.mapExecutionRow(result.rows[0]);
    }

    async findById(id: string): Promise<AgentExecutionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.agent_executions
            WHERE id = $1
        `;

        const result = await db.query<AgentExecutionModel>(query, [id]);
        return result.rows.length > 0 ? this.mapExecutionRow(result.rows[0]) : null;
    }

    async findByIdAndUserId(id: string, userId: string): Promise<AgentExecutionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.agent_executions
            WHERE id = $1 AND user_id = $2
        `;

        const result = await db.query<AgentExecutionModel>(query, [id, userId]);
        return result.rows.length > 0 ? this.mapExecutionRow(result.rows[0]) : null;
    }

    async findByAgentId(
        agentId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ executions: AgentExecutionModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.agent_executions
            WHERE agent_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.agent_executions
            WHERE agent_id = $1
            ORDER BY started_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [agentId]),
            db.query<AgentExecutionModel>(query, [agentId, limit, offset])
        ]);

        return {
            executions: executionsResult.rows.map((row) => this.mapExecutionRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ executions: AgentExecutionModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.agent_executions
            WHERE user_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.agent_executions
            WHERE user_id = $1
            ORDER BY started_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [userId]),
            db.query<AgentExecutionModel>(query, [userId, limit, offset])
        ]);

        return {
            executions: executionsResult.rows.map((row) => this.mapExecutionRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(id: string, input: UpdateAgentExecutionInput): Promise<AgentExecutionModel | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.conversation_history !== undefined) {
            updates.push(`conversation_history = $${paramIndex++}`);
            values.push(JSON.stringify(input.conversation_history));
        }

        if (input.iterations !== undefined) {
            updates.push(`iterations = $${paramIndex++}`);
            values.push(input.iterations);
        }

        if (input.tool_calls_count !== undefined) {
            updates.push(`tool_calls_count = $${paramIndex++}`);
            values.push(input.tool_calls_count);
        }

        if (input.completed_at !== undefined) {
            updates.push(`completed_at = $${paramIndex++}`);
            values.push(input.completed_at);
        }

        if (input.error !== undefined) {
            updates.push(`error = $${paramIndex++}`);
            values.push(input.error);
        }

        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(input.metadata));
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.agent_executions
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<AgentExecutionModel>(query, values);
        return result.rows.length > 0 ? this.mapExecutionRow(result.rows[0]) : null;
    }

    async addMessage(input: CreateAgentMessageInput): Promise<AgentMessageModel> {
        const query = `
            INSERT INTO flowmaestro.agent_messages (
                execution_id, role, content, tool_calls, tool_name, tool_call_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.execution_id,
            input.role,
            input.content,
            input.tool_calls ? JSON.stringify(input.tool_calls) : null,
            input.tool_name || null,
            input.tool_call_id || null
        ];

        const result = await db.query<AgentMessageModel>(query, values);
        return this.mapMessageRow(result.rows[0]);
    }

    async getMessages(
        executionId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<AgentMessageModel[]> {
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        const query = `
            SELECT * FROM flowmaestro.agent_messages
            WHERE execution_id = $1
            ORDER BY created_at ASC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query<AgentMessageModel>(query, [executionId, limit, offset]);
        return result.rows.map((row) => this.mapMessageRow(row));
    }

    async deleteExecution(id: string): Promise<boolean> {
        // This will cascade delete messages
        const query = `
            DELETE FROM flowmaestro.agent_executions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    private mapExecutionRow(row: any): AgentExecutionModel {
        return {
            ...row,
            conversation_history: typeof row.conversation_history === "string"
                ? JSON.parse(row.conversation_history)
                : row.conversation_history,
            metadata: typeof row.metadata === "string"
                ? JSON.parse(row.metadata)
                : row.metadata,
            started_at: new Date(row.started_at),
            completed_at: row.completed_at ? new Date(row.completed_at) : null
        };
    }

    private mapMessageRow(row: any): AgentMessageModel {
        return {
            ...row,
            tool_calls: row.tool_calls
                ? (typeof row.tool_calls === "string" ? JSON.parse(row.tool_calls) : row.tool_calls)
                : null,
            created_at: new Date(row.created_at)
        };
    }
}
