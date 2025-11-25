/**
 * Instagram Provider Types
 * Types for Meta Graph API integration with Instagram
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
 * Instagram account info
 */
export interface InstagramAccount {
    id: string;
    name?: string;
    username: string;
    profile_picture_url?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    biography?: string;
    website?: string;
}

/**
 * Facebook Page with Instagram account
 */
export interface FacebookPage {
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: {
        id: string;
    };
}

/**
 * Instagram send message request
 */
export interface InstagramSendMessageRequest {
    recipient: {
        id: string; // IGSID
    };
    message: InstagramMessageContent;
    messaging_type?: "RESPONSE" | "UPDATE" | "MESSAGE_TAG";
    tag?: "HUMAN_AGENT";
}

/**
 * Instagram message content
 */
export interface InstagramMessageContent {
    text?: string;
    attachment?: {
        type: "image" | "video" | "audio" | "file" | "template";
        payload: {
            url?: string;
            is_reusable?: boolean;
            template_type?: "generic";
            elements?: InstagramGenericTemplateElement[];
        };
    };
    quick_replies?: InstagramQuickReply[];
}

/**
 * Instagram quick reply button
 */
export interface InstagramQuickReply {
    content_type: "text";
    title: string;
    payload: string;
    image_url?: string;
}

/**
 * Instagram generic template element (rich card)
 */
export interface InstagramGenericTemplateElement {
    title: string;
    subtitle?: string;
    image_url?: string;
    default_action?: {
        type: "web_url";
        url: string;
    };
    buttons?: InstagramButton[];
}

/**
 * Instagram button
 */
export interface InstagramButton {
    type: "web_url" | "postback";
    title: string;
    url?: string;
    payload?: string;
}

/**
 * Instagram send message response
 */
export interface InstagramSendMessageResponse {
    recipient_id: string;
    message_id: string;
}

/**
 * Instagram conversation
 */
export interface InstagramConversation {
    id: string;
    updated_time: string;
    participants: {
        data: Array<{
            id: string;
            username?: string;
            name?: string;
        }>;
    };
}

/**
 * Instagram message
 */
export interface InstagramMessage {
    id: string;
    created_time: string;
    from: {
        id: string;
        username?: string;
        name?: string;
    };
    to: {
        data: Array<{
            id: string;
            username?: string;
            name?: string;
        }>;
    };
    message?: string;
    attachments?: {
        data: Array<{
            id: string;
            mime_type: string;
            name: string;
            size: number;
            file_url?: string;
            image_data?: {
                url: string;
                width: number;
                height: number;
            };
            video_data?: {
                url: string;
                width: number;
                height: number;
            };
        }>;
    };
}

/**
 * Instagram media container options
 */
export interface InstagramMediaContainerOptions {
    image_url?: string;
    video_url?: string;
    caption?: string;
    media_type?: "IMAGE" | "VIDEO" | "CAROUSEL" | "REELS" | "STORIES";
    children?: string[]; // Container IDs for carousel
    share_to_feed?: boolean; // For reels
    cover_url?: string; // For reels
    thumb_offset?: number; // For video thumbnail
    location_id?: string;
    user_tags?: Array<{
        username: string;
        x: number;
        y: number;
    }>;
}

/**
 * Instagram media
 */
export interface InstagramMedia {
    id: string;
    media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
    media_url?: string;
    thumbnail_url?: string;
    permalink: string;
    caption?: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
    children?: {
        data: Array<{
            id: string;
            media_type: string;
            media_url?: string;
        }>;
    };
}

/**
 * Instagram media insight
 */
export interface InstagramMediaInsight {
    id: string;
    name: string;
    period: string;
    values: Array<{
        value: number;
    }>;
    title: string;
    description: string;
}

/**
 * Instagram account insight
 */
export interface InstagramAccountInsight {
    id: string;
    name: string;
    period: string;
    values: Array<{
        value: number;
        end_time?: string;
    }>;
    title: string;
    description: string;
}

/**
 * Instagram webhook payload
 */
export interface InstagramWebhookPayload {
    object: "instagram";
    entry: Array<{
        id: string; // Instagram Account ID
        time: number;
        messaging?: Array<InstagramWebhookMessagingEvent>;
    }>;
}

/**
 * Instagram webhook messaging event
 */
export interface InstagramWebhookMessagingEvent {
    sender: {
        id: string; // IGSID
    };
    recipient: {
        id: string; // Page ID
    };
    timestamp: number;
    message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
            type: "image" | "video" | "audio" | "file" | "share" | "story_mention";
            payload: {
                url?: string;
                sticker_id?: number;
            };
        }>;
        quick_reply?: {
            payload: string;
        };
        is_echo?: boolean;
        is_deleted?: boolean;
        reply_to?: {
            mid: string;
        };
    };
    read?: {
        mid: string;
    };
    reaction?: {
        mid: string;
        action: "react" | "unreact";
        reaction?: string; // emoji
        emoji?: string;
    };
    postback?: {
        mid: string;
        title: string;
        payload: string;
    };
}
