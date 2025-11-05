import * as pulumi from "@pulumi/pulumi";

// Get Pulumi configuration
const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");

export interface InfrastructureConfig {
    // GCP Configuration
    project: string;
    region: string;
    zone: string;

    // Application Configuration
    appName: string;
    environment: string;
    domain: string;

    // GKE Configuration
    gkeAutopilot: boolean;
    gkeVersion: string;

    // Database Configuration
    dbVersion: string;
    dbTier: string;
    dbDiskSize: number;
    dbHighAvailability: boolean;
    dbBackupEnabled: boolean;

    // Redis Configuration
    redisVersion: string;
    redisMemorySizeGb: number;
    redisTier: "BASIC" | "STANDARD_HA";

    // Secrets
    dbPassword: string;
    jwtSecret: string;
    encryptionKey: string;

    // Temporal Cloud Configuration
    temporalNamespace: string;
    temporalAddress: string;
    temporalCaCert?: string;
    temporalClientCert?: string;
    temporalClientKey?: string;

    // Optional: LLM API Keys
    openaiApiKey?: string;
    anthropicApiKey?: string;
    googleApiKey?: string;
    cohereApiKey?: string;
}

// Default configuration values
const defaults = {
    gkeAutopilot: true,
    gkeVersion: "latest",
    dbVersion: "POSTGRES_15",
    dbTier: "db-custom-2-7680",
    dbDiskSize: 100,
    dbHighAvailability: true,
    dbBackupEnabled: true,
    redisVersion: "REDIS_7_0",
    redisMemorySizeGb: 5,
    redisTier: "STANDARD_HA" as const,
};

// Export configuration
export const infrastructureConfig: InfrastructureConfig = {
    // GCP Configuration
    project: gcpConfig.require("project"),
    region: gcpConfig.get("region") || "us-central1",
    zone: gcpConfig.get("zone") || "us-central1-a",

    // Application Configuration
    appName: config.get("appName") || "flowmaestro",
    environment: config.get("environment") || "production",
    domain: config.require("domain"),

    // GKE Configuration
    gkeAutopilot: config.getBoolean("gkeAutopilot") ?? defaults.gkeAutopilot,
    gkeVersion: config.get("gkeVersion") || defaults.gkeVersion,

    // Database Configuration
    dbVersion: config.get("dbVersion") || defaults.dbVersion,
    dbTier: config.get("dbTier") || defaults.dbTier,
    dbDiskSize: config.getNumber("dbDiskSize") || defaults.dbDiskSize,
    dbHighAvailability: config.getBoolean("dbHighAvailability") ?? defaults.dbHighAvailability,
    dbBackupEnabled: config.getBoolean("dbBackupEnabled") ?? defaults.dbBackupEnabled,

    // Redis Configuration
    redisVersion: config.get("redisVersion") || defaults.redisVersion,
    redisMemorySizeGb: config.getNumber("redisMemorySizeGb") || defaults.redisMemorySizeGb,
    redisTier: (config.get("redisTier") as "BASIC" | "STANDARD_HA") || defaults.redisTier,

    // Secrets (required)
    dbPassword: config.requireSecret("dbPassword"),
    jwtSecret: config.requireSecret("jwtSecret"),
    encryptionKey: config.requireSecret("encryptionKey"),

    // Temporal Cloud Configuration
    temporalNamespace: config.require("temporalNamespace"),
    temporalAddress: config.require("temporalAddress"),
    temporalCaCert: config.getSecret("temporalCaCert"),
    temporalClientCert: config.getSecret("temporalClientCert"),
    temporalClientKey: config.getSecret("temporalClientKey"),

    // Optional: LLM API Keys
    openaiApiKey: config.getSecret("openaiApiKey"),
    anthropicApiKey: config.getSecret("anthropicApiKey"),
    googleApiKey: config.getSecret("googleApiKey"),
    cohereApiKey: config.getSecret("cohereApiKey"),
};

// Helper function to create resource names
export function resourceName(name: string): string {
    return `${infrastructureConfig.appName}-${name}`;
}

// Helper function to create resource labels
export function resourceLabels(): { [key: string]: string } {
    return {
        app: infrastructureConfig.appName,
        environment: infrastructureConfig.environment,
        "managed-by": "pulumi",
    };
}
