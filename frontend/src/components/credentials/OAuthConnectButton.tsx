import { useState } from 'react';
import { useOAuth } from '../../hooks/useOAuth';
import { Loader2 } from 'lucide-react';
import { Toast } from '../common/Toast';

interface OAuthConnectButtonProps {
    provider: string;
    displayName: string;
    onSuccess?: (credential: any) => void;
    onError?: (error: Error) => void;
    className?: string;
}

interface ToastState {
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
}

/**
 * OAuth Connect Button Component
 *
 * Displays a button that initiates OAuth flow when clicked.
 * Shows loading state during authorization.
 */
export function OAuthConnectButton({
    provider,
    displayName,
    onSuccess,
    onError,
    className = '',
}: OAuthConnectButtonProps) {
    const { initiateOAuth, loading: hookLoading } = useOAuth();
    const [localLoading, setLocalLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>({
        isOpen: false,
        type: 'success',
        title: '',
        message: '',
    });

    const loading = hookLoading || localLoading;

    const showToast = (type: 'success' | 'error', title: string, message: string) => {
        setToast({ isOpen: true, type, title, message });
    };

    const handleConnect = async () => {
        setLocalLoading(true);

        try {
            const credential = await initiateOAuth(provider);
            console.log(`Successfully connected to ${provider}:`, credential);

            showToast('success', 'Connected!', `Successfully connected to ${displayName}`);

            onSuccess?.(credential);
        } catch (error) {
            console.error(`Failed to connect to ${provider}:`, error);

            showToast(
                'error',
                'Connection Failed',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );

            onError?.(error instanceof Error ? error : new Error('Unknown error'));
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleConnect}
                disabled={loading}
                className={`
                    inline-flex items-center justify-center gap-2 px-4 py-2
                    bg-primary text-primary-foreground rounded-lg
                    hover:bg-primary/90 active:bg-primary/80
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors font-medium text-sm
                    ${className}
                `}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting...</span>
                    </>
                ) : (
                    <span>Connect</span>
                )}
            </button>

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
