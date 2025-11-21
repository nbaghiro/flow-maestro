/**
 * Centralized Provider Definitions
 * Shared between frontend and backend
 */

import type { ConnectionMethod } from "./connections";

export interface MCPProvider {
    provider: string;
    displayName: string;
    description: string;
    logoUrl: string;
    category: string;
    methods: ConnectionMethod[];
    comingSoon?: boolean;
    mcpServerUrl?: string; // HTTP URL for MCP server
    mcpAuthType?: "api_key" | "oauth2" | "none";
}

/**
 * All Providers - Available and Coming Soon
 * Centralized list of all integrations with MCP server URLs from Pipedream
 */
export const ALL_PROVIDERS: MCPProvider[] = [
    // AI & ML
    {
        provider: "openai",
        displayName: "OpenAI",
        description: "GPT models and AI capabilities",
        logoUrl: "https://logo.clearbit.com/openai.com",
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "anthropic",
        displayName: "Anthropic",
        description: "Claude AI assistant",
        logoUrl: "https://logo.clearbit.com/anthropic.com",
        category: "AI & ML",
        methods: ["api_key"]
    },
    {
        provider: "huggingface",
        displayName: "Hugging Face",
        description: "Access AI models",
        logoUrl: "https://logo.clearbit.com/huggingface.co",
        category: "AI & ML",
        methods: ["api_key"],
        comingSoon: true
    },

    // Communication
    {
        provider: "slack",
        displayName: "Slack",
        description: "Send messages and manage channels",
        logoUrl: "https://logo.clearbit.com/slack.com",
        category: "Communication",
        methods: ["oauth2"],
        mcpServerUrl: "https://mcp.pipedream.com/app/slack",
        mcpAuthType: "oauth2"
    },
    {
        provider: "discord",
        displayName: "Discord",
        description: "Send messages and manage Discord servers",
        logoUrl: "https://cdn.simpleicons.org/discord/5865F2",
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/discord",
        mcpAuthType: "api_key"
    },
    {
        provider: "telegram",
        displayName: "Telegram",
        description: "Send messages via Telegram bots",
        logoUrl: "https://cdn.simpleicons.org/telegram/26A5E4",
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/telegram",
        mcpAuthType: "api_key"
    },
    {
        provider: "microsoft-teams",
        displayName: "Microsoft Teams",
        description: "Send messages and manage Teams channels",
        logoUrl: "https://logo.clearbit.com/microsoft.com",
        category: "Communication",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "whatsapp",
        displayName: "WhatsApp Business",
        description: "Send WhatsApp messages via API",
        logoUrl: "https://cdn.simpleicons.org/whatsapp/25D366",
        category: "Communication",
        methods: ["api_key"],
        comingSoon: true
    },

    // Productivity & Collaboration
    {
        provider: "google",
        displayName: "Google Workspace",
        description: "Gmail, Sheets, Drive, and Calendar",
        logoUrl: "https://logo.clearbit.com/google.com",
        category: "Productivity",
        methods: ["api_key", "oauth2"],
        mcpServerUrl: "https://mcp.pipedream.com/app/google-drive",
        mcpAuthType: "oauth2"
    },
    {
        provider: "notion",
        displayName: "Notion",
        description: "Manage databases and pages",
        logoUrl: "https://cdn.simpleicons.org/notion/000000",
        category: "Productivity",
        methods: ["oauth2"]
    },
    {
        provider: "microsoft-365",
        displayName: "Microsoft 365",
        description: "Outlook, Excel, OneDrive, and Calendar",
        logoUrl: "https://logo.clearbit.com/microsoft.com",
        category: "Productivity",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "airtable",
        displayName: "Airtable",
        description: "Manage records, bases, and collaborate in Airtable",
        logoUrl: "https://logo.clearbit.com/airtable.com",
        category: "Productivity",
        methods: ["oauth2"],
        mcpServerUrl: "https://mcp.pipedream.com/app/airtable",
        mcpAuthType: "oauth2"
    },
    {
        provider: "coda",
        displayName: "Coda",
        description: "Interact with Coda documents and tables",
        logoUrl: "https://cdn.simpleicons.org/coda/F46A54",
        category: "Productivity",
        methods: ["api_key"]
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
        mcpServerUrl: "https://mcp.pipedream.com/app/github",
        mcpAuthType: "oauth2"
    },
    {
        provider: "gitlab",
        displayName: "GitLab",
        description: "Manage GitLab projects and issues",
        logoUrl: "https://cdn.simpleicons.org/gitlab/FC6D26",
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/gitlab",
        mcpAuthType: "oauth2"
    },
    {
        provider: "bitbucket",
        displayName: "Bitbucket",
        description: "Manage Bitbucket repositories",
        logoUrl: "https://cdn.simpleicons.org/bitbucket/0052CC",
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true
    },
    {
        provider: "jira",
        displayName: "Jira",
        description: "Manage issues and sprints",
        logoUrl: "https://cdn.simpleicons.org/jira/0052CC",
        category: "Developer Tools",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/jira",
        mcpAuthType: "oauth2"
    },

    // Project Management
    {
        provider: "asana",
        displayName: "Asana",
        description: "Manage tasks and projects",
        logoUrl: "https://logo.clearbit.com/asana.com",
        category: "Project Management",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/asana",
        mcpAuthType: "oauth2"
    },
    {
        provider: "trello",
        displayName: "Trello",
        description: "Manage boards and cards",
        logoUrl: "https://cdn.simpleicons.org/trello/0052CC",
        category: "Project Management",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/trello",
        mcpAuthType: "oauth2"
    },
    {
        provider: "monday",
        displayName: "Monday.com",
        description: "Manage work boards",
        logoUrl: "https://logo.clearbit.com/monday.com",
        category: "Project Management",
        methods: ["api_key"],
        comingSoon: true
    },
    {
        provider: "clickup",
        displayName: "ClickUp",
        description: "Manage tasks and docs",
        logoUrl: "https://logo.clearbit.com/clickup.com",
        category: "Project Management",
        methods: ["api_key"],
        comingSoon: true
    },

    // CRM & Sales
    {
        provider: "salesforce",
        displayName: "Salesforce",
        description: "Manage leads, contacts, and opportunities",
        logoUrl: "https://cdn.simpleicons.org/salesforce/00A1E0",
        category: "CRM & Sales",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "hubspot",
        displayName: "HubSpot",
        description: "Manage contacts and deals",
        logoUrl: "https://cdn.simpleicons.org/hubspot/FF7A59",
        category: "CRM & Sales",
        methods: ["api_key", "oauth2"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/hubspot",
        mcpAuthType: "oauth2"
    },
    {
        provider: "pipedrive",
        displayName: "Pipedrive",
        description: "Manage sales pipelines",
        logoUrl: "https://logo.clearbit.com/pipedrive.com",
        category: "CRM & Sales",
        methods: ["api_key", "oauth2"],
        comingSoon: true
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
        mcpServerUrl: "https://mcp.pipedream.com/app/shopify",
        mcpAuthType: "oauth2"
    },
    {
        provider: "stripe",
        displayName: "Stripe",
        description: "Process payments and subscriptions",
        logoUrl: "https://cdn.simpleicons.org/stripe/008CDD",
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/stripe",
        mcpAuthType: "api_key"
    },
    {
        provider: "woocommerce",
        displayName: "WooCommerce",
        description: "Manage WordPress store",
        logoUrl: "https://cdn.simpleicons.org/woocommerce/96588A",
        category: "E-commerce",
        methods: ["api_key"],
        comingSoon: true
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
        mcpServerUrl: "https://mcp.pipedream.com/app/mailchimp",
        mcpAuthType: "oauth2"
    },
    {
        provider: "sendgrid",
        displayName: "SendGrid",
        description: "Send transactional emails",
        logoUrl: "https://cdn.simpleicons.org/sendgrid/1A82E2",
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/sendgrid",
        mcpAuthType: "api_key"
    },
    {
        provider: "twilio",
        displayName: "Twilio",
        description: "Send SMS and make calls",
        logoUrl: "https://cdn.simpleicons.org/twilio/F22F46",
        category: "Marketing",
        methods: ["api_key"],
        comingSoon: true,
        mcpServerUrl: "https://mcp.pipedream.com/app/twilio",
        mcpAuthType: "api_key"
    },

    // File Storage
    {
        provider: "dropbox",
        displayName: "Dropbox",
        description: "Manage files and folders",
        logoUrl: "https://cdn.simpleicons.org/dropbox/0061FF",
        category: "File Storage",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "box",
        displayName: "Box",
        description: "Manage enterprise files",
        logoUrl: "https://cdn.simpleicons.org/box/0061D5",
        category: "File Storage",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "onedrive",
        displayName: "OneDrive",
        description: "Microsoft cloud storage",
        logoUrl: "https://logo.clearbit.com/onedrive.live.com",
        category: "File Storage",
        methods: ["oauth2"],
        comingSoon: true
    },

    // Social Media
    {
        provider: "twitter",
        displayName: "Twitter/X",
        description: "Post tweets and manage account",
        logoUrl: "https://cdn.simpleicons.org/x/000000",
        category: "Social Media",
        methods: ["api_key", "oauth2"],
        comingSoon: true
    },
    {
        provider: "linkedin",
        displayName: "LinkedIn",
        description: "Post content and manage connections",
        logoUrl: "https://logo.clearbit.com/linkedin.com",
        category: "Social Media",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "facebook",
        displayName: "Facebook",
        description: "Post and manage pages",
        logoUrl: "https://cdn.simpleicons.org/facebook/0866FF",
        category: "Social Media",
        methods: ["oauth2"],
        comingSoon: true
    },
    {
        provider: "instagram",
        displayName: "Instagram",
        description: "Post content and manage account",
        logoUrl: "https://cdn.simpleicons.org/instagram/E4405F",
        category: "Social Media",
        methods: ["oauth2"],
        comingSoon: true
    }
];
