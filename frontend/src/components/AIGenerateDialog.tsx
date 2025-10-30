/**
 * AI Generate Dialog Component
 * Modal for generating workflows from natural language prompts
 */

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useConnectionStore } from "../stores/connectionStore";
import { getRandomExamplePrompts } from "../lib/example-prompts";

interface AIGenerateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (prompt: string, connectionId: string) => Promise<void>;
}

export function AIGenerateDialog({
    open,
    onOpenChange,
    onGenerate,
}: AIGenerateDialogProps) {
    const [prompt, setPrompt] = useState("");
    const [selectedConnectionId, setSelectedConnectionId] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [examplePrompts, setExamplePrompts] = useState<string[]>(() => getRandomExamplePrompts(4));

    const { connections, fetchConnections } = useConnectionStore();

    // Filter connections for LLM providers only (API key or OAuth)
    const llmConnections = connections.filter(conn =>
        ['openai', 'anthropic', 'google', 'cohere'].includes(conn.provider.toLowerCase())
        && conn.status === 'active'
        && (conn.connection_method === 'api_key' || conn.connection_method === 'oauth2')
    );

    // Fetch connections when dialog opens
    useEffect(() => {
        if (open) {
            fetchConnections();
        }
    }, [open, fetchConnections]);

    // Auto-select first connection if none selected
    useEffect(() => {
        if (llmConnections.length > 0 && !selectedConnectionId) {
            setSelectedConnectionId(llmConnections[0].id);
        }
    }, [llmConnections, selectedConnectionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!prompt.trim()) {
            setError("Please enter a workflow description");
            return;
        }

        if (prompt.trim().length < 10) {
            setError("Please provide a more detailed description (at least 10 characters)");
            return;
        }

        if (!selectedConnectionId) {
            setError("Please select an LLM connection");
            return;
        }

        setIsGenerating(true);
        setError("");

        try {
            await onGenerate(prompt, selectedConnectionId);

            // Reset and close on success
            setPrompt("");
            setSelectedConnectionId(llmConnections[0]?.id || "");
            setError("");
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to generate workflow:', error);
            setError(
                error instanceof Error
                    ? error.message
                    : 'Failed to generate workflow. Please try again.'
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCancel = () => {
        setPrompt("");
        setError("");
        onOpenChange(false);
    };

    const handleRefreshExamples = () => {
        // Get new random examples from the predefined list
        setExamplePrompts(getRandomExamplePrompts(4));
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
                                <Sparkles className="w-5 h-5 text-primary" />
                                Generate Workflow with AI
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-1">
                                Describe your workflow in natural language and AI will generate the nodes and connections
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                className="p-1 rounded-md hover:bg-muted transition-colors"
                                aria-label="Close"
                                disabled={isGenerating}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Prompt */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Workflow Description
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => {
                                    setPrompt(e.target.value);
                                    setError("");
                                }}
                                placeholder="Example: Fetch tech news from NewsAPI and summarize each article with GPT-4"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                rows={4}
                                autoFocus
                                disabled={isGenerating}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Be specific about what you want the workflow to do. Include data sources, transformations, and outputs.
                            </p>
                        </div>

                        {/* LLM Connection Selector */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                LLM Connection
                            </label>
                            {llmConnections.length === 0 ? (
                                <div className="px-3 py-2 border border-border rounded-lg bg-muted/50">
                                    <p className="text-sm text-muted-foreground">
                                        No LLM connections found. Please add an OpenAI, Anthropic, Google, or Cohere connection first.
                                    </p>
                                </div>
                            ) : (
                                <select
                                    value={selectedConnectionId}
                                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={isGenerating}
                                >
                                    {llmConnections.map((conn) => (
                                        <option key={conn.id} value={conn.id}>
                                            {conn.name} ({conn.provider})
                                        </option>
                                    ))}
                                </select>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                This connection will be used to generate the workflow structure
                            </p>
                        </div>

                        {/* Examples Section */}
                        <div className="px-3 py-2 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium">Example prompts:</p>
                                <button
                                    type="button"
                                    onClick={handleRefreshExamples}
                                    disabled={isGenerating}
                                    className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Shuffle examples"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                {examplePrompts.map((example, index) => (
                                    <li key={index}>• {example}</li>
                                ))}
                            </ul>
                        </div>

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
                                disabled={isGenerating}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={isGenerating || llmConnections.length === 0}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Generate Workflow
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
