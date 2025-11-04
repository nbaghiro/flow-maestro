import { Save, Play, Loader2, CheckCircle, XCircle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkflowStore } from "../stores/workflowStore";

interface BuilderHeaderProps {
    workflowName?: string;
    hasUnsavedChanges?: boolean;
    saveStatus?: "idle" | "saving" | "saved" | "error";
    onSave?: () => void;
    onNameChange?: (name: string) => void;
    onOpenSettings?: () => void;
}

export function BuilderHeader({
    workflowName = "Untitled Workflow",
    hasUnsavedChanges = false,
    saveStatus = "idle",
    onSave,
    onNameChange,
    onOpenSettings
}: BuilderHeaderProps) {
    const { executeWorkflow, isExecuting, executionResult, executionError } = useWorkflowStore();
    const navigate = useNavigate();

    const handleRun = async () => {
        // TODO: Collect inputs from input nodes if needed
        await executeWorkflow();
    };

    const handleBack = () => {
        navigate("/");
    };

    return (
        <header className="bg-white border-b border-border shadow-sm">
            <div className="flex items-center justify-between px-6 py-3">
                {/* Left: Logo and Label */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold hover:bg-primary/90 transition-colors"
                        title="Back to Library"
                    >
                        FM
                    </button>
                    <span className="text-sm font-medium text-muted-foreground">
                        Workflow Builder
                    </span>
                </div>

                {/* Center: Workflow Name and Status */}
                <div className="flex-1 flex items-center justify-center gap-4 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 max-w-full">
                        <input
                            type="text"
                            value={workflowName}
                            onChange={(e) => onNameChange?.(e.target.value)}
                            className="text-base font-semibold bg-transparent border-none outline-none focus:bg-muted/50 px-3 py-1.5 rounded transition-colors text-center min-w-[200px] max-w-full"
                            placeholder="Untitled Workflow"
                            style={{ width: `${Math.max(200, workflowName.length * 10)}px` }}
                        />
                        {hasUnsavedChanges && (
                            <span className="flex items-center gap-1.5 text-xs text-amber-600 whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Unsaved
                            </span>
                        )}
                    </div>

                    {/* Execution Status */}
                    {isExecuting && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Executing...</span>
                        </div>
                    )}

                    {executionResult && !isExecuting && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Success</span>
                        </div>
                    )}

                    {executionError && !isExecuting && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm">
                            <XCircle className="w-4 h-4" />
                            <span>{executionError}</span>
                        </div>
                    )}
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenSettings}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg transition-colors"
                        title="Workflow Settings"
                    >
                        <Settings className="w-4 h-4" />
                    </button>

                    <button
                        onClick={onSave}
                        disabled={saveStatus === "saving"}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saveStatus === "saving" ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : saveStatus === "saved" ? (
                            <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Saved
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleRun}
                        disabled={isExecuting}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                    >
                        {isExecuting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        {isExecuting ? "Running..." : "Run"}
                    </button>
                </div>
            </div>
        </header>
    );
}
