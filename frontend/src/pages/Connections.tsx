import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { NewConnectionDialog } from "../components/connections/NewConnectionDialog";
import { ConnectionDetailsDialog } from "../components/connections/ConnectionDetailsDialog";
import { useConnectionStore } from "../stores/connectionStore";
import type { Connection, ConnectionMethod } from "../lib/api";
import { useState } from "react";

interface Provider {
    provider: string;
    displayName: string;
    description: string;
    logoUrl: string;
    category: string;
    methods: ConnectionMethod[];
    comingSoon?: boolean;
}

/**
 * All Providers - Available and Coming Soon
 * Matches the exact list from the old Integrations page
 */
const ALL_PROVIDERS: Provider[] = [
    // Communication
    {
        provider: "slack",
        displayName: "Slack",
        description: "Send messages and manage channels",
        logoUrl: "https://logo.clearbit.com/slack.com",
        category: "Communication",
        methods: ["oauth2"],
    },
    {
        provider: "discord",
        displayName: "Discord",
        description: "Send messages and manage Discord servers",
        logoUrl: "https://cdn.simpleicons.org/discord/5865F2",
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true,
    },
    {
        provider: "telegram",
        displayName: "Telegram",
        description: "Send messages via Telegram bots",
        logoUrl: "https://cdn.simpleicons.org/telegram/26A5E4",
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true,
    },
    {
        provider: "microsoft-teams",
        displayName: "Microsoft Teams",
        description: "Send messages and manage Teams channels",
        logoUrl: "https://logo.clearbit.com/microsoft.com",
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true,
    },
    {
        provider: "whatsapp",
        displayName: "WhatsApp Business",
        description: "Send WhatsApp messages via API",
        logoUrl: "https://cdn.simpleicons.org/whatsapp/25D366",
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true,
    },

    // Productivity & Collaboration
    {
        provider: "google",
        displayName: "Google Workspace",
        description: "Gmail, Sheets, Drive, and Calendar",
        logoUrl: "https://logo.clearbit.com/google.com",
        category: "Productivity",
        methods: ["api_key", "oauth2"],
    },
    {
        provider: "notion",
        displayName: "Notion",
        description: "Manage databases and pages",
        logoUrl: "https://cdn.simpleicons.org/notion/000000",
        category: "Productivity",
        methods: ["oauth2"],
    },
    {
        provider: "microsoft-365",
        displayName: "Microsoft 365",
        description: "Outlook, Excel, OneDrive, and Calendar",
        logoUrl: "https://logo.clearbit.com/microsoft.com",
        category: "Productivity",
        methods: ["oauth2"],
        comingSoon: true,
    },
    {
        provider: "airtable",
        displayName: "Airtable",
        description: "Manage records in Airtable bases",
        logoUrl: "https://logo.clearbit.com/airtable.com",
        category: "Productivity",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "coda",
        displayName: "Coda",
        description: "Interact with Coda documents and tables",
        logoUrl: "https://cdn.simpleicons.org/coda/F46A54",
        category: "Productivity",
        methods: ["api_key"],
        comingSoon: true,
    },

    // Developer Tools
    {
        provider: "github",
        displayName: "GitHub",
        description: "Manage repos, issues, and pull requests",
        logoUrl: "https://cdn.simpleicons.org/github/181717",
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "gitlab",
        displayName: "GitLab",
        description: "Manage GitLab projects and pipelines",
        logoUrl: "https://cdn.simpleicons.org/gitlab/FC6D26",
        category: "Developer Tools",
        methods: ["api_key"],
        comingSoon: true,
    },
    {
        provider: "bitbucket",
        displayName: "Bitbucket",
        description: "Manage Bitbucket repositories",
        logoUrl: "https://cdn.simpleicons.org/bitbucket/0052CC",
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "jira",
        displayName: "Jira",
        description: "Create and manage Jira issues",
        logoUrl: "https://cdn.simpleicons.org/jira/0052CC",
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "linear",
        displayName: "Linear",
        description: "Manage issues and projects",
        logoUrl: "https://cdn.simpleicons.org/linear/5E6AD2",
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },

    // Project Management
    {
        provider: "asana",
        displayName: "Asana",
        description: "Create and manage tasks",
        logoUrl: "https://cdn.simpleicons.org/asana/F06A6A",
        category: "Project Management",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "trello",
        displayName: "Trello",
        description: "Manage boards and cards",
        logoUrl: "https://cdn.simpleicons.org/trello/0052CC",
        category: "Project Management",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "monday",
        displayName: "Monday.com",
        description: "Manage boards and items",
        logoUrl: "https://logo.clearbit.com/monday.com",
        category: "Project Management",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "clickup",
        displayName: "ClickUp",
        description: "Manage tasks and projects",
        logoUrl: "https://cdn.simpleicons.org/clickup/7B68EE",
        category: "Project Management",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },

    // CRM & Sales
    {
        provider: "salesforce",
        displayName: "Salesforce",
        description: "Manage leads, contacts, and opportunities",
        logoUrl: "https://cdn.simpleicons.org/salesforce/00A1E0",
        category: "CRM & Sales",
        methods: ["oauth2"],
        comingSoon: true,
    },
    {
        provider: "hubspot",
        displayName: "HubSpot",
        description: "Manage contacts and deals",
        logoUrl: "https://cdn.simpleicons.org/hubspot/FF7A59",
        category: "CRM & Sales",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "pipedrive",
        displayName: "Pipedrive",
        description: "Manage sales pipelines",
        logoUrl: "https://logo.clearbit.com/pipedrive.com",
        category: "CRM & Sales",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },

    // E-commerce & Payments
    {
        provider: "shopify",
        displayName: "Shopify",
        description: "Manage products and orders",
        logoUrl: "https://cdn.simpleicons.org/shopify/7AB55C",
        category: "E-commerce",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "stripe",
        displayName: "Stripe",
        description: "Process payments and subscriptions",
        logoUrl: "https://cdn.simpleicons.org/stripe/008CDD",
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true,
    },
    {
        provider: "woocommerce",
        displayName: "WooCommerce",
        description: "Manage WordPress store",
        logoUrl: "https://cdn.simpleicons.org/woocommerce/96588A",
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true,
    },

    // Marketing & Email
    {
        provider: "mailchimp",
        displayName: "Mailchimp",
        description: "Manage email campaigns and lists",
        logoUrl: "https://cdn.simpleicons.org/mailchimp/FFE01B",
        category: "Marketing",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "sendgrid",
        displayName: "SendGrid",
        description: "Send transactional emails",
        logoUrl: "https://cdn.simpleicons.org/sendgrid/1A82E2",
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true,
    },
    {
        provider: "twilio",
        displayName: "Twilio",
        description: "Send SMS and make calls",
        logoUrl: "https://cdn.simpleicons.org/twilio/F22F46",
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true,
    },

    // File Storage
    {
        provider: "dropbox",
        displayName: "Dropbox",
        description: "Manage files and folders",
        logoUrl: "https://cdn.simpleicons.org/dropbox/0061FF",
        category: "File Storage",
        methods: ["oauth2"],
        comingSoon: true,
    },
    {
        provider: "box",
        displayName: "Box",
        description: "Manage enterprise files",
        logoUrl: "https://cdn.simpleicons.org/box/0061D5",
        category: "File Storage",
        methods: ["oauth2"],
        comingSoon: true,
    },
    {
        provider: "onedrive",
        displayName: "OneDrive",
        description: "Microsoft cloud storage",
        logoUrl: "https://logo.clearbit.com/onedrive.live.com",
        category: "File Storage",
        methods: ["oauth2"],
        comingSoon: true,
    },

    // Social Media
    {
        provider: "twitter",
        displayName: "Twitter/X",
        description: "Post tweets and manage account",
        logoUrl: "https://cdn.simpleicons.org/x/000000",
        category: "Social Media",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
    },
    {
        provider: "linkedin",
        displayName: "LinkedIn",
        description: "Post content and manage connections",
        logoUrl: "https://logo.clearbit.com/linkedin.com",
        category: "Social Media",
        methods: ["oauth2"],
        comingSoon: true,
    },
    {
        provider: "facebook",
        displayName: "Facebook",
        description: "Post and manage pages",
        logoUrl: "https://cdn.simpleicons.org/facebook/0866FF",
        category: "Social Media",
        methods: ["oauth2"],
        comingSoon: true,
    },
    {
        provider: "instagram",
        displayName: "Instagram",
        description: "Post content and manage account",
        logoUrl: "https://cdn.simpleicons.org/instagram/E4405F",
        category: "Social Media",
        methods: ["oauth2"],
        comingSoon: true,
    },

    // AI & ML
    {
        provider: "openai",
        displayName: "OpenAI",
        description: "GPT models and AI capabilities",
        logoUrl: "https://cdn.simpleicons.org/openai/412991",
        category: "AI & ML",
        methods: ["api_key"],
    },
    {
        provider: "anthropic",
        displayName: "Anthropic",
        description: "Claude AI assistant",
        logoUrl: "https://cdn.simpleicons.org/anthropic/000000",
        category: "AI & ML",
        methods: ["api_key"],
    },
    {
        provider: "huggingface",
        displayName: "Hugging Face",
        description: "Access AI models",
        logoUrl: "https://cdn.simpleicons.org/huggingface/FFD21E",
        category: "AI & ML",
        methods: ["api_key"],
        comingSoon: true,
    },
];

