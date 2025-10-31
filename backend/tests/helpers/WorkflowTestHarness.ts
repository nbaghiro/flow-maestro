/**
 * Workflow Test Harness
 * Utilities for executing Temporal workflows in tests and verifying results
 */

import { Connection, Client, WorkflowFailedError } from "@temporalio/client";
import { Pool } from "pg";

export interface WorkflowTestResult {
    success: boolean;
    outputs: Record<string, any>;
    error?: string;
    duration: number;
}

export class WorkflowTestHarness {
    private pool: Pool;
    private connection?: Connection;
    private client?: Client;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Initialize test environment - connect to real Temporal server
     */
    async initialize(): Promise<void> {
        const temporalAddress = process.env.TEMPORAL_ADDRESS || "localhost:7233";

        this.connection = await Connection.connect({
            address: temporalAddress,
        });

        this.client = new Client({
            connection: this.connection,
        });
    }

    /**
     * Clean up test environment
     */
    async cleanup(): Promise<void> {
        if (this.connection) {
            await this.connection.close();
        }
    }

    /**
     * Execute a workflow and return results using real Temporal server
     */
    async executeWorkflow(
        workflowDefinition: any,
        inputs: Record<string, any> = {},
        executionId?: string
    ): Promise<WorkflowTestResult> {
        if (!this.client) {
            throw new Error("Test environment not initialized. Call initialize() first.");
        }

        const startTime = Date.now();
        const workflowId = `test-workflow-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        try {
            // Start workflow using real Temporal client
            // Note: This requires a worker to be running (the test will start one in beforeAll)
            const handle = await this.client.workflow.start("orchestratorWorkflow", {
                taskQueue: "flowmaestro-orchestrator",
                workflowId,
                args: [
                    {
                        workflowDefinition,
                        inputs,
                        executionId: executionId || `test-exec-${Date.now()}`,
                        userId: "00000000-0000-0000-0000-000000000001",
                    },
                ],
            });

            // Wait for workflow to complete
            const result = await handle.result();

            const duration = Date.now() - startTime;

            return {
                success: true,
                outputs: result.outputs || result || {},
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;

            if (error instanceof WorkflowFailedError) {
                return {
                    success: false,
                    outputs: {},
                    error: error.message,
                    duration,
                };
            }

            return {
                success: false,
                outputs: {},
                error: error instanceof Error ? error.message : String(error),
                duration,
            };
        }
    }

    /**
     * Execute workflow with timeout
     */
    async executeWorkflowWithTimeout(
        workflowDefinition: any,
        inputs: Record<string, any> = {},
        timeoutMs: number = 30000
    ): Promise<WorkflowTestResult> {
        const timeoutPromise = new Promise<WorkflowTestResult>((resolve) => {
            setTimeout(() => {
                resolve({
                    success: false,
                    outputs: {},
                    error: `Workflow execution timed out after ${timeoutMs}ms`,
                    duration: timeoutMs,
                });
            }, timeoutMs);
        });

        const executionPromise = this.executeWorkflow(workflowDefinition, inputs);

        return Promise.race([executionPromise, timeoutPromise]);
    }

    /**
     * Verify workflow execution in database
     */
    async verifyExecution(executionId: string): Promise<{
        found: boolean;
        status?: string;
        outputs?: any;
        logs?: any[];
    }> {
        // Get execution
        const execResult = await this.pool.query(
            `SELECT * FROM executions WHERE id = $1`,
            [executionId]
        );

        if (execResult.rows.length === 0) {
            return { found: false };
        }

        const execution = execResult.rows[0];

        // Get logs
        const logsResult = await this.pool.query(
            `SELECT * FROM execution_logs
             WHERE execution_id = $1
             ORDER BY created_at ASC`,
            [executionId]
        );

        return {
            found: true,
            status: execution.status,
            outputs: execution.outputs,
            logs: logsResult.rows,
        };
    }

    /**
     * Assert workflow succeeded
     */
    assertSuccess(result: WorkflowTestResult): void {
        if (!result.success) {
            throw new Error(
                `Workflow execution failed: ${result.error || "Unknown error"}`
            );
        }
    }

    /**
     * Assert workflow failed with specific error
     */
    assertFailedWithError(result: WorkflowTestResult, expectedError: string): void {
        if (result.success) {
            throw new Error("Expected workflow to fail but it succeeded");
        }

        if (!result.error?.includes(expectedError)) {
            throw new Error(
                `Expected error to include "${expectedError}" but got: ${result.error}`
            );
        }
    }

    /**
     * Assert output contains expected values
     */
    assertOutputContains(
        result: WorkflowTestResult,
        expectedOutputs: Record<string, any>
    ): void {
        this.assertSuccess(result);

        for (const [key, expectedValue] of Object.entries(expectedOutputs)) {
            if (!(key in result.outputs)) {
                throw new Error(`Expected output "${key}" not found in results`);
            }

            const actualValue = result.outputs[key];

            if (typeof expectedValue === "object" && expectedValue !== null) {
                // Deep comparison for objects
                if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
                    throw new Error(
                        `Output "${key}" mismatch.\nExpected: ${JSON.stringify(expectedValue)}\nActual: ${JSON.stringify(actualValue)}`
                    );
                }
            } else {
                // Direct comparison for primitives
                if (actualValue !== expectedValue) {
                    throw new Error(
                        `Output "${key}" mismatch.\nExpected: ${expectedValue}\nActual: ${actualValue}`
                    );
                }
            }
        }
    }
}
