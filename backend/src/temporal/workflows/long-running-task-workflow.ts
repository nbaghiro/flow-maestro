import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities";

const { executeNodeBatch } = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    heartbeatTimeout: "30s",
    retry: {
        initialInterval: "1s",
        maximumInterval: "30s",
        backoffCoefficient: 2,
        maximumAttempts: 5
    }
});

export interface LongRunningTaskInput {
    executionId: string;
    workflowId: string;
    userId: string;
    nodeIds: string[];
}

export interface LongRunningTaskResult {
    success: boolean;
    completedNodes: string[];
    failedNodes: string[];
    error?: string;
}

/**
 * Long-Running Task Workflow
 *
 * Handles tasks that may take longer than 5 minutes.
 * Uses Temporal activities with heartbeat for reliability.
 */
export async function longRunningTaskWorkflow(
    input: LongRunningTaskInput
): Promise<LongRunningTaskResult> {
    const { executionId, workflowId, userId, nodeIds } = input;

    console.log(`Starting long-running task for execution: ${executionId} with ${nodeIds.length} nodes`);

    try {
        const result = await executeNodeBatch({
            executionId,
            workflowId,
            userId,
            nodeIds
        });

        console.log(`Long-running task completed for execution: ${executionId}`);

        return {
            success: true,
            completedNodes: result.completedNodes,
            failedNodes: result.failedNodes
        };
    } catch (error) {
        console.error(`Long-running task failed for execution: ${executionId}`, error);

        return {
            success: false,
            completedNodes: [],
            failedNodes: nodeIds,
            error: (error as Error).message
        };
    }
}
