import { formatDistanceToNow } from "date-fns";
import { Connection, ConnectionMethod, ConnectionStatus } from "../../lib/api";
import { cn } from "../../lib/utils";
import { StatusBadge } from "../common/StatusBadge";

interface ConnectionCardProps {
    connection: Connection;
    onTest?: (id: string) => void;
    onRefreshTools?: (id: string) => void;
    onDelete?: (id: string) => void;
    onSelect?: (connection: Connection) => void;
    testing?: boolean;
    refreshing?: boolean;
}

const methodBadgeConfig: Record<ConnectionMethod, { label: string; className: string }> = {
    api_key: {
        label: "API Key",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    },
    oauth2: {
        label: "OAuth",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
    },
    mcp: {
        label: "MCP",
        className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
    },
    basic_auth: {
        label: "Basic Auth",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
    },
    custom: {
        label: "Custom",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
    }
};

const providerIcons: Record<string, string> = {
    openai: "🤖",
    anthropic: "🧠",
    google: "🔍",
    slack: "💬",
    github: "🐙",
    notion: "📝",
    airtable: "📊",
    hubspot: "🧲",
    default: "🔌"
};

export function ConnectionCard({
    connection,
    onTest,
    onRefreshTools,
    onDelete,
    onSelect,
    testing = false,
    refreshing = false
}: ConnectionCardProps) {
    const methodConfig = methodBadgeConfig[connection.connection_method];
    const icon = providerIcons[connection.provider] || providerIcons.default;

    const handleClick = () => {
        if (onSelect) {
            onSelect(connection);
        }
    };

    return (
        <div
            className={cn(
                "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow",
                onSelect && "cursor-pointer hover:border-blue-500"
            )}
            onClick={handleClick}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-2xl flex-shrink-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {connection.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {connection.provider}
                        </p>
                    </div>
                </div>
                <StatusBadge
                    status={connection.status as ConnectionStatus}
                    className="flex-shrink-0"
                />
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mb-3">
                <span
                    className={cn(
                        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                        methodConfig.className
                    )}
                >
                    {methodConfig.label}
                </span>

                {/* MCP Tool Count */}
                {connection.connection_method === "mcp" && connection.mcp_tools && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {connection.mcp_tools.length} tools
                    </span>
                )}

                {/* OAuth Expiry Warning */}
                {connection.connection_method === "oauth2" && connection.metadata?.expires_at && (
                    <span
                        className={cn(
                            "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                            Date.now() > connection.metadata.expires_at
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        )}
                    >
                        {Date.now() > connection.metadata.expires_at ? "Expired" : "Valid"}
                    </span>
                )}
            </div>

            {/* Metadata */}
            {connection.metadata?.account_info && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {connection.metadata.account_info.email ||
                        connection.metadata.account_info.username ||
                        connection.metadata.account_info.workspace}
                </div>
            )}

            {/* MCP Server URL */}
            {connection.mcp_server_url && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-mono truncate">
                    {connection.mcp_server_url}
                </div>
            )}

            {/* Last Used */}
            {connection.last_used_at && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Last used{" "}
                    {formatDistanceToNow(new Date(connection.last_used_at), {
                        addSuffix: true
                    })}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                {onTest && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTest(connection.id);
                        }}
                        disabled={testing}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {testing ? "Testing..." : "Test"}
                    </button>
                )}

                {connection.connection_method === "mcp" && onRefreshTools && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRefreshTools(connection.id);
                        }}
                        disabled={refreshing}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {refreshing ? "Refreshing..." : "Refresh Tools"}
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(connection.id);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                    >
                        Delete
                    </button>
                )}
            </div>
        </div>
    );
}
