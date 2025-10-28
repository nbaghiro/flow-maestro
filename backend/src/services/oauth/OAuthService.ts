import axios from 'axios';
import { randomBytes } from 'crypto';
import { getOAuthProvider, OAuthProvider } from './OAuthProviderRegistry';

/**
 * OAuth state token data
 */
interface StateTokenData {
    userId: string;
    expiresAt: number;
}

/**
 * OAuth token exchange result
 */
export interface OAuthTokenResult {
    userId: string;
    tokens: {
        access_token: string;
        refresh_token?: string;
        token_type: string;
        expires_in?: number;
        scope?: string;
    };
    accountInfo: any;
}

/**
 * Generic OAuth 2.0 Service
 *
 * This service implements a generic OAuth 2.0 authorization code flow
 * that works with ANY OAuth provider configured in the registry.
 *
 * Key features:
 * - CSRF protection via state tokens
 * - Generic token exchange
 * - Automatic token refresh
 * - Token revocation
 */
export class OAuthService {
    private stateStore = new Map<string, StateTokenData>();

    /**
     * Generate authorization URL for user to visit
     * GENERIC - works for all OAuth providers
     */
    generateAuthUrl(provider: string, userId: string): string {
        const config = getOAuthProvider(provider);

        // Generate CSRF state token
        const state = this.generateStateToken(userId);

        // Build authorization URL with parameters
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            state,
            ...config.authParams
        });

        // Add scopes if provider uses them
        if (config.scopes && config.scopes.length > 0) {
            params.set('scope', config.scopes.join(' '));
        }

        const authUrl = `${config.authUrl}?${params.toString()}`;
        console.log(`[OAuth] Generated auth URL for ${provider}:`, authUrl);

        return authUrl;
    }

    /**
     * Exchange authorization code for access token
     * GENERIC - works for all OAuth providers
     */
    async exchangeCodeForToken(
        provider: string,
        code: string,
        state: string
    ): Promise<OAuthTokenResult> {
        const config = getOAuthProvider(provider);

        // Validate state token (CSRF protection)
        const stateData = this.validateStateToken(state);
        if (!stateData) {
            throw new Error('Invalid or expired state token');
        }

        console.log(`[OAuth] Exchanging code for token: ${provider}`);

        try {
            // Exchange code for token
            const tokenData = await this.performTokenExchange(config, code);

            console.log(`[OAuth] Token exchange successful for ${provider}`);

            // Get user info from provider
            let accountInfo = {};
            if (config.getUserInfo) {
                try {
                    accountInfo = await config.getUserInfo(tokenData.access_token);
                    console.log(`[OAuth] Retrieved user info for ${provider}:`, accountInfo);
                } catch (error) {
                    console.error(`[OAuth] Failed to get user info for ${provider}:`, error);
                    // Continue anyway, user info is optional
                }
            }

            return {
                userId: stateData.userId,
                tokens: {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    token_type: tokenData.token_type || 'Bearer',
                    expires_in: tokenData.expires_in,
                    scope: tokenData.scope
                },
                accountInfo
            };
        } catch (error: any) {
            console.error(`[OAuth] Token exchange failed for ${provider}:`, error.response?.data || error.message);
            throw new Error(
                `Failed to exchange authorization code: ${
                    error.response?.data?.error_description ||
                    error.response?.data?.error ||
                    error.message
                }`
            );
        }
    }

    /**
     * Refresh access token using refresh token
     * GENERIC - works for all OAuth providers that support refresh
     */
    async refreshAccessToken(
        provider: string,
        refreshToken: string
    ): Promise<{
        access_token: string;
        refresh_token?: string;
        token_type: string;
        expires_in?: number;
    }> {
        const config = getOAuthProvider(provider);

        if (config.refreshable === false) {
            throw new Error(`Provider ${provider} does not support token refresh`);
        }

        console.log(`[OAuth] Refreshing token for ${provider}`);

        try {
            const params: any = {
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            };

            const response = await axios.post(
                config.tokenUrl,
                new URLSearchParams(params).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                }
            );

            const tokenData = response.data;

            console.log(`[OAuth] Token refresh successful for ${provider}`);

            return {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || refreshToken, // Some providers don't return new refresh token
                token_type: tokenData.token_type || 'Bearer',
                expires_in: tokenData.expires_in
            };
        } catch (error: any) {
            console.error(`[OAuth] Token refresh failed for ${provider}:`, error.response?.data || error.message);
            throw new Error(
                `Failed to refresh token: ${
                    error.response?.data?.error_description ||
                    error.response?.data?.error ||
                    error.message
                }`
            );
        }
    }

    /**
     * Revoke access token
     * GENERIC - works for providers that support revocation
     */
    async revokeToken(provider: string, accessToken: string): Promise<void> {
        const config = getOAuthProvider(provider);

        if (!config.revokeUrl) {
            console.log(`[OAuth] Provider ${provider} does not support token revocation`);
            return;
        }

        console.log(`[OAuth] Revoking token for ${provider}`);

        try {
            await axios.post(
                config.revokeUrl,
                null,
                {
                    params: { token: accessToken },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            console.log(`[OAuth] Token revoked successfully for ${provider}`);
        } catch (error: any) {
            console.error(`[OAuth] Token revocation failed for ${provider}:`, error.response?.data || error.message);
            // Don't throw - revocation failure shouldn't block deletion
        }
    }

    /**
     * Perform token exchange (handles provider-specific quirks)
     */
    private async performTokenExchange(config: OAuthProvider, code: string): Promise<any> {
        const params: any = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code',
            ...config.tokenParams
        };

        // Notion requires Basic Auth instead of client_id/client_secret in body
        const isNotion = config.name === 'notion';

        const headers: any = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        };

        if (isNotion) {
            // Notion uses Basic Auth
            const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
            delete params.client_id;
            delete params.client_secret;
        }

        const response = await axios.post(
            config.tokenUrl,
            new URLSearchParams(params).toString(),
            { headers }
        );

        return response.data;
    }

    /**
     * Generate a secure state token for CSRF protection
     */
    private generateStateToken(userId: string): string {
        const state = randomBytes(32).toString('hex');

        this.stateStore.set(state, {
            userId,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes expiry
        });

        // Cleanup expired states periodically
        this.cleanupExpiredStates();

        return state;
    }

    /**
     * Validate and consume state token
     */
    private validateStateToken(state: string): StateTokenData | null {
        const data = this.stateStore.get(state);

        if (!data) {
            console.error('[OAuth] State token not found');
            return null;
        }

        if (data.expiresAt < Date.now()) {
            console.error('[OAuth] State token expired');
            this.stateStore.delete(state);
            return null;
        }

        // Consume the state token (one-time use)
        this.stateStore.delete(state);

        return data;
    }

    /**
     * Remove expired state tokens from memory
     */
    private cleanupExpiredStates(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [state, data] of this.stateStore.entries()) {
            if (data.expiresAt < now) {
                this.stateStore.delete(state);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[OAuth] Cleaned up ${cleaned} expired state tokens`);
        }
    }
}

/**
 * Singleton instance
 */
export const oauthService = new OAuthService();
