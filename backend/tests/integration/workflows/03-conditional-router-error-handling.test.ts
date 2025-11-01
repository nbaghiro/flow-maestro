/**
 * Integration Test: Conditional Router with Error Handling
 * Tests conditional branching logic: route to API or database based on source type
 *
 * PREREQUISITES:
 * - Docker services must be running (npm run docker:up)
 * - Temporal worker must be running (npm run worker:orchestrator:dev in separate terminal)
 */

import { Pool } from "pg";
import { getGlobalTestPool, getGlobalDbHelper } from "../../../jest.setup";
import { DatabaseHelper } from "../../helpers/DatabaseHelper";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";
import { TestConnectionFactory } from "../../helpers/TestConnectionFactory";
import workflowDefinition from "../../fixtures/workflows/03-conditional-router-error-handling.json";

describe("Workflow 3: Conditional Router with Error Handling", () => {
    let pool: Pool;
    let dbHelper: DatabaseHelper;
    let testHarness: WorkflowTestHarness;
    let connectionFactory: TestConnectionFactory;
    let testUserId: string;
    let dbConnectionId: string;

    beforeAll(async () => {
        // Get test infrastructure
        pool = getGlobalTestPool();
        dbHelper = getGlobalDbHelper();
        testHarness = new WorkflowTestHarness(pool);

        // Initialize test environment (connect to Temporal)
        await testHarness.initialize();

        // Seed test user
        testUserId = await dbHelper.seedTestUser();

        // Create test connection factory
        connectionFactory = new TestConnectionFactory(pool, testUserId);

        // Create test table for storing users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS test_users (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                city TEXT,
                company TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Seed test data in database for database branch testing
        await pool.query(`
            INSERT INTO test_users (user_id, full_name, email, city, company) VALUES
            (1, 'Leanne Graham', 'Sincere@april.biz', 'Gwenborough', 'Romaguera-Crona'),
            (2, 'Ervin Howell', 'Shanna@melissa.tv', 'Wisokyburgh', 'Deckow-Crist'),
            (3, 'Clementine Bauch', 'Nathan@yesenia.net', 'McKenziehaven', 'Romaguera-Jacobson')
            ON CONFLICT DO NOTHING
        `);

        // Create database connection for workflow
        const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
        dbConnectionId = await connectionFactory.createDatabaseConnection(
            "postgresql",
            connectionString
        );
    });

    afterAll(async () => {
        // Clean up test table
        await pool.query(`DROP TABLE IF EXISTS test_users`);

        // Clean up test data
        if (connectionFactory) {
            await connectionFactory.cleanup();
        }
        await dbHelper.cleanup();
        await testHarness.cleanup();
    });

    afterEach(async () => {
        // Clean up any test-specific data if needed
    });

    it("should route to API branch when source is 'api'", async () => {
        // Execute workflow with source="api"
        const result = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "api" }
        );

        // Verify workflow succeeded
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        // Verify conditional node executed
        expect(result.outputs.conditionMet).toBe(true);
        expect(result.outputs.branch).toBe("true");

        // Verify API data was fetched
        expect(result.outputs.apiData).toBeDefined();
        expect(result.outputs.apiData.data.name).toBe("Leanne Graham");

        // Verify database branch did NOT execute
        expect(result.outputs.dbData).toBeUndefined();

        // Verify normalized data came from API
        expect(result.outputs.normalizedData).toBeDefined();
        expect(result.outputs.normalizedData.userId).toBe(1);
        expect(result.outputs.normalizedData.fullName).toBe("Leanne Graham");
        expect(result.outputs.normalizedData.email).toBe("Sincere@april.biz");
        expect(result.outputs.normalizedData.source).toBe("api");

        // Verify output
        expect(result.outputs.result).toEqual(result.outputs.normalizedData);
    });

    it("should route to database branch when source is 'database'", async () => {
        // Execute workflow with source="database"
        const result = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "database" }
        );

        // Verify workflow succeeded
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        // Verify conditional node executed (condition NOT met)
        expect(result.outputs.conditionMet).toBe(false);
        expect(result.outputs.branch).toBe("false");

        // Verify database data was fetched
        expect(result.outputs.dbData).toBeDefined();
        expect(result.outputs.dbData.rows).toBeDefined();
        expect(result.outputs.dbData.rows.length).toBeGreaterThan(0);
        expect(result.outputs.dbData.rows[0].full_name).toBe("Leanne Graham");

        // Verify API branch did NOT execute
        expect(result.outputs.apiData).toBeUndefined();

        // Verify normalized data came from database
        expect(result.outputs.normalizedData).toBeDefined();
        expect(result.outputs.normalizedData.userId).toBe(1);
        expect(result.outputs.normalizedData.fullName).toBe("Leanne Graham");
        expect(result.outputs.normalizedData.email).toBe("Sincere@april.biz");
        expect(result.outputs.normalizedData.source).toBe("database");

        // Verify output
        expect(result.outputs.result).toEqual(result.outputs.normalizedData);
    });

    it("should verify only one branch executes (branch isolation)", async () => {
        // Test API branch
        const apiResult = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "api" }
        );

        expect(apiResult.success).toBe(true);
        expect(apiResult.outputs.apiData).toBeDefined();
        expect(apiResult.outputs.dbData).toBeUndefined();

        // Test database branch
        const dbResult = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "database" }
        );

        expect(dbResult.success).toBe(true);
        expect(dbResult.outputs.dbData).toBeDefined();
        expect(dbResult.outputs.apiData).toBeUndefined();

        // Verify both results are different but valid
        expect(apiResult.outputs.normalizedData.source).toBe("api");
        expect(dbResult.outputs.normalizedData.source).toBe("database");
    });

    it("should transform data correctly from both sources", async () => {
        // Test API source transformation
        const apiResult = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "api" }
        );

        expect(apiResult.success).toBe(true);
        expect(apiResult.outputs.normalizedData).toMatchObject({
            userId: expect.any(Number),
            fullName: expect.any(String),
            email: expect.any(String),
            city: expect.any(String),
            company: expect.any(String),
            source: "api",
        });

        // Test database source transformation
        const dbResult = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "database" }
        );

        expect(dbResult.success).toBe(true);
        expect(dbResult.outputs.normalizedData).toMatchObject({
            userId: expect.any(Number),
            fullName: expect.any(String),
            email: expect.any(String),
            city: expect.any(String),
            company: expect.any(String),
            source: "database",
        });

        // Both should have the same structure (normalized)
        expect(Object.keys(apiResult.outputs.normalizedData).sort()).toEqual(
            Object.keys(dbResult.outputs.normalizedData).sort()
        );
    });

    it("should complete within reasonable time", async () => {
        const result = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "api" }
        );

        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(15000); // Should complete within 15 seconds
    });

    it("should handle case-insensitive source values", async () => {
        // Test with uppercase "API"
        const result1 = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "API" }
        );

        // The conditional executor uses case-insensitive comparison
        expect(result1.success).toBe(true);
        expect(result1.outputs.conditionMet).toBe(true);
        expect(result1.outputs.apiData).toBeDefined();
    });

    it("should handle invalid source values by taking false branch", async () => {
        // Test with invalid source value (not "api")
        const result = await testHarness.executeWorkflow(
            workflowDefinition,
            { source: "invalid" }
        );

        // Should take false branch (database)
        expect(result.success).toBe(true);
        expect(result.outputs.conditionMet).toBe(false);
        expect(result.outputs.branch).toBe("false");
        expect(result.outputs.dbData).toBeDefined();
    });
});
