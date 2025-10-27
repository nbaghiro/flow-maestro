/**
 * Variable Dialog Component
 * A proper modal dialog for adding variables (replaces ugly browser prompts)
 */

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface VariableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (variableName: string, initialValue: any) => void;
    title?: string;
    description?: string;
}

export function VariableDialog({
    open,
    onOpenChange,
    onConfirm,
    title = "Add Variable",
    description = "Enter a name and initial value for the variable",
}: VariableDialogProps) {
    const [variableName, setVariableName] = useState("");
    const [initialValue, setInitialValue] = useState("");
    const [valueType, setValueType] = useState<"string" | "number" | "boolean">("string");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!variableName.trim()) {
            setError("Variable name is required");
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
            setError("Variable name must start with a letter or underscore and contain only letters, numbers, and underscores");
            return;
        }

        // Parse value based on type
        let parsedValue: any = initialValue;
        if (valueType === "number") {
            parsedValue = initialValue === "" ? 0 : Number(initialValue);
            if (isNaN(parsedValue)) {
                setError("Invalid number");
                return;
            }
        } else if (valueType === "boolean") {
            parsedValue = initialValue === "true" || initialValue === "1";
        }

        // Call parent callback
        onConfirm(variableName, parsedValue);

        // Reset and close
        setVariableName("");
        setInitialValue("");
        setValueType("string");
        setError("");
        onOpenChange(false);
    };

    const handleCancel = () => {
        setVariableName("");
        setInitialValue("");
        setValueType("string");
        setError("");
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 z-50">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Dialog.Title className="text-lg font-semibold">
                                {title}
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-1">
                                {description}
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Variable Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Variable Name
                            </label>
                            <input
                                type="text"
                                value={variableName}
                                onChange={(e) => {
                                    setVariableName(e.target.value);
                                    setError("");
                                }}
                                placeholder="continueAsking"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                autoFocus
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Must start with a letter or underscore
                            </p>
                        </div>

                        {/* Value Type */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Value Type
                            </label>
                            <select
                                value={valueType}
                                onChange={(e) => {
                                    setValueType(e.target.value as any);
                                    setInitialValue("");
                                }}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                <option value="string">Text (String)</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean (true/false)</option>
                            </select>
                        </div>

                        {/* Initial Value */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Initial Value
                            </label>
                            {valueType === "boolean" ? (
                                <select
                                    value={initialValue}
                                    onChange={(e) => setInitialValue(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                </select>
                            ) : (
                                <input
                                    type={valueType === "number" ? "number" : "text"}
                                    value={initialValue}
                                    onChange={(e) => {
                                        setInitialValue(e.target.value);
                                        setError("");
                                    }}
                                    placeholder={
                                        valueType === "number"
                                            ? "0"
                                            : "Initial value..."
                                    }
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                />
                            )}
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
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Add Variable
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
