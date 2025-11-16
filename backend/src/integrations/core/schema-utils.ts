import { zodToJsonSchema } from "zod-to-json-schema";
import type { JSONSchema } from "./types";
import type { z } from "zod";

/**
 * Convert Zod schema to JSON Schema
 */
export function toJSONSchema(zodSchema: z.ZodSchema): JSONSchema {
    try {
        const jsonSchema = zodToJsonSchema(zodSchema, {
            target: "jsonSchema7",
            $refStrategy: "none",
            strictUnions: false
        });

        // Remove $schema property as it's not needed
        const { $schema: _$schema, ...rest } = jsonSchema as {
            $schema?: string;
            [key: string]: unknown;
        };

        return rest as JSONSchema;
    } catch (error) {
        console.error("[SchemaUtils] Failed to convert Zod schema to JSON Schema:", error);
        return {
            type: "object",
            properties: {},
            description: "Schema conversion failed"
        };
    }
}
