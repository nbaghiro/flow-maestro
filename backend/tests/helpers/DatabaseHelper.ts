/**
 * Database Helper for Integration Tests
 * Provides utilities for test database setup, seeding, and cleanup
 */

import { Pool, QueryResultRow } from "pg";

export class DatabaseHelper {
    private pool: Pool;
    private testSchema: string = "test_schema";

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Initialize test schema (isolated from main schema)
     */
    async initializeTestSchema(): Promise<void> {
        await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.testSchema}`);
        await this.pool.query(`SET search_path TO ${this.testSchema}, public`);
    }

    /**
     * Clean up test schema after tests
     */
    async cleanupTestSchema(): Promise<void> {
        await this.pool.query(`DROP SCHEMA IF EXISTS ${this.testSchema} CASCADE`);
    }

    /**
     * Seed test user and return user ID
     */
    async seedTestUser(): Promise<string> {
        const result = await this.pool.query<{ id: string }>(
            `INSERT INTO flowmaestro.users (id, email, password_hash, name)
             VALUES (
                 '00000000-0000-0000-0000-000000000001',
                 'test@flowmaestro.dev',
                 '$2a$10$abcdefghijklmnopqrstuv',
                 'Test User'
             )
             ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
             RETURNING id`
        );
        return result.rows[0].id;
    }

    /**
     * Create a test workflow and return workflow ID
     */
    async createTestWorkflow(
        userId: string,
        name: string,
        definition: object
    ): Promise<string> {
        const result = await this.pool.query<{ id: string }>(
            `INSERT INTO flowmaestro.workflows (user_id, name, description, definition)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [userId, name, "Test workflow", JSON.stringify(definition)]
        );
        return result.rows[0].id;
    }

    /**
     * Create a test execution and return execution ID
     */
    async createTestExecution(
        workflowId: string,
        inputs: object = {}
    ): Promise<string> {
        const result = await this.pool.query<{ id: string }>(
            `INSERT INTO flowmaestro.executions (workflow_id, status, inputs, outputs, current_state)
             VALUES ($1, 'running', $2, '{}', '{}')
             RETURNING id`,
            [workflowId, JSON.stringify(inputs)]
        );
        return result.rows[0].id;
    }

    /**
     * Get execution by ID
     */
    async getExecution(executionId: string): Promise<any> {
        const result = await this.pool.query(
            `SELECT * FROM flowmaestro.executions WHERE id = $1`,
            [executionId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get all execution logs for an execution
     */
    async getExecutionLogs(executionId: string): Promise<any[]> {
        const result = await this.pool.query(
            `SELECT * FROM flowmaestro.execution_logs
             WHERE execution_id = $1
             ORDER BY created_at ASC`,
            [executionId]
        );
        return result.rows;
    }

    /**
     * Clean up all test data
     */
    async cleanup(): Promise<void> {
        // Delete in reverse order of foreign key dependencies
        // Use schema-qualified table names to avoid search_path issues
        // Wrap in try-catch to handle cases where tables might not exist yet
        try {
            await this.pool.query(`DELETE FROM flowmaestro.execution_logs`);
            await this.pool.query(`DELETE FROM flowmaestro.executions`);
            await this.pool.query(`DELETE FROM flowmaestro.workflows`);
            await this.pool.query(`DELETE FROM flowmaestro.knowledge_chunks`);
            await this.pool.query(`DELETE FROM flowmaestro.knowledge_documents`);
            await this.pool.query(`DELETE FROM flowmaestro.knowledge_bases`);
            await this.pool.query(`DELETE FROM flowmaestro.connections WHERE user_id = '00000000-0000-0000-0000-000000000001'`);
        } catch (error) {
            // Ignore errors during cleanup - tables might not exist
            console.error('Cleanup warning:', error instanceof Error ? error.message : error);
        }
    }

    /**
     * Execute raw query (for custom test scenarios)
     */
    async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: any[] = []): Promise<T[]> {
        const result = await this.pool.query<T>(sql, params);
        return result.rows;
    }

    /**
     * Start a transaction
     */
    async beginTransaction(): Promise<void> {
        await this.pool.query("BEGIN");
    }

    /**
     * Commit a transaction
     */
    async commitTransaction(): Promise<void> {
        await this.pool.query("COMMIT");
    }

    /**
     * Rollback a transaction
     */
    async rollbackTransaction(): Promise<void> {
        await this.pool.query("ROLLBACK");
    }

    /**
     * Seed knowledge base with test documents
     */
    async seedKnowledgeBase(
        userId: string,
        name: string,
        documents: Array<{ content: string; embedding: number[] }>
    ): Promise<string> {
        // Create knowledge base
        const kbResult = await this.pool.query<{ id: string }>(
            `INSERT INTO flowmaestro.knowledge_bases (user_id, name, description, config)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
                userId,
                name,
                "Test knowledge base",
                JSON.stringify({
                    embeddingModel: "text-embedding-3-small",
                    chunkSize: 500,
                    chunkOverlap: 50,
                }),
            ]
        );

        const kbId = kbResult.rows[0].id;

        // Create documents and chunks
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];

            // Create document
            const docResult = await this.pool.query<{ id: string }>(
                `INSERT INTO flowmaestro.knowledge_documents
                 (knowledge_base_id, name, source_type, content, status)
                 VALUES ($1, $2, 'text', $3, 'ready')
                 RETURNING id`,
                [kbId, `test-doc-${i + 1}`, doc.content]
            );

            const docId = docResult.rows[0].id;

            // Create chunk with embedding
            await this.pool.query(
                `INSERT INTO flowmaestro.knowledge_chunks
                 (document_id, knowledge_base_id, chunk_index, content, embedding)
                 VALUES ($1, $2, $3, $4, $5)`,
                [docId, kbId, 0, doc.content, JSON.stringify(doc.embedding)]
            );
        }

        return kbId;
    }
}