/**
 * Provider Card Component
 */
interface ProviderCardProps {
    provider: Provider;
    connections: Connection[];
    onConnect: () => void;
    onViewDetails?: (connection: Connection) => void;
}

function ProviderCard({
    provider,
    connections,
    onConnect,
    onViewDetails,
}: ProviderCardProps) {
    const activeConnections = connections.filter((c) => c.status === "active");
    const isConnected = activeConnections.length > 0;
    const connection = activeConnections[0]; // Get the first (and only) connection

    const handleCardClick = () => {
        if (isConnected && connection && onViewDetails) {
            onViewDetails(connection);
        }
    };

    return (
        <div
            onClick={isConnected ? handleCardClick : undefined}
            className={`
                group relative flex items-start gap-4 p-5 bg-card border border-border rounded-xl
                transition-all duration-200
                ${!provider.comingSoon && !isConnected ? "hover:border-primary/50 hover:shadow-sm" : ""}
                ${isConnected ? "hover:border-primary/50 hover:shadow-sm cursor-pointer" : ""}
                ${provider.comingSoon ? "opacity-60" : ""}
            `}
        >
            {/* Logo */}
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                <img
                    src={provider.logoUrl}
                    alt={`${provider.displayName} logo`}
                    className="w-10 h-10 object-contain"
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-foreground mb-1 truncate">
                    {provider.displayName}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {provider.description}
                </p>
                {isConnected && connection && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {connection.name}
                    </p>
                )}
            </div>

            {/* Status Badge / Action */}
            <div className="flex-shrink-0">
                {provider.comingSoon ? (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                        Soon
                    </span>
                ) : isConnected ? (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md">
                        Connected
                    </span>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onConnect();
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Connect
                    </button>
                )}
            </div>
        </div>
    );
}

