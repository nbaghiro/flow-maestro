import { Worker, NativeConnection } from "@temporalio/worker";
import path from "path";
import * as activities from "../activities";
import { registerAllNodes } from "../../shared/registry/register-nodes";

/**
 * Orchestrator Worker
 *
 * Temporal worker that processes workflow executions, checkpoints,
 * and user input workflows.
 */
async function run() {
    // Register all node types
    registerAllNodes();

    // Connect to Temporal
    const connection = await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS || "localhost:7233"
    });

    // Resolve workflows path - use absolute path
    // When running with tsx (dev), use .ts; when built, use .js
    const isDev = __filename.endsWith('.ts');
    const workflowsPath = isDev
        ? path.resolve(__dirname, "../workflows.bundle.ts")
        : path.resolve(__dirname, "../workflows.bundle.js");

    console.log(`Loading workflows from: ${workflowsPath}`);

    // Create worker
    const worker = await Worker.create({
        connection,
        namespace: "default",
        taskQueue: "flowmaestro-orchestrator",
        workflowsPath,
        activities,
        maxConcurrentActivityTaskExecutions: 10,
        maxConcurrentWorkflowTaskExecutions: 10,
        // Add bundler options for TypeScript
        bundlerOptions: {
            ignoreModules: [
                "@flowmaestro/shared",
                "uuid",
                "pg",
                "redis",
                "fastify"
            ]
        }
    });

    console.log("🚀 Orchestrator worker starting...");
    console.log(`   Task Queue: flowmaestro-orchestrator`);
    console.log(`   Temporal Address: ${process.env.TEMPORAL_ADDRESS || "localhost:7233"}`);

    // Run the worker
    await worker.run();
}

run().catch((err) => {
    console.error("Worker failed:", err);
    process.exit(1);
});
