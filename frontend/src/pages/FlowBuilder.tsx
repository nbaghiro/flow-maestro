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
import { ExecutionPanel } from "../components/ExecutionPanel";
import { AIGenerateButton } from "../components/AIGenerateButton";
import { WorkflowSettingsDialog } from "../components/WorkflowSettingsDialog";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function FlowBuilder() {
    const { workflowId } = useParams<{ workflowId: string }>();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [workflowName, setWorkflowName] = useState("Untitled Workflow");
    const [workflowDescription, setWorkflowDescription] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [lastSavedState, setLastSavedState] = useState<string>("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { selectedNode, nodes, edges, aiGenerated, aiPrompt, setAIMetadata } = useWorkflowStore();

    useEffect(() => {
        if (workflowId) {
            loadWorkflow();
        }
    }, [workflowId]);

    // Helper function to create a serialized snapshot of the workflow state
    // This mirrors exactly what we save to the backend for accurate comparison
    const getWorkflowStateSnapshot = () => {
        const nodesSnapshot = nodes.map((node) => {
            // Extract label and onError from node.data, rest goes into config
            const { label, onError, ...config } = (node.data || {}) as Record<string, unknown>;

            const nodeData: {
                id: string;
                type: string;
                name: string;
                position: { x: number; y: number };
                config: Record<string, unknown>;
                onError?: unknown;
            } = {
                id: node.id,
                type: node.type || "default",
                name: (label as string) || node.id,
                // Only include non-empty config
                config: Object.keys(config).length > 0 ? config : {},
                // Normalize position to only x and y
                position: {
                    x: node.position.x,
                    y: node.position.y
                }
            };

            // Only include onError if it exists and has a strategy
            if (onError && typeof onError === "object" && "strategy" in onError) {
                nodeData.onError = onError;
            }

            return nodeData;
        });

        const edgesSnapshot = edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle })
        }));

        // Sort nodes and edges by id for consistent comparison
        const sortedNodes = [...nodesSnapshot].sort((a, b) => a.id.localeCompare(b.id));
        const sortedEdges = [...edgesSnapshot].sort((a, b) => a.id.localeCompare(b.id));

        return JSON.stringify({
            name: workflowName,
            nodes: sortedNodes,
            edges: sortedEdges
        });
    };

    // Track changes to nodes, edges, and workflow name
    useEffect(() => {
        if (!isLoading && lastSavedState !== "") {
            const currentState = getWorkflowStateSnapshot();
            const hasChanges = currentState !== lastSavedState;
            setHasUnsavedChanges(hasChanges);
        }
    }, [nodes, edges, workflowName, isLoading, lastSavedState]);

    // Debug method to log the complete workflow JSON structure
    // This can be called from browser console: window.debugWorkflow()
    const logWorkflowStructure = () => {
        // Convert React Flow nodes to backend format (keyed by node id)
        const nodesMap: Record<string, unknown> = {};
        nodes.forEach((node) => {
            // Extract label and onError from node.data, rest goes into config
            const { label, onError, ...config } = (node.data || {}) as Record<string, unknown>;

            // Only include onError if it has a valid strategy
            const nodeData: {
                type: string;
                name: string;
                config: Record<string, unknown>;
                position: { x: number; y: number };
                onError?: unknown;
            } = {
                type: node.type || "default",
                name: (label as string) || node.id,
                config: config,
                position: node.position
            };

            // Only add onError if it exists and has a strategy
            if (onError && typeof onError === "object" && "strategy" in onError) {
                nodeData.onError = onError;
            }

            nodesMap[node.id] = nodeData;
        });

        // Find entry point (first Input node or first node)
        const inputNode = nodes.find((n) => n.type === "input");
        const entryPoint = inputNode?.id || (nodes.length > 0 ? nodes[0].id : "");

        const workflowStructure = {
            name: workflowName,
            description: workflowDescription,
            nodes: nodesMap,
            edges: edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle
            })),
            entryPoint,
            aiGenerated: aiGenerated,
            aiPrompt: aiPrompt
        };

        return workflowStructure;
    };

    // Expose debug method to window for browser console access
    useEffect(() => {
        (window as Window & { debugWorkflow?: () => void }).debugWorkflow =
            logWorkflowStructure;

        return () => {
            delete (window as Window & { debugWorkflow?: () => void }).debugWorkflow;
        };
    }, [nodes, edges, workflowName, workflowDescription, aiGenerated, aiPrompt]);

    const loadWorkflow = async () => {
        if (!workflowId) return;

        try {
            const response = await getWorkflow(workflowId);

            if (response.success && response.data) {
                setWorkflowName(response.data.name);
                setWorkflowDescription(response.data.description || "");

                // Load AI metadata
                setAIMetadata(response.data.ai_generated || false, response.data.ai_prompt || null);

                // Load workflow definition (nodes, edges) into the canvas
                if (response.data.definition) {
                    const definition = response.data.definition;

                    // Convert backend nodes format to React Flow format
                    if (definition.nodes && Object.keys(definition.nodes).length > 0) {
                        const nodesObj = definition.nodes as Record<string, unknown>;
                        const flowNodes = Object.entries(nodesObj).map(
                            ([id, node]: [string, unknown]) => {
                                const nodeData = node as Record<string, unknown>;
                                return {
                                    id,
                                    type: (nodeData.type as string) || "default",
                                    position: (nodeData.position as { x: number; y: number }) || {
                                        x: 0,
                                        y: 0
                                    },
                                    data: {
                                        label: nodeData.name,
                                        ...(nodeData.config as Record<string, unknown>),
                                        onError: nodeData.onError
                                    }
                                };
                            }
                        );

                        // Set nodes in the store
                        useWorkflowStore.getState().setNodes(flowNodes);
                    }

                    // Load edges
                    if (definition.edges && definition.edges.length > 0) {
                        useWorkflowStore.getState().setEdges(definition.edges);
                    }
                }
            }
        } catch (error) {
            console.error("[FlowBuilder] Failed to load workflow:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Set initial saved state after workflow is loaded
    useEffect(() => {
        if (
            !isLoading &&
            lastSavedState === "" &&
            (nodes.length > 0 || workflowName !== "Untitled Workflow")
        ) {
            const initialState = getWorkflowStateSnapshot();
            setLastSavedState(initialState);
        }
    }, [isLoading, nodes, edges, workflowName]);

    const handleSave = async () => {
        if (!workflowId) return;

        setSaveStatus("saving");

        try {
            // Convert React Flow nodes to backend format (keyed by node id)
            const nodesMap: Record<string, unknown> = {};
            nodes.forEach((node) => {
                // Extract label and onError from node.data, rest goes into config
                const { label, onError, ...config } = (node.data || {}) as Record<string, unknown>;

                // Only include onError if it has a valid strategy
                const nodeData: {
                    type: string;
                    name: string;
                    config: Record<string, unknown>;
                    position: { x: number; y: number };
                    onError?: unknown;
                } = {
                    type: node.type || "default",
                    name: (label as string) || node.id,
                    config: config,
                    position: node.position
                };

                // Only add onError if it exists and has a strategy
                if (
                    onError &&
                    (onError as { strategy?: string }).strategy
                ) {
                    nodeData.onError = onError;
                }

                nodesMap[node.id] = nodeData;
            });

            // Find entry point (first Input node or first node)
            const inputNode = nodes.find((n) => n.type === "input");
            const entryPoint = inputNode?.id || (nodes.length > 0 ? nodes[0].id : "");

            // Don't save if there are no nodes
            if (!entryPoint || nodes.length === 0) {
                console.error("Cannot save workflow with no nodes");
                setSaveStatus("error");
                setTimeout(() => setSaveStatus("idle"), 3000);
                return;
            }

            const workflowDefinition = {
                name: workflowName,
                nodes: nodesMap,
                edges: edges.map((edge) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    sourceHandle: edge.sourceHandle
                })),
                entryPoint
            };

            console.log("Saving workflow:", {
                name: workflowName,
                nodesCount: Object.keys(nodesMap).length,
                edgesCount: edges.length,
                entryPoint
            });

            console.log("Full workflow definition:", JSON.stringify(workflowDefinition, null, 2));

            // Build update payload, only including non-empty fields
            const updatePayload: {
                name: string;
                description?: string;
                definition: unknown;
            } = {
                name: workflowName,
                definition: workflowDefinition
            };

            // Only include description if it's not empty
            if (workflowDescription) {
                updatePayload.description = workflowDescription;
            }

            // Only include AI metadata if present
            if (aiGenerated !== undefined) {
                (updatePayload as Record<string, unknown>).aiGenerated = aiGenerated;
            }
            if (aiPrompt) {
                (updatePayload as Record<string, unknown>).aiPrompt = aiPrompt;
            }

            await updateWorkflow(workflowId, updatePayload as Parameters<typeof updateWorkflow>[1]);

            setSaveStatus("saved");

            // Update saved state snapshot
            const savedState = getWorkflowStateSnapshot();
            setLastSavedState(savedState);

            console.log("Workflow saved successfully");

            // Reset to idle after 2 seconds
            setTimeout(() => {
                setSaveStatus("idle");
            }, 2000);
        } catch (error: unknown) {
            console.error("Failed to save workflow:", error);
            setSaveStatus("error");

            // Reset to idle after 3 seconds
            setTimeout(() => {
                setSaveStatus("idle");
            }, 3000);
        }
    };

    const handleNameChange = (name: string) => {
        setWorkflowName(name);
    };

    const handleSettingsSave = async (name: string, description: string) => {
        if (!workflowId) return;

        try {
            // Update backend
            await updateWorkflow(workflowId, {
                name,
                description
            });

            // Update local state
            setWorkflowName(name);
            setWorkflowDescription(description);
        } catch (error) {
            console.error("Failed to save workflow settings:", error);
            // Re-throw so the dialog can display the error
            throw error;
        }
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
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />

                <WorkflowSettingsDialog
                    open={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                    workflowName={workflowName}
                    workflowDescription={workflowDescription}
                    aiGenerated={aiGenerated}
                    aiPrompt={aiPrompt}
                    onSave={handleSettingsSave}
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

                    {/* Centered Floating Buttons Group */}
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                        <div className="flex items-center gap-2">
                            <AIGenerateButton />
                            {workflowId && (
                                <ExecutionPanel workflowId={workflowId} renderButtonOnly />
                            )}
                        </div>
                    </div>

                    {/* Drawer Panels - Positioned on the right */}
                    {workflowId && <ExecutionPanel workflowId={workflowId} renderPanelOnly />}
                </div>
            </div>
        </ReactFlowProvider>
    );
}
