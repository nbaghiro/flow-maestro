import { randomBytes, createHash } from "crypto";

/**
 * PKCE (Proof Key for Code Exchange) Utilities
 *
 * PKCE adds an extra layer of security to OAuth 2.0 flows by preventing
 * authorization code interception attacks.
 *
 * Flow:
 * 1. Generate random code_verifier (43-128 characters)
 * 2. Create code_challenge = base64url(sha256(code_verifier))
 * 3. Send code_challenge in authorization request
 * 4. Send code_verifier in token exchange
 * 5. Server verifies code_challenge matches code_verifier
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */

/**
 * Generate a cryptographically random code verifier
 * Length: 43-128 characters (using 64 bytes = 86 characters base64url)
 *
 * @returns Base64URL-encoded random string
 */
export function generateCodeVerifier(): string {
    const buffer = randomBytes(64); // 64 bytes = 512 bits of entropy
    return base64UrlEncode(buffer);
}

/**
 * Generate code challenge from code verifier using SHA-256
 *
 * @param codeVerifier - The code verifier to hash
 * @returns Base64URL-encoded SHA-256 hash of code verifier
 */
export function generateCodeChallenge(codeVerifier: string): string {
    const hash = createHash("sha256").update(codeVerifier).digest();
    return base64UrlEncode(hash);
}

/**
 * Base64URL encoding (without padding)
 * Converts standard Base64 to URL-safe Base64
 *
 * @param buffer - Buffer to encode
 * @returns Base64URL-encoded string
 */
function base64UrlEncode(buffer: Buffer): string {
    return buffer
        .toString("base64")
        .replace(/\+/g, "-") // Replace + with -
        .replace(/\//g, "_") // Replace / with _
        .replace(/=/g, ""); // Remove padding
}

/**
 * Generate both code verifier and code challenge
 * Convenience method for generating PKCE parameters
 *
 * @returns Object with codeVerifier and codeChallenge
 */
export function generatePKCEPair(): {
    codeVerifier: string;
    codeChallenge: string;
} {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    return {
        codeVerifier,
        codeChallenge
    };
}
