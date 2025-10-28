import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import { WorkflowCanvas } from "../canvas/WorkflowCanvas";
import { NodeLibrary } from "../canvas/panels/NodeLibrary";
import { NodeInspector } from "../canvas/panels/NodeInspector";
import { BuilderHeader } from "../components/BuilderHeader";
import { useWorkflowStore } from "../stores/workflowStore";
import { getWorkflow, updateWorkflow } from "../lib/api";
import { Loader2 } from "lucide-react";
import { TestDrawer } from "../components/TestDrawer";
import { TestPanelContent } from "../canvas/panels/test/TestPanelContent";
import { TriggerDrawer } from "../components/TriggerDrawer";
import { TriggerPanelContent } from "../components/triggers/TriggerPanelContent";

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function FlowBuilder() {
    const { workflowId } = useParams<{ workflowId: string }>();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [workflowName, setWorkflowName] = useState("Untitled Workflow");
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [lastSavedState, setLastSavedState] = useState<string>("");
    const { selectedNode, nodes, edges } = useWorkflowStore();

    useEffect(() => {
        if (workflowId) {
            loadWorkflow();
        }
    }, [workflowId]);

    // Helper function to create a serialized snapshot of the workflow state
    // This mirrors exactly what we save to the backend for accurate comparison
    const getWorkflowStateSnapshot = () => {
        const nodesSnapshot = nodes.map(node => {
            // Extract label and onError from node.data, rest goes into config
            const { label, onError, ...config } = node.data || {};

            return {
                id: node.id,
                type: node.type || 'default',
                name: label || node.id,
                // Only include non-empty config
                config: Object.keys(config).length > 0 ? config : {},
                // Normalize position to only x and y
                position: {
                    x: node.position.x,
                    y: node.position.y,
                },
                // Only include onError if it exists
                ...(onError && { onError }),
            };
        });

        const edgesSnapshot = edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle }),
        }));

        // Sort nodes and edges by id for consistent comparison
        const sortedNodes = [...nodesSnapshot].sort((a, b) => a.id.localeCompare(b.id));
        const sortedEdges = [...edgesSnapshot].sort((a, b) => a.id.localeCompare(b.id));

        return JSON.stringify({
            name: workflowName,
            nodes: sortedNodes,
            edges: sortedEdges,
        });
    };

    // Track changes to nodes, edges, and workflow name
    useEffect(() => {
        if (!isLoading && lastSavedState !== "") {
            const currentState = getWorkflowStateSnapshot();
            const hasChanges = currentState !== lastSavedState;
            setHasUnsavedChanges(hasChanges);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, workflowName, isLoading, lastSavedState]);

    const loadWorkflow = async () => {
        if (!workflowId) return;

        try {
            const response = await getWorkflow(workflowId);
            if (response.success && response.data) {
                setWorkflowName(response.data.name);

                // Load workflow definition (nodes, edges) into the canvas
                if (response.data.definition) {
                    const definition = response.data.definition;

                    // Convert backend nodes format to React Flow format
                    if (definition.nodes) {
                        const flowNodes = Object.entries(definition.nodes).map(([id, node]: [string, any]) => ({
                            id,
                            type: node.type,
                            position: node.position,
                            data: {
                                label: node.name,
                                ...node.config,
                                onError: node.onError,
                            },
                        }));

                        // Set nodes in the store
                        useWorkflowStore.getState().setNodes(flowNodes);
                    }

                    // Load edges
                    if (definition.edges && definition.edges.length > 0) {
                        useWorkflowStore.getState().setEdges(definition.edges);
                    }

                    console.log('Workflow loaded:', {
                        name: response.data.name,
                        nodesCount: definition.nodes ? Object.keys(definition.nodes).length : 0,
                        edgesCount: definition.edges ? definition.edges.length : 0,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to load workflow:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Set initial saved state after workflow is loaded
    useEffect(() => {
        if (!isLoading && lastSavedState === "" && (nodes.length > 0 || workflowName !== "Untitled Workflow")) {
            const initialState = getWorkflowStateSnapshot();
            setLastSavedState(initialState);
        }
    }, [isLoading, nodes, edges, workflowName]);

    const handleSave = async () => {
        if (!workflowId) return;

        setSaveStatus('saving');

        try {
            // Convert React Flow nodes to backend format (keyed by node id)
            const nodesMap: Record<string, any> = {};
            nodes.forEach(node => {
                // Extract label and onError from node.data, rest goes into config
                const { label, onError, ...config } = node.data || {};

                nodesMap[node.id] = {
                    type: node.type || 'default',
                    name: label || node.id,
                    config: config,
                    position: node.position,
                    ...(onError && { onError }),
                };
            });

            // Find entry point (first Input node or first node)
            const inputNode = nodes.find(n => n.type === 'input');
            const entryPoint = inputNode?.id || (nodes.length > 0 ? nodes[0].id : '');

            const workflowDefinition = {
                name: workflowName,
                nodes: nodesMap,
                edges: edges.map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    sourceHandle: edge.sourceHandle,
                })),
                entryPoint,
            };

            console.log('Saving workflow:', {
                name: workflowName,
                nodesCount: Object.keys(nodesMap).length,
                edgesCount: edges.length,
                entryPoint,
            });

            console.log('Full workflow definition:', JSON.stringify(workflowDefinition, null, 2));

            await updateWorkflow(workflowId, {
                name: workflowName,
                definition: workflowDefinition,
            });

            setSaveStatus('saved');

            // Update saved state snapshot
            const savedState = getWorkflowStateSnapshot();
            setLastSavedState(savedState);

            console.log('Workflow saved successfully');

            // Reset to idle after 2 seconds
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (error: any) {
            console.error("Failed to save workflow:", error);
            setSaveStatus('error');

            // Reset to idle after 3 seconds
            setTimeout(() => {
                setSaveStatus('idle');
            }, 3000);
        }
    };

    const handleNameChange = (name: string) => {
        setWorkflowName(name);
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading workflow...</p>
                </div>
            </div>
        );
    }

    return (
        <ReactFlowProvider>
            <div className="h-screen flex flex-col bg-gray-50">
                <BuilderHeader
                    workflowName={workflowName}
                    hasUnsavedChanges={hasUnsavedChanges}
                    saveStatus={saveStatus}
                    onSave={handleSave}
                    onNameChange={handleNameChange}
                />

                <div className="flex-1 flex overflow-hidden">
                    <NodeLibrary
                        isCollapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                    <div className="flex-1">
                        <WorkflowCanvas />
                    </div>
                    {selectedNode && <NodeInspector />}

                    {/* Test Drawer - Right Side Panel */}
                    <TestDrawer>
                        <TestPanelContent />
                    </TestDrawer>

                    {/* Trigger Drawer - Right Side Panel */}
                    <TriggerDrawer>
                        {workflowId && <TriggerPanelContent workflowId={workflowId} />}
                    </TriggerDrawer>
                </div>
            </div>
        </ReactFlowProvider>
    );
}
