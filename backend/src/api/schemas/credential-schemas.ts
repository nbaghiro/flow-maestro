import { z } from "zod";

// Credential type enum
export const credentialTypeSchema = z.enum(['api_key', 'oauth2', 'basic_auth', 'custom']);

// Credential status enum
export const credentialStatusSchema = z.enum(['active', 'invalid', 'expired', 'revoked']);

// API Key data schema
const apiKeyDataSchema = z.object({
    api_key: z.string(),
    api_secret: z.string().optional()
});

// OAuth2 token data schema
const oauth2TokenDataSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    token_type: z.string(),
    expires_in: z.number().optional(),
    scope: z.string().optional()
});

// Basic auth data schema
const basicAuthDataSchema = z.object({
    username: z.string(),
    password: z.string()
});

// Custom header data schema
const customHeaderDataSchema = z.object({
    headers: z.record(z.string())
});

// Union of all credential data types
const credentialDataSchema = z.union([
    apiKeyDataSchema,
    oauth2TokenDataSchema,
    basicAuthDataSchema,
    customHeaderDataSchema
]);

// Credential metadata schema
const credentialMetadataSchema = z.object({
    scopes: z.array(z.string()).optional(),
    expires_at: z.number().optional(),
    account_info: z.object({
        email: z.string().optional(),
        username: z.string().optional(),
        workspace: z.string().optional()
    }).catchall(z.any()).optional(),
    provider_config: z.record(z.any()).optional()
}).optional();

// Create credential request
export const createCredentialSchema = z.object({
    name: z.string().min(1).max(255),
    type: credentialTypeSchema,
    provider: z.string().min(1).max(100),
    data: credentialDataSchema,
    metadata: credentialMetadataSchema,
    status: credentialStatusSchema.optional()
});

// Update credential request
export const updateCredentialSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    data: credentialDataSchema.optional(),
    metadata: credentialMetadataSchema,
    status: credentialStatusSchema.optional()
});

// Query parameters for listing credentials
export const listCredentialsQuerySchema = z.object({
    provider: z.string().optional(),
    type: credentialTypeSchema.optional(),
    status: credentialStatusSchema.optional(),
    limit: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform((val) => parseInt(val)).pipe(z.number().min(0)).optional()
});

// URL parameters
export const credentialIdParamSchema = z.object({
    id: z.string().uuid()
});

// Test credential request
export const testCredentialSchema = z.object({
    test_endpoint: z.string().url().optional() // Optional custom endpoint to test against
});

export type CreateCredentialRequest = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialRequest = z.infer<typeof updateCredentialSchema>;
export type ListCredentialsQuery = z.infer<typeof listCredentialsQuerySchema>;
export type CredentialIdParam = z.infer<typeof credentialIdParamSchema>;
export type TestCredentialRequest = z.infer<typeof testCredentialSchema>;
