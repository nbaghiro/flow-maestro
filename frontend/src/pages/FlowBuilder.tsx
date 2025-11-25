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
import { VersionPanel } from "../components/VersionPanel";
import { WorkflowSettingsDialog } from "../components/WorkflowSettingsDialog";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { getWorkflow, updateWorkflow } from "../lib/api";
import { generateId } from "../lib/utils";
import {
    createWorkflowSnapshot,
    transformNodesToBackendMap,
    transformEdgesToBackend,
    findEntryPoint
} from "../lib/workflowTransformers";
import { useHistoryStore, initializeHistoryTracking } from "../stores/historyStore";
import { useWorkflowStore } from "../stores/workflowStore";

const NODE_DUPLICATE_OFFSET = 20;
const SAVE_SUCCESS_TIMEOUT = 2000;
const SAVE_ERROR_TIMEOUT = 3000;
const FIT_VIEW_PADDING = 0.2;

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
    const [isVersionOpen, setIsVersionOpen] = useState(false);

    const mockVersions = [
        { id: "1", name: "Initial version", createdAt: "Nov 21, 2025 – 10:22 AM" },
        { id: "2", name: "Checkpoint A", createdAt: "Nov 22, 2025 – 3:10 PM" },
        { id: "3", name: null, createdAt: "Nov 23, 2025 – 7:45 PM" }
    ];

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
        selectNode,
        setNodes
    } = useWorkflowStore();

    const { undo, redo, canUndo, canRedo, clear } = useHistoryStore();

    useEffect(() => {
        const unsubscribe = initializeHistoryTracking();
        return () => {
            unsubscribe();
            clear();
        };
    }, [clear]);

    useEffect(() => {
        if (workflowId) {
            loadWorkflow();
        }
    }, [workflowId]);

    useEffect(() => {
        if (!isLoading && lastSavedState !== "") {
            const currentState = createWorkflowSnapshot(workflowName, nodes, edges);
            setHasUnsavedChanges(currentState !== lastSavedState);
        }
    }, [nodes, edges, workflowName, isLoading, lastSavedState]);

    useEffect(() => {
        if (
            !isLoading &&
            lastSavedState === "" &&
            (nodes.length > 0 || workflowName !== "Untitled Workflow")
        ) {
            const initialState = createWorkflowSnapshot(workflowName, nodes, edges);
            setLastSavedState(initialState);
        }
    }, [isLoading, nodes, edges, workflowName]);

    const loadWorkflow = async () => {
        if (!workflowId) return;

        try {
            resetWorkflow();
            const response = await getWorkflow(workflowId);

            if (response.success && response.data) {
                setWorkflowName(response.data.name);
                setWorkflowDescription(response.data.description || "");
                setAIMetadata(response.data.ai_generated || false, response.data.ai_prompt || null);

                if (response.data.definition) {
                    const definition = response.data.definition;

                    if (definition.nodes && Object.keys(definition.nodes).length > 0) {
                        const nodesObj = definition.nodes as Record<string, unknown>;
                        const flowNodes = Object.entries(nodesObj).map(
                            ([id, node]: [string, unknown]) => {
                                const nodeData = node as Record<string, unknown>;
                                const flowNode: {
                                    id: string;
                                    type: string;
                                    position: { x: number; y: number };
                                    data: Record<string, unknown>;
                                    style?: React.CSSProperties;
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

                                if (nodeData.style) {
                                    flowNode.style = nodeData.style as React.CSSProperties;
                                }

                                return flowNode;
                            }
                        );

                        useWorkflowStore.getState().setNodes(flowNodes);
                    }

                    if (definition.edges && definition.edges.length > 0) {
                        useWorkflowStore.getState().setEdges(definition.edges);
                    }
                }
            }
        } catch (error) {
            console.error("[FlowBuilder] Failed to load workflow:", error);
        } finally {
            setIsLoading(false);
            clear();
        }
    };

    const handleSave = useCallback(async () => {
        if (!workflowId) return;

        setSaveStatus("saving");

        try {
            const nodesMap = transformNodesToBackendMap(nodes);
            const backendEdges = transformEdgesToBackend(edges);
            const entryPoint = findEntryPoint(nodes);

            const workflowDefinition = {
                name: workflowName,
                nodes: nodesMap,
                edges: backendEdges,
                ...(entryPoint && { entryPoint })
            };

            const updatePayload: {
                name: string;
                description?: string;
                definition: unknown;
                aiGenerated?: boolean;
                aiPrompt?: string | null;
            } = {
                name: workflowName,
                definition: workflowDefinition
            };

            if (workflowDescription) {
                updatePayload.description = workflowDescription;
            }
            if (aiGenerated !== undefined) {
                updatePayload.aiGenerated = aiGenerated;
            }
            if (aiPrompt) {
                updatePayload.aiPrompt = aiPrompt;
            }

            await updateWorkflow(workflowId, updatePayload as Parameters<typeof updateWorkflow>[1]);

            setSaveStatus("saved");
            setLastSavedState(createWorkflowSnapshot(workflowName, nodes, edges));

            setTimeout(() => setSaveStatus("idle"), SAVE_SUCCESS_TIMEOUT);
        } catch (error: unknown) {
            console.error("Failed to save workflow:", error);
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), SAVE_ERROR_TIMEOUT);
        }
    }, [workflowId, nodes, edges, workflowName, workflowDescription, aiGenerated, aiPrompt]);

    const handleDuplicateNode = useCallback(() => {
        if (!selectedNode) return;

        const node = nodes.find((n) => n.id === selectedNode);
        if (!node) return;

        const newNode: Node = {
            id: generateId(),
            type: node.type,
            position: {
                x: node.position.x + NODE_DUPLICATE_OFFSET,
                y: node.position.y + NODE_DUPLICATE_OFFSET
            },
            data: { ...node.data },
            style: node.style ? { ...node.style } : undefined
        };

        addNode(newNode);
        selectNode(newNode.id);
    }, [selectedNode, nodes, addNode, selectNode]);

    const handleCopyNode = useCallback(() => {
        if (!selectedNode) return;

        const node = nodes.find((n) => n.id === selectedNode);
        if (!node) return;

        setCopiedNode({
            type: node.type || "default",
            data: { ...node.data },
            style: node.style ? { ...node.style } : undefined,
            position: node.position
        });
    }, [selectedNode, nodes]);

    const handlePasteNode = useCallback(() => {
        if (!copiedNode) return;

        const newNode: Node = {
            id: generateId(),
            type: copiedNode.type,
            position: {
                x: copiedNode.position.x + NODE_DUPLICATE_OFFSET,
                y: copiedNode.position.y + NODE_DUPLICATE_OFFSET
            },
            data: { ...copiedNode.data },
            style: copiedNode.style
        };

        addNode(newNode);
        selectNode(newNode.id);
    }, [copiedNode, addNode, selectNode]);

    const handleDeleteNode = useCallback(() => {
        if (!selectedNode) return;
        deleteNode(selectedNode);
    }, [selectedNode, deleteNode]);

    const handleSelectAll = useCallback(() => {
        const updatedNodes = nodes.map((node) => ({
            ...node,
            selected: true
        }));
        setNodes(updatedNodes);
    }, [nodes, setNodes]);

    const handleDeselectAll = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const handleFitView = useCallback(() => {
        if (reactFlowInstanceRef.current) {
            reactFlowInstanceRef.current.fitView({ padding: FIT_VIEW_PADDING });
        }
    }, []);

    const handleRunWorkflow = useCallback(() => {
        const runButton = document.querySelector('[data-action="run"]') as HTMLButtonElement;
        if (runButton) runButton.click();
    }, []);

    const handleNameChange = (name: string) => {
        setWorkflowName(name);
    };

    const handleSettingsSave = async (name: string, description: string) => {
        if (!workflowId) return;

        try {
            await updateWorkflow(workflowId, { name, description });
            setWorkflowName(name);
            setWorkflowDescription(description);
        } catch (error) {
            console.error("Failed to save workflow settings:", error);
            throw error;
        }
    };

    const handleRenameVersion = (id: string, newName: string) => {
        console.log("Rename version:", id, "->", newName);
    };

    useKeyboardShortcuts({
        onSave: handleSave,
        onRun: handleRunWorkflow,
        onOpenSettings: () => setIsSettingsOpen(true),
        onUndo: undo,
        onRedo: redo,
        onDelete: handleDeleteNode,
        onDuplicate: handleDuplicateNode,
        onCopy: handleCopyNode,
        onPaste: handlePasteNode,
        onSelectAll: handleSelectAll,
        onDeselectAll: handleDeselectAll,
        onFitView: handleFitView,
        canUndo,
        canRedo
    });

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
                    onOpenVersion={() => setIsVersionOpen(true)}
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

                <div className="flex-1 flex overflow-hidden relative">
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

                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                        <div className="flex items-center gap-2">
                            <AIGenerateButton />
                            {workflowId && (
                                <ExecutionPanel workflowId={workflowId} renderButtonOnly />
                            )}
                        </div>
                    </div>

                    {workflowId && <ExecutionPanel workflowId={workflowId} renderPanelOnly />}
                    <VersionPanel
                        open={isVersionOpen}
                        onClose={() => setIsVersionOpen(false)}
                        versions={mockVersions}
                        onRevert={(id) => console.log("revert", id)}
                        onDelete={(id) => console.log("delete", id)}
                        onRename={handleRenameVersion}
                    />
                </div>
            </div>
        </ReactFlowProvider>
    );
}
