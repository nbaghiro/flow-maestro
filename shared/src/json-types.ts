/**
 * Shared types for working with JSON data structures
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * Type for JSON Schema objects
 * JSON Schema is always an object with specific properties
 */
export interface JsonSchema {
    type?: string | string[];
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema | JsonSchema[];
    required?: string[];
    additionalProperties?: boolean | JsonSchema;
    enum?: JsonValue[];
    const?: JsonValue;
    default?: JsonValue;
    description?: string;
    title?: string;
    $schema?: string;
    $ref?: string;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    allOf?: JsonSchema[];
    not?: JsonSchema;
    [key: string]:
        | JsonValue
        | JsonSchema
        | JsonSchema[]
        | Record<string, JsonSchema>
        | boolean
        | string[]
        | undefined;
}

/**
 * Type guard to check if a value is a JsonObject
 */
export function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a JsonArray
 */
export function isJsonArray(value: unknown): value is JsonArray {
    return Array.isArray(value);
}

/**
 * Type guard to check if a value is a JsonValue
 */
export function isJsonValue(value: unknown): value is JsonValue {
    if (value === null) return true;
    const type = typeof value;
    if (type === "string" || type === "number" || type === "boolean") return true;
    if (Array.isArray(value)) return value.every(isJsonValue);
    if (type === "object") {
        return Object.values(value as Record<string, unknown>).every(isJsonValue);
    }
    return false;
}
