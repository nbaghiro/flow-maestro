/**
 * Workflow Definition Converter
 *
 * Converts between frontend workflow format (array-based with 'data' property)
 * and backend workflow format (Record-based with 'config' property)
 */

import { WorkflowDefinition, WorkflowNode } from "@flowmaestro/shared";

export interface FrontendWorkflowNode {
    id: string;
    type: string;
    data: Record<string, unknown>;
    position?: { x: number; y: number };
}

export interface FrontendWorkflowDefinition {
    nodes: FrontendWorkflowNode[];
    edges: Array<{
        id: string;
        source: string;
        target: string;
        sourceHandle?: string;
    }>;
}

/**
 * Convert frontend workflow format to backend format
 */
export function convertFrontendToBackend(
    frontendWorkflow: FrontendWorkflowDefinition,
    workflowName: string = "Untitled Workflow"
): WorkflowDefinition {
    const nodesRecord: Record<string, WorkflowNode> = {};

    // Convert nodes array to record
    for (const node of frontendWorkflow.nodes) {
        const { id, type, data, position } = node;

        const nodeName =
            (data.label as string) ||
            (data.inputName as string) ||
            (data.outputName as string) ||
            type;

        nodesRecord[id] = {
            type,
            name: nodeName,
            config: JSON.parse(JSON.stringify(data)),
            position: position || { x: 0, y: 0 }
        };
    }

    // Find entry point (first input node or first node)
    const inputNode = frontendWorkflow.nodes.find((n) => n.type === "input");
    const entryPoint = inputNode?.id || frontendWorkflow.nodes[0]?.id;

    if (!entryPoint) {
        throw new Error(`No entry point found for workflow: ${workflowName}`);
    }

    return {
        name: workflowName,
        nodes: nodesRecord,
        edges: frontendWorkflow.edges,
        entryPoint,
        settings: {
            timeout: 300000, // 5 minutes
            maxConcurrentNodes: 10,
            enableCache: false
        }
    };
}

/**
 * Convert backend workflow format to frontend format
 */
export function convertBackendToFrontend(
    backendWorkflow: WorkflowDefinition
): FrontendWorkflowDefinition {
    const nodesArray: FrontendWorkflowNode[] = [];

    // Convert nodes record to array
    for (const [id, node] of Object.entries(backendWorkflow.nodes)) {
        nodesArray.push({
            id,
            type: node.type,
            data: node.config,
            position: node.position
        });
    }

    return {
        nodes: nodesArray,
        edges: backendWorkflow.edges
    };
}
