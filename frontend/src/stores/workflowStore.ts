import { create } from "zustand";
import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from "reactflow";
import type { JsonValue, JsonObject } from "@flowmaestro/shared";
import { getErrorMessage } from "@flowmaestro/shared";
import { executeWorkflow as executeWorkflowAPI, generateWorkflow } from "../lib/api";
import { convertToReactFlowFormat } from "../lib/workflow-layout";

export type NodeExecutionStatus = "idle" | "pending" | "running" | "success" | "error" | "skipped";

export interface NodeExecutionState {
    status: NodeExecutionStatus;
    startedAt: Date | null;
    completedAt: Date | null;
    output: JsonValue;
    error: string | null;
    duration: number | null;
    input?: JsonValue;
    metadata?: JsonObject;
    retryCount?: number;
}

export interface ExecutionLog {
    id: string;
    level: "info" | "debug" | "warn" | "error" | "success" | "warning";
    message: string;
    nodeId?: string;
    timestamp: Date;
    metadata?: JsonObject;
}

export interface CurrentExecution {
    id: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    nodeStates: Map<string, NodeExecutionState>;
    variables: Map<string, any>;
    logs: ExecutionLog[];
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null;
    triggerId?: string;
}

interface WorkflowStore {
    nodes: Node[];
    edges: Edge[];
    selectedNode: string | null;

    // Workflow metadata
    aiGenerated: boolean;
    aiPrompt: string | null;

    // Execution state (legacy)
    isExecuting: boolean;
    executionResult: JsonValue | null;
    executionError: string | null;

    // Current execution (new real-time state)
    currentExecution: CurrentExecution | null;

    // Actions
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    addNode: (node: Node) => void;
    updateNode: (nodeId: string, data: JsonObject) => void;
    deleteNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;
    setAIMetadata: (aiGenerated: boolean, aiPrompt: string | null) => void;
    executeWorkflow: (inputs?: JsonObject) => Promise<void>;
    generateWorkflowFromAI: (prompt: string, connectionId: string) => Promise<void>;

