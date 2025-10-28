import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { IntegrationCard } from "../components/integrations/IntegrationCard";
import { useCredentialStore } from "../stores/credentialStore";
import { useOAuth } from "../hooks/useOAuth";

interface Integration {
    provider: string;
    displayName: string;
    description: string;
    logoUrl: string;
    category: string;
    comingSoon?: boolean;
}

/**
 * All Integrations - Available and Coming Soon
 */
const ALL_INTEGRATIONS: Integration[] = [
    // Communication
    {
        provider: "slack",
        displayName: "Slack",
        description: "Send messages and manage channels",
        logoUrl: "https://logo.clearbit.com/slack.com",
        category: "Communication",
    },
    {
        provider: "discord",
        displayName: "Discord",
        description: "Send messages and manage Discord servers",
        logoUrl: "https://cdn.simpleicons.org/discord/5865F2",
        category: "Communication",
        comingSoon: true,
    },
    {
        provider: "telegram",
        displayName: "Telegram",
        description: "Send messages via Telegram bots",
        logoUrl: "https://cdn.simpleicons.org/telegram/26A5E4",
        category: "Communication",
        comingSoon: true,
    },
    {
        provider: "microsoft-teams",
        displayName: "Microsoft Teams",
        description: "Send messages and manage Teams channels",
        logoUrl: "https://logo.clearbit.com/microsoft.com",
        category: "Communication",
        comingSoon: true,
    },
    {
        provider: "whatsapp",
        displayName: "WhatsApp Business",
        description: "Send WhatsApp messages via API",
        logoUrl: "https://cdn.simpleicons.org/whatsapp/25D366",
        category: "Communication",
        comingSoon: true,
    },

    // Productivity & Collaboration
    {
        provider: "google",
        displayName: "Google Workspace",
        description: "Gmail, Sheets, Drive, and Calendar",
        logoUrl: "https://logo.clearbit.com/google.com",
        category: "Productivity",
    },
    {
        provider: "notion",
        displayName: "Notion",
        description: "Manage databases and pages",
        logoUrl: "https://cdn.simpleicons.org/notion/000000",
        category: "Productivity",
    },
    {
        provider: "microsoft-365",
        displayName: "Microsoft 365",
        description: "Outlook, Excel, OneDrive, and Calendar",
        logoUrl: "https://logo.clearbit.com/microsoft.com",
        category: "Productivity",
        comingSoon: true,
    },
    {
        provider: "airtable",
        displayName: "Airtable",
        description: "Manage records in Airtable bases",
        logoUrl: "https://logo.clearbit.com/airtable.com",
        category: "Productivity",
        comingSoon: true,
    },
    {
        provider: "coda",
        displayName: "Coda",
        description: "Interact with Coda documents and tables",
        logoUrl: "https://cdn.simpleicons.org/coda/F46A54",
        category: "Productivity",
        comingSoon: true,
    },

    // Developer Tools
    {
        provider: "github",
        displayName: "GitHub",
        description: "Manage repos, issues, and pull requests",
        logoUrl: "https://cdn.simpleicons.org/github/181717",
        category: "Developer Tools",
        comingSoon: true,
    },
    {
        provider: "gitlab",
        displayName: "GitLab",
        description: "Manage GitLab projects and pipelines",
        logoUrl: "https://cdn.simpleicons.org/gitlab/FC6D26",
        category: "Developer Tools",
        comingSoon: true,
    },
    {
        provider: "bitbucket",
        displayName: "Bitbucket",
        description: "Manage Bitbucket repositories",
        logoUrl: "https://cdn.simpleicons.org/bitbucket/0052CC",
        category: "Developer Tools",
        comingSoon: true,
    },
    {
        provider: "jira",
        displayName: "Jira",
        description: "Create and manage Jira issues",
        logoUrl: "https://cdn.simpleicons.org/jira/0052CC",
        category: "Developer Tools",
        comingSoon: true,
    },
    {
        provider: "linear",
        displayName: "Linear",
        description: "Manage issues and projects",
        logoUrl: "https://cdn.simpleicons.org/linear/5E6AD2",
        category: "Developer Tools",
        comingSoon: true,
    },

    // Project Management
    {
        provider: "asana",
        displayName: "Asana",
        description: "Create and manage tasks",
        logoUrl: "https://cdn.simpleicons.org/asana/F06A6A",
        category: "Project Management",
        comingSoon: true,
    },
    {
        provider: "trello",
        displayName: "Trello",
        description: "Manage boards and cards",
        logoUrl: "https://cdn.simpleicons.org/trello/0052CC",
        category: "Project Management",
        comingSoon: true,
    },
    {
        provider: "monday",
        displayName: "Monday.com",
        description: "Manage boards and items",
        logoUrl: "https://logo.clearbit.com/monday.com",
        category: "Project Management",
        comingSoon: true,
    },
    {
        provider: "clickup",
        displayName: "ClickUp",
        description: "Manage tasks and projects",
        logoUrl: "https://cdn.simpleicons.org/clickup/7B68EE",
        category: "Project Management",
        comingSoon: true,
    },

    // CRM & Sales
    {
        provider: "salesforce",
        displayName: "Salesforce",
        description: "Manage leads, contacts, and opportunities",
        logoUrl: "https://cdn.simpleicons.org/salesforce/00A1E0",
        category: "CRM & Sales",
        comingSoon: true,
    },
    {
        provider: "hubspot",
        displayName: "HubSpot",
        description: "Manage contacts and deals",
        logoUrl: "https://cdn.simpleicons.org/hubspot/FF7A59",
        category: "CRM & Sales",
        comingSoon: true,
    },
    {
        provider: "pipedrive",
        displayName: "Pipedrive",
        description: "Manage sales pipelines",
        logoUrl: "https://logo.clearbit.com/pipedrive.com",
        category: "CRM & Sales",
        comingSoon: true,
    },

    // E-commerce & Payments
    {
        provider: "shopify",
        displayName: "Shopify",
        description: "Manage products and orders",
        logoUrl: "https://cdn.simpleicons.org/shopify/7AB55C",
        category: "E-commerce",
        comingSoon: true,
    },
    {
        provider: "stripe",
        displayName: "Stripe",
        description: "Process payments and subscriptions",
        logoUrl: "https://cdn.simpleicons.org/stripe/008CDD",
        category: "E-commerce",
        comingSoon: true,
    },
    {
        provider: "woocommerce",
        displayName: "WooCommerce",
        description: "Manage WordPress store",
        logoUrl: "https://cdn.simpleicons.org/woocommerce/96588A",
        category: "E-commerce",
        comingSoon: true,
    },

    // Marketing & Email
    {
        provider: "mailchimp",
        displayName: "Mailchimp",
        description: "Manage email campaigns and lists",
        logoUrl: "https://cdn.simpleicons.org/mailchimp/FFE01B",
        category: "Marketing",
        comingSoon: true,
    },
    {
        provider: "sendgrid",
        displayName: "SendGrid",
        description: "Send transactional emails",
        logoUrl: "https://cdn.simpleicons.org/sendgrid/1A82E2",
        category: "Marketing",
        comingSoon: true,
    },
    {
        provider: "twilio",
        displayName: "Twilio",
        description: "Send SMS and make calls",
        logoUrl: "https://cdn.simpleicons.org/twilio/F22F46",
        category: "Marketing",
        comingSoon: true,
    },

    // File Storage
    {
        provider: "dropbox",
        displayName: "Dropbox",
        description: "Manage files and folders",
        logoUrl: "https://cdn.simpleicons.org/dropbox/0061FF",
        category: "File Storage",
        comingSoon: true,
    },
    {
        provider: "box",
        displayName: "Box",
        description: "Manage enterprise files",
        logoUrl: "https://cdn.simpleicons.org/box/0061D5",
        category: "File Storage",
        comingSoon: true,
    },
    {
        provider: "onedrive",
        displayName: "OneDrive",
        description: "Microsoft cloud storage",
        logoUrl: "https://logo.clearbit.com/onedrive.live.com",
        category: "File Storage",
        comingSoon: true,
    },

    // Social Media
    {
        provider: "twitter",
        displayName: "Twitter/X",
        description: "Post tweets and manage account",
        logoUrl: "https://cdn.simpleicons.org/x/000000",
        category: "Social Media",
        comingSoon: true,
    },
    {
        provider: "linkedin",
        displayName: "LinkedIn",
        description: "Post content and manage connections",
        logoUrl: "https://logo.clearbit.com/linkedin.com",
        category: "Social Media",
        comingSoon: true,
    },
    {
        provider: "facebook",
        displayName: "Facebook",
        description: "Post and manage pages",
        logoUrl: "https://cdn.simpleicons.org/facebook/0866FF",
        category: "Social Media",
        comingSoon: true,
    },
    {
        provider: "instagram",
        displayName: "Instagram",
        description: "Post content and manage account",
        logoUrl: "https://cdn.simpleicons.org/instagram/E4405F",
        category: "Social Media",
        comingSoon: true,
    },

    // AI & ML
    {
        provider: "openai",
        displayName: "OpenAI",
        description: "GPT models and AI capabilities",
        logoUrl: "https://cdn.simpleicons.org/openai/412991",
        category: "AI & ML",
        comingSoon: true,
    },
    {
        provider: "anthropic",
        displayName: "Anthropic",
        description: "Claude AI assistant",
        logoUrl: "https://cdn.simpleicons.org/anthropic/000000",
        category: "AI & ML",
        comingSoon: true,
    },
    {
        provider: "huggingface",
        displayName: "Hugging Face",
        description: "Access AI models",
        logoUrl: "https://cdn.simpleicons.org/huggingface/FFD21E",
        category: "AI & ML",
        comingSoon: true,
    },
];

