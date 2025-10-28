import { db } from "../database";
import { WorkflowModel, CreateWorkflowInput, UpdateWorkflowInput } from "../models/Workflow";

export class WorkflowRepository {
    async create(input: CreateWorkflowInput): Promise<WorkflowModel> {
        const query = `
            INSERT INTO flowmaestro.workflows (name, description, definition, user_id, ai_generated, ai_prompt)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.name,
            input.description || null,
            JSON.stringify(input.definition),
            input.user_id,
            input.ai_generated || false,
            input.ai_prompt || null
        ];

        const result = await db.query<WorkflowModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<WorkflowModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workflows
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<WorkflowModel>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ workflows: WorkflowModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.workflows
            WHERE user_id = $1 AND deleted_at IS NULL
        `;

        const query = `
            SELECT * FROM flowmaestro.workflows
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, workflowsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [userId]),
            db.query<WorkflowModel>(query, [userId, limit, offset])
        ]);

        return {
            workflows: workflowsResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(id: string, input: UpdateWorkflowInput): Promise<WorkflowModel | null> {
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

        if (input.definition !== undefined) {
            updates.push(`definition = $${paramIndex++}`);
            values.push(JSON.stringify(input.definition));
        }

        if (input.version !== undefined) {
            updates.push(`version = $${paramIndex++}`);
            values.push(input.version);
        }

        if (input.ai_generated !== undefined) {
            updates.push(`ai_generated = $${paramIndex++}`);
            values.push(input.ai_generated);
        }

        if (input.ai_prompt !== undefined) {
            updates.push(`ai_prompt = $${paramIndex++}`);
            values.push(input.ai_prompt);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.workflows
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<WorkflowModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.workflows
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async hardDelete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.workflows
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    private mapRow(row: any): WorkflowModel {
        return {
            ...row,
            definition: typeof row.definition === "string"
                ? JSON.parse(row.definition)
                : row.definition,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }
}
