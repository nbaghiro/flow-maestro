import type { JsonObject } from "@flowmaestro/shared";

/**
 * Normalize JSON Schema for LLM provider compatibility
 * JSON Schema spec requires that array types have an 'items' property.
 * This ensures compatibility with OpenAI, Anthropic, and other providers.
 */
export function normalizeSchemaForLLM(schema: JsonObject): JsonObject {
    if (typeof schema !== "object" || schema === null) {
        return schema;
    }

    const normalized: JsonObject = { ...schema };

    // If it's an array type, ensure it has items
    if (normalized.type === "array") {
        if (!normalized.items) {
            normalized.items = {
                type: "object",
                additionalProperties: true
            };
        } else if (typeof normalized.items === "object") {
            // Recursively normalize items
            normalized.items = normalizeSchemaForLLM(normalized.items as JsonObject);
        }
    }

    // Recursively normalize nested properties
    if (normalized.properties && typeof normalized.properties === "object") {
        const normalizedProperties: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(normalized.properties)) {
            normalizedProperties[key] = normalizeSchemaForLLM(value as JsonObject);
        }
        normalized.properties = normalizedProperties as Record<string, JsonObject>;
    }

    return normalized;
}
