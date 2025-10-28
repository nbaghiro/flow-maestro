import { Loader2 } from "lucide-react";
import { OAuthConnectButton } from "../credentials/OAuthConnectButton";
import { useOAuth } from "../../hooks/useOAuth";
import { useState } from "react";
import type { Credential } from "../../lib/api";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Toast } from "../common/Toast";

interface IntegrationCardProps {
    provider: string;
    displayName: string;
    description: string;
    logoUrl: string;
    comingSoon?: boolean;
    credential?: Credential;
    onConnect: () => void;
}

interface ToastState {
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
}

/**
 * Integration Card Component
 *
 * Clean card design showing:
 * - Provider logo
 * - Name and description
 * - Connection status or "Coming Soon" badge
 * - Connect/Disconnect action
 */
export function IntegrationCard({
    provider,
    displayName,
    description,
    logoUrl,
    comingSoon = false,
    credential,
    onConnect,
}: IntegrationCardProps) {
    const { revokeCredential } = useOAuth();
    const [disconnecting, setDisconnecting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [toast, setToast] = useState<ToastState>({
        isOpen: false,
        type: 'success',
        title: '',
        message: '',
    });

    const isConnected = !!credential;

    const showToast = (type: 'success' | 'error', title: string, message: string) => {
        setToast({ isOpen: true, type, title, message });
    };

    const handleDisconnectClick = () => {
        setShowConfirmDialog(true);
    };

    const handleDisconnectConfirm = async () => {
        if (!credential) return;

        setDisconnecting(true);
        try {
            await revokeCredential(provider, credential.id);
            showToast('success', 'Disconnected', `Successfully disconnected from ${displayName}`);
            onConnect(); // Refresh the list
        } catch (error) {
            showToast(
                'error',
                'Disconnection Failed',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <>
            <div
                className={`
                    group relative flex items-start gap-4 p-5 bg-card border border-border rounded-xl
                    transition-all duration-200
                    ${!comingSoon ? "hover:border-primary/50 hover:shadow-sm cursor-pointer" : "opacity-60"}
                `}
            >
                {/* Logo */}
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    <img
                        src={logoUrl}
                        alt={`${displayName} logo`}
                        className="w-full h-full object-contain"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground mb-1 truncate">
                        {displayName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {description}
                    </p>
                </div>

                {/* Status Badge / Action */}
                <div className="flex-shrink-0">
                    {comingSoon ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                            Soon
                        </span>
                    ) : isConnected ? (
                        <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md">
                                Connected
                            </span>
                            <button
                                onClick={handleDisconnectClick}
                                disabled={disconnecting}
                                className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {disconnecting ? (
                                    <span className="flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Disconnecting
                                    </span>
                                ) : (
                                    "Disconnect"
                                )}
                            </button>
                        </div>
                    ) : (
                        <OAuthConnectButton
                            provider={provider}
                            displayName={displayName}
                            onSuccess={onConnect}
                            className="px-3 py-1.5 text-xs"
                        />
                    )}
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleDisconnectConfirm}
                title="Disconnect Integration"
                message={`Are you sure you want to disconnect from ${displayName}? You'll need to reconnect to use this integration in your workflows.`}
                confirmText="Disconnect"
                cancelText="Cancel"
                variant="danger"
            />

            {/* Toast Notification */}
            <Toast
                isOpen={toast.isOpen}
                onClose={() => setToast({ ...toast, isOpen: false })}
                type={toast.type}
                title={toast.title}
                message={toast.message}
            />
        </>
    );
}
