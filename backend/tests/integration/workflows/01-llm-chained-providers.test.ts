/**
 * Integration Test: LLM Chained Providers
 * Tests OpenAI → Anthropic chaining with real APIs and variable interpolation
 */

import { Pool } from "pg";
import { getGlobalTestPool, getGlobalDbHelper } from "../../../jest.setup";
import workflowDefinition from "../../fixtures/workflows/01-llm-chained-providers.json";
import { DatabaseHelper } from "../../helpers/DatabaseHelper";
import { TestConnectionFactory } from "../../helpers/TestConnectionFactory";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";

describe("LLM Integration: Chained Providers", () => {
    let pool: Pool;
    let dbHelper: DatabaseHelper;
    let testHarness: WorkflowTestHarness;
    let connectionFactory: TestConnectionFactory;
    let testUserId: string;
    let openaiConnectionId: string;
    let anthropicConnectionId: string;

    beforeAll(async () => {
        pool = getGlobalTestPool();
        dbHelper = getGlobalDbHelper();
        testHarness = new WorkflowTestHarness(pool);

        await testHarness.initialize();

        // Create unique test user for this test run
        testUserId = await dbHelper.seedTestUser();

        // Create connection factory with test user ID
        connectionFactory = new TestConnectionFactory(pool, testUserId);

        // Create connections using real API keys from environment
        // These tests will be skipped if API keys are not available
        const openaiApiKey = process.env.OPENAI_API_KEY;
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

        if (!openaiApiKey || !anthropicApiKey) {
            console.warn(
                "⚠️  Skipping LLM tests - OPENAI_API_KEY and ANTHROPIC_API_KEY environment variables not set"
            );
            return;
        }

        openaiConnectionId = await connectionFactory.createOpenAIConnection(openaiApiKey);
        anthropicConnectionId = await connectionFactory.createAnthropicConnection(anthropicApiKey);
    });

    afterAll(async () => {
        await connectionFactory.cleanup();
        await dbHelper.cleanup();
        await testHarness.cleanup();
    });

    it("should chain OpenAI and Anthropic LLM calls with variable interpolation", async () => {
        // Skip if API keys not available
        if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - API keys not available");
            return;
        }

        // Replace placeholder connection IDs with real test connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-openai"].config.connectionId = openaiConnectionId;
        testWorkflow.nodes["llm-anthropic"].config.connectionId = anthropicConnectionId;

        const result = await testHarness.executeWorkflow(testWorkflow, {
            topic: "artificial intelligence"
        });

        // Verify workflow succeeded
        expect(result.success).toBe(true);

        // Verify finalResult output exists
        expect(result.outputs.finalResult).toBeDefined();

        // Verify structure of combined result
        const finalResult = result.outputs.finalResult as {
            original: string;
            refined: string;
            openai_tokens: number;
            anthropic_tokens: number;
            total_tokens: number;
        };
        expect(finalResult).toHaveProperty("original");
        expect(finalResult).toHaveProperty("refined");
        expect(finalResult).toHaveProperty("openai_tokens");
        expect(finalResult).toHaveProperty("anthropic_tokens");
        expect(finalResult).toHaveProperty("total_tokens");

        // Verify OpenAI response
        expect(typeof finalResult.original).toBe("string");
        expect(finalResult.original.length).toBeGreaterThan(0);
        expect(finalResult.original.toLowerCase()).toContain("artificial intelligence");

        // Verify Anthropic response (refined version)
        expect(typeof finalResult.refined).toBe("string");
        expect(finalResult.refined.length).toBeGreaterThan(0);

        // Verify token counts
        expect(typeof finalResult.openai_tokens).toBe("number");
        expect(finalResult.openai_tokens).toBeGreaterThan(0);
        expect(typeof finalResult.anthropic_tokens).toBe("number");
        expect(finalResult.anthropic_tokens).toBeGreaterThan(0);

        // Verify total tokens calculation
        expect(finalResult.total_tokens).toBe(
            finalResult.openai_tokens + finalResult.anthropic_tokens
        );
    }, 60000); // 60 second timeout for LLM API calls

    it("should handle variable interpolation correctly", async () => {
        // Skip if API keys not available
        if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - API keys not available");
            return;
        }

        // Replace placeholder connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-openai"].config.connectionId = openaiConnectionId;
        testWorkflow.nodes["llm-anthropic"].config.connectionId = anthropicConnectionId;

        const result = await testHarness.executeWorkflow(testWorkflow, {
            topic: "quantum computing"
        });

        expect(result.success).toBe(true);
        expect(result.outputs.finalResult).toBeDefined();

        const finalResult = result.outputs.finalResult as { original: string; refined: string };

        // The Anthropic prompt should have received the OpenAI response
        // and refined it, so it should be different
        expect(finalResult.original).not.toBe(finalResult.refined);

        // Both should mention the topic
        const original = finalResult.original.toLowerCase();
        const refined = finalResult.refined.toLowerCase();

        // At least one should contain the topic (might be paraphrased)
        const containsTopic = original.includes("quantum") || refined.includes("quantum");
        expect(containsTopic).toBe(true);
    }, 60000);

    it("should use correct models (gpt-4o-mini and claude-haiku-4-5)", async () => {
        // Skip if API keys not available
        if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - API keys not available");
            return;
        }

        // Verify workflow definition has correct models
        expect(workflowDefinition.nodes["llm-openai"].config.model).toBe("gpt-4o-mini");
        expect(workflowDefinition.nodes["llm-anthropic"].config.model).toBe(
            "claude-haiku-4-5-20251001"
        );

        // Replace placeholder connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-openai"].config.connectionId = openaiConnectionId;
        testWorkflow.nodes["llm-anthropic"].config.connectionId = anthropicConnectionId;

        const result = await testHarness.executeWorkflow(testWorkflow, {
            topic: "machine learning"
        });

        // Should succeed with these models
        expect(result.success).toBe(true);
    }, 60000);
});
