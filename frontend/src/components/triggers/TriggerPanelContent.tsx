/**
 * Trigger Panel Content
 * Main content for the trigger drawer - list of triggers and create functionality
 */

import { useState, useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useTriggerStore } from "../../stores/triggerStore";
import { getTriggers } from "../../lib/api";
import { TriggerCard } from "./TriggerCard";
import { CreateTriggerDialog } from "./CreateTriggerDialog";

interface TriggerPanelContentProps {
    workflowId: string;
}

export function TriggerPanelContent({ workflowId }: TriggerPanelContentProps) {
    const {
        triggers,
        loadingTriggers,
        setTriggers,
        setLoadingTriggers,
    } = useTriggerStore();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load triggers on mount and when workflowId changes
    useEffect(() => {
        loadTriggerList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflowId]);

    const loadTriggerList = async () => {
        if (!workflowId) return;

        setLoadingTriggers(true);
        setError(null);

        try {
            const response = await getTriggers(workflowId);
            if (response.success && response.data) {
                setTriggers(response.data);
            }
        } catch (err) {
            console.error("Failed to load triggers:", err);
            setError("Failed to load triggers. Please try again.");
        } finally {
            setLoadingTriggers(false);
        }
    };

    const handleTriggerCreated = () => {
        setShowCreateDialog(false);
        loadTriggerList();
    };

    return (
        <div className="h-full flex flex-col">
            {/* Action Bar */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                    <button
                        onClick={loadTriggerList}
                        disabled={loadingTriggers}
                        className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-50"
                        title="Refresh triggers"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingTriggers ? "animate-spin" : ""}`} />
                    </button>

                    <button
                        onClick={() => setShowCreateDialog(true)}
                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Trigger
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {error && (
                    <div className="mx-4 mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                        {error}
                    </div>
                )}

                {loadingTriggers && triggers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm">Loading triggers...</p>
                    </div>
                ) : triggers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium mb-2">No Triggers Yet</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add your first trigger to automate this workflow with schedules, webhooks, or events.
                        </p>
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            Create Trigger
                        </button>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {triggers.map((trigger) => (
                            <TriggerCard
                                key={trigger.id}
                                trigger={trigger}
                                onUpdate={loadTriggerList}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            {showCreateDialog && (
                <CreateTriggerDialog
                    workflowId={workflowId}
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={handleTriggerCreated}
                />
            )}
        </div>
    );
}
