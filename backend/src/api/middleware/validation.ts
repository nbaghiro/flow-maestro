import { FastifyRequest } from "fastify";
import { z, ZodSchema, ZodIssue } from "zod";
import type { JsonValue } from "@flowmaestro/shared";
import { ValidationError } from "./error-handler";

/**
 * Convert Zod errors to JSON-serializable format
 */
function serializeZodErrors(errors: ZodIssue[]): JsonValue {
    return errors.map((error) => ({
        path: error.path.join("."),
        message: error.message,
        code: error.code
    }));
}

export function validateRequest<T extends ZodSchema>(schema: T) {
    return async (request: FastifyRequest) => {
        try {
            request.body = schema.parse(request.body);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError("Validation failed", serializeZodErrors(error.errors));
            }
            throw error;
        }
    };
}

export function validateQuery<T extends ZodSchema>(schema: T) {
    return async (request: FastifyRequest) => {
        try {
            request.query = schema.parse(request.query);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    "Query validation failed",
                    serializeZodErrors(error.errors)
                );
            }
            throw error;
        }
    };
}

export function validateParams<T extends ZodSchema>(schema: T) {
    return async (request: FastifyRequest) => {
        try {
            request.params = schema.parse(request.params);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    "Params validation failed",
                    serializeZodErrors(error.errors)
                );
            }
            throw error;
        }
    };
}

export const validateBody = validateRequest;
