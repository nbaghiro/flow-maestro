/**
 * RequestContext - Request-scoped data propagation
 * Implements Mastra-inspired context passing for distributed tracing
 */

import { v4 as uuidv4 } from "uuid";

/**
 * TracingContext interface for distributed tracing
 */
export interface TracingContext {
    traceId: string;
    spanId?: string;
    parentSpanId?: string;
    userId?: string;
    requestId: string;
    sessionId?: string;
}

/**
 * RequestContext class for passing custom data through execution
 * Enables thread-local storage pattern for request-scoped values
 */
export class RequestContext {
    private contextMap: Map<string, unknown>;
    private tracingContext: TracingContext;

    constructor(tracingContext?: Partial<TracingContext>) {
        this.contextMap = new Map();
        this.tracingContext = {
            traceId: tracingContext?.traceId ?? uuidv4(),
            requestId: tracingContext?.requestId ?? uuidv4(),
            spanId: tracingContext?.spanId,
            parentSpanId: tracingContext?.parentSpanId,
            userId: tracingContext?.userId,
            sessionId: tracingContext?.sessionId
        };
    }

    /**
     * Set a value in the context
     */
    set<T>(key: string, value: T): void {
        this.contextMap.set(key, value);
    }

    /**
     * Get a value from the context
     */
    get<T>(key: string): T | undefined {
        return this.contextMap.get(key) as T | undefined;
    }

    /**
     * Check if a key exists in the context
     */
    has(key: string): boolean {
        return this.contextMap.has(key);
    }

    /**
     * Remove a value from the context
     */
    delete(key: string): boolean {
        return this.contextMap.delete(key);
    }

    /**
     * Get the tracing context (trace ID, span ID, etc.)
     */
    getTracingContext(): TracingContext {
        return { ...this.tracingContext };
    }

    /**
     * Update the tracing context (e.g., when creating a new span)
     */
    updateTracingContext(updates: Partial<TracingContext>): void {
        this.tracingContext = {
            ...this.tracingContext,
            ...updates
        };
    }

    /**
     * Get trace ID for logging and correlation
     */
    getTraceId(): string {
        return this.tracingContext.traceId;
    }

    /**
     * Get request ID for logging and correlation
     */
    getRequestId(): string {
        return this.tracingContext.requestId;
    }

    /**
     * Get user ID if available
     */
    getUserId(): string | undefined {
        return this.tracingContext.userId;
    }

    /**
     * Get session ID if available
     */
    getSessionId(): string | undefined {
        return this.tracingContext.sessionId;
    }

    /**
     * Serialize context for passing through Temporal workflows or HTTP
     */
    serialize(): SerializedRequestContext {
        const entries: Record<string, unknown> = {};
        this.contextMap.forEach((value, key) => {
            entries[key] = value;
        });

        return {
            tracingContext: this.tracingContext,
            contextMap: entries
        };
    }

    /**
     * Deserialize context from serialized form
     */
    static deserialize(serialized: SerializedRequestContext): RequestContext {
        const context = new RequestContext(serialized.tracingContext);
        Object.entries(serialized.contextMap).forEach(([key, value]) => {
            context.set(key, value);
        });
        return context;
    }

    /**
     * Create a child context (for nested operations)
     */
    createChild(updates?: Partial<TracingContext>): RequestContext {
        return new RequestContext({
            ...this.tracingContext,
            parentSpanId: this.tracingContext.spanId,
            spanId: undefined, // Child will get new span ID
            ...updates
        });
    }

    /**
     * Clone the context
     */
    clone(): RequestContext {
        return RequestContext.deserialize(this.serialize());
    }

    /**
     * Get all context keys
     */
    keys(): string[] {
        return Array.from(this.contextMap.keys());
    }

    /**
     * Get all context values
     */
    values(): unknown[] {
        return Array.from(this.contextMap.values());
    }

    /**
     * Get all context entries
     */
    entries(): [string, unknown][] {
        return Array.from(this.contextMap.entries());
    }

    /**
     * Clear all custom context (keeps tracing context)
     */
    clear(): void {
        this.contextMap.clear();
    }

    /**
     * Get size of context map
     */
    size(): number {
        return this.contextMap.size;
    }
}

/**
 * Serialized form of RequestContext for passing through boundaries
 */
export interface SerializedRequestContext {
    tracingContext: TracingContext;
    contextMap: Record<string, unknown>;
}

/**
 * Helper to create a RequestContext from common request sources
 */
export function createRequestContext(params: {
    userId?: string;
    traceId?: string;
    requestId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: unknown;
}): RequestContext {
    const { userId, traceId, requestId, sessionId, ipAddress, userAgent, ...rest } = params;

    const context = new RequestContext({
        userId,
        traceId,
        requestId,
        sessionId
    });

    // Add optional fields to context map
    if (ipAddress) context.set("ipAddress", ipAddress);
    if (userAgent) context.set("userAgent", userAgent);

    // Add any additional fields
    Object.entries(rest).forEach(([key, value]) => {
        context.set(key, value);
    });

    return context;
}
