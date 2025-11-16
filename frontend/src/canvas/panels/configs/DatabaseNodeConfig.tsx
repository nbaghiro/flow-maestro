import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CodeInput } from "../../../components/CodeInput";
import { Dialog } from "../../../components/common/Dialog";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import {
    getDatabaseConnections,
    listDatabaseConnectionTables,
    createDatabaseConnection,
    type CreateDatabaseConnectionInput
} from "../../../lib/api";

interface DatabaseNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const operations = [
    { value: "query", label: "Query" },
    { value: "insert", label: "Insert" },
    { value: "update", label: "Update" },
    { value: "delete", label: "Delete" }
];

const databases = [
    { value: "postgresql", label: "PostgreSQL" },
    { value: "mysql", label: "MySQL" },
    { value: "mongodb", label: "MongoDB" },
    { value: "redis", label: "Redis" }
];

const returnFormats = [
    { value: "array", label: "Array of rows" },
    { value: "single", label: "Single row" },
    { value: "count", label: "Row count" }
];

export function DatabaseNodeConfig({ data, onUpdate }: DatabaseNodeConfigProps) {
    const queryClient = useQueryClient();
    const [operation, setOperation] = useState((data.operation as string) || "query");
    const [databaseType, setDatabaseType] = useState((data.databaseType as string) || "postgresql");
    const [databaseConnectionId, setDatabaseConnectionId] = useState(
        (data.databaseConnectionId as string) || ""
    );
    const [query, setQuery] = useState((data.query as string) || "");
    const [parameters, setParameters] = useState((data.parameters as string) || "");
    const [returnFormat, setReturnFormat] = useState((data.returnFormat as string) || "array");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    // Dialog state for creating new connection
    const [showConnectionDialog, setShowConnectionDialog] = useState(false);
    const [connectionForm, setConnectionForm] = useState<CreateDatabaseConnectionInput>({
        name: "",
        provider: databaseType as "postgresql" | "mysql" | "mongodb",
        host: "localhost",
        port: 5432,
        database: "",
        username: "",
        password: "",
        ssl_enabled: false
    });

    // Fetch database connections (includes test databases)
    const { data: connectionsData } = useQuery({
        queryKey: ["database-connections", databaseType],
        queryFn: () =>
            getDatabaseConnections({
                provider: databaseType as "postgresql" | "mysql" | "mongodb"
            })
    });

    const databaseConnections = connectionsData?.data || [];

    // Fetch tables for selected connection
    const { data: tablesData, isLoading: isLoadingTables } = useQuery({
        queryKey: ["database-connection-tables", databaseConnectionId],
        queryFn: () => listDatabaseConnectionTables(databaseConnectionId),
        enabled:
            !!databaseConnectionId && (databaseType === "postgresql" || databaseType === "mysql")
    });

    const tables = tablesData?.data || [];

    // Mutation for creating database connection
    const createConnectionMutation = useMutation({
        mutationFn: createDatabaseConnection,
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["database-connections"] });
            setDatabaseConnectionId(response.data.id);
            setShowConnectionDialog(false);
            // Reset form
            setConnectionForm({
                name: "",
                provider: databaseType as "postgresql" | "mysql" | "mongodb",
                host: "localhost",
                port: 5432,
                database: "",
                username: "",
                password: "",
                ssl_enabled: false
            });
        }
    });

    useEffect(() => {
        onUpdate({
            operation,
            databaseType,
            databaseConnectionId,
            query,
            parameters,
            returnFormat,
            outputVariable
        });
    }, [
        operation,
        databaseType,
        databaseConnectionId,
        query,
        parameters,
        returnFormat,
        outputVariable
    ]);

    // Update connection form provider when database type changes
    useEffect(() => {
        setConnectionForm((prev) => ({
            ...prev,
            provider: databaseType as "postgresql" | "mysql" | "mongodb",
            port: databaseType === "postgresql" ? 5432 : databaseType === "mysql" ? 3306 : 27017
        }));
    }, [databaseType]);

    const getQueryPlaceholder = () => {
        if (databaseType === "mongodb") {
            switch (operation) {
                case "query":
                    return '{ "age": { "$gt": 18 } }';
                case "insert":
                    return '{ "name": "${userName}", "email": "${email}" }';
                case "update":
                    return '{ "$set": { "status": "active" } }';
                case "delete":
                    return '{ "id": "${userId}" }';
            }
        } else if (databaseType === "redis") {
            return operation === "query" ? "GET ${key}" : "SET ${key} ${value}";
        }

        // SQL databases
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
        <div>
            <FormSection title="Database">
                <FormField label="Type">
                    <select
                        value={databaseType}
                        onChange={(e) => setDatabaseType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {databases.map((db) => (
                            <option key={db.value} value={db.value}>
                                {db.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Database Connection" description="Select a saved connection">
                    <div className="space-y-2">
                        <select
                            value={databaseConnectionId}
                            onChange={(e) => setDatabaseConnectionId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="">Select a connection...</option>
                            {databaseConnections.map((conn) => (
                                <option key={conn.id} value={conn.id}>
                                    {conn.name} ({conn.provider})
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setShowConnectionDialog(true)}
                            className="w-full px-3 py-2 text-sm text-muted-foreground border border-dashed border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
                        >
                            + New Database Connection
                        </button>
                    </div>
                </FormField>

                {databaseConnectionId && tables.length > 0 && (
                    <FormField
                        label="Table Helper"
                        description="Select a table to insert into query"
                    >
                        <select
                            value=""
                            onChange={(e) => {
                                const selectedTable = e.target.value;
                                if (selectedTable) {
                                    // Insert table name into query
                                    if (!query) {
                                        setQuery(`SELECT * FROM ${selectedTable}`);
                                    } else {
                                        // Append to existing query
                                        setQuery((prev) => `${prev}\n-- FROM ${selectedTable}`);
                                    }
                                }
                            }}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="">Insert table name...</option>
                            {tables.map((table) => (
                                <option key={table.fullName} value={table.fullName}>
                                    {table.fullName}
                                </option>
                            ))}
                        </select>
                        {isLoadingTables && (
                            <p className="text-xs text-muted-foreground mt-1">Loading tables...</p>
                        )}
                    </FormField>
                )}
            </FormSection>

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

                <FormField
                    label={
                        databaseType === "mongodb"
                            ? "Query Object"
                            : databaseType === "redis"
                              ? "Command"
                              : "SQL Query"
                    }
                    description="Use $1, $2, etc. for parameterized queries (SQL)"
                >
                    <CodeInput
                        value={query}
                        onChange={setQuery}
                        language={
                            databaseType === "mongodb" || databaseType === "redis"
                                ? "javascript"
                                : "sql"
                        }
                        placeholder={getQueryPlaceholder()}
                        rows={6}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Parameters">
                <FormField
                    label="Query Parameters"
                    description="JSON array of parameter values, supports ${variableName}"
                >
                    <textarea
                        value={parameters}
                        onChange={(e) => setParameters(e.target.value)}
                        placeholder='["${userId}", "${email}"]'
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                    />
                </FormField>

                <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                        <strong>Security:</strong> Always use parameterized queries to prevent SQL
                        injection attacks.
                    </p>
                </div>
            </FormSection>

            {operation === "query" && (
                <FormSection title="Result Format">
                    <FormField label="Return Format">
                        <select
                            value={returnFormat}
                            onChange={(e) => setReturnFormat(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            {returnFormats.map((fmt) => (
                                <option key={fmt.value} value={fmt.value}>
                                    {fmt.label}
                                </option>
                            ))}
                        </select>
                    </FormField>
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Database"}
                    nodeType="database"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>

            {/* Create Connection Dialog */}
            <Dialog
                isOpen={showConnectionDialog}
                onClose={() => setShowConnectionDialog(false)}
                title="New Database Connection"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        createConnectionMutation.mutate(connectionForm);
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium mb-1">Connection Name</label>
                        <input
                            type="text"
                            value={connectionForm.name}
                            onChange={(e) =>
                                setConnectionForm({ ...connectionForm, name: e.target.value })
                            }
                            placeholder="My Database"
                            required
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Provider</label>
                        <select
                            value={connectionForm.provider}
                            onChange={(e) =>
                                setConnectionForm({
                                    ...connectionForm,
                                    provider: e.target.value as "postgresql" | "mysql" | "mongodb"
                                })
                            }
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="postgresql">PostgreSQL</option>
                            <option value="mysql">MySQL</option>
                            <option value="mongodb">MongoDB</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Host</label>
                            <input
                                type="text"
                                value={connectionForm.host}
                                onChange={(e) =>
                                    setConnectionForm({ ...connectionForm, host: e.target.value })
                                }
                                placeholder="localhost"
                                required
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Port</label>
                            <input
                                type="number"
                                value={connectionForm.port}
                                onChange={(e) =>
                                    setConnectionForm({
                                        ...connectionForm,
                                        port: parseInt(e.target.value)
                                    })
                                }
                                placeholder="5432"
                                required
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Database Name</label>
                        <input
                            type="text"
                            value={connectionForm.database}
                            onChange={(e) =>
                                setConnectionForm({ ...connectionForm, database: e.target.value })
                            }
                            placeholder="my_database"
                            required
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            value={connectionForm.username}
                            onChange={(e) =>
                                setConnectionForm({ ...connectionForm, username: e.target.value })
                            }
                            placeholder="db_user"
                            required
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={connectionForm.password}
                            onChange={(e) =>
                                setConnectionForm({ ...connectionForm, password: e.target.value })
                            }
                            placeholder="••••••••"
                            required
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="ssl_enabled"
                            checked={connectionForm.ssl_enabled}
                            onChange={(e) =>
                                setConnectionForm({
                                    ...connectionForm,
                                    ssl_enabled: e.target.checked
                                })
                            }
                            className="mr-2"
                        />
                        <label htmlFor="ssl_enabled" className="text-sm">
                            Enable SSL
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowConnectionDialog(false)}
                            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createConnectionMutation.isPending}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                            {createConnectionMutation.isPending
                                ? "Creating..."
                                : "Create Connection"}
                        </button>
                    </div>

                    {createConnectionMutation.isError && (
                        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                                Failed to create connection. Please check your credentials and try
                                again.
                            </p>
                        </div>
                    )}
                </form>
            </Dialog>
        </div>
    );
}
