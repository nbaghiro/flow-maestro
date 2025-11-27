/**
 * Email Builder Utility
 *
 * Builds RFC 2822 formatted emails and encodes them in base64url format
 * as required by the Gmail API for sending messages.
 *
 * Reference: https://datatracker.ietf.org/doc/html/rfc2822
 */

export interface EmailParams {
    from?: string; // Optional - Gmail uses authenticated user's email
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    bodyType?: "text" | "html";
    attachments?: Array<{
        filename: string;
        content: string; // base64 encoded
        mimeType: string;
    }>;
    replyTo?: string;
    inReplyTo?: string; // Message-ID for threading
    references?: string; // Reference chain for threading
}

/**
 * Convert a string to base64url encoding (Gmail's required format)
 */
export function toBase64Url(str: string): string {
    // Convert string to base64
    const base64 = Buffer.from(str).toString("base64");
    // Convert to base64url by replacing + with - and / with _
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Format email addresses for headers
 */
function formatAddresses(addresses: string | string[]): string {
    if (Array.isArray(addresses)) {
        return addresses.join(", ");
    }
    return addresses;
}

/**
 * Generate a unique boundary string for multipart messages
 */
function generateBoundary(): string {
    return `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Encode a header value for non-ASCII characters (RFC 2047)
 */
function encodeHeader(value: string): string {
    // Check if encoding is needed (contains non-ASCII characters)
    const hasNonAscii = Array.from(value).some((char) => char.charCodeAt(0) > 127);
    if (hasNonAscii) {
        // Use base64 encoding for non-ASCII headers
        const encoded = Buffer.from(value, "utf-8").toString("base64");
        return `=?UTF-8?B?${encoded}?=`;
    }
    return value;
}

/**
 * Build raw RFC 2822 email message
 */
export function buildRawEmail(params: EmailParams): string {
    const headers: string[] = [];
    const boundary = generateBoundary();
    const hasAttachments = params.attachments && params.attachments.length > 0;

    // Build headers
    if (params.from) {
        headers.push(`From: ${params.from}`);
    }
    headers.push(`To: ${formatAddresses(params.to)}`);

    if (params.cc) {
        headers.push(`Cc: ${formatAddresses(params.cc)}`);
    }
    if (params.bcc) {
        headers.push(`Bcc: ${formatAddresses(params.bcc)}`);
    }

    headers.push(`Subject: ${encodeHeader(params.subject)}`);

    if (params.replyTo) {
        headers.push(`Reply-To: ${params.replyTo}`);
    }

    // Threading headers
    if (params.inReplyTo) {
        headers.push(`In-Reply-To: ${params.inReplyTo}`);
    }
    if (params.references) {
        headers.push(`References: ${params.references}`);
    }

    headers.push("MIME-Version: 1.0");

    if (hasAttachments) {
        // Multipart message with attachments
        headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

        const parts: string[] = [];

        // Body part
        const bodyContentType =
            params.bodyType === "html" ? "text/html; charset=UTF-8" : "text/plain; charset=UTF-8";

        parts.push(`--${boundary}`);
        parts.push(`Content-Type: ${bodyContentType}`);
        parts.push("Content-Transfer-Encoding: base64");
        parts.push("");
        parts.push(Buffer.from(params.body, "utf-8").toString("base64"));

        // Attachment parts
        for (const attachment of params.attachments!) {
            parts.push(`--${boundary}`);
            parts.push(
                `Content-Type: ${attachment.mimeType}; name="${encodeHeader(attachment.filename)}"`
            );
            parts.push("Content-Transfer-Encoding: base64");
            parts.push(
                `Content-Disposition: attachment; filename="${encodeHeader(attachment.filename)}"`
            );
            parts.push("");
            // Attachment content should already be base64 encoded
            parts.push(attachment.content);
        }

        parts.push(`--${boundary}--`);

        return headers.join("\r\n") + "\r\n\r\n" + parts.join("\r\n");
    } else {
        // Simple message without attachments
        const contentType =
            params.bodyType === "html" ? "text/html; charset=UTF-8" : "text/plain; charset=UTF-8";

        headers.push(`Content-Type: ${contentType}`);
        headers.push("Content-Transfer-Encoding: base64");

        const encodedBody = Buffer.from(params.body, "utf-8").toString("base64");
        return headers.join("\r\n") + "\r\n\r\n" + encodedBody;
    }
}

/**
 * Build a reply email that maintains threading
 */
export function buildReplyEmail(
    params: Omit<EmailParams, "inReplyTo" | "references"> & {
        originalMessageId: string;
        originalReferences?: string;
    }
): string {
    // Build references chain for threading
    const references = params.originalReferences
        ? `${params.originalReferences} ${params.originalMessageId}`
        : params.originalMessageId;

    return buildRawEmail({
        ...params,
        inReplyTo: params.originalMessageId,
        references
    });
}

/**
 * Build a forward email
 */
export function buildForwardEmail(
    params: EmailParams & {
        originalMessage: {
            from: string;
            to: string;
            date: string;
            subject: string;
            body: string;
        };
    }
): string {
    // Build forwarded message body
    const forwardHeader = [
        "",
        "---------- Forwarded message ---------",
        `From: ${params.originalMessage.from}`,
        `Date: ${params.originalMessage.date}`,
        `Subject: ${params.originalMessage.subject}`,
        `To: ${params.originalMessage.to}`,
        "",
        params.originalMessage.body
    ].join("\n");

    const fullBody = params.body + forwardHeader;

    return buildRawEmail({
        ...params,
        subject: params.subject.startsWith("Fwd:") ? params.subject : `Fwd: ${params.subject}`,
        body: fullBody
    });
}

/**
 * Extract email headers from a Gmail message payload
 */
export function extractHeaders(
    headers: Array<{ name: string; value: string }>
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const header of headers) {
        result[header.name.toLowerCase()] = header.value;
    }
    return result;
}

/**
 * Decode base64url encoded content (Gmail format)
 */
export function decodeBase64Url(data: string): string {
    // Replace URL-safe characters back to standard base64
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Extract plain text body from Gmail message parts
 */
export function extractPlainTextBody(part: {
    mimeType: string;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: unknown[] }>;
}): string | null {
    if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
    }

    if (part.parts) {
        for (const subPart of part.parts) {
            const text = extractPlainTextBody(subPart as typeof part);
            if (text) return text;
        }
    }

    return null;
}

/**
 * Extract HTML body from Gmail message parts
 */
export function extractHtmlBody(part: {
    mimeType: string;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: unknown[] }>;
}): string | null {
    if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
    }

    if (part.parts) {
        for (const subPart of part.parts) {
            const html = extractHtmlBody(subPart as typeof part);
            if (html) return html;
        }
    }

    return null;
}
