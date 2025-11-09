import { FastifyRequest } from "fastify";
import { UnauthorizedError } from "./error-handler";

declare module "@fastify/jwt" {
    interface FastifyJWT {
        user: {
            id: string;
            email: string;
        };
    }
}

export async function authMiddleware(request: FastifyRequest) {
    try {
        // Verify JWT token
        await request.jwtVerify();

        // Token payload is available in request.user (set by fastify-jwt)
        if (!request.user) {
            throw new UnauthorizedError("Invalid token");
        }
    } catch (_error) {
        throw new UnauthorizedError("Authentication required");
    }
}

// Optional authentication - doesn't fail if no token
export async function optionalAuthMiddleware(request: FastifyRequest) {
    try {
        await request.jwtVerify();
    } catch {
        // Continue without authentication - user will be undefined
    }
}
