/**
 * Slack operation types and interfaces
 */

export interface SlackMessageResponse {
    ok: boolean;
    ts: string;
    channel: string;
    message?: {
        text: string;
        user: string;
        ts: string;
    };
}

export interface SlackConversation {
    id: string;
    name: string;
    is_channel: boolean;
    is_group: boolean;
    is_im: boolean;
    is_private: boolean;
    is_archived: boolean;
    num_members?: number;
}

export interface SlackConversationsResponse {
    ok: boolean;
    channels: SlackConversation[];
    response_metadata?: {
        next_cursor?: string;
    };
}

export interface SlackUser {
    id: string;
    name: string;
    real_name: string;
    profile: {
        email?: string;
        display_name?: string;
        image_72?: string;
    };
}

export interface SlackUserResponse {
    ok: boolean;
    user: SlackUser;
}
