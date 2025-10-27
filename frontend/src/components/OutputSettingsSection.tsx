/**
 * Output Settings Section Component
 * Reusable component for configuring node output variable storage
 */

import { useState, useEffect } from "react";
import { AlertCircle, Info } from "lucide-react";

interface OutputSettingsSectionProps {
    nodeName: string;
    nodeType: string;
    value?: string;
    onChange: (value: string) => void;
}

/**
 * Generate a suggested variable name from node name
 */
function generateVariableSuggestion(nodeName: string): string {
    // Convert to camelCase and remove special characters
    return nodeName
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .map((word, index) => {
            const lower = word.toLowerCase();
            return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join("");
}

/**
 * Validate variable name (alphanumeric + underscore only)
 */
function isValidVariableName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function OutputSettingsSection({
    nodeName,
    nodeType,
    value,
    onChange,
}: OutputSettingsSectionProps) {
    const [enabled, setEnabled] = useState(!!value);
    const [variableName, setVariableName] = useState(value || "");
    const [error, setError] = useState<string | null>(null);

    const suggestion = generateVariableSuggestion(nodeName || nodeType);

    // Update parent when value changes
    useEffect(() => {
        if (enabled && variableName) {
            onChange(variableName);
        } else {
            onChange("");
        }
    }, [enabled, variableName, onChange]);

    // Validate on change
    useEffect(() => {
        if (variableName && !isValidVariableName(variableName)) {
            setError("Variable name must start with letter/underscore and contain only letters, numbers, and underscores");
        } else {
            setError(null);
        }
    }, [variableName]);

    const handleToggle = (checked: boolean) => {
        setEnabled(checked);
        if (checked && !variableName) {
            setVariableName(suggestion);
        }
    };

    const handleUseSuggestion = () => {
        setVariableName(suggestion);
    };

    return (
        <div className="space-y-3">
            {/* Enable/Disable Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleToggle(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-sm font-medium">Store output in variable</span>
            </label>

            {enabled && (
                <>
                    {/* Variable Name Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium">Variable Name</label>
                        <input
                            type="text"
                            value={variableName}
                            onChange={(e) => setVariableName(e.target.value)}
                            placeholder="Enter variable name..."
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />

                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-red-700">{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Suggestion */}
                    {variableName !== suggestion && (
                        <button
                            onClick={handleUseSuggestion}
                            className="text-xs text-primary hover:text-primary/80 hover:underline"
                        >
                            💡 Use suggestion: <code className="font-mono">{suggestion}</code>
                        </button>
                    )}

                    {/* Reference Help */}
                    <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                            <strong>Reference this in other nodes:</strong>
                            <div className="mt-1 font-mono bg-white px-2 py-1 rounded border border-blue-300">
                                ${"{"}
                                {variableName || "variableName"}
                                {"}"}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
