import React, { useState } from "react";
import { ConnectionMethod, CreateConnectionInput } from "../../lib/api";
import { useConnectionStore } from "../../stores/connectionStore";
import { Dialog } from "../common/Dialog";

interface AddConnectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialProvider?: string;
}

type Step = "method" | "provider" | "configure";

const providersByMethod: Record<ConnectionMethod, string[]> = {
    api_key: ["openai", "anthropic", "google", "github", "cohere", "custom"],
    oauth2: ["slack", "google", "notion", "airtable", "hubspot", "github"],
    mcp: ["filesystem", "postgres", "mongodb", "github", "custom"],
    basic_auth: ["custom"],
    custom: ["custom"]
};

const providerLabels: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    cohere: "Cohere",
    slack: "Slack",
    github: "GitHub",
    notion: "Notion",
    airtable: "Airtable",
    hubspot: "HubSpot",
    filesystem: "Filesystem MCP",
    postgres: "PostgreSQL MCP",
    mongodb: "MongoDB MCP",
    custom: "Custom"
};

export function AddConnectionDialog({
    isOpen,
    onClose,
    onSuccess,
    initialProvider
}: AddConnectionDialogProps) {
    const [step, setStep] = useState<Step>("method");
    const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod | null>(null);
    const [provider, setProvider] = useState<string>("");
    const [name, setName] = useState<string>("");
    const [config, setConfig] = useState<Record<string, unknown>>({});
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const { addConnection, testConnectionBeforeSaving } = useConnectionStore();

    // When dialog opens with initialProvider, auto-select it
    React.useEffect(() => {
        if (isOpen && initialProvider) {
            setProvider(initialProvider);
            // Skip to method selection step
            setStep("method");
        }
    }, [isOpen, initialProvider]);

    const handleReset = () => {
        setStep("method");
        setConnectionMethod(null);
        setProvider("");
        setName("");
        setConfig({});
        setError(null);
        setTesting(false);
        setSaving(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleMethodSelect = (method: ConnectionMethod) => {
        setConnectionMethod(method);
        setStep("provider");
    };

    const handleProviderSelect = (selectedProvider: string) => {
        setProvider(selectedProvider);
        setName(`${providerLabels[selectedProvider]} Connection`);
        setStep("configure");
    };

    const handleTest = async () => {
        if (!connectionMethod || !provider) return;

        setTesting(true);
        setError(null);

        try {
            const input = buildConnectionInput();
            const isValid = await testConnectionBeforeSaving(input);

            if (isValid) {
                setShowSuccessDialog(true);
            } else {
                setError("Connection test failed. Please check your configuration.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Test failed");
        } finally {
            setTesting(false);
        }
    };

    const buildConnectionInput = (): CreateConnectionInput => {
        if (!connectionMethod || !provider) {
            throw new Error("Method and provider required");
        }

        const input: CreateConnectionInput = {
            name,
            connection_method: connectionMethod,
            provider,
            data: {}
        };

        // Build data based on connection method
        if (connectionMethod === "api_key") {
            const data: Record<string, string> = {
                api_key: (config.apiKey as string) || ""
            };
            if (config.apiSecret) {
                data.api_secret = config.apiSecret as string;
            }
            input.data = data as import("@flowmaestro/shared").JsonObject;
        } else if (connectionMethod === "mcp") {
            const data: Record<string, string> = {
                server_url: (config.serverUrl as string) || "",
                auth_type: (config.authType as string) || "none"
            };
            if (config.apiKey) {
                data.api_key = config.apiKey as string;
            }
            if (config.bearerToken) {
                data.bearer_token = config.bearerToken as string;
            }
            if (config.username) {
                data.username = config.username as string;
            }
            if (config.password) {
                data.password = config.password as string;
            }
            input.data = data as import("@flowmaestro/shared").JsonObject;
            input.mcp_server_url = config.serverUrl as string | undefined;
        } else if (connectionMethod === "basic_auth") {
            input.data = {
                username: (config.username as string) || "",
                password: (config.password as string) || ""
            } as import("@flowmaestro/shared").JsonObject;
        }

        return input;
    };

    const handleSave = async () => {
        if (!connectionMethod || !provider) return;

        setSaving(true);
        setError(null);

        try {
            const input = buildConnectionInput();
            await addConnection(input);

            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save connection");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Add Connection"
            description={
                step === "method"
                    ? "Choose how you want to connect"
                    : step === "provider"
                      ? "Select a provider"
                      : `Configure ${providerLabels[provider] || "connection"}`
            }
            maxWidth="lg"
        >
            {/* Step 1: Select Method */}
            {step === "method" && (
                <div className="space-y-3">
                    <MethodOption
                        title="API Key"
                        description="Connect using an API key or secret"
                        icon="🔑"
                        onClick={() => handleMethodSelect("api_key")}
                    />
                    <MethodOption
                        title="OAuth"
                        description="Connect with OAuth 2.0 authorization"
                        icon="🔐"
                        onClick={() => handleMethodSelect("oauth2")}
                    />
                    <MethodOption
                        title="MCP Server"
                        description="Connect to a Model Context Protocol server"
                        icon="🔌"
                        onClick={() => handleMethodSelect("mcp")}
                    />
                </div>
            )}

            {/* Step 2: Select Provider */}
            {step === "provider" && connectionMethod && (
                <div>
                    <button
                        onClick={() => setStep("method")}
                        className="text-sm text-blue-600 hover:underline mb-4"
                    >
                        ← Back to method selection
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        {providersByMethod[connectionMethod].map((p) => (
                            <button
                                key={p}
                                onClick={() => handleProviderSelect(p)}
                                className="p-4 text-left border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            >
                                <div className="font-medium text-gray-900">{providerLabels[p]}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Configure */}
            {step === "configure" && connectionMethod && (
                <div>
                    <button
                        onClick={() => setStep("provider")}
                        className="text-sm text-blue-600 hover:underline mb-4"
                    >
                        ← Back to provider selection
                    </button>

                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Connection Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="My Connection"
                            />
                        </div>

                        {/* API Key Configuration */}
                        {connectionMethod === "api_key" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={(config.apiKey as string) || ""}
                                        onChange={(e) =>
                                            setConfig({ ...config, apiKey: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="sk-..."
                                    />
                                </div>
                                {(provider === "openai" || provider === "custom") && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            API Secret (Optional)
                                        </label>
                                        <input
                                            type="password"
                                            value={(config.apiSecret as string) || ""}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    apiSecret: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* MCP Configuration */}
                        {connectionMethod === "mcp" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        MCP Server URL
                                    </label>
                                    <input
                                        type="url"
                                        value={(config.serverUrl as string) || ""}
                                        onChange={(e) =>
                                            setConfig({ ...config, serverUrl: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="http://localhost:3100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Authentication Type
                                    </label>
                                    <select
                                        value={(config.authType as string) || "none"}
                                        onChange={(e) =>
                                            setConfig({ ...config, authType: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="none">None</option>
                                        <option value="api_key">API Key</option>
                                        <option value="bearer">Bearer Token</option>
                                        <option value="basic">Basic Auth</option>
                                    </select>
                                </div>
                                {config.authType === "api_key" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            API Key
                                        </label>
                                        <input
                                            type="password"
                                            value={(config.apiKey as string) || ""}
                                            onChange={(e) =>
                                                setConfig({ ...config, apiKey: e.target.value })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                )}
                                {config.authType === "bearer" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Bearer Token
                                        </label>
                                        <input
                                            type="password"
                                            value={(config.bearerToken as string) || ""}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    bearerToken: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                )}
                                {config.authType === "basic" && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Username
                                            </label>
                                            <input
                                                type="text"
                                                value={(config.username as string) || ""}
                                                onChange={(e) =>
                                                    setConfig({
                                                        ...config,
                                                        username: e.target.value
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                value={(config.password as string) || ""}
                                                onChange={(e) =>
                                                    setConfig({
                                                        ...config,
                                                        password: e.target.value
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* OAuth Message */}
                        {connectionMethod === "oauth2" && (
                            <div className="p-4 bg-blue-50 rounded-md">
                                <p className="text-sm text-blue-800">
                                    OAuth connections are configured through the Integrations page.
                                    Click "Connect" on the provider you want to authorize.
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        {connectionMethod !== "oauth2" && (
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleTest}
                                    disabled={testing || saving}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {testing ? "Testing..." : "Test Connection"}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={testing || saving || !name}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? "Saving..." : "Save Connection"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Success Dialog */}
            <Dialog
                isOpen={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                title="Success"
            >
                <p className="text-sm text-gray-700">Connection test successful!</p>
            </Dialog>
        </Dialog>
    );
}

interface MethodOptionProps {
    title: string;
    description: string;
    icon: string;
    onClick: () => void;
}

function MethodOption({ title, description, icon, onClick }: MethodOptionProps) {
    return (
        <button
            onClick={onClick}
            className="w-full p-4 text-left border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
            <div className="flex items-start gap-3">
                <div className="text-2xl">{icon}</div>
                <div>
                    <div className="font-medium text-gray-900">{title}</div>
                    <div className="text-sm text-gray-600">{description}</div>
                </div>
            </div>
        </button>
    );
}
