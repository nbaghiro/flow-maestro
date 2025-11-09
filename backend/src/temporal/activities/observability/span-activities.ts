/**
 * Span Activities for Temporal Workflows
 * Activities for creating and ending spans from workflows
 */

import { getSpanService } from "../../../shared/observability";
import type {
    CreateSpanInput,
    SpanContext,
    SpanAttributes
} from "../../../shared/observability/types";

/**
 * Create a new span
 */
export async function createSpan(input: CreateSpanInput): Promise<SpanContext> {
    const spanService = getSpanService();
    const activeSpan = spanService.createSpan(input);

    // Return context for workflow to track
    return activeSpan.getContext();
}

/**
 * End a span
 */
export async function endSpan(params: {
    spanId: string;
    output?: Record<string, unknown>;
    error?: { message: string; type: string; stack?: string };
    attributes?: SpanAttributes;
}): Promise<void> {
    const spanService = getSpanService();
    await spanService.endSpan(params);
}

/**
 * End a span with an error
 */
export async function endSpanWithError(params: {
    spanId: string;
    error: Error | { message: string; type: string; stack?: string };
}): Promise<void> {
    const spanService = getSpanService();
    await spanService.endSpan({
        spanId: params.spanId,
        error: params.error
    });
}

/**
 * Set attributes on a span (update in batch)
 * Note: This is a placeholder for future implementation
 * Currently, spans are immutable once created and batched
 */
export async function setSpanAttributes(): Promise<void> {
    // Note: Since spans are batched, we need to update the span in the batch
    // This is a simplified version - in production you might want to
    // keep spans in a map and update them there
    // For now, we'll just create a new span update activity
    // that merges attributes when the span is flushed
}
