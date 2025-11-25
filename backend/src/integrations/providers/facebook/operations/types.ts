/**
 * Messenger operation response types
 */

/**
 * Response after sending a message
 */
export interface MessengerSendResponse {
    messageId: string;
    recipientId: string;
}

/**
 * Response for conversation list
 */
export interface MessengerConversationResponse {
    id: string;
    updatedTime: string;
    link?: string;
    messageCount?: number;
    unreadCount?: number;
    participants: Array<{
        id: string;
        name?: string;
        email?: string;
    }>;
}

/**
 * Response for message list
 */
export interface MessengerMessageResponse {
    id: string;
    createdTime: string;
    from: {
        id: string;
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
 * Response for page info
 */
export interface MessengerPageResponse {
    id: string;
    name: string;
    username?: string;
    about?: string;
    category?: string;
    pictureUrl?: string;
}

/**
 * Response for typing indicator / mark seen
 */
export interface MessengerActionResponse {
    success: boolean;
    recipientId: string;
}
