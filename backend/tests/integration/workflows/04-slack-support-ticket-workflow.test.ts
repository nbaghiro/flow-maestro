/**
 * Integration Test: Slack Customer Support Ticket Processor
 * Tests realistic support workflow: Slack message → AI triage → conditional routing → database → Slack reply
 *
 * PREREQUISITES:
 * - Docker services must be running (npm run docker:up)
 * - Temporal worker must be running (npm run worker:orchestrator:dev in separate terminal)
 * - Environment variables: SLACK_BOT_TOKEN, ANTHROPIC_API_KEY
 *
 * WORKFLOW:
 * 1. Input: Support message with channel, userId, message
 * 2. LLM Analysis: Anthropic Claude classifies urgency (high/medium/low) and category
 * 3. Conditional Router: Routes based on urgency
 *    - High: PostgreSQL → Webhook (PagerDuty) → Transform → Slack
 *    - Medium: PostgreSQL → Transform → Slack
 *    - Low: MongoDB → Transform → Slack
 * 4. Slack Reply: Posts formatted response in thread
 */

import { Pool } from "pg";
import { MongoClient, Db } from "mongodb";
import http from "http";
import { getGlobalTestPool, getGlobalDbHelper } from "../../../jest.setup";
import { DatabaseHelper } from "../../helpers/DatabaseHelper";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";
import { TestConnectionFactory } from "../../helpers/TestConnectionFactory";
import workflowDefinition from "../../fixtures/workflows/04-slack-support-ticket.json";

