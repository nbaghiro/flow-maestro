import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ConnectionPicker } from "../../../components/connections/ConnectionPicker";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import {
    getIntegrationProviders,
    getProviderOperations,
    type ProviderSummary,
    type OperationSummary,
    type OperationParameter
} from "../../../lib/api";

interface IntegrationNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

/**
 * Dynamic Integration Node Config
 * Loads providers and operations dynamically from the backend
 */
export function IntegrationNodeConfig({ data, onUpdate }: IntegrationNodeConfigProps) {
    const [provider, setProvider] = useState((data.provider as string) || "slack");
    const [operation, setOperation] = useState((data.operation as string) || "");
    const [connectionId, setConnectionId] = useState((data.connectionId as string) || "");
    const [parameters, setParameters] = useState<Record<string, unknown>>(
        (data.parameters as Record<string, unknown>) || {}
    );
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    // Load available providers
    const { data: providersData, isLoading: providersLoading } = useQuery({
        queryKey: ["integration-providers"],
        queryFn: getIntegrationProviders
    });

    // Load operations for selected provider
    const { data: operationsData, isLoading: operationsLoading } = useQuery({
        queryKey: ["provider-operations", provider],
        queryFn: () => getProviderOperations(provider),
        enabled: !!provider
    });

    const providers: ProviderSummary[] = providersData?.data || [];
    const operations: OperationSummary[] = operationsData?.data?.operations || [];
    const selectedOperation = operations.find((op) => op.id === operation);

    // Set default operation when provider changes
    useEffect(() => {
        if (operations.length > 0 && !operation) {
            setOperation(operations[0].id);
        }
    }, [operations, operation]);

    // Update parent component whenever config changes
    useEffect(() => {
        const config = {
            provider,
            operation,
            connectionId,
            parameters,
            outputVariable
        };
        onUpdate(config);
    }, [provider, operation, connectionId, parameters, outputVariable, onUpdate]);

    // Handle parameter change
    const handleParameterChange = (paramName: string, value: unknown): void => {
        setParameters((prev) => ({
            ...prev,
            [paramName]: value
        }));
    };

    // Render form field based on parameter type
    const renderParameterField = (param: OperationParameter): React.ReactNode => {
        const value = parameters[param.name];

        // Determine field type based on parameter type
        if (param.type === "boolean") {
            return (
                <FormField key={param.name} label={param.name} description={param.description}>
                    <select
                        value={value ? "true" : "false"}
                        onChange={(e) =>
                            handleParameterChange(param.name, e.target.value === "true")
                        }
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="false">False</option>
                        <option value="true">True</option>
                    </select>
                </FormField>
            );
        }

        if (param.type === "number") {
            return (
                <FormField key={param.name} label={param.name} description={param.description}>
                    <input
                        type="number"
                        value={(value as number) || ""}
                        onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
                        placeholder={param.description || `Enter ${param.name}`}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                </FormField>
            );
        }

        if (param.type === "object" || param.type === "array") {
            return (
                <FormField
                    key={param.name}
                    label={param.name}
                    description={param.description || "JSON object"}
                >
                    <textarea
                        value={
                            typeof value === "string" ? value : JSON.stringify(value || {}, null, 2)
                        }
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleParameterChange(param.name, parsed);
                            } catch {
                                // Keep as string if invalid JSON
                                handleParameterChange(param.name, e.target.value);
                            }
                        }}
                        placeholder={"{ ... } or ${variableName}"}
                        rows={6}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                    />
                </FormField>
            );
        }

        // Default to text input for strings and unknown types
        return (
            <FormField key={param.name} label={param.name} description={param.description}>
                <input
                    type="text"
                    value={(value as string) || ""}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    placeholder={param.description || `Enter ${param.name}`}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
            </FormField>
        );
    };

    if (providersLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground">Loading providers...</p>
            </div>
        );
    }

    return (
        <div>
            <FormSection title="Provider">
                <FormField label="Integration Provider">
                    <select
                        value={provider}
                        onChange={(e) => {
                            setProvider(e.target.value);
                            setOperation("");
                            setParameters({});
                        }}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {providers.map((p) => (
                            <option key={p.name} value={p.name}>
                                {p.displayName}
                            </option>
                        ))}
                    </select>
                </FormField>

                <ConnectionPicker
                    provider={provider}
                    value={connectionId}
                    onChange={(id) => setConnectionId(id || "")}
                    label="Connection"
                    description={`Select your ${providers.find((p) => p.name === provider)?.displayName || provider} connection`}
                    required
                />
            </FormSection>

            <FormSection title="Operation">
                {operationsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading operations...</p>
                ) : (
                    <FormField label="Action Type">
                        <select
                            value={operation}
                            onChange={(e) => {
                                setOperation(e.target.value);
                                setParameters({});
                            }}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            {operations.length === 0 && (
                                <option value="">No operations available</option>
                            )}
                            {operations.map((op) => (
                                <option key={op.id} value={op.id}>
                                    {op.name}
                                </option>
                            ))}
                        </select>
                        {selectedOperation?.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {selectedOperation.description}
                            </p>
                        )}
                    </FormField>
                )}
            </FormSection>

            {selectedOperation && selectedOperation.parameters.length > 0 && (
                <FormSection title="Parameters">
                    {selectedOperation.parameters.map((param) => renderParameterField(param))}
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Integration"}
                    nodeType="integration"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
