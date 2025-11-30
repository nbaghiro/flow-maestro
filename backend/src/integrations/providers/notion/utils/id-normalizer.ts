/**
 * Extract Notion ID from URL if provided
 * Notion URLs format: https://www.notion.so/Page-Name-{id}
 * The ID is the last segment after the last hyphen
 */
function extractIdFromUrl(urlOrId: string): string {
    // If it looks like a URL, extract the ID
    if (urlOrId.includes("notion.so/")) {
        // Extract the last segment (the ID part)
        const segments = urlOrId.split("/");
        const lastSegment = segments[segments.length - 1];
        // Remove URL parameters if any
        const idPart = lastSegment.split("?")[0].split("#")[0];
        // Extract the ID (last part after the last hyphen, or the whole thing if no hyphens)
        const parts = idPart.split("-");
        // The ID is typically the last segment, but might be concatenated with the page name
        // Try to find a 32-character hex string
        const hexMatch = idPart.match(/[a-f0-9]{32}$/i);
        if (hexMatch) {
            return hexMatch[0];
        }
        // If no 32-char match, return the last segment (might be partial)
        return parts[parts.length - 1] || idPart;
    }
    return urlOrId;
}

/**
 * Normalize Notion ID to proper UUID format
 * Notion IDs are 32-character hex strings that need to be formatted as UUIDs
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12)
 */
export function normalizeNotionId(id: string): string {
    if (!id || typeof id !== "string") {
        return id;
    }

    // First, try to extract ID from URL if it's a URL
    const extractedId = extractIdFromUrl(id);

    // Remove any existing hyphens and whitespace
    const cleaned = extractedId.replace(/[-\s]/g, "");

    // If it's already in UUID format (has hyphens), validate and return as-is
    if (extractedId.includes("-") && cleaned.length === 32) {
        return extractedId; // Already properly formatted
    }

    // If it's exactly 32 characters (UUID without hyphens), add hyphens
    if (cleaned.length === 32) {
        const normalized = `${cleaned.substring(0, 8)}-${cleaned.substring(8, 12)}-${cleaned.substring(12, 16)}-${cleaned.substring(16, 20)}-${cleaned.substring(20, 32)}`;
        return normalized;
    }

    // If it's less than 32 characters, it might be truncated
    // Try to find the full ID in the original string (might be in a URL)
    if (cleaned.length < 32 && id.length > cleaned.length) {
        // Look for a 32-character hex string in the original
        const fullIdMatch = id.match(/[a-f0-9]{32}/i);
        if (fullIdMatch) {
            const fullId = fullIdMatch[0];
            const normalized = `${fullId.substring(0, 8)}-${fullId.substring(8, 12)}-${fullId.substring(12, 16)}-${fullId.substring(16, 20)}-${fullId.substring(20, 32)}`;
            return normalized;
        }
    }

    // If it's a different length, log warning (this is a real warning, not debug)
    if (cleaned.length !== 32) {
        console.warn(
            `[Notion ID] Warning: ID "${id}" (extracted: "${extractedId}") has ${cleaned.length} characters (expected 32). This may cause API errors.`
        );
    }

    // Return as-is (might be invalid, but let Notion API validate)
    return extractedId;
}
