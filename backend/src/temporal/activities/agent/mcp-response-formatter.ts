import type { JsonObject } from "@flowmaestro/shared";

/**
 * Format MCP tool responses for LLM consumption
 * Removes verbose API details and extracts key information
 */
export function formatMCPToolResponse(
    provider: string,
    toolName: string,
    result: unknown
): JsonObject {
    // Handle OperationResult format (success/error wrapper)
    if (typeof result === "object" && result !== null) {
        const opResult = result as { success?: boolean; data?: unknown; error?: unknown };
        if (opResult.success === false) {
            // Return error as-is
            return {
                success: false,
                error: opResult.error
            } as JsonObject;
        }
        if (opResult.data !== undefined) {
            // Format the data based on provider and tool
            return formatProviderResponse(provider, toolName, opResult.data);
        }
    }

    // If not wrapped, format directly
    return formatProviderResponse(provider, toolName, result);
}

/**
 * Format provider-specific responses
 */
function formatProviderResponse(provider: string, toolName: string, data: unknown): JsonObject {
    switch (provider) {
        case "notion":
            return formatNotionResponse(toolName, data);
        case "slack":
            return formatSlackResponse(toolName, data);
        // Add more providers as needed
        default:
            // For unknown providers, return a simplified version
            return simplifyGenericResponse(data);
    }
}

/**
 * Format Notion API responses
 */
function formatNotionResponse(toolName: string, data: unknown): JsonObject {
    if (typeof data !== "object" || data === null) {
        return { result: data } as JsonObject;
    }

    const obj = data as Record<string, unknown>;

    // Handle search results
    if (toolName === "notion_search" || (obj.results && Array.isArray(obj.results))) {
        const results = (obj.results as unknown[]) || [];
        return {
            success: true,
            count: results.length,
            items: results.map((item) => formatNotionItem(item))
        } as JsonObject;
    }

    // Handle createPage
    if (toolName === "notion_createPage" || obj.object === "page") {
        // Ensure we return the full ID (extract from URL if needed)
        let pageId = obj.id as string;
        if (typeof pageId === "string" && pageId.length < 32 && obj.url) {
            // Try to extract full ID from URL
            const urlIdMatch = (obj.url as string).match(/[a-f0-9]{32}/i);
            if (urlIdMatch) {
                pageId = urlIdMatch[0];
            }
        }

        return {
            success: true,
            pageId,
            url: obj.url || null,
            title: extractNotionTitle(obj),
            created: true
        } as JsonObject;
    }

    // Handle updatePage
    if (toolName === "notion_updatePage" || (obj.object === "page" && obj.id)) {
        // Ensure we return the full ID
        let pageId = obj.id as string;
        if (typeof pageId === "string" && pageId.length < 32 && obj.url) {
            const urlIdMatch = (obj.url as string).match(/[a-f0-9]{32}/i);
            if (urlIdMatch) {
                pageId = urlIdMatch[0];
            }
        }

        return {
            success: true,
            pageId,
            url: obj.url || null,
            title: extractNotionTitle(obj),
            updated: true
        } as JsonObject;
    }

    // Handle getPage
    if (toolName === "notion_getPage" || obj.object === "page") {
        // Ensure we return the full ID
        let pageId = obj.id as string;
        if (typeof pageId === "string" && pageId.length < 32 && obj.url) {
            const urlIdMatch = (obj.url as string).match(/[a-f0-9]{32}/i);
            if (urlIdMatch) {
                pageId = urlIdMatch[0];
            }
        }

        return {
            success: true,
            pageId,
            url: obj.url || null,
            title: extractNotionTitle(obj),
            archived: Boolean(obj.archived) || false
        } as JsonObject;
    }

    // Handle queryDatabase
    if (toolName === "notion_queryDatabase" || (obj.results && obj.object === "list")) {
        const results = (obj.results as unknown[]) || [];
        return {
            success: true,
            count: results.length,
            hasMore: Boolean(obj.has_more) || false,
            pages: results.map((item) => formatNotionItem(item))
        } as JsonObject;
    }

    // Default: simplify the response
    return simplifyNotionObject(obj);
}

