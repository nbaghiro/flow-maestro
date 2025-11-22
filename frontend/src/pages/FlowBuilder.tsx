import { Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { ReactFlowProvider, useReactFlow, Node } from "reactflow";
import { NodeInspector } from "../canvas/panels/NodeInspector";
import { NodeLibrary } from "../canvas/panels/NodeLibrary";
import { WorkflowCanvas } from "../canvas/WorkflowCanvas";
import { AIGenerateButton } from "../components/AIGenerateButton";
import { BuilderHeader } from "../components/BuilderHeader";
import { ExecutionPanel } from "../components/ExecutionPanel";
import { WorkflowSettingsDialog } from "../components/WorkflowSettingsDialog";
import { getWorkflow, updateWorkflow } from "../lib/api";
import { generateId } from "../lib/utils";
import { useWorkflowStore } from "../stores/workflowStore";
import { useHistoryStore } from "@/stores/historyStore";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CopiedNode {
    type: string;
    data: Record<string, unknown>;
    style?: React.CSSProperties;
    position: { x: number; y: number };
}

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
    const [copiedNode, setCopiedNode] = useState<CopiedNode | null>(null);
    const reactFlowInstanceRef = useRef<ReturnType<typeof useReactFlow> | null>(null);
    const {
        selectedNode,
        nodes,
        edges,
        aiGenerated,
        aiPrompt,
        setAIMetadata,
        resetWorkflow,
        deleteNode,
        addNode,
        selectNode
    } = useWorkflowStore();

    // Access undo/redo actions and flags from the global history store.
    // clear() resets the entire undo/redo stack (called on unmount + page refresh).
    const { undo, redo, canUndo, canRedo, clear } = useHistoryStore();

    // Clear history when exiting the FlowBuilder page (component unmount).
    // This ensures each workflow starts with a fresh undo/redo stack.
    useEffect(() => {
        return () => {
            clear();
        };
    }, []);

    // Clear history on browser refresh (Cmd + R, F5, or closing tab).
    useEffect(() => {
        const handleBeforeUnload = () => {
            clear();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

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
                style?: React.CSSProperties;
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

            // Include style if it exists (for node dimensions)
            if (node.style) {
                nodeData.style = node.style;
            }

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
                style?: React.CSSProperties;
                onError?: unknown;
            } = {
                type: node.type || "default",
                name: (label as string) || node.id,
                config: config,
                position: node.position
            };

            // Include style if it exists (for node dimensions)
            if (node.style) {
                nodeData.style = node.style;
            }

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
        (window as Window & { debugWorkflow?: () => void }).debugWorkflow = logWorkflowStructure;

        return () => {
            delete (window as Window & { debugWorkflow?: () => void }).debugWorkflow;
        };
    }, [nodes, edges, workflowName, workflowDescription, aiGenerated, aiPrompt]);

    const loadWorkflow = async () => {
        if (!workflowId) return;

        try {
            // Reset the workflow store before loading new workflow
            resetWorkflow();

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
                                const flowNode: {
                                    id: string;
                                    type: string;
                                    position: { x: number; y: number };
                                    style?: React.CSSProperties;
                                    data: Record<string, unknown>;
                                } = {
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

                                // Include style if it exists (for node dimensions)
                                if (nodeData.style) {
                                    flowNode.style = nodeData.style as React.CSSProperties;
                                }

                                return flowNode;
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

    const handleSave = useCallback(async () => {
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
                    style?: React.CSSProperties;
                    onError?: unknown;
                } = {
                    type: node.type || "default",
                    name: (label as string) || node.id,
                    config: config,
                    position: node.position
                };

                // Include style if it exists (for node dimensions)
                if (node.style) {
                    nodeData.style = node.style;
                }

                // Only add onError if it exists and has a strategy
                if (onError && (onError as { strategy?: string }).strategy) {
                    nodeData.onError = onError;
                }

                nodesMap[node.id] = nodeData;
            });

            // Find entry point (first Input node or first node)
            const inputNode = nodes.find((n) => n.type === "input");
            const entryPoint = inputNode?.id || (nodes.length > 0 ? nodes[0].id : "");

            const workflowDefinition: {
                name: string;
                nodes: Record<string, unknown>;
                edges: Array<{
                    id: string;
                    source: string;
                    target: string;
                    sourceHandle?: string;
                }>;
                entryPoint?: string;
            } = {
                name: workflowName,
                nodes: nodesMap,
                edges: edges.map((edge) => {
                    const edgeData: {
                        id: string;
                        source: string;
                        target: string;
                        sourceHandle?: string;
                    } = {
                        id: edge.id,
                        source: edge.source,
                        target: edge.target
                    };
                    if (edge.sourceHandle) {
                        edgeData.sourceHandle = edge.sourceHandle;
                    }
                    return edgeData;
                })
            };

            // Only include entryPoint if workflow has nodes
            if (entryPoint) {
                workflowDefinition.entryPoint = entryPoint;
            }

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
    }, [workflowId, nodes, edges, workflowName, workflowDescription, aiGenerated, aiPrompt]);

    // Helper: Duplicate selected node
    const handleDuplicateNode = useCallback(() => {
        if (!selectedNode) return;

        const node = nodes.find((n) => n.id === selectedNode);
        if (!node) return;

        const newNode: Node = {
            id: generateId(),
            type: node.type,
            position: {
                x: node.position.x + 20,
                y: node.position.y + 20
            },
            data: { ...node.data },
            style: node.style ? { ...node.style } : undefined
        };

        addNode(newNode);
        selectNode(newNode.id);
    }, [selectedNode, nodes, addNode, selectNode]);

    // Helper: Copy selected node
    const handleCopyNode = useCallback(() => {
        if (!selectedNode) {
            console.log("Copy: No node selected");
            return;
        }

        const node = nodes.find((n) => n.id === selectedNode);
        if (!node) {
            console.log("Copy: Node not found");
            return;
        }

        const copied = {
            type: node.type || "default",
            data: { ...node.data },
            style: node.style ? { ...node.style } : undefined,
            position: node.position
        };

        console.log("Node copied:", copied);
        setCopiedNode(copied);
    }, [selectedNode, nodes]);

    // Helper: Paste copied node
    const handlePasteNode = useCallback(() => {
        if (!copiedNode) return;

        // Position with offset like duplicate (20px down and right)
        const newNode: Node = {
            id: generateId(),
            type: copiedNode.type,
            position: {
                x: copiedNode.position.x + 20,
                y: copiedNode.position.y + 20
            },
            data: { ...copiedNode.data },
            style: copiedNode.style
        };

        addNode(newNode);
        selectNode(newNode.id);
    }, [copiedNode, addNode, selectNode]);

    // Helper: Delete selected node
    const handleDeleteNode = useCallback(() => {
        if (!selectedNode) return;
        deleteNode(selectedNode);
    }, [selectedNode, deleteNode]);

    // Helper: Select all nodes
    const handleSelectAll = useCallback(() => {
        // React Flow handles multi-selection natively, but we can't trigger it programmatically
        // For now, this is a placeholder - React Flow doesn't expose a selectAll API
        console.log("Select all - not implemented (React Flow limitation)");
    }, []);

    // Helper: Deselect all nodes
    const handleDeselectAll = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    // Helper: Fit view
    const handleFitView = useCallback(() => {
        if (reactFlowInstanceRef.current) {
            reactFlowInstanceRef.current.fitView({ padding: 0.2 });
        }
    }, []);

    // Keyboard shortcuts handler
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore shortcuts when typing in input fields
            const target = event.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                // Exception: Allow Cmd+S to save even when in input
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                    event.preventDefault();
                    handleSave();
                }
                return;
            }

            const key = event.key.toLowerCase();

            // Cmd+S (Mac) or Ctrl+S (Windows/Linux) - Save
            if ((event.metaKey || event.ctrlKey) && key === "s") {
                event.preventDefault();
                handleSave();
                return;
            }

            // Cmd+Enter - Run workflow
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                const runButton = document.querySelector(
                    '[data-action="run"]'
                ) as HTMLButtonElement;
                if (runButton) runButton.click();
                return;
            }

            // Cmd+, - Open settings
            if ((event.metaKey || event.ctrlKey) && event.key === ",") {
                event.preventDefault();
                console.log("Opening settings via Cmd+,");
                setIsSettingsOpen(true);
                return;
            }

            // Cmd+Z - Undo
            if ((event.metaKey || event.ctrlKey) && key === "z" && !event.shiftKey) {
                event.preventDefault();
                if (canUndo) undo();
                return;
            }

            // Cmd+Shift+Z (Mac) - Redo
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && "z") {
                event.preventDefault();
                if (canRedo) redo();
                return;
            }

            // Ctrl+Y (Windows/linux) - Redo
            if ((event.metaKey || event.ctrlKey) && key === "y") {
                event.preventDefault();
                if (canRedo) redo();
                return;
            }

            // Delete/Backspace - Delete node
            if (event.key === "Delete" || event.key === "Backspace") {
                event.preventDefault();
                handleDeleteNode();
                return;
            }

            // Cmd+D - Duplicate node
            if ((event.metaKey || event.ctrlKey) && key === "d") {
                event.preventDefault();
                handleDuplicateNode();
                return;
            }

            // Cmd+C - Copy node
            if ((event.metaKey || event.ctrlKey) && key === "c") {
                event.preventDefault();
                console.log("Copy shortcut triggered, selectedNode:", selectedNode);
                handleCopyNode();
                return;
            }

            // Cmd+V - Paste node
            if ((event.metaKey || event.ctrlKey) && key === "v") {
                event.preventDefault();
                console.log("Paste shortcut triggered, copiedNode:", copiedNode);
                handlePasteNode();
                return;
            }

            // Cmd+A - Select all nodes
            if ((event.metaKey || event.ctrlKey) && key === "a") {
                event.preventDefault();
                handleSelectAll();
                return;
            }

            // Escape - Deselect all
            if (event.key === "Escape") {
                event.preventDefault();
                handleDeselectAll();
                return;
            }

            // Cmd+0 - Fit view
            if ((event.metaKey || event.ctrlKey) && key === "0") {
                event.preventDefault();
                handleFitView();
                return;
            }
        };

        // Add event listener
        document.addEventListener("keydown", handleKeyDown);

        // Cleanup
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        handleSave,
        handleDeleteNode,
        handleDuplicateNode,
        handleCopyNode,
        handlePasteNode,
        handleSelectAll,
        handleDeselectAll,
        handleFitView,
        selectedNode,
        copiedNode
    ]);

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
                    workflowId={workflowId}
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
                        <WorkflowCanvas
                            onInit={(instance) => (reactFlowInstanceRef.current = instance)}
                        />
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
