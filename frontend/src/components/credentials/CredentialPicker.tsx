import { useEffect, useState } from "react";
import { Plus, Key, AlertCircle } from "lucide-react";
import { useCredentialStore } from "../../stores/credentialStore";
import { AddCredentialDialog } from "./AddCredentialDialog";

interface CredentialPickerProps {
    provider: string;
    value: string | null;
    onChange: (credentialId: string | null) => void;
    label?: string;
    description?: string;
    required?: boolean;
}

export function CredentialPicker({
    provider,
    value,
    onChange,
    label = "Credential",
    description,
    required = false,
}: CredentialPickerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { credentials, fetchCredentials } = useCredentialStore();

    useEffect(() => {
        fetchCredentials({ provider });
    }, [provider, fetchCredentials]);

    const providerCredentials = credentials.filter(
        (cred) => cred.provider === provider && cred.status === "active"
    );

    const selectedCredential = providerCredentials.find((cred) => cred.id === value);

    const getProviderName = (provider: string) => {
        const names: Record<string, string> = {
            openai: "OpenAI",
            anthropic: "Anthropic",
            google: "Google AI",
            cohere: "Cohere",
        };
        return names[provider] || provider;
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-foreground">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {description && (
                <p className="text-xs text-muted-foreground mb-2">{description}</p>
            )}

            {providerCredentials.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Key className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            No {getProviderName(provider)} credentials found
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsAddDialogOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add {getProviderName(provider)} Credential
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <select
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value || null)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="">Select a credential</option>
                        {providerCredentials.map((cred) => (
                            <option key={cred.id} value={cred.id}>
                                {cred.name}
                                {cred.metadata?.account_info?.email &&
                                    ` (${cred.metadata.account_info.email})`}
                            </option>
                        ))}
                    </select>

                    {selectedCredential && selectedCredential.status !== "active" && (
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>
                                This credential has status: {selectedCredential.status}. Please test it in the
                                Credentials page.
                            </span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsAddDialogOpen(true)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add new credential
                    </button>
                </div>
            )}

            <AddCredentialDialog
                isOpen={isAddDialogOpen}
                onClose={() => {
                    setIsAddDialogOpen(false);
                    fetchCredentials({ provider });
                }}
            />
        </div>
    );
}
