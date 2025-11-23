import { providerRegistry } from "./core/ProviderRegistry";
import type { ProviderRegistryEntry } from "./core/types";

/**
 * Register all providers
 *
 * This is the single place where all providers are registered.
 * To add a new provider, simply add a new entry here.
 */

// Register Slack provider
const slackEntry: ProviderRegistryEntry = {
    name: "slack",
    displayName: "Slack",
    authMethod: "oauth2",
    category: "communication",
    loader: async () => {
        const { SlackProvider } = await import("./providers/slack/SlackProvider");
        return new SlackProvider();
    }
};

// Register Coda provider
const codaEntry: ProviderRegistryEntry = {
    name: "coda",
    displayName: "Coda",
    authMethod: "api_key",
    category: "productivity",
    loader: async () => {
        const { CodaProvider } = await import("./providers/coda/CodaProvider");
        return new CodaProvider();
    }
};

// Register Notion provider
const notionEntry: ProviderRegistryEntry = {
    name: "notion",
    displayName: "Notion",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { NotionProvider } = await import("./providers/notion/NotionProvider");
        return new NotionProvider();
    }
};

// Register Airtable provider
const airtableEntry: ProviderRegistryEntry = {
    name: "airtable",
    displayName: "Airtable",
    authMethod: "oauth2",
    category: "productivity",
    loader: async () => {
        const { AirtableProvider } = await import("./providers/airtable/AirtableProvider");
        return new AirtableProvider();
    }
};

// Register HubSpot provider
const hubspotEntry: ProviderRegistryEntry = {
    name: "hubspot",
    displayName: "HubSpot",
    authMethod: "oauth2",
    category: "crm",
    loader: async () => {
        const { HubspotProvider } = await import("./providers/hubspot/HubspotProvider");
        return new HubspotProvider();
    }
};

// Register PostgreSQL provider
const postgresqlEntry: ProviderRegistryEntry = {
    name: "postgresql",
    displayName: "PostgreSQL",
    authMethod: "api_key",
    category: "database",
    loader: async () => {
        const { PostgresqlProvider } = await import("./providers/postgresql/PostgresqlProvider");
        return new PostgresqlProvider();
    }
};

// Register GitHub provider
const githubEntry: ProviderRegistryEntry = {
    name: "github",
    displayName: "GitHub",
    authMethod: "oauth2",
    category: "developer_tools",
    loader: async () => {
        const { GitHubProvider } = await import("./providers/github/GitHubProvider");
        return new GitHubProvider();
    }
};

// Register Linear provider
const linearEntry: ProviderRegistryEntry = {
    name: "linear",
    displayName: "Linear",
    authMethod: "oauth2",
    category: "project_management",
    loader: async () => {
        const { LinearProvider } = await import("./providers/linear/LinearProvider");
        return new LinearProvider();
    }
};

// Register all providers
providerRegistry.register(slackEntry);
providerRegistry.register(codaEntry);
providerRegistry.register(notionEntry);
providerRegistry.register(airtableEntry);
providerRegistry.register(hubspotEntry);
providerRegistry.register(postgresqlEntry);
providerRegistry.register(githubEntry);
providerRegistry.register(linearEntry);

// Export for use in application
export { providerRegistry };
