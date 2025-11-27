/**
 * WhatsApp Provider Types
 * Types for Meta Graph API integration with WhatsApp Business
 */

/**
 * Meta Graph API version and base URL
 */
export const META_GRAPH_API_VERSION = "v21.0";
export const META_GRAPH_API_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

/**
 * Meta Graph API error response structure
 */
export interface MetaGraphAPIError {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id?: string;
        error_user_title?: string;
        error_user_msg?: string;
    };
}

/**
 * Check if response is a Meta Graph API error
 */
export function isMetaGraphAPIError(response: unknown): response is MetaGraphAPIError {
    return (
        typeof response === "object" &&
        response !== null &&
        "error" in response &&
        typeof (response as MetaGraphAPIError).error === "object" &&
        "message" in (response as MetaGraphAPIError).error
    );
}

/**
 * WhatsApp Business Account info
 */
export interface WhatsAppBusinessAccount {
    id: string;
    name: string;
    timezone_id: string;
    message_template_namespace: string;
}

/**
 * WhatsApp phone number info
 */
export interface WhatsAppPhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
    code_verification_status?: string;
    platform_type?: string;
    throughput?: {
        level: string;
    };
}

/**
 * WhatsApp message template
 */
export interface WhatsAppMessageTemplate {
    id: string;
    name: string;
    status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
    category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
    language: string;
    components: Array<{
        type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
        text?: string;
        format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
        buttons?: Array<{
            type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
            text: string;
            url?: string;
            phone_number?: string;
        }>;
    }>;
}

/**
 * WhatsApp send message request
 */
export interface WhatsAppSendMessageRequest {
    messaging_product: "whatsapp";
    recipient_type?: "individual";
    to: string;
    type:
        | "text"
        | "template"
        | "image"
        | "video"
        | "audio"
        | "document"
        | "sticker"
        | "location"
        | "contacts"
        | "interactive"
        | "reaction";
    text?: {
        preview_url?: boolean;
        body: string;
    };
    template?: {
        name: string;
        language: {
            code: string;
        };
        components?: Array<{
            type: "header" | "body" | "button";
            parameters?: Array<{
                type: "text" | "currency" | "date_time" | "image" | "document" | "video";
                text?: string;
                currency?: {
                    fallback_value: string;
                    code: string;
                    amount_1000: number;
                };
                date_time?: {
                    fallback_value: string;
                };
                image?: {
                    link?: string;
                    id?: string;
                };
                document?: {
                    link?: string;
                    id?: string;
                    filename?: string;
                };
                video?: {
                    link?: string;
                    id?: string;
                };
            }>;
            sub_type?: "quick_reply" | "url";
            index?: number;
        }>;
    };
    image?: {
        link?: string;
        id?: string;
        caption?: string;
    };
    video?: {
        link?: string;
        id?: string;
        caption?: string;
    };
    audio?: {
        link?: string;
        id?: string;
    };
    document?: {
        link?: string;
        id?: string;
        caption?: string;
        filename?: string;
    };
    sticker?: {
        link?: string;
        id?: string;
    };
    location?: {
        longitude: number;
        latitude: number;
        name?: string;
        address?: string;
    };
    contacts?: Array<{
        name: {
            formatted_name: string;
            first_name?: string;
            last_name?: string;
        };
        phones?: Array<{
            phone: string;
            type?: string;
        }>;
        emails?: Array<{
            email: string;
            type?: string;
        }>;
    }>;
    reaction?: {
        message_id: string;
        emoji: string;
    };
    context?: {
        message_id: string;
    };
}

/**
 * WhatsApp send message response
 */
export interface WhatsAppSendMessageResponse {
    messaging_product: "whatsapp";
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
        message_status?: string;
    }>;
}

/**
 * WhatsApp webhook payload
 */
export interface WhatsAppWebhookPayload {
    object: "whatsapp_business_account";
    entry: Array<{
        id: string;
        changes: Array<{
            field: "messages" | "message_template_status_update";
            value: WhatsAppWebhookMessagesValue | WhatsAppWebhookTemplateStatusValue;
        }>;
    }>;
}

/**
 * WhatsApp webhook messages value
 */
export interface WhatsAppWebhookMessagesValue {
    messaging_product: "whatsapp";
    metadata: {
        display_phone_number: string;
        phone_number_id: string;
    };
    contacts?: Array<{
        profile: {
            name: string;
        };
        wa_id: string;
    }>;
    messages?: Array<WhatsAppWebhookMessage>;
    statuses?: Array<WhatsAppWebhookStatus>;
    errors?: Array<{
        code: number;
        title: string;
        message: string;
        error_data?: {
            details: string;
        };
    }>;
}

/**
 * WhatsApp webhook message
 */
export interface WhatsAppWebhookMessage {
    from: string;
    id: string;
    timestamp: string;
    type:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "document"
        | "sticker"
        | "location"
        | "contacts"
        | "button"
        | "interactive"
        | "reaction"
        | "unsupported";
    text?: {
        body: string;
    };
    image?: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    video?: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    audio?: {
        id: string;
        mime_type: string;
        sha256: string;
        voice?: boolean;
    };
    document?: {
        id: string;
        filename: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    sticker?: {
        id: string;
        mime_type: string;
        sha256: string;
        animated?: boolean;
    };
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    contacts?: Array<{
        name: {
            formatted_name: string;
            first_name?: string;
            last_name?: string;
        };
        phones?: Array<{
            phone: string;
            type?: string;
        }>;
    }>;
    button?: {
        text: string;
        payload: string;
    };
    interactive?: {
        type: "button_reply" | "list_reply";
        button_reply?: {
            id: string;
            title: string;
        };
        list_reply?: {
            id: string;
            title: string;
            description?: string;
        };
    };
    reaction?: {
        message_id: string;
        emoji: string;
    };
    context?: {
        from: string;
        id: string;
        forwarded?: boolean;
        frequently_forwarded?: boolean;
    };
    referral?: {
        source_url: string;
        source_type: string;
        source_id: string;
        headline?: string;
        body?: string;
        media_type?: string;
        image_url?: string;
        video_url?: string;
        thumbnail_url?: string;
    };
}

/**
 * WhatsApp webhook status update
 */
export interface WhatsAppWebhookStatus {
    id: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string;
    recipient_id: string;
    conversation?: {
        id: string;
        origin: {
            type: "business_initiated" | "user_initiated" | "referral_conversion";
        };
        expiration_timestamp?: string;
    };
    pricing?: {
        billable: boolean;
        pricing_model: string;
        category: string;
    };
    errors?: Array<{
        code: number;
        title: string;
        message: string;
        error_data?: {
            details: string;
        };
    }>;
}

/**
 * WhatsApp webhook template status update value
 */
export interface WhatsAppWebhookTemplateStatusValue {
    event: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
    message_template_id: string;
    message_template_name: string;
    message_template_language: string;
    reason?: string;
}

/**
 * WhatsApp business profile
 */
export interface WhatsAppBusinessProfile {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    profile_picture_url?: string;
    vertical?: string;
    websites?: string[];
}
