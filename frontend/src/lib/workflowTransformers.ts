import { Node, Edge } from "reactflow";

/**
 * Backend workflow node format
 */
export interface BackendNode {
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    config: Record<string, unknown>;
    style?: React.CSSProperties;
    onError?: unknown;
}

/**
 * Backend workflow edge format
 */
export interface BackendEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
}

/**
 * Transform a React Flow node to backend format
 */
export function transformNodeForBackend(node: Node): BackendNode {
    const { label, onError, ...config } = (node.data || {}) as Record<string, unknown>;

    const backendNode: BackendNode = {
        id: node.id,
        type: node.type || "default",
        name: (label as string) || node.id,
        config: Object.keys(config).length > 0 ? config : {},
        position: {
            x: node.position.x,
            y: node.position.y
        }
    };

    if (node.style) {
        backendNode.style = node.style;
    }

    if (onError && typeof onError === "object" && "strategy" in onError) {
        backendNode.onError = onError;
    }

    return backendNode;
}

/**
 * Transform a React Flow edge to backend format
 */
export function transformEdgeForBackend(edge: Edge): BackendEdge {
    const backendEdge: BackendEdge = {
        id: edge.id,
        source: edge.source,
        target: edge.target
    };

    if (edge.sourceHandle) {
        backendEdge.sourceHandle = edge.sourceHandle;
    }

    return backendEdge;
}

/**
 * Transform multiple nodes to backend format (for saving)
 * Returns an object keyed by node ID
 */
export function transformNodesToBackendMap(nodes: Node[]): Record<string, BackendNode> {
    const nodesMap: Record<string, BackendNode> = {};
    nodes.forEach((node) => {
        nodesMap[node.id] = transformNodeForBackend(node);
    });
    return nodesMap;
}

/**
 * Transform multiple edges to backend format
 */
export function transformEdgesToBackend(edges: Edge[]): BackendEdge[] {
    return edges.map(transformEdgeForBackend);
}

/**
 * Find the entry point node in a workflow
 * Prioritizes Input nodes, falls back to first node
 */
export function findEntryPoint(nodes: Node[]): string {
    const inputNode = nodes.find((n) => n.type === "input");
    return inputNode?.id || (nodes.length > 0 ? nodes[0].id : "");
}

/**
 * Transform nodes for state snapshot comparison
 * Sorts by ID for consistent comparison
 */
export function transformNodesForSnapshot(nodes: Node[]): BackendNode[] {
    return nodes.map(transformNodeForBackend).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Transform edges for state snapshot comparison
 * Sorts by ID for consistent comparison
 */
export function transformEdgesForSnapshot(edges: Edge[]): BackendEdge[] {
    return edges.map(transformEdgeForBackend).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Create a serialized workflow state snapshot for change detection
 */
export function createWorkflowSnapshot(workflowName: string, nodes: Node[], edges: Edge[]): string {
    return JSON.stringify({
        name: workflowName,
        nodes: transformNodesForSnapshot(nodes),
        edges: transformEdgesForSnapshot(edges)
    });
}
