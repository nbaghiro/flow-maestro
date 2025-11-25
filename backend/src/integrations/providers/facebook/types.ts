/**
 * Facebook Provider Types
 * Types for Meta Graph API integration with Facebook Messenger
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
 * Facebook Page
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
 * Messenger send message request
 */
export interface MessengerSendMessageRequest {
    recipient: {
        id: string; // PSID
    };
    message: MessengerMessageContent;
    messaging_type?: "RESPONSE" | "UPDATE" | "MESSAGE_TAG";
    tag?: MessengerMessageTag;
    notification_type?: "REGULAR" | "SILENT_PUSH" | "NO_PUSH";
}

/**
 * Messenger message tags (for sending outside 24h window)
 */
export type MessengerMessageTag =
    | "CONFIRMED_EVENT_UPDATE"
    | "POST_PURCHASE_UPDATE"
    | "ACCOUNT_UPDATE"
    | "HUMAN_AGENT";

/**
 * Messenger message content
 */
export interface MessengerMessageContent {
    text?: string;
    attachment?: MessengerAttachment;
    quick_replies?: MessengerQuickReply[];
}

/**
 * Messenger attachment
 */
export interface MessengerAttachment {
    type: "image" | "video" | "audio" | "file" | "template";
    payload: {
        url?: string;
        is_reusable?: boolean;
        template_type?: "button" | "generic" | "media" | "receipt";
        text?: string; // For button template
        buttons?: MessengerButton[];
        elements?: MessengerGenericTemplateElement[];
        media_type?: "image" | "video"; // For media template
        attachment_id?: string; // For media template
        sharable?: boolean;
    };
}

/**
 * Messenger quick reply
 */
export interface MessengerQuickReply {
    content_type: "text" | "user_phone_number" | "user_email";
    title?: string;
    payload?: string;
    image_url?: string;
}

/**
 * Messenger button
 */
export interface MessengerButton {
    type: "web_url" | "postback" | "phone_number" | "account_link" | "account_unlink";
    title: string;
    url?: string;
    payload?: string;
    webview_height_ratio?: "compact" | "tall" | "full";
    messenger_extensions?: boolean;
    fallback_url?: string;
}

/**
 * Messenger generic template element
 */
export interface MessengerGenericTemplateElement {
    title: string;
    subtitle?: string;
    image_url?: string;
    default_action?: {
        type: "web_url";
        url: string;
        webview_height_ratio?: "compact" | "tall" | "full";
        messenger_extensions?: boolean;
        fallback_url?: string;
    };
    buttons?: MessengerButton[];
}

/**
 * Messenger send message response
 */
export interface MessengerSendMessageResponse {
    recipient_id: string;
    message_id: string;
}

/**
 * Messenger sender action (typing indicator, mark seen)
 */
export interface MessengerSenderActionRequest {
    recipient: {
        id: string;
    };
    sender_action: "typing_on" | "typing_off" | "mark_seen";
}

/**
 * Messenger conversation
 */
export interface MessengerConversation {
    id: string;
    updated_time: string;
    link?: string;
    message_count?: number;
    unread_count?: number;
    participants: {
        data: Array<{
            id: string;
            name?: string;
            email?: string;
        }>;
    };
}

/**
 * Messenger message
 */
