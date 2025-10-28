import { CredentialRepository } from '../../storage/repositories/CredentialRepository';
import { oauthService } from './OAuthService';
import { OAuth2TokenData } from '../../storage/models/Credential';

const credentialRepo = new CredentialRepository();

/**
 * Get OAuth access token, automatically refreshing if needed
 *
 * This is the PRIMARY function that node executors should use
 * to get OAuth tokens. It handles:
 * - Token expiry checking
 * - Automatic refresh before expiry
 * - Database updates
 * - Usage tracking
 *
 * @param credentialId - The credential ID to get token for
 * @returns Valid access token
 * @throws Error if credential not found or refresh fails
 */
export async function getAccessToken(credentialId: string): Promise<string> {
    const credential = await credentialRepo.findByIdWithData(credentialId);

    if (!credential) {
        throw new Error(`Credential not found: ${credentialId}`);
    }

    if (credential.type !== 'oauth2') {
        throw new Error(`Credential ${credentialId} is not an OAuth token (type: ${credential.type})`);
    }

    const tokenData = credential.data as OAuth2TokenData;

    if (!tokenData.access_token) {
        throw new Error(`Credential ${credentialId} is missing access_token`);
    }

    // Check if token is expiring soon (within 5 minutes)
    const needsRefresh = credentialRepo.isExpired(credential);

    if (needsRefresh && tokenData.refresh_token) {
        console.log(`[TokenRefresh] Token expiring soon for credential ${credentialId}, refreshing...`);

        try {
            // Refresh the token
            const newTokens = await oauthService.refreshAccessToken(
                credential.provider,
                tokenData.refresh_token
            );

            console.log(`[TokenRefresh] Successfully refreshed token for credential ${credentialId}`);

            // Update in database
            await credentialRepo.updateTokens(credentialId, newTokens);

            // Mark as used
            await credentialRepo.markAsUsed(credentialId);

            return newTokens.access_token;
        } catch (error) {
            console.error(`[TokenRefresh] Failed to refresh token for credential ${credentialId}:`, error);

            // Mark credential as expired
            await credentialRepo.markAsTested(credentialId, 'expired');

            throw new Error(
                `Failed to refresh OAuth token: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
                `Please reconnect your ${credential.provider} account.`
            );
        }
    }

    // Token is still valid, just mark as used
    await credentialRepo.markAsUsed(credentialId);

    return tokenData.access_token;
}

/**
 * Get OAuth token data with provider info
 * Useful when you need more than just the access token
 */
export async function getTokenData(credentialId: string) {
    const accessToken = await getAccessToken(credentialId);
    const credential = await credentialRepo.findById(credentialId);

    return {
        accessToken,
        provider: credential!.provider,
        accountInfo: credential!.metadata.account_info
    };
}

/**
 * Check if a credential needs refreshing
 * Can be used for background jobs or monitoring
 */
export async function checkIfNeedsRefresh(credentialId: string): Promise<boolean> {
    const credential = await credentialRepo.findById(credentialId);

    if (!credential || credential.type !== 'oauth2') {
        return false;
    }

    return credentialRepo.isExpired(credential);
}

/**
 * Background job: Refresh all expiring OAuth tokens
 *
 * This can be run as a cron job to proactively refresh tokens
 * before they expire, preventing execution failures.
 *
 * Recommended: Run every hour
 */
export async function refreshExpiringTokens(userId?: string): Promise<{
    refreshed: number;
    failed: number;
    errors: Array<{ credentialId: string; error: string }>;
}> {
    console.log('[TokenRefresh] Starting background token refresh job...');

    const results = {
        refreshed: 0,
        failed: 0,
        errors: [] as Array<{ credentialId: string; error: string }>
    };

    try {
        // If userId provided, only refresh that user's tokens
        // Otherwise would need to iterate all users (not implemented here)
        if (!userId) {
            console.log('[TokenRefresh] No userId provided, skipping');
            return results;
        }

        // Get expiring credentials for user
        const expiringCredentials = await credentialRepo.findExpiringSoon(userId);

        console.log(`[TokenRefresh] Found ${expiringCredentials.length} expiring credentials for user ${userId}`);

        for (const credential of expiringCredentials) {
            try {
                // Trigger refresh by calling getAccessToken
                await getAccessToken(credential.id);
                results.refreshed++;
                console.log(`[TokenRefresh] Successfully refreshed credential ${credential.id}`);
            } catch (error) {
                results.failed++;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                results.errors.push({
                    credentialId: credential.id,
                    error: errorMessage
                });
                console.error(`[TokenRefresh] Failed to refresh credential ${credential.id}:`, error);
            }
        }

        console.log(
            `[TokenRefresh] Job complete. Refreshed: ${results.refreshed}, Failed: ${results.failed}`
        );

        return results;
    } catch (error) {
        console.error('[TokenRefresh] Background job failed:', error);
        throw error;
    }
}

/**
 * Force refresh a token regardless of expiry status
 * Useful for testing or manual refresh
 */
export async function forceRefreshToken(credentialId: string): Promise<void> {
    const credential = await credentialRepo.findByIdWithData(credentialId);

    if (!credential) {
        throw new Error(`Credential not found: ${credentialId}`);
    }

    if (credential.type !== 'oauth2') {
        throw new Error(`Credential ${credentialId} is not an OAuth token`);
    }

    const tokenData = credential.data as OAuth2TokenData;

    if (!tokenData.refresh_token) {
        throw new Error(`Credential ${credentialId} does not have a refresh token`);
    }

    console.log(`[TokenRefresh] Force refreshing token for credential ${credentialId}`);

    const newTokens = await oauthService.refreshAccessToken(
        credential.provider,
        tokenData.refresh_token
    );

    await credentialRepo.updateTokens(credentialId, newTokens);
    console.log(`[TokenRefresh] Force refresh successful for credential ${credentialId}`);
}
