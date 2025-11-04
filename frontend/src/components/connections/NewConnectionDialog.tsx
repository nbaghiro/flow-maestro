import React, { useState, useEffect } from "react";
import { ArrowLeft, X, Eye, EyeOff, Shield, Key, Blocks } from "lucide-react";
import type { JsonObject } from "@flowmaestro/shared";
import { useOAuth } from "../../hooks/useOAuth";
import { useConnectionStore } from "../../stores/connectionStore";
import type { CreateConnectionInput } from "../../lib/api";

interface NewConnectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    provider: string;
    providerDisplayName: string;
    providerIcon?: React.ReactNode;
    onSuccess?: () => void;
    supportsOAuth?: boolean;
    supportsApiKey?: boolean;
    supportsMCP?: boolean;
    mcpServerUrl?: string;
}

type DialogStep = "method-selection" | "api-key-form" | "mcp-form";

/**
 * New Connection Dialog with StackAI-style design
 *
 * Displays two authentication options:
 * 1. OAuth2 - Opens popup for provider consent
 * 2. API Key - Shows form for manual credential entry
 */
export function NewConnectionDialog({
    isOpen,
    onClose,
    provider,
    providerDisplayName,
    providerIcon,
    onSuccess,
    supportsOAuth = true,
    supportsApiKey = true,
    supportsMCP = false,
    mcpServerUrl
}: NewConnectionDialogProps) {
    const [step, setStep] = useState<DialogStep>("method-selection");
    const [connectionName, setConnectionName] = useState<string>(
        `${providerDisplayName} Connection`
    );
    const [apiKey, setApiKey] = useState<string>("");
    const [mcpAuthKey, setMcpAuthKey] = useState<string>("");
    const [showApiKey, setShowApiKey] = useState<boolean>(false);
    const [showMcpAuthKey, setShowMcpAuthKey] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const { initiateOAuth, loading: oauthLoading } = useOAuth();
    const { addConnection } = useConnectionStore();

    // Auto-select authentication method if only one is supported
    useEffect(() => {
        if (!isOpen) return;

        const methodCount =
            (supportsOAuth ? 1 : 0) + (supportsApiKey ? 1 : 0) + (supportsMCP ? 1 : 0);

        // If only one method is supported, auto-select it
        if (methodCount === 1) {
            if (supportsOAuth && !supportsApiKey && !supportsMCP) {
                // Auto-start OAuth flow
                handleOAuthSelect();
            } else if (supportsApiKey && !supportsOAuth && !supportsMCP) {
                // Auto-show API Key form
                setStep("api-key-form");
            } else if (supportsMCP && !supportsOAuth && !supportsApiKey) {
                // Auto-show MCP form
                setStep("mcp-form");
            }
        } else {
            // Multiple methods supported, show selection
            setStep("method-selection");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, supportsOAuth, supportsApiKey, supportsMCP]);

    const handleReset = () => {
        setStep("method-selection");
        setConnectionName(`${providerDisplayName} Connection`);
        setApiKey("");
        setMcpAuthKey("");
        setShowApiKey(false);
        setShowMcpAuthKey(false);
        setError(null);
        setIsSubmitting(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleOAuthSelect = async () => {
        setError(null);
        try {
            await initiateOAuth(provider);
            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            // Only show error if it's not "Not authenticated" (which happens when no existing connection)
            const errorMessage = err instanceof Error ? err.message : "OAuth authentication failed";
            if (errorMessage !== "Not authenticated") {
                setError(errorMessage);
            }
        }
    };

    const handleApiKeySelect = () => {
        setStep("api-key-form");
    };

    const handleMCPSelect = () => {
        setStep("mcp-form");
    };

    const handleBackToMethodSelection = () => {
        setStep("method-selection");
        setError(null);
    };

    const handleApiKeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!connectionName.trim()) {
            setError("Connection name is required");
            return;
        }

        if (!apiKey.trim()) {
            setError("API key is required");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const input: CreateConnectionInput = {
                name: connectionName,
                connection_method: "api_key",
                provider,
                data: {
                    api_key: apiKey
                }
            };

            await addConnection(input);
            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create connection");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMCPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!connectionName.trim()) {
            setError("Connection name is required");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const data: JsonObject = {
                server_url: mcpServerUrl || ""
            };

            // Only include auth_key if it's provided
            if (mcpAuthKey.trim()) {
                data.auth_key = mcpAuthKey.trim();
            }

            const input: CreateConnectionInput = {
                name: connectionName,
                connection_method: "mcp",
                provider,
                data
            };

            await addConnection(input);
            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create MCP connection");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

            {/* Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        {(step === "api-key-form" || step === "mcp-form") && (
                            <button
                                onClick={handleBackToMethodSelection}
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                type="button"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h2 className="text-lg font-semibold text-gray-900">New Connection</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Provider Connection Visual */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {/* FlowMaestro Icon */}
                        <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center shadow-md">
                            <span className="text-2xl font-bold text-white">FM</span>
                        </div>

                        {/* Dotted Line */}
                        <div className="flex-1 max-w-[120px] border-t-2 border-dotted border-gray-300" />

                        {/* Provider Icon */}
                        <div className="w-16 h-16 flex items-center justify-center shadow-md">
                            {providerIcon || (
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white">
                                        {providerDisplayName.substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Connection Title */}
                    <p className="text-center text-gray-700 mb-6">
                        Connect FlowMaestro to {providerDisplayName}
                    </p>

                    {/* Method Selection */}
                    {step === "method-selection" && (
                        <div className="space-y-3">
                            {supportsOAuth && (
                                <button
                                    onClick={handleOAuthSelect}
                                    disabled={oauthLoading}
                                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    type="button"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-gray-700" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-900">
                                                    OAuth2 {providerDisplayName}
                                                </span>
                                                <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                                                    OAUTH
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Link your account to FlowMaestro
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {supportsApiKey && (
                                <button
                                    onClick={handleApiKeySelect}
                                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                    type="button"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <Key className="w-5 h-5 text-gray-700" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 mb-1">
                                                API Key
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Manually enter account credentials
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {supportsMCP && (
                                <button
                                    onClick={handleMCPSelect}
                                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                                    type="button"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Blocks className="w-5 h-5 text-purple-700" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-900">
                                                    MCP Server
                                                </span>
                                                <span className="px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded border border-purple-200">
                                                    MCP
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Connect to Model Context Protocol server
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}
                        </div>
                    )}

                    {/* API Key Form */}
                    {step === "api-key-form" && (
                        <form onSubmit={handleApiKeySubmit} className="space-y-4">
                            {/* Connection Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Connection Name <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Give your connection a friendly name to identify it in your
                                    workflows and settings
                                </p>
                                <input
                                    type="text"
                                    value={connectionName}
                                    onChange={(e) => setConnectionName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                    placeholder={`${providerDisplayName} (Personal Access Token) connection`}
                                    required
                                />
                            </div>

                            {/* API Key / Personal Access Token */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Personal Access Token <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                        placeholder="Enter your API key or token"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting ? "Creating..." : "Create connection"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* MCP Form */}
                    {step === "mcp-form" && (
                        <form onSubmit={handleMCPSubmit} className="space-y-4">
                            {/* Connection Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Connection Name <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Give your MCP connection a friendly name
                                </p>
                                <input
                                    type="text"
                                    value={connectionName}
                                    onChange={(e) => setConnectionName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors"
                                    placeholder={`${providerDisplayName} MCP Connection`}
                                    required
                                />
                            </div>

                            {/* MCP Server URL (read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    MCP Server URL
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Server URL from MCP registry
                                </p>
                                <input
                                    type="text"
                                    value={mcpServerUrl || ""}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>

                            {/* Authentication Key (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Authentication Key{" "}
                                    <span className="text-gray-400">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showMcpAuthKey ? "text" : "password"}
                                        value={mcpAuthKey}
                                        onChange={(e) => setMcpAuthKey(e.target.value)}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors"
                                        placeholder="Enter authentication key if required"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowMcpAuthKey(!showMcpAuthKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showMcpAuthKey ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting ? "Creating..." : "Create MCP connection"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Error Message for OAuth */}
                    {error && step === "method-selection" && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
