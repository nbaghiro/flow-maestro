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
        // Try Authorization header first (standard approach)
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            // Verify JWT token (jwtVerify reads from Authorization header automatically)
            await request.jwtVerify();
        } else {
            // Fallback: Try token query param (for EventSource/SSE which can't send headers)
            const query = request.query as Record<string, string | string[] | undefined>;
            const token =
                typeof query.token === "string"
                    ? query.token
                    : Array.isArray(query.token)
                      ? query.token[0]
                      : undefined;

            if (token) {
                // Manually verify token from query param
                const decoded = request.server.jwt.verify(token) as { id: string; email: string };
                // Set request.user manually since jwtVerify() wasn't called
                request.user = decoded;
            } else {
                throw new UnauthorizedError("No authentication token provided");
            }
        }

        // Token payload is available in request.user (set by fastify-jwt or manually)
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
