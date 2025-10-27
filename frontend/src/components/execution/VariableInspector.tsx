/**
 * Variable Inspector Component
 * Display real-time workflow variables with tree view
 */

import { useState } from "react";
import { useTestScenarioStore } from "../../stores/testScenarioStore";
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function VariableInspector() {
    const { execution } = useTestScenarioStore();
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const toggleExpanded = (key: string) => {
        const newExpanded = new Set(expandedKeys);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedKeys(newExpanded);
    };

    const copyValue = (value: any) => {
        const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
        navigator.clipboard.writeText(text);
        setCopiedKey(JSON.stringify(value));
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const renderValue = (
        key: string,
        value: any,
        path: string = "",
        level: number = 0
    ): React.ReactNode => {
        const fullPath = path ? `${path}.${key}` : key;
        const isExpanded = expandedKeys.has(fullPath);
        const indent = level * 16;

        // Handle objects and arrays
        if (value !== null && typeof value === "object") {
            const isArray = Array.isArray(value);
            const entries = isArray
                ? value.map((v, i) => [i.toString(), v])
                : Object.entries(value);

            return (
                <div key={fullPath}>
                    <div
                        className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded cursor-pointer group"
                        style={{ paddingLeft: `${indent + 8}px` }}
                        onClick={() => toggleExpanded(fullPath)}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm text-primary">{key}:</span>
                        <span className="text-xs text-muted-foreground">
                            {isArray ? `Array(${value.length})` : `Object`}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                copyValue(value);
                            }}
                            className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
                            title="Copy value"
                        >
                            {copiedKey === JSON.stringify(value) ? (
                                <Check className="w-3 h-3 text-green-600" />
                            ) : (
                                <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                        </button>
                    </div>

                    {isExpanded && (
                        <div>
                            {entries.map(([k, v]) => renderValue(k, v, fullPath, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        // Handle primitives
        const valueType = typeof value;
        let displayValue = value;
        let valueClass = "";

        if (valueType === "string") {
            displayValue = `"${value}"`;
            valueClass = "text-green-600";
        } else if (valueType === "number") {
            valueClass = "text-blue-600";
        } else if (valueType === "boolean") {
            valueClass = "text-purple-600";
        } else if (value === null) {
            displayValue = "null";
            valueClass = "text-gray-500";
        } else if (value === undefined) {
            displayValue = "undefined";
            valueClass = "text-gray-500";
        }

        return (
            <div
                key={fullPath}
                className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded group"
                style={{ paddingLeft: `${indent + 24}px` }}
            >
                <span className="font-medium text-sm text-foreground">{key}:</span>
                <span className={cn("text-sm font-mono", valueClass)}>{String(displayValue)}</span>
                <button
                    onClick={() => copyValue(value)}
                    className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
                    title="Copy value"
                >
                    {copiedKey === JSON.stringify(value) ? (
                        <Check className="w-3 h-3 text-green-600" />
                    ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                </button>
            </div>
        );
    };

    if (Object.keys(execution.variables).length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-8 text-sm text-muted-foreground">
                No variables yet. Variables will appear here during execution.
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-2">
            <div className="space-y-0.5">
                {Object.entries(execution.variables).map(([key, value]) =>
                    renderValue(key, value)
                )}
            </div>
        </div>
    );
}
