/**
 * Integration Test: HTTP + Transform + Database Workflow
 * Tests fetching data from real HTTP endpoint, transforming it, and storing in database
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
import workflowDefinition from "../../fixtures/workflows/01-http-transform-database.json";

describe("Workflow 1: HTTP + Transform + Database", () => {
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

        // Create database connection for workflow
        const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
        dbConnectionId = await connectionFactory.createDatabaseConnection(
            "postgresql",
            connectionString
        );
    });

    afterAll(async () => {
        // Clean up test table
        await pool.query("DROP TABLE IF EXISTS test_users");

        // Clean up test data
        if (connectionFactory) {
            await connectionFactory.cleanup();
        }
        await dbHelper.cleanup();
        await testHarness.cleanup();
    });

    afterEach(async () => {
        // Clean up test_users table after each test (if it exists)
        try {
            await pool.query("DELETE FROM test_users");
        } catch (error) {
            // Ignore if table doesn't exist yet
        }
    });

    it("should fetch user from API, transform data, and store in database", async () => {
        // Create execution
        const workflowId = await dbHelper.createTestWorkflow(
            testUserId,
            "Test HTTP Transform DB",
            workflowDefinition
        );

        const executionId = await dbHelper.createTestExecution(workflowId, { userId: 1 });

        // Execute workflow
        const result = await testHarness.executeWorkflow(
            workflowDefinition,
            { userId: 1 }, // JSONPlaceholder user ID
            executionId
        );

        // Verify workflow succeeded
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        // Verify transform output (userInfo)
        expect(result.outputs.userInfo).toBeDefined();
        expect(result.outputs.userInfo.userId).toBe(1);
        expect(result.outputs.userInfo.fullName).toBe("Leanne Graham");
        expect(result.outputs.userInfo.email).toBe("Sincere@april.biz");
        expect(result.outputs.userInfo.city).toBe("Gwenborough");
        expect(result.outputs.userInfo.company).toBe("Romaguera-Crona");

        // Verify database output (storedUser)
        expect(result.outputs.storedUser).toBeDefined();
        expect(result.outputs.storedUser.rows).toBeDefined();
        expect(result.outputs.storedUser.rows.length).toBeGreaterThan(0);

        const storedUser = result.outputs.storedUser.rows[0];
        expect(storedUser.user_id).toBe(1);
        expect(storedUser.full_name).toBe("Leanne Graham");
        expect(storedUser.email).toBe("Sincere@april.biz");
        expect(storedUser.city).toBe("Gwenborough");
        expect(storedUser.company).toBe("Romaguera-Crona");

        // Verify data was actually stored in database
        const dbResult = await pool.query("SELECT * FROM test_users WHERE user_id = 1");

        expect(dbResult.rows.length).toBe(1);
        expect(dbResult.rows[0].full_name).toBe("Leanne Graham");
        expect(dbResult.rows[0].email).toBe("Sincere@april.biz");
    });

    it("should handle different user IDs correctly", async () => {
        // Execute workflow with user ID 2
        const result = await testHarness.executeWorkflow(workflowDefinition, { userId: 2 });

        // Verify workflow succeeded
        expect(result.success).toBe(true);

        // Verify userInfo for user 2
        expect(result.outputs.userInfo.userId).toBe(2);
        expect(result.outputs.userInfo.fullName).toBe("Ervin Howell"); // JSONPlaceholder user 2
        expect(result.outputs.userInfo.email).toBe("Shanna@melissa.tv");

        // Verify database storage
        const storedUser = result.outputs.storedUser.rows[0];
        expect(storedUser.user_id).toBe(2);
        expect(storedUser.full_name).toBe("Ervin Howell");

        // Verify in database
        const dbResult = await pool.query("SELECT * FROM test_users WHERE user_id = 2");

        expect(dbResult.rows.length).toBe(1);
        expect(dbResult.rows[0].full_name).toBe("Ervin Howell");
    });

    it.skip("should handle HTTP errors gracefully", async () => {
        // TODO: This test needs a workflow with conditional logic to handle 404s
        // Currently, 404 returns empty object which causes transform to fail
        // We'll implement this in a later workflow with error handling
    });

    it("should store multiple users correctly", async () => {
        // Execute workflow multiple times with different user IDs
        const userIds = [1, 2, 3];

        for (const userId of userIds) {
            const result = await testHarness.executeWorkflow(workflowDefinition, { userId });

            expect(result.success).toBe(true);
        }

        // Verify all users were stored
        const dbResult = await pool.query("SELECT * FROM test_users ORDER BY user_id");

        expect(dbResult.rows.length).toBe(3);
        expect(dbResult.rows[0].user_id).toBe(1);
        expect(dbResult.rows[1].user_id).toBe(2);
        expect(dbResult.rows[2].user_id).toBe(3);
    });

    it("should complete within reasonable time", async () => {
        const result = await testHarness.executeWorkflow(workflowDefinition, { userId: 1 });

        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(15000); // Should complete within 15 seconds
    });
});
