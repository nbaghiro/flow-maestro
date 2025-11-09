/**
 * WorkingMemoryRepository - Database access for agent working memory
 */

import { db } from "../database";
import type { JsonObject } from "@flowmaestro/shared";

export interface WorkingMemory {
    agentId: string;
    userId: string;
    workingMemory: string;
    updatedAt: Date;
    createdAt: Date;
    metadata: JsonObject;
}

export interface CreateWorkingMemoryInput {
    agentId: string;
    userId: string;
    workingMemory: string;
    metadata?: JsonObject;
}

export interface UpdateWorkingMemoryInput {
    agentId: string;
    userId: string;
    workingMemory: string;
    metadata?: JsonObject;
}

export class WorkingMemoryRepository {
    /**
     * Get working memory for an agent-user pair
     */
    async get(agentId: string, userId: string): Promise<WorkingMemory | null> {
        const result = await db.query<{
            agent_id: string;
            user_id: string;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            SELECT agent_id, user_id, working_memory, updated_at, created_at, metadata
            FROM flowmaestro.agent_working_memory
            WHERE agent_id = $1 AND user_id = $2
            `,
            [agentId, userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            agentId: row.agent_id,
            userId: row.user_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        };
    }

    /**
     * Create working memory
     */
    async create(input: CreateWorkingMemoryInput): Promise<WorkingMemory> {
        const result = await db.query<{
            agent_id: string;
            user_id: string;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            INSERT INTO flowmaestro.agent_working_memory (agent_id, user_id, working_memory, metadata)
            VALUES ($1, $2, $3, $4)
            RETURNING agent_id, user_id, working_memory, updated_at, created_at, metadata
            `,
            [input.agentId, input.userId, input.workingMemory, input.metadata || {}]
        );

        const row = result.rows[0];
        return {
            agentId: row.agent_id,
            userId: row.user_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        };
    }

    /**
     * Update working memory (upsert)
     */
    async update(input: UpdateWorkingMemoryInput): Promise<WorkingMemory> {
        const result = await db.query<{
            agent_id: string;
            user_id: string;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            INSERT INTO flowmaestro.agent_working_memory (agent_id, user_id, working_memory, metadata, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (agent_id, user_id)
            DO UPDATE SET
                working_memory = EXCLUDED.working_memory,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING agent_id, user_id, working_memory, updated_at, created_at, metadata
            `,
            [input.agentId, input.userId, input.workingMemory, input.metadata || {}]
        );

        const row = result.rows[0];
        return {
            agentId: row.agent_id,
            userId: row.user_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        };
    }

    /**
     * Delete working memory
     */
    async delete(agentId: string, userId: string): Promise<boolean> {
        const result = await db.query(
            `
            DELETE FROM flowmaestro.agent_working_memory
            WHERE agent_id = $1 AND user_id = $2
            `,
            [agentId, userId]
        );

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * List all working memory for an agent
     */
    async listByAgent(agentId: string): Promise<WorkingMemory[]> {
        const result = await db.query<{
            agent_id: string;
            user_id: string;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            SELECT agent_id, user_id, working_memory, updated_at, created_at, metadata
            FROM flowmaestro.agent_working_memory
            WHERE agent_id = $1
            ORDER BY updated_at DESC
            `,
            [agentId]
        );

        return result.rows.map((row) => ({
            agentId: row.agent_id,
            userId: row.user_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        }));
    }

    /**
     * List all working memory for a user (across agents)
     */
    async listByUser(userId: string): Promise<WorkingMemory[]> {
        const result = await db.query<{
            agent_id: string;
            user_id: string;
            working_memory: string;
            updated_at: Date;
            created_at: Date;
            metadata: JsonObject;
        }>(
            `
            SELECT agent_id, user_id, working_memory, updated_at, created_at, metadata
            FROM flowmaestro.agent_working_memory
            WHERE user_id = $1
            ORDER BY updated_at DESC
            `,
            [userId]
        );

        return result.rows.map((row) => ({
            agentId: row.agent_id,
            userId: row.user_id,
            workingMemory: row.working_memory,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            metadata: row.metadata
        }));
    }
}
