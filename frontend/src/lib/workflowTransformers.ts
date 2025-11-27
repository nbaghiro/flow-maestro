import { Node, Edge } from "reactflow";
import { deepEqual } from "./utils";

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

// ============================================================================
// CHECKPOINT COMPARISON UTILITIES
// ============================================================================

export interface WorkflowSnapshot {
    nodes: Record<string, BackendNode>;
    edges: BackendEdge[];
}

export interface WorkflowComparisonResult {
    hasSignificantChanges: boolean;
    changes: {
        nodesAdded: string[];
        nodesRemoved: string[];
        nodesConfigChanged: string[];
        edgesAdded: number;
        edgesRemoved: number;
    };
}

/**
 * Compare two workflow snapshots for structural differences.
 * Ignores position and style changes (minor/cosmetic).
 * Detects structural changes: nodes added/removed, config changes, edges added/removed.
 */
export function compareWorkflowSnapshots(
    currentNodes: Record<string, BackendNode>,
    currentEdges: BackendEdge[],
    previousSnapshot: WorkflowSnapshot | null
): WorkflowComparisonResult {
    // If no previous snapshot exists, there are always significant changes
    if (!previousSnapshot) {
        return {
            hasSignificantChanges: true,
            changes: {
                nodesAdded: Object.keys(currentNodes),
                nodesRemoved: [],
                nodesConfigChanged: [],
                edgesAdded: currentEdges.length,
                edgesRemoved: 0
            }
        };
    }

    const previousNodes = previousSnapshot.nodes || {};
    const previousEdges = previousSnapshot.edges || [];

    const currentNodeIds = new Set(Object.keys(currentNodes));
    const previousNodeIds = new Set(Object.keys(previousNodes));

    // Find added and removed nodes
    const nodesAdded = [...currentNodeIds].filter((id) => !previousNodeIds.has(id));
    const nodesRemoved = [...previousNodeIds].filter((id) => !currentNodeIds.has(id));

    // Find nodes with config changes (ignoring position and style)
    const nodesConfigChanged: string[] = [];
    for (const nodeId of currentNodeIds) {
        if (!previousNodeIds.has(nodeId)) continue; // Skip added nodes

        const currentNode = currentNodes[nodeId];
        const previousNode = previousNodes[nodeId];

        // Compare type
        if (currentNode.type !== previousNode.type) {
            nodesConfigChanged.push(nodeId);
            continue;
        }

        // Compare name
        if (currentNode.name !== previousNode.name) {
            nodesConfigChanged.push(nodeId);
            continue;
        }

        // Compare config (deep comparison)
        if (!deepEqual(currentNode.config, previousNode.config)) {
            nodesConfigChanged.push(nodeId);
            continue;
        }

        // Compare onError config
        if (!deepEqual(currentNode.onError, previousNode.onError)) {
            nodesConfigChanged.push(nodeId);
        }
    }

    // Compare edges (by source-target-sourceHandle combination)
    const edgeKey = (e: BackendEdge) => `${e.source}->${e.target}:${e.sourceHandle || "default"}`;
    const currentEdgeKeys = new Set(currentEdges.map(edgeKey));
    const previousEdgeKeys = new Set(previousEdges.map(edgeKey));

    const edgesAdded = [...currentEdgeKeys].filter((k) => !previousEdgeKeys.has(k)).length;
    const edgesRemoved = [...previousEdgeKeys].filter((k) => !currentEdgeKeys.has(k)).length;

    const hasSignificantChanges =
        nodesAdded.length > 0 ||
        nodesRemoved.length > 0 ||
        nodesConfigChanged.length > 0 ||
        edgesAdded > 0 ||
        edgesRemoved > 0;

    return {
        hasSignificantChanges,
        changes: {
            nodesAdded,
            nodesRemoved,
            nodesConfigChanged,
            edgesAdded,
            edgesRemoved
        }
    };
}
