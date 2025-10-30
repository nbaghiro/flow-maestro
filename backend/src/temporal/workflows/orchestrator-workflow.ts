import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';
import type { WorkflowDefinition, WorkflowNode, JsonObject } from '@flowmaestro/shared';

// Re-export WorkflowDefinition for use by other workflow files
export type { WorkflowDefinition, WorkflowNode };

const { executeNode } = proxyActivities<typeof activities>({
    startToCloseTimeout: '10 minutes',
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2,
    },
});

// Event emission activities (non-retryable, fire-and-forget)
const {
    emitExecutionStarted,
    emitExecutionProgress,
    emitExecutionCompleted,
    emitExecutionFailed,
    emitNodeStarted,
    emitNodeCompleted,
    emitNodeFailed
} = proxyActivities<typeof activities>({
    startToCloseTimeout: '5 seconds',
    retry: {
        maximumAttempts: 1, // Don't retry event emissions
    },
});

export interface OrchestratorInput {
    executionId: string;
    workflowDefinition: WorkflowDefinition;
    inputs?: JsonObject;
    userId?: string;
}

export interface OrchestratorResult {
    success: boolean;
    outputs: JsonObject;
    error?: string;
}

/**
 * Main workflow orchestrator - executes a workflow definition
 */
export async function orchestratorWorkflow(input: OrchestratorInput): Promise<OrchestratorResult> {
    const { executionId, workflowDefinition, inputs = {} } = input;
    const { nodes, edges } = workflowDefinition;

    // Get workflow start time
    const workflowStartTime = Date.now();

    // Convert nodes Record to entries for processing
    const nodeEntries = Object.entries(nodes);
    console.log(`[Orchestrator] Starting workflow with ${nodeEntries.length} nodes, ${edges.length} edges`);

    // Emit execution started event
    await emitExecutionStarted({
        executionId,
        workflowName: workflowDefinition.name || "Unnamed Workflow",
        totalNodes: nodeEntries.length,
    });

    // Build execution graph
    const nodeMap = new Map<string, WorkflowNode>();
    const outgoingEdges = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();

    // Initialize maps from nodes Record
    nodeEntries.forEach(([nodeId, node]) => {
        nodeMap.set(nodeId, node);
        outgoingEdges.set(nodeId, []);
        incomingEdges.set(nodeId, []);
    });

    edges.forEach(edge => {
        outgoingEdges.get(edge.source)?.push(edge.target);
        incomingEdges.get(edge.target)?.push(edge.source);
    });

    // Find start nodes (nodes with no incoming edges or input nodes)
    const startNodes = nodeEntries.filter(
        ([nodeId, node]) => node.type === 'input' || (incomingEdges.get(nodeId)?.length || 0) === 0
    );

    console.log(`[Orchestrator] Start nodes: ${startNodes.map(([id]) => id).join(', ')}`);

    // Execution context - stores all node outputs
    const context: JsonObject = { ...inputs };
    const executed = new Set<string>();
    const errors: Record<string, string> = {};
    let completedNodeCount = 0;

    // Execute nodes in topological order
    async function executeNodeAndDependents(nodeId: string): Promise<void> {
        if (executed.has(nodeId)) {
            return;
        }

        // Mark as executed immediately to prevent circular dependency infinite recursion
        executed.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found in workflow definition`);
        }

        // Wait for all dependencies to complete
        const dependencies = incomingEdges.get(nodeId) || [];
        for (const depId of dependencies) {
            if (!executed.has(depId)) {
                await executeNodeAndDependents(depId);
            }
        }

        // Skip if dependency failed
        if (dependencies.some(depId => errors[depId])) {
            console.log(`[Orchestrator] Skipping ${nodeId} due to failed dependency`);
            errors[nodeId] = 'Dependency failed';
            return;
        }

        console.log(`[Orchestrator] Executing node ${nodeId} (${node.type})`);

        // Emit node started event
        await emitNodeStarted({
            executionId,
            nodeId,
            nodeName: node.name,
            nodeType: node.type,
        });

        const nodeStartTime = Date.now();

        try {
            // Handle input nodes specially
            if (node.type === 'input') {
                const inputName = typeof node.config.inputName === 'string' ? node.config.inputName : 'input';
                const inputValue = inputs[inputName];
                context[inputName] = inputValue;
                console.log(`[Orchestrator] Input node ${nodeId}: ${inputName} = ${JSON.stringify(inputValue)}`);
            } else {
                // Execute the node using the activity
                const result = await executeNode({
                    nodeType: node.type,
                    nodeConfig: node.config,
                    context,
                });

                // Merge result into context
                Object.assign(context, result);
                console.log(`[Orchestrator] Node ${nodeId} completed, added keys: ${Object.keys(result).join(', ')}`);
            }

            // Emit node completed event
            const nodeDuration = Date.now() - nodeStartTime;
            await emitNodeCompleted({
                executionId,
                nodeId,
                output: context,
                duration: nodeDuration,
            });

            // Update progress
            completedNodeCount++;
            const percentage = Math.round((completedNodeCount / nodeEntries.length) * 100);
            await emitExecutionProgress({
                executionId,
                completed: completedNodeCount,
                total: nodeEntries.length,
                percentage,
            });

            // Execute dependent nodes
            const dependents = outgoingEdges.get(nodeId) || [];
            for (const dependentId of dependents) {
                await executeNodeAndDependents(dependentId);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Orchestrator] Node ${nodeId} failed: ${errorMessage}`);
            errors[nodeId] = errorMessage;

            // Emit node failed event
            await emitNodeFailed({
                executionId,
                nodeId,
                error: errorMessage,
            });

            // Don't execute dependents if this node failed (already marked as executed at start)
        }
    }

    // Execute from all start nodes
    try {
        for (const [startNodeId] of startNodes) {
            await executeNodeAndDependents(startNodeId);
        }

        // Check if there were any errors
        if (Object.keys(errors).length > 0) {
            const errorMessage = `Workflow completed with errors: ${JSON.stringify(errors)}`;

            // Find the first failed node ID
            const failedNodeId = Object.keys(errors)[0];

            // Emit execution failed event
            await emitExecutionFailed({
                executionId,
                error: errorMessage,
                failedNodeId,
            });

            return {
                success: false,
                outputs: context,
                error: errorMessage,
            };
        }

        console.log(`[Orchestrator] Workflow completed successfully`);
        const workflowDuration = Date.now() - workflowStartTime;

        // Emit execution completed event
        await emitExecutionCompleted({
            executionId,
            outputs: context,
            duration: workflowDuration,
        });

        return {
            success: true,
            outputs: context,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Orchestrator] Workflow failed: ${errorMessage}`);

        // Emit execution failed event
        await emitExecutionFailed({
            executionId,
            error: errorMessage,
        });

        return {
            success: false,
            outputs: context,
            error: errorMessage,
        };
    }
}
