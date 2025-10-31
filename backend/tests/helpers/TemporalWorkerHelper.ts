/**
 * Temporal Worker Helper for Tests
 * Starts and stops a Temporal worker for integration tests
 */

import { Worker, NativeConnection } from "@temporalio/worker";
import * as activities from "../../src/temporal/activities";
import path from "path";

export class TemporalWorkerHelper {
    private worker?: Worker;
    private workerRunPromise?: Promise<void>;

    /**
     * Start a Temporal worker for tests
     */
    async start(): Promise<void> {
        const temporalAddress = process.env.TEMPORAL_ADDRESS || "localhost:7233";

        const connection = await NativeConnection.connect({
            address: temporalAddress,
        });

        // Resolve workflows path - use absolute path
        const workflowsPath = path.resolve(
            __dirname,
            "../../src/temporal/workflows.bundle.ts"
        );

        console.log(`Loading workflows from: ${workflowsPath}`);

        this.worker = await Worker.create({
            connection,
            namespace: "default",
            taskQueue: "flowmaestro-orchestrator",
            workflowsPath,
            activities,
            // Add bundler options to prevent webpack errors
            bundlerOptions: {
                ignoreModules: [
                    "@flowmaestro/shared",
                    "uuid",
                    "pg",
                    "redis",
                    "fastify",
                    "nanoid",
                ],
            },
        });

        // Run worker in background
        this.workerRunPromise = this.worker.run();

        console.log("✅ Temporal worker started for tests");
    }

    /**
     * Stop the Temporal worker
     */
    async stop(): Promise<void> {
        if (this.worker) {
            this.worker.shutdown();
            await this.workerRunPromise;
            console.log("✅ Temporal worker stopped");
        }
    }
}
