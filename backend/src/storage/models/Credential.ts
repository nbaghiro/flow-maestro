/**
 * Credential Model
 * Represents stored credentials for external services (API keys, OAuth tokens, etc.)
 */

export type CredentialType = 'api_key' | 'oauth2' | 'basic_auth' | 'custom';
export type CredentialStatus = 'active' | 'invalid' | 'expired' | 'revoked';

/**
 * OAuth 2.0 token data
 */
export interface OAuth2TokenData {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
}

/**
 * API key credential data
 */
export interface ApiKeyData {
    api_key: string;
    api_secret?: string; // For providers that need both key and secret
}

/**
 * Basic auth credential data
 */
export interface BasicAuthData {
    username: string;
    password: string;
}

/**
 * Custom header credential data
 */
export interface CustomHeaderData {
    headers: Record<string, string>;
}

/**
 * Union of all credential data types
 */
export type CredentialData =
    | ApiKeyData
    | OAuth2TokenData
    | BasicAuthData
    | CustomHeaderData;

/**
 * Credential metadata (non-sensitive)
 */
export interface CredentialMetadata {
    scopes?: string[];
    expires_at?: number; // Unix timestamp
    account_info?: {
        email?: string;
        username?: string;
        workspace?: string;
        [key: string]: any;
    };
    provider_config?: Record<string, any>;
}

/**
 * Credential model as stored in database
 */
export interface CredentialModel {
    id: string;
    user_id: string;
    name: string;
    type: CredentialType;
    provider: string;
    encrypted_data: string; // Encrypted JSON string
    metadata: CredentialMetadata;
    status: CredentialStatus;
    last_tested_at: Date | null;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Credential with decrypted data (only used in memory, never stored)
 */
export interface CredentialWithData extends Omit<CredentialModel, 'encrypted_data'> {
    data: CredentialData;
}

/**
 * Input for creating a new credential
 */
export interface CreateCredentialInput {
    user_id: string;
    name: string;
    type: CredentialType;
    provider: string;
    data: CredentialData; // Will be encrypted before storage
    metadata?: CredentialMetadata;
    status?: CredentialStatus;
}

/**
 * Input for updating a credential
 */
export interface UpdateCredentialInput {
    name?: string;
    data?: CredentialData; // Will be encrypted before storage
    metadata?: CredentialMetadata;
    status?: CredentialStatus;
}

/**
 * Credential summary (safe to send to frontend, no sensitive data)
 */
export interface CredentialSummary {
    id: string;
    name: string;
    type: CredentialType;
    provider: string;
    status: CredentialStatus;
    metadata: CredentialMetadata;
    last_tested_at: Date | null;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
