import type { JsonValue } from "@flowmaestro/shared";
import { db } from "../database";
import { WorkflowRepository } from "./WorkflowRepository";

interface VersionRow {
    id: string;
    workflow_id: string;
    version_number: number;
    name: string | null;
    snapshot: string | Record<string, JsonValue>;
    created_at: string | Date;
}

export class VersionsRepository {
    private workflowRepository = new WorkflowRepository();

    async create(workflowId: string, userId: string, name?: string) {
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow || workflow.user_id !== userId) {
            throw new Error("Workflow not found");
        }

        const versionQuery = `
            SELECT COALESCE(MAX(version_number), 0) + 1 AS next
            FROM flowmaestro.workflow_versions
            WHERE workflow_id = $1
        `;

        const versionResult = await db.query<{ next: number }>(versionQuery, [workflowId]);
        const nextVersion = versionResult.rows[0].next;

        const insertQuery = `
            INSERT INTO flowmaestro.workflow_versions (workflow_id, version_number, name, snapshot)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [workflowId, nextVersion, name ?? null, JSON.stringify(workflow.definition)];

        const result = await db.query<VersionRow>(insertQuery, values);
        return this.mapRow(result.rows[0] as VersionRow);
    }

    async delete(id: string, userId: string) {
        const versionResult = await db.query<VersionRow>(
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

        await db.query("DELETE FROM flowmaestro.workflow_versions WHERE id = $1", [id]);
    }

    async list(workflowId: string, userId: string) {
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow || workflow.user_id !== userId) {
            throw new Error("Worklow not found");
        }

        const query = `
            SELECT *
            FROM flowmaestro.workflow_versions
            WHERE workflow_id = $1
            ORDER BY version_number DESC
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

    private mapRow(row: VersionRow) {
        return {
            ...row,
            name: row.name,
            snapshot: typeof row.snapshot === "string" ? JSON.parse(row.snapshot) : row.snapshot,
            created_at: new Date(row.created_at)
        };
    }
}
