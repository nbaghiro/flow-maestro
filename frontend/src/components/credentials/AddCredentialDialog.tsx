import { useState, FormEvent } from "react";
import { X, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useCredentialStore } from "../../stores/credentialStore";
import { testCredentialConnection } from "../../lib/api";
import type { CreateCredentialInput } from "../../lib/api";

interface AddCredentialDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface AIProvider {
    id: string;
    name: string;
    description: string;
}

const AI_PROVIDERS: AIProvider[] = [
    { id: "openai", name: "OpenAI", description: "GPT-4, GPT-3.5, and other OpenAI models" },
    { id: "anthropic", name: "Anthropic", description: "Claude 3 and Claude 2 models" },
    { id: "google", name: "Google AI", description: "Gemini and PaLM models" },
    { id: "cohere", name: "Cohere", description: "Command and Embed models" },
];

export function AddCredentialDialog({ isOpen, onClose }: AddCredentialDialogProps) {
    const [name, setName] = useState("");
    const [provider, setProvider] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [error, setError] = useState("");

    const { addCredential } = useCredentialStore();

    const handleTest = async () => {
        setError("");
        setTestResult(null);

        if (!provider) {
            setError("Please select a provider");
            return;
        }

        if (!apiKey.trim()) {
            setError("Please enter an API key");
            return;
        }

        setIsTesting(true);
        try {
            // Test the connection without saving
            const response = await testCredentialConnection(provider, {
                api_key: apiKey.trim()
            });

            setTestResult({
                success: response.data.valid,
                message: response.data.message,
            });
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || "Failed to test connection",
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setTestResult(null);

        if (!provider) {
            setError("Please select a provider");
            return;
        }

        if (!name.trim()) {
            setError("Credential name is required");
            return;
        }

        if (!apiKey.trim()) {
            setError("API key is required");
            return;
        }

        setIsCreating(true);
        try {
            const input: CreateCredentialInput = {
                name: name.trim(),
                type: "api_key",
                provider,
                data: { api_key: apiKey.trim() },
            };

            await addCredential(input);

            // Reset form
            setName("");
            setProvider("");
            setApiKey("");
            setTestResult(null);
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to add credential");
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        if (!isCreating && !isTesting) {
            setName("");
            setProvider("");
            setApiKey("");
            setShowApiKey(false);
            setTestResult(null);
            setError("");
            onClose();
        }
    };

    if (!isOpen) return null;

    const selectedProvider = AI_PROVIDERS.find((p) => p.id === provider);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Add AI Provider Credential</h2>
                    <button
                        onClick={handleClose}
                        disabled={isCreating || isTesting}
                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {testResult && (
                        <div
                            className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                                testResult.success
                                    ? "bg-green-50 border border-green-200 text-green-800"
                                    : "bg-red-50 border border-red-200 text-red-800"
                            }`}
                        >
                            {testResult.success ? (
                                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            )}
                            <span>{testResult.message}</span>
                        </div>
                    )}

                    <div>
                        <label htmlFor="provider" className="block text-sm font-medium text-foreground mb-1.5">
                            AI Provider <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="provider"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            disabled={isCreating || isTesting}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">Select a provider</option>
                            {AI_PROVIDERS.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        {selectedProvider && (
                            <p className="mt-1.5 text-xs text-muted-foreground">{selectedProvider.description}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="credential-name" className="block text-sm font-medium text-foreground mb-1.5">
                            Credential Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="credential-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., My OpenAI Key"
                            required
                            maxLength={255}
                            disabled={isCreating || isTesting}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                            A friendly name to identify this credential
                        </p>
                    </div>

                    <div>
                        <label htmlFor="api-key" className="block text-sm font-medium text-foreground mb-1.5">
                            API Key <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="api-key"
                                type={showApiKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                required
                                disabled={isCreating || isTesting}
                                className="w-full px-3 py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                disabled={isCreating || isTesting}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                            Your API key will be encrypted and stored securely
                        </p>
                    </div>

                    {/* Test Connection Button */}
                    <button
                        type="button"
                        onClick={handleTest}
                        disabled={isCreating || isTesting || !provider || !apiKey.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {isTesting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Testing connection...
                            </>
                        ) : (
                            "Test Connection"
                        )}
                    </button>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isCreating || isTesting}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isTesting || !name.trim() || !provider || !apiKey.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                "Add Credential"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
