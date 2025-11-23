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
                // Notion OAuth returns workspace info in the token response
                // We need to get the bot user info which has workspace details
                const response = await fetch("https://api.notion.com/v1/users/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Notion-Version": "2022-06-28"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    object?: string;
                    id?: string;
                    type?: string;
                    name?: string;
                    avatar_url?: string | null;
                    bot?: {
                        owner?: {
                            type?: string;
                            workspace?: boolean | { id?: string; name?: string };
                            user?: {
                                object?: string;
                                id?: string;
                                name?: string;
                                avatar_url?: string;
                                type?: string;
                                person?: { email?: string };
                            };
                        };
                        workspace_name?: string;
                    };
                    workspace_name?: string;
                };

                console.log("[OAuth] Notion user info response:", JSON.stringify(data, null, 2));

                // Extract workspace name and user info
                let workspaceName = "Notion Workspace";
                let userName = "Notion User";
                let userEmail = "unknown@notion";

                if (data.bot?.workspace_name) {
                    workspaceName = data.bot.workspace_name;
                } else if (data.workspace_name) {
                    workspaceName = data.workspace_name;
                }

                if (data.bot?.owner?.user) {
                    userName = data.bot.owner.user.name || userName;
                    userEmail = data.bot.owner.user.person?.email || userEmail;
                } else if (data.name) {
                    userName = data.name;
                }

                return {
                    workspace: workspaceName,
                    user: userName,
                    email: userEmail,
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
    },

    github: {
        name: "github",
        displayName: "GitHub",
        authUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        scopes: [
            "repo", // Full repository access
            "read:org", // Read organization membership
            "workflow", // Manage GitHub Actions workflows
            "write:discussion" // Write discussions
        ],
        clientId: process.env.GITHUB_CLIENT_ID || "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        redirectUri: `${process.env.API_URL || "http://localhost:3000"}/api/oauth/github/callback`,
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.github.com/user", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/vnd.github+json",
                        "X-GitHub-Api-Version": "2022-11-28"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    login?: string;
                    id?: number;
                    email?: string;
                    name?: string;
                    avatar_url?: string;
                    company?: string;
                    location?: string;
                };

                return {
                    username: data.login || "unknown",
                    userId: data.id?.toString() || "unknown",
                    email: data.email || `${data.login}@github`,
                    name: data.name || data.login,
                    avatar: data.avatar_url,
                    company: data.company,
                    location: data.location
                };
            } catch (error) {
                console.error("[OAuth] Failed to get GitHub user info:", error);
                return {
                    username: "GitHub User",
                    userId: "unknown",
                    email: "unknown@github"
                };
            }
        },
        refreshable: false // GitHub OAuth tokens don't expire unless revoked
    },

    hubspot: {
        name: "hubspot",
        displayName: "HubSpot",
        authUrl: "https://app.hubspot.com/oauth/authorize",
        tokenUrl: "https://api.hubapi.com/oauth/v1/token",
        scopes: [
            // CRM Objects
            "crm.objects.contacts.read",
            "crm.objects.contacts.write",
            "crm.objects.companies.read",
            "crm.objects.companies.write",
            "crm.objects.deals.read",
            "crm.objects.deals.write",
            "crm.objects.tickets.read",
            "crm.objects.tickets.write",
            "crm.objects.quotes.read",
            "crm.objects.quotes.write",
            "crm.objects.line_items.read",
            "crm.objects.line_items.write",
            // Engagements
            "crm.objects.meetings.read",
            "crm.objects.meetings.write",
            "crm.objects.tasks.read",
            "crm.objects.tasks.write",
            "crm.objects.notes.read",
            "crm.objects.notes.write",
            "crm.objects.calls.read",
            "crm.objects.calls.write",
            "crm.objects.emails.read",
            "crm.objects.emails.write",
            // Schema & Lists
            "crm.schemas.contacts.read",
            "crm.schemas.companies.read",
            "crm.schemas.deals.read",
            "crm.lists.read",
            "crm.lists.write",
            // Marketing
            "content",
            "forms",
            "automation",
            // Files & Communication
            "files",
            "conversations.read",
            "conversations.write"
        ],
        clientId: process.env.HUBSPOT_CLIENT_ID || "",
        clientSecret: process.env.HUBSPOT_CLIENT_SECRET || "",
        redirectUri: `${process.env.API_URL || "http://localhost:3000"}/api/oauth/hubspot/callback`,
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch(
                    "https://api.hubapi.com/account-info/v3/api-usage/daily",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    portalId?: number;
                    timeZone?: string;
                };

                return {
                    portalId: data.portalId || "unknown",
                    timeZone: data.timeZone || "UTC"
                };
            } catch (error) {
                console.error("[OAuth] Failed to get HubSpot account info:", error);
                return {
                    portalId: "unknown",
                    timeZone: "UTC"
                };
            }
        },
        refreshable: true
    },

    linear: {
        name: "linear",
        displayName: "Linear",
        authUrl: "https://linear.app/oauth/authorize",
        tokenUrl: "https://api.linear.app/oauth/token",
        scopes: ["read", "write"],
        clientId: process.env.LINEAR_CLIENT_ID || "",
        clientSecret: process.env.LINEAR_CLIENT_SECRET || "",
        redirectUri: `${process.env.API_URL || "http://localhost:3000"}/api/oauth/linear/callback`,
        tokenParams: {
            grant_type: "authorization_code"
        },
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.linear.app/graphql", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        query: "query { viewer { id name email } }"
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = (await response.json()) as {
                    data?: {
                        viewer?: {
                            id?: string;
                            name?: string;
                            email?: string;
                        };
                    };
                    errors?: Array<{ message: string }>;
                };

                if (result.errors && result.errors.length > 0) {
                    throw new Error(result.errors[0].message);
                }

                const viewer = result.data?.viewer;

                return {
                    userId: viewer?.id || "unknown",
                    name: viewer?.name || "Linear User",
                    email: viewer?.email || "unknown@linear.app"
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Linear user info:", error);
                return {
                    userId: "unknown",
                    name: "Linear User",
                    email: "unknown@linear.app"
                };
            }
        },
        refreshable: true
    },

    figma: {
        name: "figma",
        displayName: "Figma",
        authUrl: "https://www.figma.com/oauth",
        tokenUrl: "https://api.figma.com/v1/oauth/token",
        scopes: [
            "file_content:read",
            "file_metadata:read",
            "file_comments:read",
            "file_comments:write",
            "webhooks:write"
        ],
        clientId: process.env.FIGMA_CLIENT_ID || "",
        clientSecret: process.env.FIGMA_CLIENT_SECRET || "",
        redirectUri: `${process.env.API_URL || "http://localhost:3000"}/api/oauth/figma/callback`,
        pkceEnabled: true,
        getUserInfo: async (accessToken: string) => {
            try {
                const response = await fetch("https://api.figma.com/v1/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = (await response.json()) as {
                    id?: string;
                    handle?: string;
                    email?: string;
                    img_url?: string;
                };

                return {
                    userId: data.id || "unknown",
                    name: data.handle || "Figma User",
                    email: data.email || "unknown@figma.com",
                    avatar: data.img_url
                };
            } catch (error) {
                console.error("[OAuth] Failed to get Figma user info:", error);
                return {
                    userId: "unknown",
                    name: "Figma User",
                    email: "unknown@figma.com"
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
