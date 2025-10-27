/**
 * Webhook Trigger Configuration
 * Configure HTTP request parameters to simulate webhook calls
 */

import { useState, useEffect } from "react";
import { Plus, Trash2, Code } from "lucide-react";
import { WebhookTriggerConfig as WebhookConfig } from "../../../../lib/triggerTypes";

interface WebhookTriggerConfigProps {
    config: WebhookConfig | undefined;
    onChange: (config: WebhookConfig) => void;
}

export function WebhookTriggerConfig({ config, onChange }: WebhookTriggerConfigProps) {
    const [method, setMethod] = useState<WebhookConfig["method"]>(config?.method || "POST");
    const [headers, setHeaders] = useState<Record<string, string>>(
        config?.headers || { "Content-Type": "application/json" }
    );
    const [body, setBody] = useState(config?.body || {});
    const [bodyText, setBodyText] = useState(JSON.stringify(config?.body || {}, null, 2));
    const [queryParams, setQueryParams] = useState<Record<string, string>>(
        config?.queryParams || {}
    );

    useEffect(() => {
        onChange({
            method,
            headers,
            body,
            queryParams,
        });
    }, [method, headers, body, queryParams]);

    const handleAddHeader = () => {
        const key = prompt("Header name:");
        if (key && !headers[key]) {
            setHeaders({ ...headers, [key]: "" });
        }
    };

    const handleUpdateHeader = (key: string, value: string) => {
        setHeaders({ ...headers, [key]: value });
    };

    const handleRemoveHeader = (key: string) => {
        const newHeaders = { ...headers };
        delete newHeaders[key];
        setHeaders(newHeaders);
    };

    const handleBodyChange = (text: string) => {
        setBodyText(text);
        try {
            const parsed = JSON.parse(text);
            setBody(parsed);
        } catch (err) {
            // Invalid JSON, keep editing
        }
    };

    const handleAddQueryParam = () => {
        const key = prompt("Query parameter name:");
        if (key && !queryParams[key]) {
            setQueryParams({ ...queryParams, [key]: "" });
        }
    };

    const handleUpdateQueryParam = (key: string, value: string) => {
        setQueryParams({ ...queryParams, [key]: value });
    };

    const handleRemoveQueryParam = (key: string) => {
        const newParams = { ...queryParams };
        delete newParams[key];
        setQueryParams(newParams);
    };

    return (
        <div className="p-4 space-y-6">
            {/* HTTP Method */}
            <div className="space-y-2">
                <label className="block text-sm font-medium">HTTP Method</label>
                <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as WebhookConfig["method"])}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                </select>
            </div>

            {/* Headers */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Headers</label>
                    <button
                        onClick={handleAddHeader}
                        className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Add Header
                    </button>
                </div>

                <div className="space-y-2">
                    {Object.entries(headers).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                            <input
                                type="text"
                                value={key}
                                disabled
                                className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-lg font-mono opacity-75"
                                placeholder="Header name"
                            />
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => handleUpdateHeader(key, e.target.value)}
                                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                placeholder="Header value"
                            />
                            <button
                                onClick={() => handleRemoveHeader(key)}
                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove header"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {Object.keys(headers).length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                            No headers defined
                        </div>
                    )}
                </div>
            </div>

            {/* Request Body */}
            {(method === "POST" || method === "PUT" || method === "PATCH") && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Request Body (JSON)</label>
                    <div className="relative">
                        <textarea
                            value={bodyText}
                            onChange={(e) => handleBodyChange(e.target.value)}
                            placeholder='{\n  "key": "value"\n}'
                            rows={10}
                            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                        />
                        {bodyText && !isValidJSON(bodyText) && (
                            <div className="absolute top-2 right-2 px-2 py-1 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                                Invalid JSON
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Query Parameters */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Query Parameters</label>
                    <button
                        onClick={handleAddQueryParam}
                        className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Add Parameter
                    </button>
                </div>

                <div className="space-y-2">
                    {Object.entries(queryParams).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                            <input
                                type="text"
                                value={key}
                                disabled
                                className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-lg font-mono opacity-75"
                                placeholder="Parameter name"
                            />
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => handleUpdateQueryParam(key, e.target.value)}
                                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                placeholder="Parameter value"
                            />
                            <button
                                onClick={() => handleRemoveQueryParam(key)}
                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove parameter"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {Object.keys(queryParams).length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                            No query parameters defined
                        </div>
                    )}
                </div>
            </div>

            {/* cURL Preview */}
            <div className="pt-3 border-t border-border">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                    cURL Command Preview
                </label>
                <div className="relative">
                    <pre className="px-3 py-3 bg-muted border border-border rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                        {generateCurlCommand(method, headers, body, queryParams)}
                    </pre>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(
                                generateCurlCommand(method, headers, body, queryParams)
                            );
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-background border border-border rounded hover:bg-muted transition-colors"
                        title="Copy to clipboard"
                    >
                        <Code className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Check if string is valid JSON
 */
function isValidJSON(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate cURL command for preview
 */
function generateCurlCommand(
    method: string,
    headers: Record<string, string>,
    body: any,
    queryParams: Record<string, string>
): string {
    const baseUrl = "https://your-webhook-endpoint.com/webhook";

    // Build query string
    const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");

    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    // Build cURL command
    let curl = `curl -X ${method} "${url}"`;

    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
    });

    // Add body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(method) && Object.keys(body).length > 0) {
        curl += ` \\\n  -d '${JSON.stringify(body)}'`;
    }

    return curl;
}
