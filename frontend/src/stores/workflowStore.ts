import { create } from "zustand";
import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from "reactflow";
import { executeWorkflow as executeWorkflowAPI, generateWorkflow } from "../lib/api";
import { convertToReactFlowFormat } from "../lib/workflow-layout";

interface WorkflowStore {
    nodes: Node[];
    edges: Edge[];
    selectedNode: string | null;

    // Workflow metadata
    aiGenerated: boolean;
    aiPrompt: string | null;

    // Execution state
    isExecuting: boolean;
    executionResult: any | null;
    executionError: string | null;

    // Actions
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    addNode: (node: Node) => void;
    updateNode: (nodeId: string, data: any) => void;
    deleteNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;
    setAIMetadata: (aiGenerated: boolean, aiPrompt: string | null) => void;
    executeWorkflow: (inputs?: Record<string, any>) => Promise<void>;
    generateWorkflowFromAI: (prompt: string, credentialId: string) => Promise<void>;
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

            const response = await executeWorkflowAPI(nodes, edges, inputs);

            if (response.success && response.data) {
                console.log('[Workflow] Execution completed:', response.data.result);
                set({
                    executionResult: response.data.result,
                    isExecuting: false
                });
            } else {
                throw new Error(response.error || 'Workflow execution failed');
            }
        } catch (error: any) {
            console.error('[Workflow] Execution failed:', error);
            set({
                executionError: error.message || 'Unknown error',
                isExecuting: false
            });
        }
    },

    generateWorkflowFromAI: async (prompt: string, credentialId: string) => {
        console.log('[Workflow] Generating workflow from AI prompt:', prompt);

        try {
            const response = await generateWorkflow({ prompt, credentialId });

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
        } catch (error: any) {
            console.error('[Workflow] AI generation failed:', error);
            throw error; // Re-throw so dialog can show error
        }
    },
}));
