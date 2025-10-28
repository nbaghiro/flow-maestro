import { useEffect, useState } from "react";
import { Key, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { AddCredentialDialog } from "../components/credentials/AddCredentialDialog";
import { CredentialCard } from "../components/credentials/CredentialCard";
import { useCredentialStore } from "../stores/credentialStore";

/**
 * Credentials Page
 *
 * Manages static API keys (not OAuth integrations).
 * For OAuth integrations, see the Integrations page.
 */
export function Credentials() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { credentials, loading, error, fetchCredentials } = useCredentialStore();

    useEffect(() => {
        fetchCredentials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Only show API key credentials (not OAuth)
    const apiKeyCredentials = credentials.filter((cred) => cred.type === "api_key");

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Credentials"
                description="Manage your API keys for AI providers and other services"
                action={
                    <button
                        onClick={() => setIsAddDialogOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Credential
                    </button>
                }
            />

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* Info box about integrations */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-medium mb-1">Looking for OAuth integrations?</p>
                <p>
                    Connect to services like Slack, Google, and Notion on the{" "}
                    <a href="/integrations" className="underline font-medium">
                        Integrations page
                    </a>
                    .
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : apiKeyCredentials.length === 0 ? (
                <EmptyState
                    icon={Key}
                    title="No API keys yet"
                    description="Add your first API key to use AI providers in your workflows"
                    action={
                        <button
                            onClick={() => setIsAddDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add API Key
                        </button>
                    }
                />
            ) : (
                <div className="space-y-4">
                    {apiKeyCredentials.map((credential) => (
                        <CredentialCard key={credential.id} credential={credential} />
                    ))}
                </div>
            )}

            <AddCredentialDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} />
        </div>
    );
}
