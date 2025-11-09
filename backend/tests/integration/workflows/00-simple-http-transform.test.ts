/**
 * Debug Test: Simple HTTP + Transform
 */

import { Pool } from "pg";
import { getGlobalTestPool, getGlobalDbHelper } from "../../../jest.setup";
import workflowDefinition from "../../fixtures/workflows/00-simple-http-transform.json";
import { DatabaseHelper } from "../../helpers/DatabaseHelper";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";

describe("Debug: Simple HTTP + Transform", () => {
    let pool: Pool;
    let _dbHelper: DatabaseHelper;
    let testHarness: WorkflowTestHarness;

    beforeAll(async () => {
        pool = getGlobalTestPool();
        _dbHelper = getGlobalDbHelper();
        testHarness = new WorkflowTestHarness(pool);

        await testHarness.initialize();
    });

    afterAll(async () => {
        await testHarness.cleanup();
    });

    it("should execute HTTP and Transform nodes", async () => {
        const result = await testHarness.executeWorkflow(workflowDefinition, {});

        console.error("🔍 Simple workflow result:", JSON.stringify(result, null, 2));

        expect(result.success).toBe(true);

        // Should have HTTP response data
        expect(result.outputs.data).toBeDefined();
        expect(result.outputs.data.name).toBe("Leanne Graham");

        // Should have transform result
        expect(result.outputs.result).toBeDefined();
        expect(result.outputs.result.fullName).toBe("Leanne Graham");
    });
});
