import { db } from "../database";
import { IntegrationModel, CreateIntegrationInput, UpdateIntegrationInput } from "../models/Integration";

export class IntegrationRepository {
    async create(input: CreateIntegrationInput): Promise<IntegrationModel> {
        const query = `
            INSERT INTO flowmaestro.integrations (name, type, config, credentials, user_id, enabled)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.name,
            input.type,
            JSON.stringify(input.config),
            JSON.stringify(input.credentials),
            input.user_id,
            input.enabled !== undefined ? input.enabled : true
        ];

        const result = await db.query<IntegrationModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<IntegrationModel | null> {
        const query = `
            SELECT * FROM flowmaestro.integrations
            WHERE id = $1
        `;

        const result = await db.query<IntegrationModel>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number; type?: string } = {}
    ): Promise<{ integrations: IntegrationModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.integrations
            WHERE user_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.integrations
            WHERE user_id = $1
        `;

        const countParams: any[] = [userId];
        const queryParams: any[] = [userId];

        // Add type filter if provided
        if (options.type) {
            countQuery += ` AND type = $2`;
            query += ` AND type = $2`;
            countParams.push(options.type);
            queryParams.push(options.type);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const [countResult, integrationsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query<IntegrationModel>(query, queryParams)
        ]);

        return {
            integrations: integrationsResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findByType(type: string): Promise<IntegrationModel[]> {
        const query = `
            SELECT * FROM flowmaestro.integrations
            WHERE type = $1 AND enabled = true
            ORDER BY created_at DESC
        `;

        const result = await db.query<IntegrationModel>(query, [type]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async update(id: string, input: UpdateIntegrationInput): Promise<IntegrationModel | null> {
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

        if (input.credentials !== undefined) {
            updates.push(`credentials = $${paramIndex++}`);
            values.push(JSON.stringify(input.credentials));
        }

        if (input.enabled !== undefined) {
            updates.push(`enabled = $${paramIndex++}`);
            values.push(input.enabled);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.integrations
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<IntegrationModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.integrations
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    private mapRow(row: any): IntegrationModel {
        return {
            ...row,
            config: typeof row.config === "string"
                ? JSON.parse(row.config)
                : row.config,
            credentials: typeof row.credentials === "string"
                ? JSON.parse(row.credentials)
                : row.credentials,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }
}
