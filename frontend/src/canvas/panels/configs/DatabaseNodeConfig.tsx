import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { CodeInput } from "../../../components/CodeInput";
import { Select } from "../../../components/common/Select";
import { ProviderConnectionDialog } from "../../../components/connections/ProviderConnectionDialog";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { ALL_PROVIDERS } from "../../../lib/providers";
import { useConnectionStore } from "../../../stores/connectionStore";

interface DatabaseNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const operations = [
    { value: "query", label: "Execute Query" },
    { value: "insert", label: "Insert Row" },
    { value: "update", label: "Update Rows" },
    { value: "delete", label: "Delete Rows" },
    { value: "listTables", label: "List Tables" }
];

const returnFormats = [
    { value: "array", label: "Array of rows" },
    { value: "single", label: "Single row" },
    { value: "count", label: "Row count" }
];

export function DatabaseNodeConfig({ data, onUpdate }: DatabaseNodeConfigProps) {
    const [connectionId, setConnectionId] = useState((data.connectionId as string) || "");
    const [provider, setProvider] = useState((data.provider as string) || "");
    const [operation, setOperation] = useState((data.operation as string) || "");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);

    // Operation-specific parameters
    const [query, setQuery] = useState(
        ((data.parameters as Record<string, unknown>)?.query as string) || ""
    );
    const [parameters, setParameters] = useState(
        JSON.stringify((data.parameters as Record<string, unknown>)?.parameters || [], null, 2)
    );
    const [returnFormat, setReturnFormat] = useState(
        ((data.parameters as Record<string, unknown>)?.returnFormat as string) || "array"
    );

    const { connections, fetchConnections } = useConnectionStore();

    // Fetch connections on mount
    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    // Get selected connection and provider info
    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);

    // Handle connection selection from dialog
    const handleConnectionSelect = (selectedProvider: string, selectedConnectionId: string) => {
        setProvider(selectedProvider);
        setConnectionId(selectedConnectionId);
        setIsProviderDialogOpen(false);
    };

    useEffect(() => {
        // Parse parameters JSON
        let parsedParams: unknown[] = [];
        if (parameters) {
            try {
                parsedParams = JSON.parse(parameters);
            } catch (e) {
                // Invalid JSON, will be caught during execution
                console.error("Error parsing parameters:", e);
            }
        }

        // Build config based on operation
        const config: Record<string, unknown> = {
            connectionId,
            provider,
            operation,
            outputVariable,
            parameters: {
                nodeId: data.id
            }
        };

        // Add operation-specific parameters
        if (operation === "query") {
            config.parameters = {
                ...(config.parameters as Record<string, unknown>),
                query,
                parameters: parsedParams,
                returnFormat,
                outputVariable
            };
        } else if (operation === "insert") {
            config.parameters = {
                ...(config.parameters as Record<string, unknown>),
                table: (data.parameters as Record<string, unknown>)?.table || "",
                data: {},
                returning: [],
                outputVariable
            };
        } else if (operation === "update") {
            config.parameters = {
                ...(config.parameters as Record<string, unknown>),
                table: (data.parameters as Record<string, unknown>)?.table || "",
                data: {},
                where: "",
                whereParameters: [],
                returning: [],
                outputVariable
            };
        } else if (operation === "delete") {
            config.parameters = {
                ...(config.parameters as Record<string, unknown>),
                table: (data.parameters as Record<string, unknown>)?.table || "",
                where: "",
                whereParameters: [],
                returning: [],
                outputVariable
            };
        } else if (operation === "listTables") {
            config.parameters = {
                ...(config.parameters as Record<string, unknown>),
                schema: "public",
                outputVariable
            };
        }

        onUpdate(config);
    }, [connectionId, provider, operation, query, parameters, returnFormat, outputVariable]);

    const getQueryPlaceholder = () => {
        switch (operation) {
            case "query":
                return "SELECT * FROM users WHERE age > $1";
            case "insert":
                return "INSERT INTO users (name, email) VALUES ($1, $2)";
            case "update":
                return "UPDATE users SET status = $1 WHERE id = $2";
            case "delete":
                return "DELETE FROM users WHERE id = $1";
            default:
                return "";
        }
    };

    return (
        <>
            <FormSection title="Database">
                <FormField label="Database Connection">
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
                <FormField label="Type">
                    <Select value={operation} onChange={setOperation} options={operations} />
                </FormField>

                {operation === "query" && (
                    <>
                        <FormField
                            label="SQL Query"
                            description="Use $1, $2, etc. for parameterized queries"
                        >
                            <CodeInput
                                value={query}
                                onChange={setQuery}
                                language="sql"
                                placeholder={getQueryPlaceholder()}
                                rows={6}
                            />
                        </FormField>

                        <FormField
                            label="Query Parameters"
                            description="JSON array of parameter values"
                        >
                            <textarea
                                value={parameters}
                                onChange={(e) => setParameters(e.target.value)}
                                placeholder='["value1", "value2"]'
                                rows={4}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                            />
                        </FormField>

                        <FormField label="Return Format">
                            <Select
                                value={returnFormat}
                                onChange={setReturnFormat}
                                options={returnFormats}
                            />
                        </FormField>

                        <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-800">
                                <strong>Security:</strong> Always use parameterized queries ($1, $2)
                                to prevent SQL injection attacks.
                            </p>
                        </div>
                    </>
                )}

                {operation === "listTables" && (
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            This operation will list all tables in the database.
                        </p>
                    </div>
                )}

                {(operation === "insert" || operation === "update" || operation === "delete") && (
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            For {operation} operations, please use the Query operation with a custom
                            SQL statement.
                        </p>
                    </div>
                )}
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Database"}
                    nodeType="database"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>

            {/* Provider Connection Dialog */}
            <ProviderConnectionDialog
                isOpen={isProviderDialogOpen}
                onClose={() => setIsProviderDialogOpen(false)}
                selectedConnectionId={connectionId}
                defaultCategory="Databases"
                onSelect={handleConnectionSelect}
            />
        </>
    );
}
