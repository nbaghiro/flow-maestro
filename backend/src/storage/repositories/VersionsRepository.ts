import type { JsonValue } from "@flowmaestro/shared";
import { db } from "../database";
import { WorkflowRepository } from "./WorkflowRepository";

interface VersionRow {
    id: string;
    workflow_id: string;
    created_by: string;
    name: string | null;
    description: string | null;
    snapshot: string | Record<string, JsonValue>;
    created_at: string | Date;
    deleted_at: string | Date | null;
}

export class VersionsRepository {
    private workflowRepository = new WorkflowRepository();

    async create(workflowId: string, userId: string, name?: string, description?: string) {
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow || workflow.user_id !== userId) {
            throw new Error("Workflow not found");
        }

        const insertQuery = `
            INSERT INTO flowmaestro.workflow_versions (workflow_id, created_by, name, description, snapshot)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [
            workflowId,
            userId,
            name ?? null,
            description ?? null,
            JSON.stringify(workflow.definition)
        ];

        const result = await db.query<VersionRow>(insertQuery, values);
        return this.mapRow(result.rows[0] as VersionRow);
    }

    async delete(id: string, userId: string) {
        const versionResult = await db.query<{ workflow_id: string }>(
            "SELECT workflow_id FROM flowmaestro.workflow_versions WHERE id = $1",
            [id]
        );

        if (versionResult.rowCount === 0) {
            throw new Error("Workflow not found");
        }

        const workflowId = versionResult.rows[0].workflow_id;
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow || workflow.user_id !== userId) {
            throw new Error("Workflow not found");
        }

        await db.query(
            "UPDATE flowmaestro.workflow_versions SET deleted_at = NOW() WHERE id = $1",
            [id]
        );
    }

    async list(workflowId: string, userId: string) {
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow || workflow.user_id !== userId) {
            throw new Error("Workflow not found");
        }

        const query = `
            SELECT *
            FROM flowmaestro.workflow_versions
            WHERE workflow_id = $1
                AND deleted_at IS NULL
            ORDER BY created_at DESC
        `;

        const result = await db.query<VersionRow>(query, [workflowId]);

        return result.rows.map((row) => this.mapRow(row as VersionRow));
    }

    async get(id: string, userId: string) {
        const versionResult = await db.query<VersionRow>(
            `
            SELECT *
            FROM flowmaestro.workflow_versions
            WHERE id = $1
                AND deleted_at IS NULL
            `,
            [id]
        );

        if (versionResult.rowCount === 0) {
            throw new Error("Version not found");
        }

        const version = versionResult.rows[0];
        const workflow = await this.workflowRepository.findById(version.workflow_id);

        if (!workflow || workflow.user_id !== userId) {
            throw new Error("Workflow not found");
        }

        return this.mapRow(version as VersionRow);
    }

    async rename(id: string, userId: string, newName: string) {
        const versionResult = await db.query<{ workflow_id: string }>(
            "SELECT workflow_id from flowmaestro.workflow_versions WHERE id = $1",
            [id]
        );

        if (versionResult.rowCount === 0) {
            throw new Error("Workflow not found");
        }

        const workflowId = versionResult.rows[0].workflow_id;
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow || workflow.user_id !== userId) {
            throw new Error("Workflow not found");
        }

        const result = await db.query(
            `
            UPDATE flowmaestro.workflow_versions
            SET name = $2
            WHERE id = $1
            RETURNING *
            `,
            [id, newName]
        );

        const updated = result.rows[0] as VersionRow;
        return this.mapRow(updated);
    }

    private mapRow(row: VersionRow) {
        return {
            ...row,
            snapshot: typeof row.snapshot === "string" ? JSON.parse(row.snapshot) : row.snapshot,
            created_at: new Date(row.created_at)
        };
    }
}
