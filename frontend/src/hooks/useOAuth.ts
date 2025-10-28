import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface OAuthProvider {
    name: string;
    displayName: string;
    scopes: string[];
    configured: boolean;
}

interface OAuthCredential {
    id: string;
    name: string;
    provider: string;
    status: string;
    metadata: {
        account_info?: {
            email?: string;
            workspace?: string;
            user?: string;
        };
    };
}

interface OAuthMessageData {
    type: 'oauth_success' | 'oauth_error';
    provider: string;
    credential?: OAuthCredential;
    error?: string;
}

/**
 * Hook for OAuth integration flow
 *
 * Handles:
 * - Fetching available OAuth providers
 * - Initiating OAuth popup flow
 * - Listening for callback messages
 * - Error handling
 */
export function useOAuth() {
    const [loading, setLoading] = useState(false);
    const [providers, setProviders] = useState<OAuthProvider[]>([]);

    /**
     * Fetch available OAuth providers
     */
    const fetchProviders = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/oauth/providers`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                setProviders(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch OAuth providers:', error);
        }
    };

    /**
     * Initiate OAuth flow for a provider
     *
     * Opens a popup window with the OAuth authorization URL,
     * then waits for the callback to post a message back.
     */
    const initiateOAuth = async (provider: string): Promise<OAuthCredential> => {
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }

            // Get authorization URL from backend
            const response = await fetch(
                `${API_BASE_URL}/api/oauth/${provider}/authorize`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!data.success || !data.data?.authUrl) {
                throw new Error(data.error || 'Failed to get authorization URL');
            }

            const authUrl = data.data.authUrl;

            // Open OAuth popup
            const popup = openOAuthPopup(authUrl, provider);

            if (!popup) {
                throw new Error('Failed to open popup window');
            }

            // Wait for callback message
            return await waitForOAuthCallback(popup, provider);
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    /**
     * Open OAuth authorization popup window
     */
    const openOAuthPopup = (url: string, provider: string): Window | null => {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            url,
            `oauth_${provider}`,
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        return popup;
    };

    /**
     * Wait for OAuth callback message from popup
     */
    const waitForOAuthCallback = (
        popup: Window,
        provider: string
    ): Promise<OAuthCredential> => {
        return new Promise((resolve, reject) => {
            // Set timeout (5 minutes)
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('OAuth flow timed out'));
            }, 5 * 60 * 1000);

            // Listen for messages from popup
            const messageHandler = (event: MessageEvent) => {
                // Verify origin (in production, check against your backend URL)
                // if (event.origin !== API_BASE_URL) return;

                const data = event.data as OAuthMessageData;

                // Only handle OAuth messages for this provider
                if (!data.type || data.provider !== provider) {
                    return;
                }

                if (data.type === 'oauth_success' && data.credential) {
                    cleanup();
                    resolve(data.credential);
                } else if (data.type === 'oauth_error') {
                    cleanup();
                    reject(new Error(data.error || 'OAuth authorization failed'));
                }
            };

            // Monitor popup closure
            const checkPopupClosed = setInterval(() => {
                if (popup.closed) {
                    cleanup();
                    reject(new Error('OAuth popup was closed'));
                }
            }, 500);

            // Cleanup function
            const cleanup = () => {
                clearTimeout(timeout);
                clearInterval(checkPopupClosed);
                window.removeEventListener('message', messageHandler);
                setLoading(false);

                // Close popup if still open
                if (!popup.closed) {
                    popup.close();
                }
            };

            // Register message listener
            window.addEventListener('message', messageHandler);
        });
    };

    /**
     * Revoke an OAuth credential
     */
    const revokeCredential = async (provider: string, credentialId: string): Promise<void> => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `${API_BASE_URL}/api/oauth/${provider}/revoke/${credentialId}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to revoke credential');
        }
    };

    /**
     * Manually refresh a credential's token
     */
    const refreshCredential = async (provider: string, credentialId: string): Promise<void> => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `${API_BASE_URL}/api/oauth/${provider}/refresh/${credentialId}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to refresh credential');
        }
    };

    return {
        loading,
        providers,
        fetchProviders,
        initiateOAuth,
        revokeCredential,
        refreshCredential,
    };
}
