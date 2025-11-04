import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { CodeInput } from "../../../components/CodeInput";

interface TransformNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const operations = [
    { value: "map", label: "Map (transform each item)" },
    { value: "filter", label: "Filter (select items)" },
    { value: "reduce", label: "Reduce (aggregate)" },
    { value: "sort", label: "Sort" },
    { value: "merge", label: "Merge objects/arrays" },
    { value: "extract", label: "Extract properties" },
    { value: "custom", label: "Custom JSONata" }
];

export function TransformNodeConfig({ data, onUpdate }: TransformNodeConfigProps) {
    const [operation, setOperation] = useState(data.operation || "map");
    const [inputData, setInputData] = useState(data.inputData || "");
    const [expression, setExpression] = useState(data.expression || "");
    const [outputVariable, setOutputVariable] = useState(data.outputVariable || "");

    // Sync state when data prop changes (e.g., loading from database)
    useEffect(() => {
        if (data.operation) setOperation(data.operation);
        if (data.inputData) setInputData(data.inputData);
        if (data.expression) setExpression(data.expression);
        if (data.outputVariable) setOutputVariable(data.outputVariable);
    }, [data.operation, data.inputData, data.expression, data.outputVariable]);

    useEffect(() => {
        onUpdate({
            operation,
            inputData,
            expression,
            outputVariable
        });
    }, [operation, inputData, expression, outputVariable]);

    const getPlaceholder = () => {
        switch (operation) {
            case "map":
                return "item => ({ ...item, newField: item.oldField * 2 })";
            case "filter":
                return "item => item.value > 10";
            case "reduce":
                return "(acc, item) => acc + item.value";
            case "sort":
                return "(a, b) => a.value - b.value";
            case "merge":
                return "[${array1}, ${array2}] or {...${obj1}, ...${obj2}}";
            case "extract":
                return "item.property.nested";
            case "custom":
                return "$map(items, function($item) { $item.price * 1.1 })";
            default:
                return "";
        }
    };

    const getDescription = () => {
        switch (operation) {
            case "map":
                return "Transform each item in an array";
            case "filter":
                return "Filter items based on a condition";
            case "reduce":
                return "Aggregate array into a single value";
            case "sort":
                return "Sort array items";
            case "merge":
                return "Combine multiple objects or arrays";
            case "extract":
                return "Extract specific properties from objects";
            case "custom":
                return "Use JSONata query language for complex transformations";
            default:
                return "";
        }
    };

    return (
        <div>
            <FormSection title="Operation">
                <FormField label="Transform Type">
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

                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">{getDescription()}</p>
                </div>
            </FormSection>

            <FormSection title="Input">
                <FormField label="Input Data" description="Variable reference to transform">
                    <input
                        type="text"
                        value={inputData}
                        onChange={(e) => setInputData(e.target.value)}
                        placeholder="${arrayVariable}"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Transformation">
                <FormField
                    label={operation === "custom" ? "JSONata Expression" : "Expression"}
                    description={
                        operation === "custom"
                            ? "JSONata query"
                            : "JavaScript expression or function"
                    }
                >
                    <CodeInput
                        value={expression}
                        onChange={setExpression}
                        language={operation === "custom" ? "jsonata" : "javascript"}
                        placeholder={getPlaceholder()}
                        rows={operation === "custom" ? 8 : 6}
                    />
                </FormField>

                {operation === "custom" && (
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">
                            <strong>JSONata Examples:</strong>
                        </p>
                        <code className="text-xs block mb-1">
                            $map(items, function($i) {"{"}$i.name{"}"}){" "}
                            <span className="text-muted-foreground">// Extract names</span>
                        </code>
                        <code className="text-xs block mb-1">
                            items[price &gt; 100]{" "}
                            <span className="text-muted-foreground">// Filter by price</span>
                        </code>
                        <code className="text-xs block">
                            $sum(items.price){" "}
                            <span className="text-muted-foreground">// Sum prices</span>
                        </code>
                    </div>
                )}
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "Transform"}
                    nodeType="transform"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
