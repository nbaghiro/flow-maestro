/**
 * Instagram operation response types
 */

/**
 * Response after sending a message
 */
export interface InstagramSendResponse {
    messageId: string;
    recipientId: string;
}

/**
 * Response for conversation list
 */
export interface InstagramConversationResponse {
    id: string;
    updatedTime: string;
    participants: Array<{
        id: string;
        username?: string;
        name?: string;
    }>;
}

/**
 * Response for message list
 */
export interface InstagramMessageResponse {
    id: string;
    createdTime: string;
    from: {
        id: string;
        username?: string;
        name?: string;
    };
    text?: string;
    attachments?: Array<{
        id: string;
        type: string;
        url?: string;
    }>;
}

/**
 * Response for publish operations
 */
export interface InstagramPublishResponse {
    mediaId: string;
    permalink?: string;
}

/**
 * Response for media info
 */
export interface InstagramMediaResponse {
    id: string;
    mediaType: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    permalink: string;
    caption?: string;
    timestamp: string;
    likeCount?: number;
    commentsCount?: number;
}

/**
 * Response for media insights
 */
export interface InstagramInsightResponse {
    name: string;
    value: number;
    period: string;
    title: string;
    description: string;
}

/**
 * Response for account info
 */
export interface InstagramAccountResponse {
    id: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
    followersCount?: number;
    followsCount?: number;
    mediaCount?: number;
    biography?: string;
    website?: string;
}
