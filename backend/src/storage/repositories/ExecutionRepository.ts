import { db } from "../database";
import { ExecutionModel, CreateExecutionInput, UpdateExecutionInput } from "../models/Execution";
import { ExecutionStatus } from "@flowmaestro/shared";

export class ExecutionRepository {
    async create(input: CreateExecutionInput): Promise<ExecutionModel> {
        const query = `
            INSERT INTO flowmaestro.executions (workflow_id, inputs, status)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const values = [
            input.workflow_id,
            input.inputs ? JSON.stringify(input.inputs) : null,
            "pending" as ExecutionStatus
        ];

        const result = await db.query<ExecutionModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<ExecutionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.executions
            WHERE id = $1
        `;

        const result = await db.query<ExecutionModel>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByWorkflowId(
        workflowId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ executions: ExecutionModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.executions
            WHERE workflow_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.executions
            WHERE workflow_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [workflowId]),
            db.query<ExecutionModel>(query, [workflowId, limit, offset])
        ]);

        return {
            executions: executionsResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findByStatus(
        status: ExecutionStatus,
        options: { limit?: number; offset?: number } = {}
    ): Promise<ExecutionModel[]> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const query = `
            SELECT * FROM flowmaestro.executions
            WHERE status = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query<ExecutionModel>(query, [status, limit, offset]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async update(id: string, input: UpdateExecutionInput): Promise<ExecutionModel | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.outputs !== undefined) {
            updates.push(`outputs = $${paramIndex++}`);
            values.push(JSON.stringify(input.outputs));
        }

        if (input.current_state !== undefined) {
            updates.push(`current_state = $${paramIndex++}`);
            values.push(JSON.stringify(input.current_state));
        }

        if (input.error !== undefined) {
            updates.push(`error = $${paramIndex++}`);
            values.push(input.error);
        }

        if (input.started_at !== undefined) {
            updates.push(`started_at = $${paramIndex++}`);
            values.push(input.started_at);
        }

        if (input.completed_at !== undefined) {
            updates.push(`completed_at = $${paramIndex++}`);
            values.push(input.completed_at);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.executions
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<ExecutionModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.executions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async getLogs(
        executionId: string,
        options: { limit?: number; offset?: number; level?: string; nodeId?: string } = {}
    ): Promise<{ logs: any[]; total: number }> {
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.execution_logs
            WHERE execution_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.execution_logs
            WHERE execution_id = $1
        `;

        const countParams: any[] = [executionId];
        const queryParams: any[] = [executionId];
        let paramIndex = 2;

        if (options.level) {
            countQuery += ` AND level = $${paramIndex}`;
            query += ` AND level = $${paramIndex}`;
            countParams.push(options.level);
            queryParams.push(options.level);
            paramIndex++;
        }

        if (options.nodeId) {
            countQuery += ` AND node_id = $${paramIndex}`;
            query += ` AND node_id = $${paramIndex}`;
            countParams.push(options.nodeId);
            queryParams.push(options.nodeId);
            paramIndex++;
        }

        query += ` ORDER BY created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const [countResult, logsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query<any>(query, queryParams)
        ]);

        return {
            logs: logsResult.rows.map((row) => ({
                ...row,
                metadata: row.metadata ? (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) : null,
                created_at: new Date(row.created_at)
            })),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findAll(
        options: { limit?: number; offset?: number; status?: ExecutionStatus } = {}
    ): Promise<{ executions: ExecutionModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.executions
        `;

        let query = `
            SELECT * FROM flowmaestro.executions
        `;

        const countParams: any[] = [];
        const queryParams: any[] = [];

        if (options.status) {
            countQuery += ` WHERE status = $1`;
            query += ` WHERE status = $1`;
            countParams.push(options.status);
            queryParams.push(options.status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams.length > 0 ? countParams : undefined),
            db.query<ExecutionModel>(query, queryParams)
        ]);

        return {
            executions: executionsResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    private mapRow(row: any): ExecutionModel {
        return {
            ...row,
            inputs: row.inputs ? (typeof row.inputs === "string" ? JSON.parse(row.inputs) : row.inputs) : null,
            outputs: row.outputs ? (typeof row.outputs === "string" ? JSON.parse(row.outputs) : row.outputs) : null,
            current_state: row.current_state ? (typeof row.current_state === "string" ? JSON.parse(row.current_state) : row.current_state) : null,
            created_at: new Date(row.created_at),
            started_at: row.started_at ? new Date(row.started_at) : null,
            completed_at: row.completed_at ? new Date(row.completed_at) : null
        };
    }
}
