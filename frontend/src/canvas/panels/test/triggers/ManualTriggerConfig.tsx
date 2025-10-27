/**
 * Manual Trigger Configuration
 * Simple key-value input editor for manual workflow execution
 */

import { useState, useEffect } from "react";
import { Node } from "reactflow";
import { Plus, Trash2, Info } from "lucide-react";
import { ManualTriggerConfig as ManualConfig } from "../../../../lib/triggerTypes";

interface ManualTriggerConfigProps {
    config: ManualConfig | undefined;
    onChange: (config: ManualConfig) => void;
    workflowNodes: Node[];
}

export function ManualTriggerConfig({ config, onChange, workflowNodes }: ManualTriggerConfigProps) {
    const [inputs, setInputs] = useState<Record<string, any>>(config?.inputs || {});

    // Extract input nodes from workflow
    const inputNodes = workflowNodes.filter((node) => node.type === "input");

    useEffect(() => {
        onChange({ inputs });
    }, [inputs]);

    const handleAddInput = () => {
        const key = prompt("Input name:");
        if (key && !inputs[key]) {
            setInputs({ ...inputs, [key]: "" });
        }
    };

    const handleUpdateInput = (key: string, value: any) => {
        setInputs({ ...inputs, [key]: value });
    };

    const handleRemoveInput = (key: string) => {
        const newInputs = { ...inputs };
        delete newInputs[key];
        setInputs(newInputs);
    };

    const handleInputTypeChange = (key: string, type: string) => {
        let defaultValue: any = "";

        switch (type) {
            case "number":
                defaultValue = 0;
                break;
            case "boolean":
                defaultValue = false;
                break;
            case "json":
                defaultValue = {};
                break;
            default:
                defaultValue = "";
        }

        setInputs({ ...inputs, [key]: defaultValue });
    };

    // Auto-populate from input nodes
    useEffect(() => {
        if (inputNodes.length > 0 && Object.keys(inputs).length === 0) {
            const autoInputs: Record<string, any> = {};
            inputNodes.forEach((node) => {
                const inputName = node.data.config?.inputName || `input_${node.id}`;
                const inputType = node.data.config?.inputType || "text";

                switch (inputType) {
                    case "number":
                        autoInputs[inputName] = 0;
                        break;
                    case "boolean":
                        autoInputs[inputName] = false;
                        break;
                    case "json":
                        autoInputs[inputName] = {};
                        break;
                    default:
                        autoInputs[inputName] = "";
                }
            });
            setInputs(autoInputs);
        }
    }, [inputNodes]);

    const renderInputField = (key: string, value: any) => {
        const valueType = typeof value;

        if (valueType === "boolean") {
            return (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleUpdateInput(key, e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-sm">{value ? "True" : "False"}</span>
                </label>
            );
        }

        if (valueType === "number") {
            return (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => handleUpdateInput(key, Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    placeholder="Enter number..."
                />
            );
        }

        if (valueType === "object") {
            return (
                <textarea
                    value={JSON.stringify(value, null, 2)}
                    onChange={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            handleUpdateInput(key, parsed);
                        } catch (err) {
                            // Invalid JSON, keep editing
                        }
                    }}
                    rows={4}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                    placeholder='{"key": "value"}'
                />
            );
        }

        // Default: string input
        return (
            <input
                type="text"
                value={value}
                onChange={(e) => handleUpdateInput(key, e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                placeholder="Enter value..."
            />
        );
    };

    return (
        <div className="p-4 space-y-4">
            {/* Info */}
            {inputNodes.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-800">
                        <strong>Auto-detected {inputNodes.length} input node{inputNodes.length > 1 ? "s" : ""}</strong>
                        <p className="mt-1">
                            Inputs have been pre-populated from your workflow's Input nodes.
                        </p>
                    </div>
                </div>
            )}

            {/* Inputs List */}
            {Object.keys(inputs).length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                        No inputs defined. Add inputs to provide data to your workflow.
                    </p>
                    <button
                        onClick={handleAddInput}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Input
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {Object.entries(inputs).map(([key, value]) => (
                        <div
                            key={key}
                            className="p-3 border border-border rounded-lg space-y-2"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium font-mono">{key}</span>
                                <div className="flex items-center gap-1">
                                    <select
                                        value={typeof value}
                                        onChange={(e) => handleInputTypeChange(key, e.target.value)}
                                        className="px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                                    >
                                        <option value="string">Text</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="object">JSON</option>
                                    </select>
                                    <button
                                        onClick={() => handleRemoveInput(key)}
                                        className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Remove input"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {renderInputField(key, value)}
                        </div>
                    ))}

                    <button
                        onClick={handleAddInput}
                        className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add Another Input
                    </button>
                </div>
            )}

            {/* JSON Preview */}
            {Object.keys(inputs).length > 0 && (
                <div className="pt-3 border-t border-border">
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                        JSON Preview
                    </label>
                    <pre className="px-3 py-2 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                        {JSON.stringify(inputs, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
