import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkflows, createWorkflow, generateWorkflow, updateWorkflow, deleteWorkflow, getWorkflow } from "../lib/api";
import { CreateWorkflowDialog } from "../components/CreateWorkflowDialog";
import { AIGenerateDialog } from "../components/AIGenerateDialog";
import { ErrorDialog } from "../components/ErrorDialog";
import { convertToReactFlowFormat } from "../lib/workflow-layout";
import { PageHeader } from "../components/common/PageHeader";
import { Plus, FileText, Calendar, Loader2, Sparkles, Trash2, MoreVertical, Copy } from "lucide-react";

interface Workflow {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export function Workflows() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
    const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [error, setError] = useState<{ title: string; message: string } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadWorkflows();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [openMenuId]);

    const loadWorkflows = async () => {
        try {
            const response = await getWorkflows();
            if (response.success && response.data) {
                setWorkflows(response.data.items);
            }
        } catch (error) {
            console.error("Failed to load workflows:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateWorkflow = async (name: string, description?: string) => {
        const response = await createWorkflow(name, description);
        if (response.success && response.data) {
            navigate(`/builder/${response.data.id}`);
        }
    };

    const handleGenerateWorkflow = async (prompt: string, credentialId: string) => {
        try {
            // Generate workflow using AI
            const generateResponse = await generateWorkflow({ prompt, credentialId });

            if (generateResponse.success && generateResponse.data) {
                const { nodes, edges, metadata } = generateResponse.data;

                // Convert generated workflow to React Flow format
                const { nodes: flowNodes, edges: flowEdges } = convertToReactFlowFormat(
                    nodes,
                    edges,
                    metadata.entryNodeId
                );

                // Create a new workflow with the generated name
                const workflowName = metadata.name || "AI Generated Workflow";
                const createResponse = await createWorkflow(workflowName, metadata.description);

                if (createResponse.success && createResponse.data) {
                    const workflowId = createResponse.data.id;

                    // Convert React Flow format back to backend format for saving
                    const nodesMap: Record<string, any> = {};
                    flowNodes.forEach(node => {
                        const { label, onError, ...config } = node.data || {};
                        nodesMap[node.id] = {
                            type: node.type || 'default',
                            name: label || node.id,
                            config: config,
                            position: node.position,
                            ...(onError && { onError }),
                        };
                    });

                    // Find entry point
                    const inputNode = flowNodes.find(n => n.type === 'input');
                    const entryPoint = inputNode?.id || (flowNodes.length > 0 ? flowNodes[0].id : '');

                    const workflowDefinition = {
                        name: workflowName,
                        nodes: nodesMap,
                        edges: flowEdges.map(edge => ({
                            id: edge.id,
                            source: edge.source,
                            target: edge.target,
                            sourceHandle: edge.sourceHandle,
                        })),
                        entryPoint,
                    };

                    // Update workflow with the generated definition
                    await updateWorkflow(workflowId, {
                        name: workflowName,
                        definition: workflowDefinition,
                    });

                    // Navigate to the builder with the new workflow
                    navigate(`/builder/${workflowId}`);
                }
            }
        } catch (error) {
            console.error("Failed to generate workflow:", error);
        }
    };

    const handleDeleteWorkflow = async () => {
        if (!workflowToDelete) return;

        setIsDeleting(true);
        try {
            await deleteWorkflow(workflowToDelete.id);
            // Refresh the workflow list
            await loadWorkflows();
            setWorkflowToDelete(null);
        } catch (error: any) {
            console.error("Failed to delete workflow:", error);
            setError({
                title: "Delete Failed",
                message: error.message || "Failed to delete workflow. Please try again.",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicateWorkflow = async (workflow: Workflow) => {
        try {
            setOpenMenuId(null);

            // Fetch the full workflow with definition
            const response = await getWorkflow(workflow.id);
            if (!response.success || !response.data) {
                throw new Error("Failed to load workflow");
            }

            const originalWorkflow = response.data;

            // Create a new workflow with "Copy of" prefix and the full definition
            const newName = `Copy of ${workflow.name}`;

            // Prepare the definition with the new name
            const newDefinition = originalWorkflow.definition
                ? { ...originalWorkflow.definition, name: newName }
                : {
                    name: newName,
                    nodes: {},
                    edges: [],
                    entryPoint: '',
                };

            // Create workflow directly with the full definition using fetch
            const token = localStorage.getItem('auth_token');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

            const createResponse = await fetch(`${API_BASE_URL}/api/workflows`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({
                    name: newName,
                    description: workflow.description,
                    definition: newDefinition,
                }),
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${createResponse.status}: ${createResponse.statusText}`);
            }

            const createData = await createResponse.json();

            if (createData.success && createData.data) {
                // Refresh the workflow list
                await loadWorkflows();

                // Navigate to the new workflow
                navigate(`/builder/${createData.data.id}`);
            }
        } catch (error: any) {
            console.error("Failed to duplicate workflow:", error);
            setError({
                title: "Duplicate Failed",
                message: error.message || "Failed to duplicate workflow. Please try again.",
            });
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Workflows"
                description={`${workflows.length} ${workflows.length === 1 ? "workflow" : "workflows"}`}
                action={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAIDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-background hover:bg-muted border border-border rounded-lg transition-colors shadow-sm"
                            title="Generate workflow with AI"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate with AI
                        </button>
                        <button
                            onClick={() => setIsDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Workflow
                        </button>
                    </div>
                }
            />

            {/* Workflow Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading workflows...</p>
                    </div>
                </div>
            ) : workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-white">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No workflows yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        Get started by creating your first workflow. Build complex AI-powered
                        workflows with our drag-and-drop canvas.
                    </p>
                    <button
                        onClick={() => setIsDialogOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Your First Workflow
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="bg-white border border-border rounded-lg p-5 hover:border-primary hover:shadow-md transition-all group relative"
                        >
                            <div
                                onClick={() => navigate(`/builder/${workflow.id}`)}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                            Workflow
                                        </span>

                                        {/* Menu Button */}
                                        <div className="relative" ref={openMenuId === workflow.id ? menuRef : null}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === workflow.id ? null : workflow.id);
                                                }}
                                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                                title="More options"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openMenuId === workflow.id && (
                                                <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDuplicateWorkflow(workflow);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Duplicate
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            setWorkflowToDelete(workflow);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {workflow.name}
                                </h3>

                                {workflow.description && (
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                        {workflow.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Created {formatDate(workflow.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Workflow Dialog */}
            <CreateWorkflowDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onCreate={handleCreateWorkflow}
            />

            {/* AI Generate Dialog */}
            <AIGenerateDialog
                open={isAIDialogOpen}
                onOpenChange={setIsAIDialogOpen}
                onGenerate={handleGenerateWorkflow}
            />

            {/* Delete Confirmation Dialog */}
            {workflowToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Delete Workflow
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete "{workflowToDelete.name}"? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setWorkflowToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteWorkflow}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Dialog */}
            <ErrorDialog
                isOpen={error !== null}
                title={error?.title || "Error"}
                message={error?.message || "An error occurred"}
                onClose={() => setError(null)}
            />
        </div>
    );
}
