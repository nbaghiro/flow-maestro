import { gzipSync, gunzipSync } from "node:zlib";
import type { JsonValue, WorkflowDefinition } from "@flowmaestro/shared";
import { ForbiddenError, NotFoundError } from "../../api/middleware/error-handler";
import { db } from "../database";
import { WorkflowRepository } from "./WorkflowRepository";

// Maximum number of checkpoints to keep per workflow (oldest beyond this limit are auto-pruned)
const MAX_CHECKPOINTS_PER_WORKFLOW = 50;

interface CheckpointRow {
    id: string;
    workflow_id: string;
    created_by: string;
    name: string | null;
    description: string | null;
    snapshot: string | Record<string, JsonValue>;
    created_at: string | Date;
    deleted_at: string | Date | null;
}

export class CheckpointsRepository {
    private workflowRepository = new WorkflowRepository();

    async create(workflowId: string, userId: string, name?: string, description?: string) {
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow) {
            throw new NotFoundError("Workflow not found");
        }

        if (workflow.user_id !== userId) {
            throw new ForbiddenError("Access denied to this workflow");
        }

        // Compress the snapshot for storage efficiency
        const compressedSnapshot = this.compressSnapshot(workflow.definition);

        const insertQuery = `
            INSERT INTO flowmaestro.workflow_checkpoints (workflow_id, created_by, name, description, snapshot)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [workflowId, userId, name ?? null, description ?? null, compressedSnapshot];

        const result = await db.query<CheckpointRow>(insertQuery, values);

        // Auto-prune old checkpoints beyond the limit
        await this.pruneOldCheckpoints(workflowId);

        return this.mapRow(result.rows[0] as CheckpointRow);
    }

    async delete(id: string, userId: string) {
        const checkpointResult = await db.query<{ workflow_id: string }>(
            "SELECT workflow_id FROM flowmaestro.workflow_checkpoints WHERE id = $1 AND deleted_at IS NULL",
            [id]
        );

        if (checkpointResult.rowCount === 0) {
            throw new NotFoundError("Checkpoint not found");
        }

        const workflowId = checkpointResult.rows[0].workflow_id;
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow) {
            throw new NotFoundError("Workflow not found");
        }

        if (workflow.user_id !== userId) {
            throw new ForbiddenError("Access denied to this workflow");
        }

        await db.query(
            "UPDATE flowmaestro.workflow_checkpoints SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1",
            [id]
        );
    }

    async list(workflowId: string, userId: string) {
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow) {
            throw new NotFoundError("Workflow not found");
        }

        if (workflow.user_id !== userId) {
            throw new ForbiddenError("Access denied to this workflow");
        }

        const query = `
            SELECT *
            FROM flowmaestro.workflow_checkpoints
            WHERE workflow_id = $1
                AND deleted_at IS NULL
            ORDER BY created_at DESC
        `;

        const result = await db.query<CheckpointRow>(query, [workflowId]);

        return result.rows.map((row) => this.mapRow(row as CheckpointRow));
    }

    async get(id: string, userId: string) {
        const checkpointResult = await db.query<CheckpointRow>(
            `
            SELECT *
            FROM flowmaestro.workflow_checkpoints
            WHERE id = $1
                AND deleted_at IS NULL
            `,
            [id]
        );

        if (checkpointResult.rowCount === 0) {
            throw new NotFoundError("Checkpoint not found");
        }

        const checkpoint = checkpointResult.rows[0];
        const workflow = await this.workflowRepository.findById(checkpoint.workflow_id);

        if (!workflow) {
            throw new NotFoundError("Workflow not found");
        }

        if (workflow.user_id !== userId) {
            throw new ForbiddenError("Access denied to this workflow");
        }

        return this.mapRow(checkpoint as CheckpointRow);
    }

    async rename(id: string, userId: string, newName: string) {
        const checkpointResult = await db.query<{ workflow_id: string }>(
            "SELECT workflow_id FROM flowmaestro.workflow_checkpoints WHERE id = $1 AND deleted_at IS NULL",
            [id]
        );

        if (checkpointResult.rowCount === 0) {
            throw new NotFoundError("Checkpoint not found");
        }

        const workflowId = checkpointResult.rows[0].workflow_id;
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow) {
            throw new NotFoundError("Workflow not found");
        }

        if (workflow.user_id !== userId) {
            throw new ForbiddenError("Access denied to this workflow");
        }

        const result = await db.query(
            `
            UPDATE flowmaestro.workflow_checkpoints
            SET name = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [id, newName]
        );

        const updated = result.rows[0] as CheckpointRow;
        return this.mapRow(updated);
    }

    /**
     * Auto-prune checkpoints beyond the limit, keeping the most recent ones.
     * Soft-deletes the oldest checkpoints.
     */
    private async pruneOldCheckpoints(workflowId: string): Promise<void> {
        await db.query(
            `
            UPDATE flowmaestro.workflow_checkpoints
            SET deleted_at = NOW(), updated_at = NOW()
            WHERE id IN (
                SELECT id FROM flowmaestro.workflow_checkpoints
                WHERE workflow_id = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                OFFSET $2
            )
            `,
            [workflowId, MAX_CHECKPOINTS_PER_WORKFLOW]
        );
    }

    /**
     * Compress snapshot JSON for storage efficiency.
     * Stores as base64-encoded gzip with a prefix marker.
     */
    private compressSnapshot(definition: WorkflowDefinition): string {
        const jsonStr = JSON.stringify(definition);
        const compressed = gzipSync(Buffer.from(jsonStr, "utf-8"));
        return JSON.stringify({ __compressed: true, data: compressed.toString("base64") });
    }

    /**
     * Decompress snapshot if compressed, otherwise parse as regular JSON.
     */
    private decompressSnapshot(snapshot: string | Record<string, JsonValue>): WorkflowDefinition {
        if (typeof snapshot === "string") {
            const parsed = JSON.parse(snapshot) as Record<string, unknown>;
            if (parsed.__compressed && parsed.data) {
                const decompressed = gunzipSync(Buffer.from(parsed.data as string, "base64"));
                return JSON.parse(decompressed.toString("utf-8")) as WorkflowDefinition;
            }
            return parsed as unknown as WorkflowDefinition;
        }

        // Handle JSONB that's already parsed by pg driver
        if (snapshot && typeof snapshot === "object" && "__compressed" in snapshot) {
            const compressedData = snapshot as { __compressed: boolean; data: string };
            if (compressedData.__compressed && compressedData.data) {
                const decompressed = gunzipSync(Buffer.from(compressedData.data, "base64"));
                return JSON.parse(decompressed.toString("utf-8")) as WorkflowDefinition;
            }
        }

        return snapshot as unknown as WorkflowDefinition;
    }

    private mapRow(row: CheckpointRow) {
        return {
            ...row,
            snapshot: this.decompressSnapshot(row.snapshot),
            created_at: new Date(row.created_at)
        };
    }
}
