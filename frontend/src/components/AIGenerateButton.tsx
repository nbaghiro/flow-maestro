/**
 * AI Generate Button Component
 * Floating button to trigger AI workflow generation
 */

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import { useWorkflowStore } from "../stores/workflowStore";
import { AIGenerateDialog } from "./AIGenerateDialog";

export function AIGenerateButton() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const generateWorkflowFromAI = useWorkflowStore((state) => state.generateWorkflowFromAI);

    const handleGenerate = async (prompt: string, connectionId: string, model: string) => {
        await generateWorkflowFromAI(prompt, connectionId, model);
    };

    return (
        <>
            <button
                onClick={() => setDialogOpen(true)}
                className={cn(
                    "px-4 py-2 border rounded-lg shadow-lg transition-colors",
                    "bg-background border-border hover:bg-muted"
                )}
                title="Generate workflow with AI"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">Generate</span>
                </div>
            </button>

            {/* Dialog */}
            <AIGenerateDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onGenerate={handleGenerate}
            />
        </>
    );
}