export function Connections() {
    const { connections, loading, error, fetchConnections, deleteConnectionById } =
        useConnectionStore();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

    useEffect(() => {
        fetchConnections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Get connections for a specific provider
    const getConnectionsForProvider = (provider: string) => {
        return connections.filter((c) => c.provider === provider);
    };

    // Group providers by category with custom order (AI & ML first)
    const categoryOrder = [
        "AI & ML",
        "Communication",
        "Productivity",
        "Developer Tools",
        "Project Management",
        "CRM & Sales",
        "E-commerce",
        "Marketing",
        "File Storage",
        "Social Media",
    ];

    const categories = Array.from(new Set(ALL_PROVIDERS.map((p) => p.category)));

    // Sort categories by custom order
    const sortedCategories = categories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);

        // If category not in order list, push to end
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
    });

    const providersByCategory = sortedCategories.map((category) => ({
        name: category,
        providers: ALL_PROVIDERS.filter((p) => p.category === category),
    }));

    const handleConnect = (provider: Provider) => {
        // Check if provider is already connected
        const existingConnections = getConnectionsForProvider(provider.provider);
        const hasActiveConnection = existingConnections.some((c) => c.status === "active");

        // Only allow connection if not already connected
        if (!hasActiveConnection) {
            setSelectedProvider(provider);
            setIsAddDialogOpen(true);
        }
    };

    const handleViewDetails = (connection: Connection) => {
        setSelectedConnection(connection);
        setIsDetailsDialogOpen(true);
    };

    const handleDisconnect = async (connectionId: string) => {
        await deleteConnectionById(connectionId);
        await fetchConnections(); // Refresh the list
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Connections"
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
                    {/* Providers grouped by category */}
                    {providersByCategory.map((category) => (
                        <section key={category.name}>
                            <h2 className="text-base font-semibold mb-4 text-foreground">
                                {category.name}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {category.providers.map((provider) => (
                                    <ProviderCard
                                        key={provider.provider}
                                        provider={provider}
                                        connections={getConnectionsForProvider(provider.provider)}
                                        onConnect={() => handleConnect(provider)}
                                        onViewDetails={handleViewDetails}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {/* New Connection Dialog */}
            {selectedProvider && (
                <NewConnectionDialog
                    isOpen={isAddDialogOpen}
                    onClose={() => {
                        setIsAddDialogOpen(false);
                        setSelectedProvider(null);
                    }}
                    provider={selectedProvider.provider}
                    providerDisplayName={selectedProvider.displayName}
                    providerIcon={
                        <img
                            src={selectedProvider.logoUrl}
                            alt={selectedProvider.displayName}
                            className="w-10 h-10 object-contain"
                        />
                    }
                    onSuccess={() => {
                        fetchConnections();
                        setIsAddDialogOpen(false);
                        setSelectedProvider(null);
                    }}
                    supportsOAuth={selectedProvider.methods.includes("oauth2")}
                    supportsApiKey={selectedProvider.methods.includes("api_key")}
                />
            )}

            {/* Connection Details Dialog */}
            {selectedConnection && (
                <ConnectionDetailsDialog
                    isOpen={isDetailsDialogOpen}
                    onClose={() => {
                        setIsDetailsDialogOpen(false);
                        setSelectedConnection(null);
                    }}
                    connection={selectedConnection}
                    providerDisplayName={
                        ALL_PROVIDERS.find((p) => p.provider === selectedConnection.provider)
                            ?.displayName || selectedConnection.provider
                    }
                    providerIcon={
                        <img
                            src={
                                ALL_PROVIDERS.find(
                                    (p) => p.provider === selectedConnection.provider
                                )?.logoUrl || ""
                            }
                            alt={selectedConnection.provider}
                            className="w-12 h-12 object-contain"
                        />
                    }
                    onDisconnect={handleDisconnect}
                />
            )}
        </div>
    );
}
