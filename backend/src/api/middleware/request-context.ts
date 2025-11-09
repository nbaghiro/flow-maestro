/**
 * RequestContext Middleware for Fastify
 * Attaches RequestContext to every request for distributed tracing
 */

import { randomUUID } from "crypto";
import { createRequestContext, type RequestContext } from "@flowmaestro/shared";
import type { FastifyRequest, FastifyReply } from "fastify";

// Extend Fastify request to include requestContext
declare module "fastify" {
    interface FastifyRequest {
        requestContext: RequestContext;
    }
}

/**
 * Middleware to create and attach RequestContext to requests
 */
export async function requestContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Extract user ID from JWT if authenticated
    const userId = request.user?.id;

    // Get or generate trace ID from headers (for distributed tracing)
    const traceId = (request.headers["x-trace-id"] as string) ?? randomUUID();

    // Get or generate request ID
    const requestId = (request.headers["x-request-id"] as string) ?? randomUUID();

    // Get session ID from headers if available
    const sessionId = request.headers["x-session-id"] as string | undefined;

    // Create RequestContext with tracing information
    const requestContext = createRequestContext({
        userId,
        traceId,
        requestId,
        sessionId,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
        method: request.method,
        url: request.url
    });

    // Attach to request
    request.requestContext = requestContext;

    // Add correlation headers to response
    reply.header("X-Trace-ID", traceId);
    reply.header("X-Request-ID", requestId);

    // Update logger with correlation IDs
    request.log = request.log.child({
        traceId,
        requestId,
        userId,
        sessionId
    });
}
