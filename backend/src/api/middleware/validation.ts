import { FastifyRequest } from "fastify";
import { z, ZodSchema } from "zod";
import { ValidationError } from "./error-handler";

export function validateRequest<T extends ZodSchema>(schema: T) {
    return async (request: FastifyRequest) => {
        try {
            request.body = schema.parse(request.body);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError("Validation failed", error.errors);
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
                throw new ValidationError("Query validation failed", error.errors);
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
                throw new ValidationError("Params validation failed", error.errors);
            }
            throw error;
        }
    };
}

export const validateBody = validateRequest;
