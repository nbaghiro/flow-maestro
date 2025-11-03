import { db } from "../database";
import { AgentModel, CreateAgentInput, UpdateAgentInput } from "../models/Agent";

export class AgentRepository {
    async create(input: CreateAgentInput): Promise<AgentModel> {
        const query = `
            INSERT INTO flowmaestro.agents (
                user_id, name, description, model, provider, connection_id,
                system_prompt, temperature, max_tokens, max_iterations,
                available_tools, memory_config, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.name,
            input.description || null,
            input.model,
            input.provider,
            input.connection_id || null,
            input.system_prompt,
            input.temperature !== undefined ? input.temperature : 0.7,
            input.max_tokens || 4000,
            input.max_iterations || 100,
            JSON.stringify(input.available_tools || []),
            JSON.stringify(input.memory_config || { type: "buffer", max_messages: 20 }),
            JSON.stringify(input.metadata || {})
        ];

        const result = await db.query<AgentModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<AgentModel | null> {
        const query = `
            SELECT * FROM flowmaestro.agents
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<AgentModel>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByIdAndUserId(id: string, userId: string): Promise<AgentModel | null> {
        const query = `
            SELECT * FROM flowmaestro.agents
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query<AgentModel>(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ agents: AgentModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.agents
            WHERE user_id = $1 AND deleted_at IS NULL
        `;

        const query = `
            SELECT * FROM flowmaestro.agents
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, agentsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [userId]),
            db.query<AgentModel>(query, [userId, limit, offset])
        ]);

        return {
            agents: agentsResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(id: string, input: UpdateAgentInput): Promise<AgentModel | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(input.description);
        }

        if (input.model !== undefined) {
            updates.push(`model = $${paramIndex++}`);
            values.push(input.model);
        }

        if (input.provider !== undefined) {
            updates.push(`provider = $${paramIndex++}`);
            values.push(input.provider);
        }

        if (input.connection_id !== undefined) {
            updates.push(`connection_id = $${paramIndex++}`);
            values.push(input.connection_id);
        }

        if (input.system_prompt !== undefined) {
            updates.push(`system_prompt = $${paramIndex++}`);
            values.push(input.system_prompt);
        }

        if (input.temperature !== undefined) {
            updates.push(`temperature = $${paramIndex++}`);
            values.push(input.temperature);
        }

        if (input.max_tokens !== undefined) {
            updates.push(`max_tokens = $${paramIndex++}`);
            values.push(input.max_tokens);
        }

        if (input.max_iterations !== undefined) {
            updates.push(`max_iterations = $${paramIndex++}`);
            values.push(input.max_iterations);
        }

        if (input.available_tools !== undefined) {
            updates.push(`available_tools = $${paramIndex++}`);
            values.push(JSON.stringify(input.available_tools));
        }

        if (input.memory_config !== undefined) {
            updates.push(`memory_config = $${paramIndex++}`);
            values.push(JSON.stringify(input.memory_config));
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
            UPDATE flowmaestro.agents
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<AgentModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.agents
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async hardDelete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.agents
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    private mapRow(row: any): AgentModel {
        return {
            ...row,
            available_tools: typeof row.available_tools === "string"
                ? JSON.parse(row.available_tools)
                : row.available_tools,
            memory_config: typeof row.memory_config === "string"
                ? JSON.parse(row.memory_config)
                : row.memory_config,
            metadata: typeof row.metadata === "string"
                ? JSON.parse(row.metadata)
                : row.metadata,
            temperature: parseFloat(row.temperature),
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }
}