/**
 * Format a single Notion item (page or database)
 */
function formatNotionItem(item: unknown): Record<string, unknown> {
    if (typeof item !== "object" || item === null) {
        return { item };
    }

    const obj = item as Record<string, unknown>;
    // Ensure ID is a string and properly formatted
    let itemId = obj.id;
    if (typeof itemId !== "string") {
        itemId = String(itemId);
    }

    const formatted: Record<string, unknown> = {
        id: itemId,
        type: obj.object === "page" ? "page" : obj.object === "database" ? "database" : "unknown"
    };

    // Extract title
    const title = extractNotionTitle(obj);
    if (title) {
        formatted.title = title;
    }

    // Extract URL if available
    if (obj.url) {
        formatted.url = obj.url;
    }

    // For databases, include description
    if (obj.object === "database" && obj.description && Array.isArray(obj.description)) {
        formatted.description = extractNotionText(obj.description);
    }

    return formatted;
}

/**
 * Extract title from Notion object
 */
function extractNotionTitle(obj: Record<string, unknown>): string | null {
    // Try properties.title
    if (obj.properties && typeof obj.properties === "object") {
        const props = obj.properties as Record<string, unknown>;
        if (props.title && typeof props.title === "object") {
            const titleObj = props.title as Record<string, unknown>;
            if (titleObj.title && Array.isArray(titleObj.title)) {
                const text = extractNotionText(titleObj.title);
                if (text) return text;
            }
        }
    }

    // Try title array directly
    if (obj.title && Array.isArray(obj.title)) {
        const text = extractNotionText(obj.title);
        if (text) return text;
    }

    return null;
}

/**
 * Extract plain text from Notion rich text array
 */
function extractNotionText(textArray: unknown[]): string {
    if (!Array.isArray(textArray)) return "";

    return textArray
        .map((item) => {
            if (typeof item === "object" && item !== null) {
                const obj = item as Record<string, unknown>;
                const textObj = obj.text as Record<string, unknown> | undefined;
                return (obj.plain_text as string) || (textObj?.content as string | undefined) || "";
            }
            return "";
        })
        .filter(Boolean)
        .join(" ");
}

/**
 * Simplify a generic Notion object
 */
function simplifyNotionObject(obj: Record<string, unknown>): JsonObject {
    const simplified: Record<string, unknown> = {};

    if (obj.id) simplified.id = obj.id;
    if (obj.url) simplified.url = obj.url;
    if (obj.object) simplified.type = obj.object;

    const title = extractNotionTitle(obj);
    if (title) simplified.title = title;

    return simplified as JsonObject;
}

/**
 * Format Slack responses
 */
function formatSlackResponse(toolName: string, data: unknown): JsonObject {
    if (typeof data !== "object" || data === null) {
        return { result: data } as JsonObject;
    }

    const obj = data as Record<string, unknown>;

    // Handle sendMessage
    if (toolName === "slack_sendMessage" || obj.ts) {
        return {
            success: true,
            messageSent: true,
            timestamp: obj.ts,
            channel: obj.channel || null
        } as JsonObject;
    }

    return { success: true, data: obj } as JsonObject;
}

/**
 * Simplify generic responses (fallback)
 */
function simplifyGenericResponse(data: unknown): JsonObject {
    if (typeof data === "object" && data !== null) {
        const obj = data as Record<string, unknown>;
        // Keep only essential fields
        const simplified: Record<string, unknown> = {};
        if (obj.id) simplified.id = obj.id;
        if (obj.success !== undefined) simplified.success = obj.success;
        if (obj.error) simplified.error = obj.error;
        if (obj.message) simplified.message = obj.message;
        return simplified as JsonObject;
    }

    return { result: data } as JsonObject;
}