    // Execution state management
    startExecution: (executionId: string, triggerId?: string) => void;
    updateExecutionStatus: (status: CurrentExecution["status"]) => void;
    updateNodeState: (nodeId: string, state: Partial<NodeExecutionState>) => void;
    addExecutionLog: (log: Omit<ExecutionLog, "id">) => void;
    updateVariable: (key: string, value: JsonValue) => void;
    clearExecution: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    aiGenerated: false,
    aiPrompt: null,
    isExecuting: false,
    executionResult: null,
    executionError: null,
    currentExecution: null,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    setAIMetadata: (aiGenerated, aiPrompt) => set({ aiGenerated, aiPrompt }),

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },

    addNode: (node) => {
        set({ nodes: [...get().nodes, node] });
    },

    updateNode: (nodeId, data) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
            ),
        });
    },

    deleteNode: (nodeId) => {
        set({
            nodes: get().nodes.filter((node) => node.id !== nodeId),
            edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        });
    },

    selectNode: (nodeId) => set({ selectedNode: nodeId }),

    executeWorkflow: async (inputs = {}) => {
        const { nodes, edges } = get();

        if (nodes.length === 0) {
            set({ executionError: 'Workflow is empty' });
            return;
        }

        set({
            isExecuting: true,
            executionResult: null,
            executionError: null
        });

        try {
            console.log('[Workflow] Executing workflow with', nodes.length, 'nodes');

            // Convert React Flow nodes to WorkflowNode format
            const workflowNodes = nodes.map((node) => ({
                type: node.type || "default",
                name: (node.data?.label as string) || node.id,
                config: (node.data?.config as JsonObject) || {},
                position: node.position,
                ...(node.data?.onError && {
                    onError: node.data.onError as {
                        strategy: "continue" | "fallback" | "goto" | "fail";
                        fallbackValue?: JsonValue;
                        gotoNode?: string;
                    },
                }),
            }));

            // Convert React Flow edges to WorkflowEdge format
            const workflowEdges = edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle }),
            }));

            const response = await executeWorkflowAPI(workflowNodes, workflowEdges, inputs);

            if (response.success && response.data) {
                console.log('[Workflow] Execution completed:', response.data.result);
                set({
                    executionResult: response.data.result,
                    isExecuting: false
                });
            } else {
                throw new Error(response.error || 'Workflow execution failed');
            }
        } catch (error: unknown) {
            console.error('[Workflow] Execution failed:', error);
            set({
                executionError: getErrorMessage(error),
                isExecuting: false
            });
        }
    },

    generateWorkflowFromAI: async (prompt: string, connectionId: string) => {
        console.log('[Workflow] Generating workflow from AI prompt:', prompt);

        try {
            const response = await generateWorkflow({ prompt, connectionId });

            if (response.success && response.data) {
                console.log('[Workflow] AI generated workflow with', response.data.nodes.length, 'nodes');

                // Convert to React Flow format with auto-layout
                const { nodes, edges } = convertToReactFlowFormat(
                    response.data.nodes,
                    response.data.edges,
                    response.data.metadata.entryNodeId
                );

                // Replace current workflow with generated workflow
                set({
                    nodes,
                    edges,
                    selectedNode: null,
                    executionResult: null,
                    executionError: null,
                    aiGenerated: true,
                    aiPrompt: prompt
                });

                console.log('[Workflow] Successfully added AI-generated workflow to canvas');
            } else {
                throw new Error(response.error || 'Failed to generate workflow');
            }
        } catch (error: unknown) {
            console.error('[Workflow] AI generation failed:', error);
            throw error; // Re-throw so dialog can show error
        }
    },

    // Execution state management methods
    startExecution: (executionId: string, triggerId?: string) => {
        console.log('[Workflow] Starting execution:', executionId);
        set({
            currentExecution: {
                id: executionId,
                status: "running",
                nodeStates: new Map(),
                variables: new Map(),
                logs: [],
                startedAt: new Date(),
                completedAt: null,
                duration: null,
                triggerId,
            },
        });
    },

    updateExecutionStatus: (status: CurrentExecution["status"]) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        const now = new Date();
        const completedAt = ["completed", "failed", "cancelled"].includes(status) ? now : null;
        const duration = completedAt
            ? now.getTime() - currentExecution.startedAt.getTime()
            : null;

        set({
            currentExecution: {
                ...currentExecution,
                status,
                completedAt,
                duration,
            },
        });

        console.log('[Workflow] Execution status updated:', status);
    },

    updateNodeState: (nodeId: string, state: Partial<NodeExecutionState>) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        const existingState = currentExecution.nodeStates.get(nodeId) || {
            status: "idle",
            startedAt: null,
            completedAt: null,
            output: null,
            error: null,
            duration: null,
        };

        const updatedState: NodeExecutionState = {
            ...existingState,
            ...state,
        };

        // Calculate duration if completed
        if (updatedState.completedAt && updatedState.startedAt) {
            updatedState.duration =
                updatedState.completedAt.getTime() - updatedState.startedAt.getTime();
        }

        const newNodeStates = new Map(currentExecution.nodeStates);
        newNodeStates.set(nodeId, updatedState);

        set({
            currentExecution: {
                ...currentExecution,
                nodeStates: newNodeStates,
            },
        });

        console.log('[Workflow] Node state updated:', nodeId, updatedState.status);
    },

    addExecutionLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        const newLog: ExecutionLog = {
            ...log,
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
        };

        set({
            currentExecution: {
                ...currentExecution,
                logs: [...currentExecution.logs, newLog],
            },
        });
    },

    updateVariable: (key: string, value: JsonValue) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        const newVariables = new Map(currentExecution.variables);
        newVariables.set(key, value);

        set({
            currentExecution: {
                ...currentExecution,
                variables: newVariables,
            },
        });

        console.log('[Workflow] Variable updated:', key);
    },

    clearExecution: () => {
        console.log('[Workflow] Clearing execution state');
        set({ currentExecution: null });
    },
}));
