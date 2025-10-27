/**
 * Outputs Viewer Component
 * Display final workflow outputs in a readable format
 */

import { useState } from "react";
import { useTestScenarioStore } from "../../stores/testScenarioStore";
import { Copy, Check } from "lucide-react";

export function OutputsViewer() {
    const { execution } = useTestScenarioStore();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const text = JSON.stringify(execution.outputs, null, 2);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (Object.keys(execution.outputs).length === 0) {
        return (
            <div className="text-center py-8 text-sm text-muted-foreground">
                No outputs produced
            </div>
        );
    }

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Output Data</span>
                <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-background rounded transition-colors"
                    title="Copy outputs"
                >
                    {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                    ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {Object.entries(execution.outputs).map(([key, value]) => (
                    <div key={key} className="mb-4 last:mb-0">
                        <div className="text-sm font-medium text-primary mb-2">{key}</div>
                        <div className="bg-muted rounded-lg p-3">
                            {typeof value === "object" ? (
                                <pre className="text-xs font-mono overflow-x-auto">
                                    {JSON.stringify(value, null, 2)}
                                </pre>
                            ) : (
                                <div className="text-sm">{String(value)}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
