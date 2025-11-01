import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { CodeInput } from "../../../components/CodeInput";

interface WaitNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const waitTypes = [
    { value: "duration", label: "Fixed Duration" },
    { value: "until", label: "Until Timestamp" },
    { value: "condition", label: "Until Condition" },
];

const timeUnits = [
    { value: "seconds", label: "Seconds" },
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
];

export function WaitNodeConfig({ data, onUpdate }: WaitNodeConfigProps) {
    const [waitType, setWaitType] = useState(data.waitType || "duration");
    const [duration, setDuration] = useState(data.duration || 5);
    const [unit, setUnit] = useState(data.unit || "seconds");
    const [timestamp, setTimestamp] = useState(data.timestamp || "");
    const [condition, setCondition] = useState(data.condition || "");
    const [pollingInterval, setPollingInterval] = useState(data.pollingInterval || 5);
    const [outputVariable, setOutputVariable] = useState(data.outputVariable || "");

    useEffect(() => {
        onUpdate({
            waitType,
            duration,
            unit,
            timestamp,
            condition,
            pollingInterval,
            outputVariable,
        });
    }, [waitType, duration, unit, timestamp, condition, pollingInterval, outputVariable]);

    return (
        <div>
            <FormSection title="Wait Type">
                <FormField label="Type">
                    <select
                        value={waitType}
                        onChange={(e) => setWaitType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {waitTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </FormField>
            </FormSection>

            {waitType === "duration" && (
                <FormSection title="Duration">
                    <FormField label="Wait For">
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                min={1}
                                max={365}
                                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="w-32 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                {timeUnits.map((u) => (
                                    <option key={u.value} value={u.value}>
                                        {u.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </FormField>

                    <div className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
                        The workflow will pause for{" "}
                        <strong>
                            {duration} {unit}
                        </strong>{" "}
                        before continuing.
                    </div>
                </FormSection>
            )}

            {waitType === "until" && (
                <FormSection title="Until Timestamp">
                    <FormField
                        label="Timestamp"
                        description="ISO 8601 format or use ${variable}"
                    >
                        <input
                            type="text"
                            value={timestamp}
                            onChange={(e) => setTimestamp(e.target.value)}
                            placeholder="2024-12-31T23:59:59Z or ${scheduledTime}"
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                    </FormField>

                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                            <strong>Examples:</strong>
                            <br />• 2024-12-31T23:59:59Z
                            <br />• 2024-01-15T09:00:00-05:00
                            <br />• {`\${futureTimestamp}`}
                        </p>
                    </div>
                </FormSection>
            )}

            {waitType === "condition" && (
                <FormSection title="Until Condition">
                    <FormField
                        label="Condition"
                        description="Wait until this evaluates to true"
                    >
                        <CodeInput
                            value={condition}
                            onChange={setCondition}
                            language="javascript"
                            placeholder="${status} === 'complete'"
                            rows={4}
                        />
                    </FormField>

                    <FormField
                        label="Polling Interval (seconds)"
                        description="How often to check the condition"
                    >
                        <input
                            type="number"
                            value={pollingInterval}
                            onChange={(e) => setPollingInterval(parseInt(e.target.value) || 0)}
                            min={1}
                            max={3600}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </FormField>

                    <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>Note:</strong> Condition will be checked every {pollingInterval}{" "}
                            seconds until it evaluates to true.
                        </p>
                    </div>
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "Wait"}
                    nodeType="wait"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