export function Integrations() {
    const { credentials, loading, error, fetchCredentials } = useCredentialStore();
    const { fetchProviders } = useOAuth();

    useEffect(() => {
        fetchCredentials();
        fetchProviders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Group credentials by provider (only OAuth ones)
    const oauthCredentials = credentials.filter((cred) => cred.type === "oauth2");

    // Get credential for each integration
    const getCredentialForProvider = (provider: string) => {
        return oauthCredentials.find((cred) => cred.provider === provider);
    };

    // Group all integrations by category
    const categories = Array.from(new Set(ALL_INTEGRATIONS.map((i) => i.category)));
    const integrationsByCategory = categories.map((category) => ({
        name: category,
        integrations: ALL_INTEGRATIONS.filter((i) => i.category === category),
    }));

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Integrations"
                description="Connect to external services to enhance your workflows"
            />

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Integrations grouped by category */}
                    {integrationsByCategory.map((category) => (
                        <section key={category.name}>
                            <h2 className="text-base font-semibold mb-4 text-foreground">
                                {category.name}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {category.integrations.map((integration) => (
                                    <IntegrationCard
                                        key={integration.provider}
                                        provider={integration.provider}
                                        displayName={integration.displayName}
                                        description={integration.description}
                                        logoUrl={integration.logoUrl}
                                        comingSoon={integration.comingSoon}
                                        credential={getCredentialForProvider(integration.provider)}
                                        onConnect={fetchCredentials}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
