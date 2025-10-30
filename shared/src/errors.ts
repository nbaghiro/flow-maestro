/**
 * Error handling utilities for type-safe error handling in catch blocks.
 */

/**
 * Type guard to check if a value is an Error instance.
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Type guard to check if a value has an error-like structure.
 */
export function isErrorLike(error: unknown): error is { message: string; name?: string } {
    return (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
    );
}

/**
 * Safely get error message from unknown error value.
 */
export function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message;
    }

    if (isErrorLike(error)) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "An unknown error occurred";
}

/**
 * Safely get error stack trace from unknown error value.
 */
export function getErrorStack(error: unknown): string | undefined {
    if (isError(error)) {
        return error.stack;
    }

    return undefined;
}

/**
 * Convert unknown error to Error instance.
 */
export function toError(error: unknown): Error {
    if (isError(error)) {
        return error;
    }

    if (isErrorLike(error)) {
        const err = new Error(error.message);
        if (error.name) {
            err.name = error.name;
        }
        return err;
    }

    if (typeof error === "string") {
        return new Error(error);
    }

    return new Error("An unknown error occurred");
}
