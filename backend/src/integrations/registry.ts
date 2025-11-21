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

// Register all providers
providerRegistry.register(slackEntry);
providerRegistry.register(codaEntry);
providerRegistry.register(notionEntry);
providerRegistry.register(airtableEntry);
providerRegistry.register(hubspotEntry);

// Export for use in application
export { providerRegistry };
