import { db } from "../database";
import {
    KnowledgeDocumentModel,
    CreateKnowledgeDocumentInput,
    UpdateKnowledgeDocumentInput,
    DocumentStatus
} from "../models/KnowledgeDocument";

export class KnowledgeDocumentRepository {
    async create(input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocumentModel> {
        const query = `
            INSERT INTO flowmaestro.knowledge_documents
            (knowledge_base_id, name, source_type, source_url, file_path, file_type, file_size, metadata, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            input.knowledge_base_id,
            input.name,
            input.source_type,
            input.source_url || null,
            input.file_path || null,
            input.file_type,
            input.file_size || null,
            JSON.stringify(input.metadata || {}),
            'pending' // Initial status
        ];

        const result = await db.query<KnowledgeDocumentModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<KnowledgeDocumentModel | null> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_documents
            WHERE id = $1
        `;

        const result = await db.query<KnowledgeDocumentModel>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByKnowledgeBaseId(
        knowledgeBaseId: string,
        options: { limit?: number; offset?: number; status?: DocumentStatus } = {}
    ): Promise<{ documents: KnowledgeDocumentModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.knowledge_documents
            WHERE knowledge_base_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.knowledge_documents
            WHERE knowledge_base_id = $1
        `;

        const countValues: any[] = [knowledgeBaseId];
        const queryValues: any[] = [knowledgeBaseId];

        if (options.status) {
            countQuery += ` AND status = $2`;
            query += ` AND status = $2`;
            countValues.push(options.status);
            queryValues.push(options.status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryValues.length + 1} OFFSET $${queryValues.length + 2}`;
        queryValues.push(limit, offset);

        const [countResult, documentsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countValues),
            db.query<KnowledgeDocumentModel>(query, queryValues)
        ]);

        return {
            documents: documentsResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(id: string, input: UpdateKnowledgeDocumentInput): Promise<KnowledgeDocumentModel | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.content !== undefined) {
            updates.push(`content = $${paramIndex++}`);
            values.push(input.content);
        }

        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(input.metadata));
        }

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.error_message !== undefined) {
            updates.push(`error_message = $${paramIndex++}`);
            values.push(input.error_message);
        }

        if (input.processing_started_at !== undefined) {
            updates.push(`processing_started_at = $${paramIndex++}`);
            values.push(input.processing_started_at);
        }

        if (input.processing_completed_at !== undefined) {
            updates.push(`processing_completed_at = $${paramIndex++}`);
            values.push(input.processing_completed_at);
        }

        // Always update updated_at
        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        if (updates.length === 1) {
            // Only updated_at, no actual changes
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.knowledge_documents
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<KnowledgeDocumentModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        // Hard delete - cascades to chunks via foreign key constraints
        const query = `
            DELETE FROM flowmaestro.knowledge_documents
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async updateStatus(
        id: string,
        status: DocumentStatus,
        errorMessage?: string
    ): Promise<KnowledgeDocumentModel | null> {
        const updates: string[] = [`status = $1`];
        const values: any[] = [status];
        let paramIndex = 2;

        if (status === 'processing') {
            updates.push(`processing_started_at = CURRENT_TIMESTAMP`);
        } else if (status === 'ready' || status === 'failed') {
            updates.push(`processing_completed_at = CURRENT_TIMESTAMP`);
        }

        if (errorMessage !== undefined) {
            updates.push(`error_message = $${paramIndex++}`);
            values.push(errorMessage);
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE flowmaestro.knowledge_documents
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<KnowledgeDocumentModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async deleteByKnowledgeBaseId(knowledgeBaseId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.knowledge_documents
            WHERE knowledge_base_id = $1
        `;

        const result = await db.query(query, [knowledgeBaseId]);
        return result.rowCount || 0;
    }

    private mapRow(row: any): KnowledgeDocumentModel {
        return {
            ...row,
            metadata: typeof row.metadata === "string"
                ? JSON.parse(row.metadata)
                : row.metadata,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            processing_started_at: row.processing_started_at ? new Date(row.processing_started_at) : null,
            processing_completed_at: row.processing_completed_at ? new Date(row.processing_completed_at) : null
        };
    }
}
