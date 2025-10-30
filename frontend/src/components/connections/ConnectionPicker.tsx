import { useEffect, useState } from "react";
import { Plus, Key, AlertCircle } from "lucide-react";
import { useConnectionStore } from "../../stores/connectionStore";
import { AddConnectionDialog } from "./AddConnectionDialog";
import { ConnectionMethod } from "../../lib/api";
import { cn } from "../../lib/utils";

interface ConnectionPickerProps {
    provider: string;
    value: string | null;
    onChange: (connectionId: string | null) => void;
    label?: string;
    description?: string;
    required?: boolean;
    connectionMethod?: ConnectionMethod; // Optional: filter by connection method
    allowedMethods?: ConnectionMethod[]; // Optional: limit to specific methods
}

const methodBadgeConfig: Record<ConnectionMethod, { label: string; className: string }> = {
    api_key: {
        label: "API Key",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    oauth2: {
        label: "OAuth",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
    mcp: {
        label: "MCP",
        className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    },
    basic_auth: {
        label: "Basic Auth",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    },
    custom: {
        label: "Custom",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    },
};

export function ConnectionPicker({
    provider,
    value,
    onChange,
    label = "Connection",
    description,
    required = false,
    connectionMethod,
    allowedMethods,
}: ConnectionPickerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { connections, fetchConnections } = useConnectionStore();

    useEffect(() => {
        fetchConnections({ provider });
    }, [provider, fetchConnections]);

    // Filter connections by provider and optionally by method
    const providerConnections = connections.filter((conn) => {
        if (conn.provider !== provider) return false;
        if (conn.status !== "active") return false;

        // Filter by specific connection method if provided
        if (connectionMethod && conn.connection_method !== connectionMethod) {
            return false;
        }

        // Filter by allowed methods if provided
        if (allowedMethods && !allowedMethods.includes(conn.connection_method)) {
            return false;
        }

        return true;
    });

    const selectedConnection = providerConnections.find((conn) => conn.id === value);

    const getProviderName = (provider: string): string => {
        const names: Record<string, string> = {
            openai: "OpenAI",
            anthropic: "Anthropic",
            google: "Google",
            slack: "Slack",
            github: "GitHub",
            notion: "Notion",
            filesystem: "Filesystem",
            postgres: "PostgreSQL",
            mongodb: "MongoDB",
        };
        return names[provider] || provider;
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{description}</p>
            )}

            {providerConnections.length === 0 ? (
                <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Key className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            No {getProviderName(provider)} connections found
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsAddDialogOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add {getProviderName(provider)} Connection
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <select
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value || null)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    >
                        <option value="">Select a connection</option>
                        {providerConnections.map((conn) => (
                            <option key={conn.id} value={conn.id}>
                                {conn.name}
                                {conn.metadata?.account_info?.email &&
                                    ` (${conn.metadata.account_info.email})`}
                            </option>
                        ))}
                    </select>

                    {/* Show method badge for selected connection */}
                    {selectedConnection && (
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                                    methodBadgeConfig[selectedConnection.connection_method]
                                        .className
                                )}
                            >
                                {methodBadgeConfig[selectedConnection.connection_method].label}
                            </span>

                            {/* Show MCP tool count if applicable */}
                            {selectedConnection.connection_method === "mcp" &&
                                selectedConnection.mcp_tools && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                        {selectedConnection.mcp_tools.length} tools
                                    </span>
                                )}

                            {/* OAuth expiry warning */}
                            {selectedConnection.connection_method === "oauth2" &&
                                selectedConnection.metadata?.expires_at &&
                                Date.now() > selectedConnection.metadata.expires_at && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        Expired
                                    </span>
                                )}
                        </div>
                    )}

                    {selectedConnection && selectedConnection.status !== "active" && (
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-400">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>
                                This connection has status: {selectedConnection.status}. Please
                                test it in the Connections page.
                            </span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsAddDialogOpen(true)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add new connection
                    </button>
                </div>
            )}

            <AddConnectionDialog
                isOpen={isAddDialogOpen}
                onClose={() => {
                    setIsAddDialogOpen(false);
                    fetchConnections({ provider });
                }}
                onSuccess={() => {
                    setIsAddDialogOpen(false);
                    fetchConnections({ provider });
                }}
            />
        </div>
    );
}
