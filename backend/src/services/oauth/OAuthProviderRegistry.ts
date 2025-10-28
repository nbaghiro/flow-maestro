import axios from 'axios';

/**
 * OAuth Provider Configuration
 * Defines the structure for OAuth 2.0 provider configuration
 */
export interface OAuthProvider {
    name: string;
    displayName: string;
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    clientId: string;
    clientSecret: string;
    redirectUri: string;

    // Optional customizations
    authParams?: Record<string, string>;
    tokenParams?: Record<string, string>;
    getUserInfo?: (accessToken: string) => Promise<any>;
    revokeUrl?: string;
    refreshable?: boolean;
}

/**
 * Central Registry of OAuth Providers
 *
 * Adding a new OAuth integration is as simple as adding a new entry here!
 * The generic OAuth system handles all the rest.
 */
export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
    slack: {
        name: 'slack',
        displayName: 'Slack',
        authUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: [
            'chat:write',
            'channels:read',
            'channels:history',
            'files:write',
            'users:read',
            'users:read.email'
        ],
        clientId: process.env.SLACK_CLIENT_ID || '',
        clientSecret: process.env.SLACK_CLIENT_SECRET || '',
        redirectUri: `${process.env.API_URL || 'http://localhost:3000'}/api/oauth/slack/callback`,
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await axios.post(
                    'https://slack.com/api/auth.test',
                    null,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );

                if (!response.data.ok) {
                    throw new Error(response.data.error || 'Failed to get Slack user info');
                }

                return {
                    workspace: response.data.team,
                    workspaceId: response.data.team_id,
                    user: response.data.user,
                    userId: response.data.user_id,
                    email: response.data.email || `${response.data.user}@slack`
                };
            } catch (error) {
                console.error('[OAuth] Failed to get Slack user info:', error);
                return {
                    user: 'Slack User',
                    email: 'unknown@slack'
                };
            }
        },
        revokeUrl: 'https://slack.com/api/auth.revoke',
        refreshable: true
    },

    google: {
        name: 'google',
        displayName: 'Google Workspace',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/calendar.events'
        ],
        authParams: {
            access_type: 'offline',  // Required to get refresh token
            prompt: 'consent'        // Force consent screen to ensure refresh token
        },
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: `${process.env.API_URL || 'http://localhost:3000'}/api/oauth/google/callback`,
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await axios.get(
                    'https://www.googleapis.com/oauth2/v2/userinfo',
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );

                return {
                    email: response.data.email,
                    name: response.data.name,
                    picture: response.data.picture,
                    userId: response.data.id
                };
            } catch (error) {
                console.error('[OAuth] Failed to get Google user info:', error);
                return {
                    email: 'unknown@google',
                    name: 'Google User'
                };
            }
        },
        revokeUrl: 'https://oauth2.googleapis.com/revoke',
        refreshable: true
    },

    notion: {
        name: 'notion',
        displayName: 'Notion',
        authUrl: 'https://api.notion.com/v1/oauth/authorize',
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        scopes: [], // Notion doesn't use traditional scopes
        authParams: {
            owner: 'user'
        },
        clientId: process.env.NOTION_CLIENT_ID || '',
        clientSecret: process.env.NOTION_CLIENT_SECRET || '',
        redirectUri: `${process.env.API_URL || 'http://localhost:3000'}/api/oauth/notion/callback`,
        tokenParams: {
            // Notion requires Basic Auth for token exchange
            grant_type: 'authorization_code'
        },
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await axios.get(
                    'https://api.notion.com/v1/users/me',
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Notion-Version': '2022-06-28'
                        }
                    }
                );

                return {
                    workspace: response.data.workspace_name || 'Notion Workspace',
                    user: response.data.name || 'Notion User',
                    email: response.data.person?.email || 'unknown@notion',
                    userId: response.data.id
                };
            } catch (error) {
                console.error('[OAuth] Failed to get Notion user info:', error);
                return {
                    workspace: 'Notion Workspace',
                    user: 'Notion User',
                    email: 'unknown@notion'
                };
            }
        },
        refreshable: true
    }
};

/**
 * Get OAuth provider configuration by name
 * @throws Error if provider not found
 */
export function getOAuthProvider(provider: string): OAuthProvider {
    const config = OAUTH_PROVIDERS[provider];

    if (!config) {
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    // Validate configuration
    if (!config.clientId || !config.clientSecret) {
        throw new Error(
            `OAuth provider ${provider} is not configured. ` +
            `Please set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET environment variables.`
        );
    }

    return config;
}

/**
 * List all available OAuth providers
 */
export function listOAuthProviders() {
    return Object.values(OAUTH_PROVIDERS).map(provider => ({
        name: provider.name,
        displayName: provider.displayName,
        scopes: provider.scopes,
        configured: !!(provider.clientId && provider.clientSecret)
    }));
}

/**
 * Check if a provider is configured (has client ID and secret)
 */
export function isProviderConfigured(provider: string): boolean {
    const config = OAUTH_PROVIDERS[provider];
    if (!config) return false;
    return !!(config.clientId && config.clientSecret);
}