describe("Workflow 4: Slack Customer Support Ticket Processor", () => {
    let pool: Pool;
    let dbHelper: DatabaseHelper;
    let testHarness: WorkflowTestHarness;
    let connectionFactory: TestConnectionFactory;
    let testUserId: string;
    let slackConnectionId: string;
    let anthropicConnectionId: string;
    let pgConnectionId: string;
    let mongoConnectionId: string;
    let mongoClient: MongoClient;
    let mongoDb: Db;
    let mockWebhookServer: http.Server;
    let webhookRequests: Array<unknown> = [];
    let webhookUrl: string;

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

        // Create PostgreSQL test table for support tickets
        await pool.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                ticket_number TEXT NOT NULL UNIQUE,
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                urgency TEXT NOT NULL,
                message TEXT NOT NULL,
                channel_id TEXT,
                thread_ts TEXT,
                status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Setup MongoDB connection and collection (with defaults)
        const mongoHost = process.env.MONGO_HOST || "localhost";
        const mongoPort = process.env.MONGO_PORT || "27017";
        const mongoUser = process.env.MONGO_INITDB_ROOT_USERNAME || "flowmaestro";
        const mongoPass = process.env.MONGO_INITDB_ROOT_PASSWORD || "flowmaestro_dev_password";
        const mongoUrl = `mongodb://${mongoUser}:${mongoPass}@${mongoHost}:${mongoPort}`;

        try {
            mongoClient = new MongoClient(mongoUrl);
            await mongoClient.connect();
            mongoDb = mongoClient.db("flowmaestro_test");
        } catch (error) {
            console.warn(
                "⚠️  MongoDB connection failed - low priority tests will be skipped",
                error
            );
        }

        // Create connections
        const slackToken = process.env.SLACK_BOT_TOKEN;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        if (!slackToken || !anthropicKey) {
            console.warn(
                "⚠️  Skipping Slack integration tests - SLACK_BOT_TOKEN and ANTHROPIC_API_KEY environment variables not set"
            );
            return;
        }

        slackConnectionId = await connectionFactory.createSlackConnection(slackToken);
        anthropicConnectionId = await connectionFactory.createAnthropicConnection(
            anthropicKey
        );

        // Create database connections
        const pgConnectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
        pgConnectionId = await connectionFactory.createDatabaseConnection(
            "postgresql",
            pgConnectionString
        );

        const mongoConnectionString = mongoUrl;
        if (mongoDb) {
            mongoConnectionId = await connectionFactory.createDatabaseConnection(
                "mongodb",
                mongoConnectionString
            );
        }

        // Setup mock webhook server for PagerDuty simulation
        mockWebhookServer = http.createServer((req, res) => {
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", () => {
                try {
                    webhookRequests.push(JSON.parse(body));
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, incident_id: "INC-" + Date.now() }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "Invalid JSON" }));
                }
            });
        });

        // Start mock server on random port
        await new Promise<void>((resolve) => {
            mockWebhookServer.listen(0, () => {
                const address = mockWebhookServer.address();
                if (address && typeof address === "object") {
                    webhookUrl = `http://localhost:${address.port}/webhook`;
                }
                resolve();
            });
        });
    });

    afterAll(async () => {
        // Clean up PostgreSQL test table
        await pool.query(`DROP TABLE IF EXISTS support_tickets`);

        // Clean up MongoDB collection
        if (mongoDb) {
            await mongoDb.collection("support_backlog").deleteMany({});
        }

        // Close MongoDB connection
        if (mongoClient) {
            await mongoClient.close();
        }

        // Close mock webhook server
        if (mockWebhookServer) {
            await new Promise<void>((resolve) => {
                mockWebhookServer.close(() => resolve());
            });
        }

        // Clean up test data
        if (connectionFactory) {
            await connectionFactory.cleanup();
        }
        await dbHelper.cleanup();
        await testHarness.cleanup();
    });

    beforeEach(() => {
        // Clear webhook requests before each test
        webhookRequests = [];
    });

    afterEach(async () => {
        // Clean up support_tickets table after each test
        try {
            await pool.query(`DELETE FROM support_tickets`);
        } catch (error) {
            // Ignore if table doesn't exist
        }

        // Clean up MongoDB collection after each test
        try {
            await mongoDb.collection("support_backlog").deleteMany({});
        } catch (error) {
            // Ignore errors
        }
    });

    it("should process high urgency ticket: PostgreSQL → Webhook → Slack", async () => {
        // Skip if tokens not available
        if (!process.env.SLACK_BOT_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - tokens not available");
            return;
        }

        // Generate unique ticket number
        const ticketNumber = `TICKET-HIGH-${Date.now()}`;

        // Replace placeholder connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-1"].config.connectionId = anthropicConnectionId;
        testWorkflow.nodes["database-high-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-medium-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-low-1"].config.connectionId = mongoConnectionId;
        testWorkflow.nodes["integration-1"].config.connectionId = slackConnectionId;

        // Execute workflow with high urgency message
        const result = await testHarness.executeWorkflow(testWorkflow, {
            message: "URGENT: Payment processing is completely down for all users! Transactions are failing.",
            channel: "C12345TEST",
            userId: "U123TEST",
            threadTs: undefined,
            ticket_number: ticketNumber,
            pagerduty_webhook_url: webhookUrl,
        });

        // Verify workflow succeeded
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        // Verify LLM analysis
        expect(result.outputs.result).toBeDefined();
        expect(result.outputs.result.llm_analysis).toBeDefined();
        expect(result.outputs.result.llm_analysis.urgency).toBe("high");
        expect(result.outputs.result.llm_analysis.category).toBeDefined();
        expect(result.outputs.result.llm_analysis.summary).toBeDefined();

        // Verify ticket data
        expect(result.outputs.result.ticket).toBeDefined();
        expect(result.outputs.result.ticket.ticket_number).toBe(ticketNumber);
        expect(result.outputs.result.ticket.urgency).toBe("high");
        expect(result.outputs.result.ticket.status).toBe("escalated");

        // Verify webhook was called
        expect(webhookRequests.length).toBe(1);
        const webhookPayload = webhookRequests[0] as Record<string, unknown>;
        expect(webhookPayload.severity).toBe("error");
        expect(webhookPayload.ticket_number).toBe(ticketNumber);

        // Verify Slack response
        expect(result.outputs.result.slack).toBeDefined();
        expect(result.outputs.result.slack.success).toBe(true);

        // Verify database record
        const dbResult = await pool.query(
            `SELECT * FROM support_tickets WHERE ticket_number = $1`,
            [ticketNumber]
        );
        expect(dbResult.rows.length).toBe(1);
        expect(dbResult.rows[0].urgency).toBe("high");
        expect(dbResult.rows[0].status).toBe("open");

        // Verify MongoDB was NOT used
        const mongoResult = await mongoDb
            .collection("support_backlog")
            .findOne({ ticket_number: ticketNumber });
        expect(mongoResult).toBeNull();
    }, 90000); // 90 second timeout for full workflow

    it("should process medium urgency ticket: PostgreSQL → Slack (no webhook)", async () => {
        // Skip if tokens not available
        if (!process.env.SLACK_BOT_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - tokens not available");
            return;
        }

        const ticketNumber = `TICKET-MED-${Date.now()}`;

        // Replace placeholder connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-1"].config.connectionId = anthropicConnectionId;
        testWorkflow.nodes["database-high-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-medium-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-low-1"].config.connectionId = mongoConnectionId;
        testWorkflow.nodes["integration-1"].config.connectionId = slackConnectionId;

        const result = await testHarness.executeWorkflow(testWorkflow, {
            message: "Our analytics dashboard is showing incorrect data for yesterday's report",
            channel: "C12345TEST",
            userId: "U123TEST",
            threadTs: undefined,
            ticket_number: ticketNumber,
            pagerduty_webhook_url: webhookUrl,
        });

        // Verify workflow succeeded
        expect(result.success).toBe(true);

        // Verify LLM classified as medium
        expect(result.outputs.result.llm_analysis.urgency).toBe("medium");

        // Verify ticket data
        expect(result.outputs.result.ticket.urgency).toBe("medium");
        expect(result.outputs.result.ticket.status).toBe("assigned");

        // Verify webhook was NOT called (only high urgency triggers webhook)
        expect(webhookRequests.length).toBe(0);

        // Verify PostgreSQL record
        const dbResult = await pool.query(
            `SELECT * FROM support_tickets WHERE ticket_number = $1`,
            [ticketNumber]
        );
        expect(dbResult.rows.length).toBe(1);
        expect(dbResult.rows[0].urgency).toBe("medium");

        // Verify MongoDB was NOT used
        const mongoResult = await mongoDb
            .collection("support_backlog")
            .findOne({ ticket_number: ticketNumber });
        expect(mongoResult).toBeNull();
    }, 90000);

    it("should process low urgency ticket: MongoDB → Slack (backlog)", async () => {
        // Skip if tokens not available
        if (!process.env.SLACK_BOT_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - tokens not available");
            return;
        }

        const ticketNumber = `TICKET-LOW-${Date.now()}`;

        // Replace placeholder connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-1"].config.connectionId = anthropicConnectionId;
        testWorkflow.nodes["database-high-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-medium-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-low-1"].config.connectionId = mongoConnectionId;
        testWorkflow.nodes["integration-1"].config.connectionId = slackConnectionId;

        const result = await testHarness.executeWorkflow(testWorkflow, {
            message: "Feature request: Can we add dark mode to the settings page? It would be nice to have.",
            channel: "C12345TEST",
            userId: "U123TEST",
            threadTs: undefined,
            ticket_number: ticketNumber,
            pagerduty_webhook_url: webhookUrl,
        });

        // Verify workflow succeeded
        expect(result.success).toBe(true);

        // Verify LLM classified as low
        expect(result.outputs.result.llm_analysis.urgency).toBe("low");

        // Verify ticket data
        expect(result.outputs.result.ticket.urgency).toBe("low");
        expect(result.outputs.result.ticket.status).toBe("backlog");

        // Verify webhook was NOT called
        expect(webhookRequests.length).toBe(0);

        // Verify MongoDB record (low priority goes to backlog)
        const mongoResult = await mongoDb
            .collection("support_backlog")
            .findOne({ ticket_number: ticketNumber });
        expect(mongoResult).not.toBeNull();
        expect(mongoResult?.urgency).toBe("low");
        expect(mongoResult?.status).toBe("backlog");

        // Verify PostgreSQL was NOT used
        const dbResult = await pool.query(
            `SELECT * FROM support_tickets WHERE ticket_number = $1`,
            [ticketNumber]
        );
        expect(dbResult.rows.length).toBe(0);
    }, 90000);

    it("should verify branch isolation (only one DB path executes)", async () => {
        // Skip if tokens not available
        if (!process.env.SLACK_BOT_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - tokens not available");
            return;
        }

        const ticketNumber = `TICKET-ISO-${Date.now()}`;

        // Replace placeholder connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-1"].config.connectionId = anthropicConnectionId;
        testWorkflow.nodes["database-high-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-medium-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-low-1"].config.connectionId = mongoConnectionId;
        testWorkflow.nodes["integration-1"].config.connectionId = slackConnectionId;

        const result = await testHarness.executeWorkflow(testWorkflow, {
            message: "CRITICAL: Security vulnerability detected in authentication system!",
            channel: "C12345TEST",
            userId: "U123TEST",
            threadTs: undefined,
            ticket_number: ticketNumber,
            pagerduty_webhook_url: webhookUrl,
        });

        expect(result.success).toBe(true);
        expect(result.outputs.result.llm_analysis.urgency).toBe("high");

        // Verify ONLY PostgreSQL has the record
        const pgResult = await pool.query(
            `SELECT * FROM support_tickets WHERE ticket_number = $1`,
            [ticketNumber]
        );
        expect(pgResult.rows.length).toBe(1);

        // Verify MongoDB does NOT have the record
        const mongoResult = await mongoDb
            .collection("support_backlog")
            .findOne({ ticket_number: ticketNumber });
        expect(mongoResult).toBeNull();
    }, 90000);

    it("should handle Slack threaded replies correctly", async () => {
        // Skip if tokens not available
        if (!process.env.SLACK_BOT_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - tokens not available");
            return;
        }

        const ticketNumber = `TICKET-THREAD-${Date.now()}`;
        const threadTs = "1234567890.123456"; // Simulated thread timestamp

        // Replace placeholder connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-1"].config.connectionId = anthropicConnectionId;
        testWorkflow.nodes["database-high-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-medium-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-low-1"].config.connectionId = mongoConnectionId;
        testWorkflow.nodes["integration-1"].config.connectionId = slackConnectionId;

        const result = await testHarness.executeWorkflow(testWorkflow, {
            message: "Minor issue: Button alignment is off on mobile",
            channel: "C12345TEST",
            userId: "U123TEST",
            threadTs: threadTs,
            ticket_number: ticketNumber,
            pagerduty_webhook_url: webhookUrl,
        });

        expect(result.success).toBe(true);

        // Verify Slack response includes threadTs
        expect(result.outputs.result.slack).toBeDefined();
        expect(result.outputs.result.slack.success).toBe(true);

        // Verify database record includes thread_ts
        const dbOrMongo =
            result.outputs.result.ticket.urgency === "low"
                ? await mongoDb.collection("support_backlog").findOne({ ticket_number: ticketNumber })
                : (await pool.query(`SELECT * FROM support_tickets WHERE ticket_number = $1`, [ticketNumber])).rows[0];

        expect(dbOrMongo).toBeDefined();
        expect(dbOrMongo.thread_ts).toBe(threadTs);
    }, 90000);

    it("should complete workflow within reasonable time", async () => {
        // Skip if tokens not available
        if (!process.env.SLACK_BOT_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            console.warn("Skipping test - tokens not available");
            return;
        }

        const ticketNumber = `TICKET-PERF-${Date.now()}`;

        // Replace placeholder connection IDs
        const testWorkflow = JSON.parse(JSON.stringify(workflowDefinition));
        testWorkflow.nodes["llm-1"].config.connectionId = anthropicConnectionId;
        testWorkflow.nodes["database-high-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-medium-1"].config.connectionId = pgConnectionId;
        testWorkflow.nodes["database-low-1"].config.connectionId = mongoConnectionId;
        testWorkflow.nodes["integration-1"].config.connectionId = slackConnectionId;

        const result = await testHarness.executeWorkflow(testWorkflow, {
            message: "Quick question about API rate limits",
            channel: "C12345TEST",
            userId: "U123TEST",
            threadTs: undefined,
            ticket_number: ticketNumber,
            pagerduty_webhook_url: webhookUrl,
        });

        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(60000); // Should complete within 60 seconds
    }, 90000);
});
