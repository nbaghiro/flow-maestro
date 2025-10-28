import { useState } from "react";
import { Key, Loader2, CheckCircle, AlertCircle, Trash2, MoreVertical } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge";
import type { Credential } from "../../lib/api";
import { useCredentialStore } from "../../stores/credentialStore";

interface CredentialCardProps {
    credential: Credential;
}

export function CredentialCard({ credential }: CredentialCardProps) {
    const [isTesting, setIsTesting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const { testCredentialById, deleteCredentialById } = useCredentialStore();

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const isValid = await testCredentialById(credential.id);
            setTestResult({
                success: isValid,
                message: isValid ? "Connection successful!" : "Connection failed",
            });
            setTimeout(() => setTestResult(null), 3000);
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || "Failed to test credential",
            });
            setTimeout(() => setTestResult(null), 3000);
        } finally {
            setIsTesting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${credential.name}"?`)) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteCredentialById(credential.id);
        } catch (err: any) {
            alert(err.message || "Failed to delete credential");
        } finally {
            setIsDeleting(false);
        }
    };

    const getProviderName = (provider: string) => {
        const names: Record<string, string> = {
            openai: "OpenAI",
            anthropic: "Anthropic",
            google: "Google AI",
            cohere: "Cohere",
        };
        return names[provider] || provider;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(date);
    };

    return (
        <div className="bg-white border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <Key className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-foreground truncate">
                                {credential.name}
                            </h3>
                            <StatusBadge status={credential.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                            {getProviderName(credential.provider)}
                        </p>

                        {testResult && (
                            <div
                                className={`mb-3 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                    testResult.success
                                        ? "bg-green-50 text-green-800"
                                        : "bg-red-50 text-red-800"
                                }`}
                            >
                                {testResult.success ? (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                ) : (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                )}
                                <span>{testResult.message}</span>
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div>
                                Last tested: <span className="font-medium">{formatDate(credential.last_tested_at)}</span>
                            </div>
                            <div>
                                Last used: <span className="font-medium">{formatDate(credential.last_used_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 z-20">
                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        handleTest();
                                    }}
                                    disabled={isTesting}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                    {isTesting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    <span>Test Connection</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        handleDelete();
                                    }}
                                    disabled={isDeleting}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    <span>Delete</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
