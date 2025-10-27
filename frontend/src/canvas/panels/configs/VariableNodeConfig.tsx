import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";

interface VariableNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const operations = [
    { value: "set", label: "Set Variable" },
    { value: "get", label: "Get Variable" },
    { value: "delete", label: "Delete Variable" },
];

const scopes = [
    { value: "workflow", label: "Workflow (current workflow only)" },
    { value: "global", label: "Global (across workflows)" },
    { value: "temporary", label: "Temporary (this execution only)" },
];

const valueTypes = [
    { value: "auto", label: "Auto-detect" },
    { value: "string", label: "String" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "json", label: "JSON" },
];

export function VariableNodeConfig({ data, onUpdate }: VariableNodeConfigProps) {
    const [operation, setOperation] = useState(data.config?.operation || "set");
    const [variableName, setVariableName] = useState(data.config?.variableName || "");
    const [value, setValue] = useState(data.config?.value || "");
    const [scope, setScope] = useState(data.config?.scope || "workflow");
    const [valueType, setValueType] = useState(data.config?.valueType || "auto");

    useEffect(() => {
        onUpdate({
            operation,
            variableName,
            value,
            scope,
            valueType,
        });
    }, [operation, variableName, value, scope, valueType]);

    return (
        <div>
            <FormSection title="Operation">
                <FormField label="Type">
                    <select
                        value={operation}
                        onChange={(e) => setOperation(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {operations.map((op) => (
                            <option key={op.value} value={op.value}>
                                {op.label}
                            </option>
                        ))}
                    </select>
                </FormField>
            </FormSection>

            <FormSection title="Variable">
                <FormField
                    label="Variable Name"
                    description="Name of the variable"
                >
                    <input
                        type="text"
                        value={variableName}
                        onChange={(e) => setVariableName(e.target.value)}
                        placeholder="myVariable"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                </FormField>

                <FormField label="Scope">
                    <select
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {scopes.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </FormField>
            </FormSection>

            {operation === "set" && (
                <FormSection title="Value">
                    <FormField label="Value Type">
                        <select
                            value={valueType}
                            onChange={(e) => setValueType(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            {valueTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField
                        label="Value"
                        description="Literal value or ${variableName} reference"
                    >
                        <textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={
                                valueType === "json"
                                    ? '{"key": "value"}'
                                    : valueType === "boolean"
                                    ? "true"
                                    : "Value or ${otherVariable}"
                            }
                            rows={valueType === "json" ? 6 : 4}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            {operation === "get" && (
                <FormSection title="Output">
                    <div className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
                        <p>
                            The variable value will be available in the workflow context after this
                            node executes.
                        </p>
                        <p className="mt-2">
                            <strong>Access via:</strong>{" "}
                            <code className="text-foreground">{`\${${variableName || "variableName"}}`}</code>
                        </p>
                    </div>
                </FormSection>
            )}

            {operation === "delete" && (
                <FormSection title="Confirmation">
                    <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>Warning:</strong> This will permanently delete the variable{" "}
                            <code>{variableName || "variableName"}</code> from the {scope} scope.
                        </p>
                    </div>
                </FormSection>
            )}

            <FormSection title="Scope Information">
                <div className="space-y-2 text-xs">
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="font-semibold text-foreground">Workflow</p>
                        <p className="text-muted-foreground">
                            Variables persist only within the current workflow execution
                        </p>
                    </div>
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="font-semibold text-foreground">Global</p>
                        <p className="text-muted-foreground">
                            Variables shared across all workflow executions
                        </p>
                    </div>
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="font-semibold text-foreground">Temporary</p>
                        <p className="text-muted-foreground">
                            Variables exist only during current node execution
                        </p>
                    </div>
                </div>
            </FormSection>
        </div>
    );
}
