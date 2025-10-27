import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { CodeInput } from "../../../components/CodeInput";

interface ConditionalNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const conditionTypes = [
    { value: "simple", label: "Simple Comparison" },
    { value: "expression", label: "JavaScript Expression" },
];

const operators = [
    { value: "==", label: "Equals (==)" },
    { value: "!=", label: "Not Equals (!=)" },
    { value: ">", label: "Greater Than (>)" },
    { value: "<", label: "Less Than (<)" },
    { value: ">=", label: "Greater or Equal (>=)" },
    { value: "<=", label: "Less or Equal (<=)" },
    { value: "contains", label: "Contains" },
    { value: "startsWith", label: "Starts With" },
    { value: "endsWith", label: "Ends With" },
    { value: "matches", label: "Regex Match" },
];

export function ConditionalNodeConfig({ data, onUpdate }: ConditionalNodeConfigProps) {
    const [conditionType, setConditionType] = useState(data.config?.conditionType || "simple");
    const [leftValue, setLeftValue] = useState(data.config?.leftValue || "");
    const [operator, setOperator] = useState(data.config?.operator || "==");
    const [rightValue, setRightValue] = useState(data.config?.rightValue || "");
    const [expression, setExpression] = useState(data.config?.expression || "");
    const [outputVariable, setOutputVariable] = useState(data.config?.outputVariable || "");

    useEffect(() => {
        onUpdate({
            conditionType,
            leftValue,
            operator,
            rightValue,
            expression,
            outputVariable,
        });
    }, [conditionType, leftValue, operator, rightValue, expression, outputVariable]);

    return (
        <div>
            <FormSection title="Condition Type">
                <FormField label="Type">
                    <select
                        value={conditionType}
                        onChange={(e) => setConditionType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {conditionTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </FormField>
            </FormSection>

            {conditionType === "simple" && (
                <FormSection title="Simple Comparison">
                    <FormField
                        label="Left Value"
                        description="Use ${variableName} to reference variables"
                    >
                        <input
                            type="text"
                            value={leftValue}
                            onChange={(e) => setLeftValue(e.target.value)}
                            placeholder="${variable} or literal value"
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                    </FormField>

                    <FormField label="Operator">
                        <select
                            value={operator}
                            onChange={(e) => setOperator(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            {operators.map((op) => (
                                <option key={op.value} value={op.value}>
                                    {op.label}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField
                        label="Right Value"
                        description="Use ${variableName} to reference variables"
                    >
                        <input
                            type="text"
                            value={rightValue}
                            onChange={(e) => setRightValue(e.target.value)}
                            placeholder="${variable} or literal value"
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            {conditionType === "expression" && (
                <FormSection title="JavaScript Expression">
                    <FormField
                        label="Expression"
                        description="Write JavaScript that evaluates to true/false. Use ${variableName} for variables."
                    >
                        <CodeInput
                            value={expression}
                            onChange={setExpression}
                            language="javascript"
                            placeholder="${var1} > 10 && ${var2}.includes('text')"
                            rows={6}
                        />
                    </FormField>

                    <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>Examples:</strong>
                            <br />• {`\${age} >= 18`}
                            <br />• {`\${status} === 'active' && \${score} > 75`}
                            <br />• {`\${email}.endsWith('@company.com')`}
                        </p>
                    </div>
                </FormSection>
            )}

            <FormSection title="Branch Info">
                <div className="px-3 py-2 text-xs bg-muted rounded-lg text-muted-foreground">
                    <p>
                        <strong>True Branch:</strong> Connect to nodes that should run when condition is true
                    </p>
                    <p className="mt-2">
                        <strong>False Branch:</strong> Connect to nodes that should run when condition is false
                    </p>
                </div>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "Conditional"}
                    nodeType="conditional"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
