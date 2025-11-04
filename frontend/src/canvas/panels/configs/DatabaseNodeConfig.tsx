import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { CodeInput } from "../../../components/CodeInput";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DatabaseNodeConfigProps {
    data: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate: (config: any) => void;
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
    const [operation, setOperation] = useState(data.operation || "query");
    const [databaseType, setDatabaseType] = useState(data.databaseType || "postgresql");
    const [connectionId, setConnectionId] = useState(data.connectionId || "");
    const [query, setQuery] = useState(data.query || "");
    const [parameters, setParameters] = useState(data.parameters || "");
    const [returnFormat, setReturnFormat] = useState(data.returnFormat || "array");
    const [outputVariable, setOutputVariable] = useState(data.outputVariable || "");

    useEffect(() => {
        onUpdate({
            operation,
            databaseType,
            connectionId,
            query,
            parameters,
            returnFormat,
            outputVariable
        });
    }, [operation, databaseType, connectionId, query, parameters, returnFormat, outputVariable]);

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

                <FormField label="Connection" description="Stored connection reference">
                    <input
                        type="text"
                        value={connectionId}
                        onChange={(e) => setConnectionId(e.target.value)}
                        placeholder="production-db"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </FormField>
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
                    nodeName={data.label || "Database"}
                    nodeType="database"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