export interface MessengerMessage {
    id: string;
    created_time: string;
    from: {
        id: string;
        name?: string;
        email?: string;
    };
    to: {
        data: Array<{
            id: string;
            name?: string;
            email?: string;
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
    shares?: {
        data: Array<{
            link?: string;
            name?: string;
            description?: string;
        }>;
    };
    sticker?: string;
}

/**
 * Messenger webhook payload
 */
export interface MessengerWebhookPayload {
    object: "page";
    entry: Array<{
        id: string; // Page ID
        time: number;
        messaging?: Array<MessengerWebhookMessagingEvent>;
        standby?: Array<MessengerWebhookMessagingEvent>; // Standby mode events
    }>;
}

/**
 * Messenger webhook messaging event
 */
export interface MessengerWebhookMessagingEvent {
    sender: {
        id: string; // PSID
    };
    recipient: {
        id: string; // Page ID
    };
    timestamp: number;
    message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
            type: "image" | "video" | "audio" | "file" | "location" | "fallback" | "template";
            payload: {
                url?: string;
                sticker_id?: number;
                coordinates?: {
                    lat: number;
                    long: number;
                };
                title?: string;
            };
        }>;
        quick_reply?: {
            payload: string;
        };
        is_echo?: boolean;
        app_id?: string;
        metadata?: string;
        reply_to?: {
            mid: string;
        };
    };
    postback?: {
        mid?: string;
        title: string;
        payload: string;
        referral?: {
            ref?: string;
            source?: string;
            type?: string;
        };
    };
    read?: {
        watermark: number;
    };
    delivery?: {
        mids?: string[];
        watermark: number;
    };
    referral?: {
        ref?: string;
        source?: string;
        type?: string;
        ad_id?: string;
    };
    reaction?: {
        mid: string;
        action: "react" | "unreact";
        reaction?: string;
        emoji?: string;
    };
}

// ==========================================================================
// Facebook Page Posts Types
// ==========================================================================

/**
 * Create a text or link post request
 */
export interface FacebookCreatePostRequest {
    message?: string;
    link?: string;
    published?: boolean;
    scheduled_publish_time?: number | string; // Unix timestamp, ISO 8601, or strtotime string
    targeting?: {
        geo_locations?: {
            countries?: string[];
            cities?: Array<{ key: string }>;
            regions?: Array<{ key: string }>;
        };
        age_min?: number;
        age_max?: number;
    };
    feed_targeting?: {
        age_min?: number;
        age_max?: number;
        genders?: number[];
        geo_locations?: {
            countries?: string[];
        };
    };
}

/**
 * Create a photo post request
 */
export interface FacebookCreatePhotoRequest {
    url?: string;
    caption?: string;
    published?: boolean;
    scheduled_publish_time?: number | string;
    temporary?: boolean; // For multi-photo posts
    vault_image_id?: string;
}

/**
 * Create a multi-photo post request
 */
export interface FacebookCreateMultiPhotoPostRequest {
    message?: string;
    attached_media: Array<{ media_fbid: string }>;
    published?: boolean;
    scheduled_publish_time?: number | string;
}

/**
 * Create a video post request (non-resumable upload)
 */
export interface FacebookCreateVideoRequest {
    file_url?: string;
    title?: string;
    description?: string;
    published?: boolean;
    scheduled_publish_time?: number | string;
    thumb?: string; // URL to thumbnail image
}

/**
 * Video upload session start response
 */
export interface FacebookVideoUploadSessionResponse {
    video_id: string;
    start_offset: string;
    end_offset: string;
    upload_session_id: string;
}

/**
 * Update post request
 */
export interface FacebookUpdatePostRequest {
    message?: string;
    privacy?: {
        value: "EVERYONE" | "ALL_FRIENDS" | "FRIENDS_OF_FRIENDS" | "SELF";
    };
    is_hidden?: boolean;
    is_published?: boolean;
    scheduled_publish_time?: number | string;
}

/**
 * Facebook page post
 */
export interface FacebookPagePost {
    id: string;
    message?: string;
    story?: string;
    created_time: string;
    updated_time?: string;
    permalink_url?: string;
    full_picture?: string;
    picture?: string;
    link?: string;
    name?: string;
    description?: string;
    caption?: string;
    type?: "link" | "status" | "photo" | "video" | "offer";
    status_type?: string;
    is_published?: boolean;
    is_hidden?: boolean;
    scheduled_publish_time?: number;
    from?: {
        id: string;
        name: string;
    };
    shares?: {
        count: number;
    };
    likes?: {
        data: Array<{ id: string; name: string }>;
        summary?: { total_count: number };
    };
    comments?: {
        data: Array<FacebookComment>;
        summary?: { total_count: number };
    };
    reactions?: {
        data: Array<{ id: string; name: string; type: string }>;
        summary?: { total_count: number };
    };
    attachments?: {
        data: Array<{
            type: string;
            url?: string;
            title?: string;
            description?: string;
            media?: {
                image?: { src: string; width: number; height: number };
            };
            subattachments?: {
                data: Array<{
                    type: string;
                    url?: string;
                    media?: {
                        image?: { src: string; width: number; height: number };
                    };
                }>;
            };
        }>;
    };
}

