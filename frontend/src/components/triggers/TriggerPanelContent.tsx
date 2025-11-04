/**
 * Trigger Panel Content
 * Main content for the trigger drawer - list of triggers and create functionality
 */

import { useState, useEffect } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { useTriggerStore } from "../../stores/triggerStore";
import { getTriggers } from "../../lib/api";
import { TriggerCard } from "./TriggerCard";
import { CreateTriggerDialog } from "./CreateTriggerDialog";

interface TriggerPanelContentProps {
    workflowId: string;
}

export function TriggerPanelContent({ workflowId }: TriggerPanelContentProps) {
    const { triggers, loadingTriggers, setTriggers, setLoadingTriggers } = useTriggerStore();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load triggers on mount and when workflowId changes
    useEffect(() => {
        loadTriggerList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflowId]);

    // Listen for create trigger event
    useEffect(() => {
        const handleCreateTrigger = () => {
            setShowCreateDialog(true);
        };

        window.addEventListener("trigger:create", handleCreateTrigger);
        return () => window.removeEventListener("trigger:create", handleCreateTrigger);
    }, []);

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
                            <Zap className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium mb-2">No Triggers Yet</h4>
                        <p className="text-sm text-muted-foreground">
                            Click the + icon above to add your first trigger and automate this
                            workflow.
                        </p>
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
