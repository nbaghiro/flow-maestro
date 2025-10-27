import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';

const { executeNode } = proxyActivities<typeof activities>({
    startToCloseTimeout: '10 minutes',
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2,
    },
});

export interface WorkflowNode {
    id: string;
    type: string;
    data: any;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
}

export interface WorkflowDefinition {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface OrchestratorInput {
    workflowDefinition: WorkflowDefinition;
    inputs?: Record<string, any>;
}

export interface OrchestratorResult {
    success: boolean;
    outputs: Record<string, any>;
    error?: string;
}

/**
 * Main workflow orchestrator - executes a workflow definition
 */
export async function orchestratorWorkflow(input: OrchestratorInput): Promise<OrchestratorResult> {
    const { workflowDefinition, inputs = {} } = input;
    const { nodes, edges } = workflowDefinition;

    console.log(`[Orchestrator] Starting workflow with ${nodes.length} nodes, ${edges.length} edges`);

    // Build execution graph
    const nodeMap = new Map<string, WorkflowNode>();
    const outgoingEdges = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();

    nodes.forEach(node => {
        nodeMap.set(node.id, node);
        outgoingEdges.set(node.id, []);
        incomingEdges.set(node.id, []);
    });

    edges.forEach(edge => {
        outgoingEdges.get(edge.source)?.push(edge.target);
        incomingEdges.get(edge.target)?.push(edge.source);
    });

    // Find start nodes (nodes with no incoming edges or input nodes)
    const startNodes = nodes.filter(
        node => node.type === 'input' || (incomingEdges.get(node.id)?.length || 0) === 0
    );

    console.log(`[Orchestrator] Start nodes: ${startNodes.map(n => n.id).join(', ')}`);

    // Execution context - stores all node outputs
    const context: Record<string, any> = { ...inputs };
    const executed = new Set<string>();
    const errors: Record<string, string> = {};

    // Execute nodes in topological order
    async function executeNodeAndDependents(nodeId: string): Promise<void> {
        if (executed.has(nodeId)) {
            return;
        }

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
            executed.add(nodeId);
            return;
        }

        console.log(`[Orchestrator] Executing node ${nodeId} (${node.type})`);

        try {
            // Handle input nodes specially
            if (node.type === 'input') {
                const inputName = node.data.inputName || 'input';
                const inputValue = inputs[inputName];
                context[inputName] = inputValue;
                console.log(`[Orchestrator] Input node ${nodeId}: ${inputName} = ${inputValue}`);
            } else {
                // Execute the node using the activity
                const result = await executeNode({
                    nodeType: node.type,
                    nodeConfig: node.data,
                    context,
                });

                // Merge result into context
                Object.assign(context, result);
                console.log(`[Orchestrator] Node ${nodeId} completed, added keys: ${Object.keys(result).join(', ')}`);
            }

            executed.add(nodeId);

            // Execute dependent nodes
            const dependents = outgoingEdges.get(nodeId) || [];
            for (const dependentId of dependents) {
                await executeNodeAndDependents(dependentId);
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error';
            console.error(`[Orchestrator] Node ${nodeId} failed: ${errorMessage}`);
            errors[nodeId] = errorMessage;
            executed.add(nodeId);
            // Don't execute dependents if this node failed
        }
    }

    // Execute from all start nodes
    try {
        for (const startNode of startNodes) {
            await executeNodeAndDependents(startNode.id);
        }

        // Check if there were any errors
        if (Object.keys(errors).length > 0) {
            return {
                success: false,
                outputs: context,
                error: `Workflow completed with errors: ${JSON.stringify(errors)}`,
            };
        }

        console.log(`[Orchestrator] Workflow completed successfully`);
        return {
            success: true,
            outputs: context,
        };
    } catch (error: any) {
        console.error(`[Orchestrator] Workflow failed: ${error.message}`);
        return {
            success: false,
            outputs: context,
            error: error.message || 'Unknown error',
        };
    }
}
