import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ProviderConnectionDialog } from "../../../components/connections/ProviderConnectionDialog";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import {
    getProviderOperations,
    type OperationSummary,
    type OperationParameter
} from "../../../lib/api";
import { ALL_PROVIDERS } from "../../../lib/providers";
import { useConnectionStore } from "../../../stores/connectionStore";

interface IntegrationNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

/**
 * Dynamic Integration Node Config
 * Loads providers and operations dynamically from the backend
 */
export function IntegrationNodeConfig({ data, onUpdate }: IntegrationNodeConfigProps) {
    const [provider, setProvider] = useState((data.provider as string) || "");
    const [operation, setOperation] = useState((data.operation as string) || "");
    const [connectionId, setConnectionId] = useState((data.connectionId as string) || "");
    const [parameters, setParameters] = useState<Record<string, unknown>>(
        (data.parameters as Record<string, unknown>) || {}
    );
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);

    const { connections, fetchConnections } = useConnectionStore();

    // Fetch connections on mount and when provider changes
    useEffect(() => {
        if (provider) {
            fetchConnections({ provider });
        } else {
            fetchConnections();
        }
    }, [provider, fetchConnections]);

    // Load operations for selected provider
    const { data: operationsData, isLoading: operationsLoading } = useQuery({
        queryKey: ["provider-operations", provider],
        queryFn: () => getProviderOperations(provider),
        enabled: !!provider
    });

    const operations: OperationSummary[] = operationsData?.data?.operations || [];
    const selectedOperation = operations.find((op) => op.id === operation);

    // Get selected connection info
    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);

    // Set default operation when provider changes
    useEffect(() => {
        if (operations.length > 0 && !operation) {
            setOperation(operations[0].id);
        }
    }, [operations, operation]);

    // Update parent component whenever config changes
    // Use useRef to track previous values and avoid infinite loops
    const prevConfigRef = useRef<string>("");

    useEffect(() => {
        const config = {
            provider,
            operation,
            connectionId,
            parameters,
            outputVariable
        };

        // Serialize config to compare - only update if actually changed
        const configString = JSON.stringify(config);
        if (configString !== prevConfigRef.current) {
            prevConfigRef.current = configString;
            onUpdate(config);
        }
    }, [provider, operation, connectionId, parameters, outputVariable]);

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

    return (
        <>
            <FormSection title="Provider">
                <FormField label="Integration Provider">
                    {provider && selectedConnection ? (
                        <button
                            type="button"
                            onClick={() => setIsProviderDialogOpen(true)}
                            className="w-full flex items-start gap-3 p-3 text-left border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                            {/* Provider Icon */}
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                {providerInfo?.logoUrl ? (
                                    <img
                                        src={providerInfo.logoUrl}
                                        alt={providerInfo.displayName}
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gray-200 rounded" />
                                )}
                            </div>

                            {/* Connection Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-sm text-gray-900">
                                        {providerInfo?.displayName || provider}
                                    </h3>
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                    {selectedConnection.name}
                                </p>
                                {selectedConnection.metadata?.account_info?.email && (
                                    <p className="text-xs text-gray-500 truncate">
                                        {selectedConnection.metadata.account_info.email}
                                    </p>
                                )}
                            </div>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsProviderDialogOpen(true)}
                            className="w-full flex items-center justify-center gap-2 p-4 text-sm font-medium text-gray-700 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Select or Add Connection
                        </button>
                    )}
                </FormField>
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

            {/* Provider Connection Dialog */}
            <ProviderConnectionDialog
                isOpen={isProviderDialogOpen}
                onClose={() => setIsProviderDialogOpen(false)}
                selectedConnectionId={connectionId}
                onSelect={(newProvider, newConnectionId) => {
                    setProvider(newProvider);
                    setConnectionId(newConnectionId);
                    setOperation("");
                    setParameters({});
                    setIsProviderDialogOpen(false);
                }}
            />
        </>
    );
}
