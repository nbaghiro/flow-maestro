import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { Plus, Trash2 } from "lucide-react";

interface HTTPNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const methods = [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "PATCH", label: "PATCH" },
    { value: "DELETE", label: "DELETE" },
];

const authTypes = [
    { value: "none", label: "None" },
    { value: "basic", label: "Basic Auth" },
    { value: "bearer", label: "Bearer Token" },
    { value: "apiKey", label: "API Key" },
];

const bodyTypes = [
    { value: "json", label: "JSON" },
    { value: "form", label: "Form Data" },
    { value: "raw", label: "Raw" },
];

interface KeyValue {
    key: string;
    value: string;
}

export function HTTPNodeConfig({ data, onUpdate }: HTTPNodeConfigProps) {
    const [method, setMethod] = useState(data.config?.method || "GET");
    const [url, setUrl] = useState(data.config?.url || "");
    const [headers, setHeaders] = useState<KeyValue[]>(data.config?.headers || [{ key: "", value: "" }]);
    const [queryParams, setQueryParams] = useState<KeyValue[]>(data.config?.queryParams || []);
    const [authType, setAuthType] = useState(data.config?.authType || "none");
    const [authCredentials, setAuthCredentials] = useState(data.config?.authCredentials || "");
    const [bodyType, setBodyType] = useState(data.config?.bodyType || "json");
    const [body, setBody] = useState(data.config?.body || "");
    const [timeout, setTimeout] = useState(data.config?.timeout || 30);
    const [retryCount, setRetryCount] = useState(data.config?.retryCount || 3);
    const [outputVariable, setOutputVariable] = useState(data.config?.outputVariable || "");

    useEffect(() => {
        onUpdate({
            method,
            url,
            headers: headers.filter(h => h.key),
            queryParams: queryParams.filter(q => q.key),
            authType,
            authCredentials,
            bodyType,
            body,
            timeout,
            retryCount,
            outputVariable,
        });
    }, [method, url, headers, queryParams, authType, authCredentials, bodyType, body, timeout, retryCount, outputVariable]);

    const addHeader = () => setHeaders([...headers, { key: "", value: "" }]);
    const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));
    const updateHeader = (index: number, field: keyof KeyValue, value: string) => {
        const updated = [...headers];
        updated[index] = { ...updated[index], [field]: value };
        setHeaders(updated);
    };

    const addQueryParam = () => setQueryParams([...queryParams, { key: "", value: "" }]);
    const removeQueryParam = (index: number) => setQueryParams(queryParams.filter((_, i) => i !== index));
    const updateQueryParam = (index: number, field: keyof KeyValue, value: string) => {
        const updated = [...queryParams];
        updated[index] = { ...updated[index], [field]: value };
        setQueryParams(updated);
    };

    return (
        <div>
            <FormSection title="Request">
                <FormField label="Method">
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {methods.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField
                    label="URL"
                    description="Supports ${variableName} interpolation"
                >
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://api.example.com/endpoint"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Headers">
                {headers.map((header, index) => (
                    <div key={index} className="flex gap-2 items-start min-w-0">
                        <input
                            type="text"
                            value={header.key}
                            onChange={(e) => updateHeader(index, "key", e.target.value)}
                            placeholder="Header name"
                            className="flex-1 min-w-0 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                        <input
                            type="text"
                            value={header.value}
                            onChange={(e) => updateHeader(index, "value", e.target.value)}
                            placeholder="Value"
                            className="flex-1 min-w-0 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                        {headers.length > 1 && (
                            <button
                                onClick={() => removeHeader(index)}
                                className="flex-shrink-0 p-2 hover:bg-red-50 rounded transition-colors"
                            >
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                        )}
                    </div>
                ))}
                <button
                    onClick={addHeader}
                    className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Header
                </button>
            </FormSection>

            {queryParams.length > 0 || method === "GET" ? (
                <FormSection title="Query Parameters">
                    {queryParams.map((param, index) => (
                        <div key={index} className="flex gap-2 items-start min-w-0">
                            <input
                                type="text"
                                value={param.key}
                                onChange={(e) => updateQueryParam(index, "key", e.target.value)}
                                placeholder="Parameter name"
                                className="flex-1 min-w-0 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                            />
                            <input
                                type="text"
                                value={param.value}
                                onChange={(e) => updateQueryParam(index, "value", e.target.value)}
                                placeholder="Value"
                                className="flex-1 min-w-0 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                            />
                            <button
                                onClick={() => removeQueryParam(index)}
                                className="flex-shrink-0 p-2 hover:bg-red-50 rounded transition-colors"
                            >
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addQueryParam}
                        className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Query Parameter
                    </button>
                </FormSection>
            ) : null}

            <FormSection title="Authentication">
                <FormField label="Auth Type">
                    <select
                        value={authType}
                        onChange={(e) => setAuthType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {authTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                {authType !== "none" && (
                    <FormField
                        label="Credentials"
                        description={
                            authType === "basic"
                                ? "username:password"
                                : authType === "bearer"
                                ? "Token value"
                                : "API key value"
                        }
                    >
                        <input
                            type="password"
                            value={authCredentials}
                            onChange={(e) => setAuthCredentials(e.target.value)}
                            placeholder={
                                authType === "basic"
                                    ? "username:password"
                                    : "Token or API key"
                            }
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                    </FormField>
                )}
            </FormSection>

            {["POST", "PUT", "PATCH"].includes(method) && (
                <FormSection title="Request Body">
                    <FormField label="Body Type">
                        <select
                            value={bodyType}
                            onChange={(e) => setBodyType(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            {bodyTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Body">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={
                                bodyType === "json"
                                    ? '{\n  "key": "${value}"\n}'
                                    : "Request body..."
                            }
                            rows={8}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            <FormSection title="Settings">
                <FormField
                    label="Timeout (seconds)"
                    description="Maximum request duration"
                >
                    <input
                        type="number"
                        value={timeout}
                        onChange={(e) => setTimeout(parseInt(e.target.value) || 0)}
                        min={1}
                        max={300}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </FormField>

                <FormField
                    label="Retry Count"
                    description="Number of retries on failure"
                >
                    <input
                        type="number"
                        value={retryCount}
                        onChange={(e) => setRetryCount(parseInt(e.target.value) || 0)}
                        min={0}
                        max={10}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "HTTP"}
                    nodeType="http"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
