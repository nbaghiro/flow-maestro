/**
 * Workflow Settings Dialog Component
 * Modal for viewing and editing workflow metadata
 */

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Sparkles, Loader2 } from "lucide-react";

interface WorkflowSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowName: string;
    workflowDescription: string;
    aiGenerated: boolean;
    aiPrompt: string | null;
    onSave: (name: string, description: string) => Promise<void>;
}

export function WorkflowSettingsDialog({
    open,
    onOpenChange,
    workflowName,
    workflowDescription,
    aiGenerated,
    aiPrompt,
    onSave,
}: WorkflowSettingsDialogProps) {
    const [name, setName] = useState(workflowName);
    const [description, setDescription] = useState(workflowDescription);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    // Update local state when props change
    useEffect(() => {
        setName(workflowName);
        setDescription(workflowDescription);
        setError("");
    }, [workflowName, workflowDescription, open]);

    const handleSave = async () => {
        setIsSaving(true);
        setError("");

        try {
            await onSave(name, description);
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save workflow settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original values
        setName(workflowName);
        setDescription(workflowDescription);
        setError("");
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 z-50">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                Workflow Settings
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-1">
                                View and edit workflow metadata
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                className="p-1 rounded-md hover:bg-muted transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        {/* Workflow Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Workflow Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Untitled Workflow"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                autoFocus
                            />
                        </div>

                        {/* Workflow Description */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter a description for this workflow..."
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                rows={3}
                            />
                        </div>

                        {/* AI Generation Info */}
                        {aiGenerated && (
                            <div className="pt-3 border-t border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">AI Generated Workflow</span>
                                </div>

                                {aiPrompt && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-muted-foreground">
                                            Original Prompt
                                        </label>
                                        <div className="px-3 py-2 bg-muted/50 border border-border rounded-lg">
                                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                                {aiPrompt}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
