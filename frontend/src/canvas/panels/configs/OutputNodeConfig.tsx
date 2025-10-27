import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";

interface OutputNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const formats = [
    { value: "json", label: "JSON" },
    { value: "string", label: "String" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
];

export function OutputNodeConfig({ data, onUpdate }: OutputNodeConfigProps) {
    const [outputName, setOutputName] = useState(data.config?.outputName || "result");
    const [value, setValue] = useState(data.config?.value || "");
    const [format, setFormat] = useState(data.config?.format || "json");
    const [description, setDescription] = useState(data.config?.description || "");

    useEffect(() => {
        onUpdate({
            outputName,
            value,
            format,
            description,
        });
    }, [outputName, value, format, description]);

    return (
        <div>
            <FormSection title="Output Configuration">
                <FormField
                    label="Output Name"
                    description="Name for this output in workflow results"
                >
                    <input
                        type="text"
                        value={outputName}
                        onChange={(e) => setOutputName(e.target.value)}
                        placeholder="result"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                </FormField>

                <FormField label="Format">
                    <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {formats.map((fmt) => (
                            <option key={fmt.value} value={fmt.value}>
                                {fmt.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField
                    label="Description"
                    description="Optional description for this output"
                >
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description of what this output contains..."
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Value">
                <FormField
                    label="Output Value"
                    description="Value to output (supports ${variableName} references)"
                >
                    <textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={
                            format === "json"
                                ? '{\n  "key": "${variableName}",\n  "processed": true\n}'
                                : "${variableName}"
                        }
                        rows={format === "json" ? 8 : 4}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                    />
                </FormField>

                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                        <strong>Examples:</strong>
                        <br />• {`\${llmResponse}`} - Reference a variable
                        <br />• {`\${user.name}`} - Access nested properties
                        <br />• {`\{...\${object}, extra: "value"\}`} - Merge objects
                    </p>
                </div>
            </FormSection>

            <FormSection title="Preview">
                <div className="px-3 py-2 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">
                        <strong>Workflow result will include:</strong>
                    </p>
                    <code className="text-xs block font-mono text-foreground">
                        {"{"}
                        <br />
                        {"  "}"{outputName || "outputName"}": {format === "json" ? "{...}" : format === "number" ? "123" : format === "boolean" ? "true" : '"..."'}
                        <br />
                        {"}"}
                    </code>
                </div>
            </FormSection>

            <FormSection title="Usage Notes">
                <div className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground space-y-2">
                    <p>
                        • Output nodes define the final results returned by the workflow
                    </p>
                    <p>
                        • Multiple output nodes can be used to return different values
                    </p>
                    <p>
                        • Outputs are accessible via the workflow execution API
                    </p>
                </div>
            </FormSection>
        </div>
    );
}
