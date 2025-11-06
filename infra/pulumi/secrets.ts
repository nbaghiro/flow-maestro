import * as gcp from "@pulumi/gcp";
import { infrastructureConfig, resourceName } from "./config";

// Helper function to create a secret
function createSecret(name: string, secretData: pulumi.Output<string> | string) {
    const secret = new gcp.secretmanager.Secret(resourceName(name), {
        secretId: resourceName(name),
        replication: {
            auto: {},
        },
        labels: {
            app: infrastructureConfig.appName,
            environment: infrastructureConfig.environment,
        },
    });

    new gcp.secretmanager.SecretVersion(resourceName(`${name}-version`), {
        secret: secret.id,
        secretData: secretData,
    });

    return secret;
}

// Create secrets for sensitive credentials
export const dbPasswordSecret = createSecret("db-password", infrastructureConfig.dbPassword);

export const jwtSecretSecret = createSecret("jwt-secret", infrastructureConfig.jwtSecret);

export const encryptionKeySecret = createSecret(
    "encryption-key",
    infrastructureConfig.encryptionKey
);

// Temporal Cloud certificates (if provided)
export const temporalCaCertSecret = infrastructureConfig.temporalCaCert
    ? createSecret("temporal-ca-cert", infrastructureConfig.temporalCaCert)
    : undefined;

export const temporalClientCertSecret = infrastructureConfig.temporalClientCert
    ? createSecret("temporal-client-cert", infrastructureConfig.temporalClientCert)
    : undefined;

export const temporalClientKeySecret = infrastructureConfig.temporalClientKey
    ? createSecret("temporal-client-key", infrastructureConfig.temporalClientKey)
    : undefined;

// Optional: LLM API keys
export const openaiApiKeySecret = infrastructureConfig.openaiApiKey
    ? createSecret("openai-api-key", infrastructureConfig.openaiApiKey)
    : undefined;

export const anthropicApiKeySecret = infrastructureConfig.anthropicApiKey
    ? createSecret("anthropic-api-key", infrastructureConfig.anthropicApiKey)
    : undefined;

export const googleApiKeySecret = infrastructureConfig.googleApiKey
    ? createSecret("google-api-key", infrastructureConfig.googleApiKey)
    : undefined;

export const cohereApiKeySecret = infrastructureConfig.cohereApiKey
    ? createSecret("cohere-api-key", infrastructureConfig.cohereApiKey)
    : undefined;

// Export secret outputs
export const secretOutputs = {
    dbPasswordSecretId: dbPasswordSecret.id,
    jwtSecretSecretId: jwtSecretSecret.id,
    encryptionKeySecretId: encryptionKeySecret.id,
    temporalCaCertSecretId: temporalCaCertSecret?.id,
    temporalClientCertSecretId: temporalClientCertSecret?.id,
    temporalClientKeySecretId: temporalClientKeySecret?.id,
    openaiApiKeySecretId: openaiApiKeySecret?.id,
    anthropicApiKeySecretId: anthropicApiKeySecret?.id,
    googleApiKeySecretId: googleApiKeySecret?.id,
    cohereApiKeySecretId: cohereApiKeySecret?.id,
};
