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
    getUserInfo?: (accessToken: string) => Promise<unknown>;
    revokeUrl?: string;
    refreshable?: boolean;
    pkceEnabled?: boolean; // Enable PKCE (Proof Key for Code Exchange)
}

/**
 * Central Registry of OAuth Providers
 *
 * Adding a new OAuth integration is as simple as adding a new entry here!
 * The generic OAuth system handles all the rest.
 */
export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
    slack: {
        name: "slack",
        displayName: "Slack",
        authUrl: "https://slack.com/oauth/v2/authorize",
        tokenUrl: "https://slack.com/api/oauth.v2.access",
        scopes: [
            "chat:write",
            "channels:read",
            "channels:history",
            "files:write",
            "users:read",
            "users:read.email"
        ],
        clientId: process.env.SLACK_CLIENT_ID || "",
        clientSecret: process.env.SLACK_CLIENT_SECRET || "",
        redirectUri: `${process.env.API_URL || "http://localhost:3000"}/api/oauth/slack/callback`,
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://slack.com/api/auth.test", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                });

                const data = (await response.json()) as {
                    ok?: boolean;
                    error?: string;
                    team?: string;
                    team_id?: string;
                    user?: string;
                    user_id?: string;
                    email?: string;
                };

                if (!data.ok) {
                    throw new Error(data.error || "Failed to get Slack user info");
                }

                return {
                    workspace: data.team,
                    workspaceId: data.team_id,
                    user: data.user,
                    userId: data.user_id,
                    email: data.email || `${data.user}@slack`
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Slack user info:", error);
                return {
                    user: "Slack User",
                    email: "unknown@slack"
                };
            }
        },
        revokeUrl: "https://slack.com/api/auth.revoke",
        refreshable: true
    },

    google: {
        name: "google",
        displayName: "Google Workspace",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/calendar.events"
        ],
        authParams: {
            access_type: "offline", // Required to get refresh token
            prompt: "consent" // Force consent screen to ensure refresh token
        },
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirectUri: `${process.env.API_URL || "http://localhost:3000"}/api/oauth/google/callback`,
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const data = (await response.json()) as {
                    email?: string;
                    name?: string;
                    picture?: string;
                    id?: string;
                };

                return {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Google user info:", error);
                return {
                    email: "unknown@google",
                    name: "Google User"
                };
            }
        },
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        refreshable: true
    },

    notion: {
        name: "notion",
        displayName: "Notion",
        authUrl: "https://api.notion.com/v1/oauth/authorize",
        tokenUrl: "https://api.notion.com/v1/oauth/token",
        scopes: [], // Notion doesn't use traditional scopes
        authParams: {
            owner: "user"
        },
        clientId: process.env.NOTION_CLIENT_ID || "",
        clientSecret: process.env.NOTION_CLIENT_SECRET || "",
        redirectUri: `${process.env.API_URL || "http://localhost:3000"}/api/oauth/notion/callback`,
        tokenParams: {
            // Notion requires Basic Auth for token exchange
            grant_type: "authorization_code"
        },
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.notion.com/v1/users/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Notion-Version": "2022-06-28"
                    }
                });

                const data = (await response.json()) as {
                    workspace_name?: string;
                    name?: string;
                    person?: { email?: string };
                    id?: string;
                };

                return {
                    workspace: data.workspace_name || "Notion Workspace",
                    user: data.name || "Notion User",
                    email: data.person?.email || "unknown@notion",
                    userId: data.id
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Notion user info:", error);
                return {
                    workspace: "Notion Workspace",
                    user: "Notion User",
                    email: "unknown@notion"
                };
            }
        },
        refreshable: true
    },

    airtable: {
        name: "airtable",
        displayName: "Airtable",
        authUrl: "https://airtable.com/oauth2/v1/authorize",
        tokenUrl: "https://airtable.com/oauth2/v1/token",
        scopes: [
            "data.records:read",
            "data.records:write",
            "schema.bases:read",
            "schema.bases:write",
            "data.recordComments:read",
            "data.recordComments:write",
            "webhook:manage"
        ],
        clientId: process.env.AIRTABLE_CLIENT_ID || "",
        clientSecret: process.env.AIRTABLE_CLIENT_SECRET || "",
        redirectUri: `${process.env.API_URL || "http://localhost:3000"}/api/oauth/airtable/callback`,
        pkceEnabled: true, // Airtable requires PKCE for enhanced security
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.airtable.com/v0/meta/whoami", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    scopes?: string[];
                };

                return {
                    userId: data.id || "unknown",
                    scopes: data.scopes || []
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Airtable user info:", error);
                return {
                    userId: "unknown",
                    scopes: []
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
    return Object.values(OAUTH_PROVIDERS).map((provider) => ({
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
