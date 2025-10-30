import React, { useState } from "react";
import { X, Shield, Key, AlertTriangle } from "lucide-react";
import type { Connection } from "../../lib/api";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface ConnectionDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    connection: Connection;
    providerDisplayName: string;
    providerIcon?: React.ReactNode;
    onDisconnect: (connectionId: string) => Promise<void>;
}

/**
 * Connection Details Dialog
 *
 * Shows connection information including:
 * - Authentication method (OAuth or API Key)
 * - Masked credentials
 * - Account information
 * - Disconnect option
 */
export function ConnectionDetailsDialog({
    isOpen,
    onClose,
    connection,
    providerDisplayName,
    providerIcon,
    onDisconnect,
}: ConnectionDetailsDialogProps) {
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isOAuth = connection.connection_method === "oauth2";
    const isApiKey = connection.connection_method === "api_key";

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        setError(null);

        try {
            await onDisconnect(connection.id);
            setShowConfirmDisconnect(false);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to disconnect");
        } finally {
            setIsDisconnecting(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Dialog */}
                <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Connection Details
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            type="button"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Provider Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex-shrink-0">
                                {providerIcon}
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900">
                                    {providerDisplayName}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {connection.name}
                                </p>
                            </div>
                        </div>

                        {/* Authentication Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Authentication Method
                            </label>
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                                {isOAuth ? (
                                    <>
                                        <Shield className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm text-gray-900">
                                            OAuth 2.0
                                        </span>
                                        <span className="ml-auto px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                                            OAUTH
                                        </span>
                                    </>
                                ) : isApiKey ? (
                                    <>
                                        <Key className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm text-gray-900">
                                            API Key
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-900">
                                        {connection.connection_method}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* OAuth Account Info */}
                        {isOAuth && connection.metadata?.account_info && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Connected Account
                                </label>
                                <div className="p-3 bg-gray-50 rounded-md space-y-1">
                                    {connection.metadata.account_info.email && (
                                        <div className="text-sm">
                                            <span className="text-gray-600">Email: </span>
                                            <span className="text-gray-900">
                                                {connection.metadata.account_info.email}
                                            </span>
                                        </div>
                                    )}
                                    {connection.metadata.account_info.username && (
                                        <div className="text-sm">
                                            <span className="text-gray-600">Username: </span>
                                            <span className="text-gray-900">
                                                {connection.metadata.account_info.username}
                                            </span>
                                        </div>
                                    )}
                                    {connection.metadata.account_info.workspace && (
                                        <div className="text-sm">
                                            <span className="text-gray-600">Workspace: </span>
                                            <span className="text-gray-900">
                                                {connection.metadata.account_info.workspace}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* API Key (masked) */}
                        {isApiKey && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    API Key
                                </label>
                                <div className="p-3 bg-gray-50 rounded-md">
                                    <code className="text-sm text-gray-900 font-mono">
                                        ••••••••••••••••
                                    </code>
                                    <p className="text-xs text-gray-500 mt-1">
                                        API keys are encrypted and cannot be displayed
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md ${
                                        connection.status === "active"
                                            ? "bg-green-50 text-green-700"
                                            : connection.status === "expired"
                                            ? "bg-yellow-50 text-yellow-700"
                                            : "bg-red-50 text-red-700"
                                    }`}
                                >
                                    {connection.status.charAt(0).toUpperCase() +
                                        connection.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Created
                                </label>
                                <p className="text-sm text-gray-900">
                                    {formatDate(connection.created_at)}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Used
                                </label>
                                <p className="text-sm text-gray-900">
                                    {formatDate(connection.last_used_at)}
                                </p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Disconnect Button */}
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setShowConfirmDisconnect(true)}
                                disabled={isDisconnecting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Disconnect {providerDisplayName}
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                You can reconnect to a different account anytime
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Disconnect Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDisconnect}
                onClose={() => setShowConfirmDisconnect(false)}
                onConfirm={handleDisconnect}
                title="Disconnect Integration"
                message={`Are you sure you want to disconnect ${providerDisplayName}? This will remove access to your ${providerDisplayName} account.`}
                confirmText="Disconnect"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
}
