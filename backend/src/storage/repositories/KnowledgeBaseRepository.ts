import { db } from "../database";
import {
    KnowledgeBaseModel,
    CreateKnowledgeBaseInput,
    UpdateKnowledgeBaseInput,
    KnowledgeBaseStats,
    KnowledgeBaseConfig
} from "../models/KnowledgeBase";

const DEFAULT_CONFIG: KnowledgeBaseConfig = {
    embeddingModel: "text-embedding-3-small",
    embeddingProvider: "openai",
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingDimensions: 1536
};

export class KnowledgeBaseRepository {
    async create(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseModel> {
        const config = { ...DEFAULT_CONFIG, ...input.config };

        const query = `
            INSERT INTO flowmaestro.knowledge_bases (user_id, name, description, config)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.name,
            input.description || null,
            JSON.stringify(config)
        ];

        const result = await db.query<KnowledgeBaseModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<KnowledgeBaseModel | null> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_bases
            WHERE id = $1
        `;

        const result = await db.query<KnowledgeBaseModel>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ knowledgeBases: KnowledgeBaseModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.knowledge_bases
            WHERE user_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.knowledge_bases
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, kbResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [userId]),
            db.query<KnowledgeBaseModel>(query, [userId, limit, offset])
        ]);

        return {
            knowledgeBases: kbResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(id: string, input: UpdateKnowledgeBaseInput): Promise<KnowledgeBaseModel | null> {
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

        if (input.config !== undefined) {
            // Merge with existing config
            const existing = await this.findById(id);
            if (existing) {
                const mergedConfig = { ...existing.config, ...input.config };
                updates.push(`config = $${paramIndex++}`);
                values.push(JSON.stringify(mergedConfig));
            }
        }

        // Always update updated_at
        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        if (updates.length === 1) {
            // Only updated_at, no actual changes
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.knowledge_bases
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<KnowledgeBaseModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        // Hard delete - cascades to documents and chunks via foreign key constraints
        const query = `
            DELETE FROM flowmaestro.knowledge_bases
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async getStats(id: string): Promise<KnowledgeBaseStats | null> {
        const query = `
            SELECT
                kb.id,
                kb.name,
                COUNT(DISTINCT kd.id) as document_count,
                COUNT(kc.id) as chunk_count,
                COALESCE(SUM(kd.file_size), 0) as total_size_bytes,
                MAX(GREATEST(kb.updated_at, kd.updated_at)) as last_updated
            FROM flowmaestro.knowledge_bases kb
            LEFT JOIN flowmaestro.knowledge_documents kd ON kb.id = kd.knowledge_base_id
            LEFT JOIN flowmaestro.knowledge_chunks kc ON kb.id = kc.knowledge_base_id
            WHERE kb.id = $1
            GROUP BY kb.id, kb.name
        `;

        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            document_count: parseInt(row.document_count || '0'),
            chunk_count: parseInt(row.chunk_count || '0'),
            total_size_bytes: parseInt(row.total_size_bytes || '0'),
            last_updated: new Date(row.last_updated)
        };
    }

    private mapRow(row: any): KnowledgeBaseModel {
        return {
            ...row,
            config: typeof row.config === "string"
                ? JSON.parse(row.config)
                : row.config,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }
}
