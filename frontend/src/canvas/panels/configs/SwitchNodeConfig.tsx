import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { Plus, Trash2 } from "lucide-react";

interface SwitchNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const matchTypes = [
    { value: "exact", label: "Exact Match" },
    { value: "contains", label: "Contains" },
    { value: "regex", label: "Regex Pattern" }
];

interface SwitchCase {
    value: string;
    label: string;
}

export function SwitchNodeConfig({ data, onUpdate }: SwitchNodeConfigProps) {
    const [inputVariable, setInputVariable] = useState(data.inputVariable || "");
    const [matchType, setMatchType] = useState(data.matchType || "exact");
    const [cases, setCases] = useState<SwitchCase[]>(
        data.cases || [{ value: "", label: "Case 1" }]
    );
    const [hasDefault, setHasDefault] = useState(data.hasDefault ?? true);
    const [outputVariable, setOutputVariable] = useState(data.outputVariable || "");

    useEffect(() => {
        onUpdate({
            inputVariable,
            matchType,
            cases,
            hasDefault,
            outputVariable
        });
    }, [inputVariable, matchType, cases, hasDefault, outputVariable]);

    const addCase = () => {
        setCases([...cases, { value: "", label: `Case ${cases.length + 1}` }]);
    };

    const removeCase = (index: number) => {
        if (cases.length > 1) {
            setCases(cases.filter((_, i) => i !== index));
        }
    };

    const updateCase = (index: number, field: keyof SwitchCase, value: string) => {
        const updated = [...cases];
        updated[index] = { ...updated[index], [field]: value };
        setCases(updated);
    };

    return (
        <div>
            <FormSection title="Input">
                <FormField label="Input Variable" description="Variable to match against cases">
                    <input
                        type="text"
                        value={inputVariable}
                        onChange={(e) => setInputVariable(e.target.value)}
                        placeholder="${variableName}"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                </FormField>

                <FormField label="Match Type">
                    <select
                        value={matchType}
                        onChange={(e) => setMatchType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {matchTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </FormField>
            </FormSection>

            <FormSection title="Cases">
                {cases.map((switchCase, index) => (
                    <div
                        key={index}
                        className="space-y-2 p-3 border border-border rounded-lg bg-muted/30"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Case {index + 1}
                            </span>
                            {cases.length > 1 && (
                                <button
                                    onClick={() => removeCase(index)}
                                    className="p-1 hover:bg-red-50 rounded transition-colors"
                                    title="Remove case"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                </button>
                            )}
                        </div>

                        <FormField label="Match Value">
                            <input
                                type="text"
                                value={switchCase.value}
                                onChange={(e) => updateCase(index, "value", e.target.value)}
                                placeholder={
                                    matchType === "regex" ? "^pattern.*$" : "value to match"
                                }
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                            />
                        </FormField>

                        <FormField label="Label">
                            <input
                                type="text"
                                value={switchCase.label}
                                onChange={(e) => updateCase(index, "label", e.target.value)}
                                placeholder="Case label"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </FormField>
                    </div>
                ))}

                <button
                    onClick={addCase}
                    className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Case
                </button>
            </FormSection>

            <FormSection title="Default Case">
                <FormField label="Enable Default" description="Run if no cases match">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasDefault}
                            onChange={(e) => setHasDefault(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">Enable default case</span>
                    </label>
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "Switch"}
                    nodeType="switch"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