/**
 * Facebook comment
 */
export interface FacebookComment {
    id: string;
    message: string;
    created_time: string;
    from?: {
        id: string;
        name: string;
    };
    like_count?: number;
    comment_count?: number;
}

/**
 * Facebook photo object
 */
export interface FacebookPhoto {
    id: string;
    created_time: string;
    name?: string;
    picture?: string;
    source?: string;
    link?: string;
    height?: number;
    width?: number;
    images?: Array<{
        source: string;
        width: number;
        height: number;
    }>;
}

/**
 * Facebook video object
 */
export interface FacebookVideo {
    id: string;
    created_time: string;
    title?: string;
    description?: string;
    source?: string;
    picture?: string;
    permalink_url?: string;
    length?: number;
    status?: {
        video_status: "ready" | "processing" | "error";
        uploading_phase?: {
            status: string;
        };
        processing_phase?: {
            status: string;
        };
        publishing_phase?: {
            status: string;
            publish_status?: string;
            publish_time?: string;
        };
    };
}

/**
 * Post insight metric
 */
export interface FacebookPostInsight {
    id: string;
    name: string;
    period: string;
    values: Array<{
        value: number | Record<string, number>;
    }>;
    title: string;
    description: string;
}

/**
 * Available post insight metrics
 */
export type FacebookPostInsightMetric =
    | "post_impressions"
    | "post_impressions_unique"
    | "post_impressions_paid"
    | "post_impressions_paid_unique"
    | "post_impressions_fan"
    | "post_impressions_fan_unique"
    | "post_impressions_organic"
    | "post_impressions_organic_unique"
    | "post_impressions_viral"
    | "post_impressions_viral_unique"
    | "post_impressions_by_story_type"
    | "post_impressions_by_story_type_unique"
    | "post_engaged_users"
    | "post_negative_feedback"
    | "post_negative_feedback_unique"
    | "post_negative_feedback_by_type"
    | "post_negative_feedback_by_type_unique"
    | "post_engaged_fan"
    | "post_clicks"
    | "post_clicks_unique"
    | "post_clicks_by_type"
    | "post_clicks_by_type_unique"
    | "post_reactions_by_type_total"
    | "post_reactions_like_total"
    | "post_reactions_love_total"
    | "post_reactions_wow_total"
    | "post_reactions_haha_total"
    | "post_reactions_sorry_total"
    | "post_reactions_anger_total"
    | "post_video_avg_time_watched"
    | "post_video_complete_views_organic"
    | "post_video_complete_views_organic_unique"
    | "post_video_complete_views_paid"
    | "post_video_complete_views_paid_unique"
    | "post_video_views"
    | "post_video_views_organic"
    | "post_video_views_organic_unique"
    | "post_video_views_paid"
    | "post_video_views_paid_unique"
    | "post_video_length"
    | "post_video_views_10s"
    | "post_video_views_10s_unique"
    | "post_video_views_10s_organic"
    | "post_video_views_10s_paid"
    | "post_video_views_sound_on"
    | "post_video_view_time"
    | "post_video_view_time_organic";

/**
 * Page-level insight metric (for reference)
 */
export type FacebookPageInsightMetric =
    | "page_impressions"
    | "page_impressions_unique"
    | "page_impressions_paid"
    | "page_impressions_organic"
    | "page_impressions_viral"
    | "page_engaged_users"
    | "page_post_engagements"
    | "page_consumptions"
    | "page_consumptions_unique"
    | "page_negative_feedback"
    | "page_fan_adds"
    | "page_fan_removes"
    | "page_fans"
    | "page_views_total"
    | "page_video_views"
    | "page_video_views_paid"
    | "page_video_views_organic";

/**
 * Pagination cursor
 */
export interface FacebookPaging {
    cursors?: {
        before?: string;
        after?: string;
    };
    next?: string;
    previous?: string;
}

/**
 * Paginated response
 */
export interface FacebookPaginatedResponse<T> {
    data: T[];
    paging?: FacebookPaging;
}
