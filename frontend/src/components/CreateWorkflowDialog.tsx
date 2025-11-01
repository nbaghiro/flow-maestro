import { useState, FormEvent } from "react";
import { X, Loader2, Upload, FileJson, ChevronRight } from "lucide-react";
import type { WorkflowDefinition } from "../lib/api";

interface CreateWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description?: string, definition?: WorkflowDefinition) => Promise<void>;
}

export function CreateWorkflowDialog({ isOpen, onClose, onCreate }: CreateWorkflowDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [jsonInput, setJsonInput] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [parsedWorkflow, setParsedWorkflow] = useState<WorkflowDefinition | null>(null);

    const validateAndParseJSON = (json: string): { valid: boolean; data?: WorkflowDefinition; error?: string } => {
        if (!json.trim()) {
            return { valid: true }; // Empty is valid (optional)
        }

        try {
            const parsed = JSON.parse(json);

            // Validate basic structure
            if (!parsed || typeof parsed !== "object") {
                return { valid: false, error: "Invalid JSON: Expected an object" };
            }

            // Check if it has the required workflow structure
            if (!parsed.nodes || typeof parsed.nodes !== "object") {
                return { valid: false, error: "Invalid workflow: Missing 'nodes' property (must be an object)" };
            }

            if (!parsed.edges || !Array.isArray(parsed.edges)) {
                return { valid: false, error: "Invalid workflow: Missing or invalid 'edges' property (must be an array)" };
            }

            // Validate nodes structure more deeply
            const nodeEntries = Object.entries(parsed.nodes);
            if (nodeEntries.length > 0) {
                for (const [nodeId, node] of nodeEntries) {
                    const nodeObj = node as any;
                    if (!nodeObj.type || typeof nodeObj.type !== "string") {
                        return { valid: false, error: `Invalid node '${nodeId}': Missing or invalid 'type' property` };
                    }
                    if (!nodeObj.name || typeof nodeObj.name !== "string") {
                        return { valid: false, error: `Invalid node '${nodeId}': Missing or invalid 'name' property` };
                    }
                    if (!nodeObj.position || typeof nodeObj.position !== "object") {
                        return { valid: false, error: `Invalid node '${nodeId}': Missing 'position' property` };
                    }
                    if (typeof nodeObj.position.x !== "number" || typeof nodeObj.position.y !== "number") {
                        return { valid: false, error: `Invalid node '${nodeId}': Position must have x and y coordinates` };
                    }
                }
            }

            // Ensure entryPoint exists if there are nodes
            if (nodeEntries.length > 0 && !parsed.entryPoint) {
                return { valid: false, error: "Invalid workflow: Missing 'entryPoint' property" };
            }

            return { valid: true, data: parsed };
        } catch (err: any) {
            return { valid: false, error: `JSON parse error: ${err.message}` };
        }
    };

    const handleJsonChange = (value: string) => {
        setJsonInput(value);
        setError("");
        setParsedWorkflow(null);

        if (value.trim()) {
            const result = validateAndParseJSON(value);
            if (result.valid && result.data) {
                setParsedWorkflow(result.data);
            } else if (!result.valid && result.error) {
                setError(result.error);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".json")) {
            setError("Please upload a JSON file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            handleJsonChange(content);
        };
        reader.onerror = () => {
            setError("Failed to read file");
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        // When importing JSON, use the workflow name from JSON
        const workflowName = parsedWorkflow?.name || name.trim();
        const workflowDescription = parsedWorkflow?.description || description.trim();

        if (!workflowName) {
            setError("Workflow name is required");
            return;
        }

        // Validate JSON if provided
        if (jsonInput.trim()) {
            const result = validateAndParseJSON(jsonInput);
            if (!result.valid) {
                setError(result.error || "Invalid JSON");
                return;
            }
        }

        setIsCreating(true);
        try {
            await onCreate(
                workflowName,
                workflowDescription || undefined,
                parsedWorkflow || undefined
            );

            // Reset form
            setName("");
            setDescription("");
            setJsonInput("");
            setParsedWorkflow(null);
            setShowJsonImport(false);
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to create workflow");
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        if (!isCreating) {
            setName("");
            setDescription("");
            setJsonInput("");
            setParsedWorkflow(null);
            setError("");
            setShowJsonImport(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {showJsonImport ? "Import Workflow from JSON" : "Create New Workflow"}
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={isCreating}
                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    {/* Show name/description fields only when NOT in import mode */}
                    {!showJsonImport && (
                        <>
                            <div>
                                <label htmlFor="workflow-name" className="block text-sm font-medium text-foreground mb-1.5">
                                    Workflow Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="workflow-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Customer Onboarding Flow"
                                    required
                                    maxLength={255}
                                    disabled={isCreating}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label htmlFor="workflow-description" className="block text-sm font-medium text-foreground mb-1.5">
                                    Description (optional)
                                </label>
                                <textarea
                                    id="workflow-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what this workflow does..."
                                    rows={3}
                                    maxLength={1000}
                                    disabled={isCreating}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {description.length}/1000 characters
                                </p>
                            </div>

                            <div className="border-t border-border pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowJsonImport(true)}
                                    disabled={isCreating}
                                    className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors disabled:opacity-50"
                                >
                                    <FileJson className="w-4 h-4" />
                                    <span>Or import from JSON</span>
                                    <ChevronRight className="w-4 h-4 ml-auto" />
                                </button>
                            </div>
                        </>
                    )}

                    {/* JSON Import Section */}
                    {showJsonImport && (
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowJsonImport(false);
                                    setJsonInput("");
                                    setParsedWorkflow(null);
                                    setError("");
                                }}
                                disabled={isCreating}
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 mb-4"
                            >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                                <span>Back to manual creation</span>
                            </button>
                            <div className="mt-3 space-y-3">
                                {/* File Upload */}
                                <div>
                                    <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                                        <Upload className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Upload JSON file</span>
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileUpload}
                                            disabled={isCreating}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex-1 border-t border-border"></div>
                                    <span className="text-xs text-muted-foreground">OR</span>
                                    <div className="flex-1 border-t border-border"></div>
                                </div>

                                {/* JSON Input */}
                                <div>
                                    <label htmlFor="json-input" className="block text-xs font-medium text-muted-foreground mb-1.5">
                                        Paste JSON Definition
                                    </label>
                                    <textarea
                                        id="json-input"
                                        value={jsonInput}
                                        onChange={(e) => handleJsonChange(e.target.value)}
                                        placeholder={`{\n  "name": "My Workflow",\n  "nodes": {...},\n  "edges": [...],\n  "entryPoint": "..."\n}`}
                                        rows={6}
                                        disabled={isCreating}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {parsedWorkflow && (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    Valid
                                                </span>
                                                <span>{Object.keys(parsedWorkflow.nodes || {}).length} nodes</span>
                                                <span>{(parsedWorkflow.edges || []).length} edges</span>
                                            </div>
                                            {parsedWorkflow.name && (
                                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                                    <p className="text-sm font-medium text-foreground mb-1">
                                                        {parsedWorkflow.name}
                                                    </p>
                                                    {parsedWorkflow.description && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {parsedWorkflow.description}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isCreating}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || (showJsonImport ? !parsedWorkflow : !name.trim())}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {showJsonImport ? "Importing..." : "Creating..."}
                                </>
                            ) : (
                                showJsonImport ? "Import Workflow" : "Create Workflow"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
