import type { OAuth2TokenData } from "../../../storage/models/Connection";

/**
 * Zendesk connection data extends OAuth2 with subdomain
 */
export interface ZendeskConnectionData extends OAuth2TokenData {
    subdomain: string;
}

/**
 * Zendesk ticket status
 */
export type TicketStatus = "new" | "open" | "pending" | "hold" | "solved" | "closed";

/**
 * Zendesk ticket priority
 */
export type TicketPriority = "urgent" | "high" | "normal" | "low";

/**
 * Zendesk ticket type
 */
export type TicketType = "problem" | "incident" | "question" | "task";

/**
 * Zendesk user role
 */
export type UserRole = "end-user" | "agent" | "admin";

/**
 * Zendesk ticket
 */
export interface ZendeskTicket {
    id: number;
    url: string;
    external_id: string | null;
    type: TicketType | null;
    subject: string;
    raw_subject: string;
    description: string;
    priority: TicketPriority | null;
    status: TicketStatus;
    recipient: string | null;
    requester_id: number;
    submitter_id: number;
    assignee_id: number | null;
    organization_id: number | null;
    group_id: number | null;
    collaborator_ids: number[];
    follower_ids: number[];
    email_cc_ids: number[];
    forum_topic_id: number | null;
    problem_id: number | null;
    has_incidents: boolean;
    is_public: boolean;
    due_at: string | null;
    tags: string[];
    custom_fields: Array<{ id: number; value: unknown }>;
    satisfaction_rating: {
        score: string;
        comment: string;
    } | null;
    sharing_agreement_ids: number[];
    fields: Array<{ id: number; value: unknown }>;
    followup_ids: number[];
    brand_id: number;
    allow_channelback: boolean;
    allow_attachments: boolean;
    via: {
        channel: string;
        source: {
            from: Record<string, unknown>;
            to: Record<string, unknown>;
            rel: string | null;
        };
    };
    created_at: string;
    updated_at: string;
}

/**
 * Zendesk ticket comment
 */
export interface ZendeskTicketComment {
    id: number;
    type: string;
    body: string;
    html_body: string;
    plain_body: string;
    public: boolean;
    author_id: number;
    attachments: ZendeskAttachment[];
    via: {
        channel: string;
        source: Record<string, unknown>;
    };
    created_at: string;
}

/**
 * Zendesk attachment
 */
export interface ZendeskAttachment {
    id: number;
    file_name: string;
    content_url: string;
    content_type: string;
    size: number;
    thumbnails: Array<{
        id: number;
        file_name: string;
        content_url: string;
        content_type: string;
        size: number;
    }>;
}

/**
 * Zendesk user
 */
export interface ZendeskUser {
    id: number;
    url: string;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
    time_zone: string;
    iana_time_zone: string;
    phone: string | null;
    shared_phone_number: boolean | null;
    photo: {
        url: string;
        id: number;
        file_name: string;
        content_url: string;
        mapped_content_url: string;
        content_type: string;
        size: number;
        width: number | null;
        height: number | null;
        inline: boolean;
        thumbnails: unknown[];
    } | null;
    locale_id: number;
    locale: string;
    organization_id: number | null;
    role: UserRole;
    verified: boolean;
    external_id: string | null;
    tags: string[];
    alias: string | null;
    active: boolean;
    shared: boolean;
    shared_agent: boolean;
    last_login_at: string | null;
    two_factor_auth_enabled: boolean | null;
    signature: string | null;
    details: string | null;
    notes: string | null;
    role_type: number | null;
    custom_role_id: number | null;
    moderator: boolean;
    ticket_restriction: string | null;
    only_private_comments: boolean;
    restricted_agent: boolean;
    suspended: boolean;
    default_group_id: number | null;
    report_csv: boolean;
    user_fields: Record<string, unknown>;
}

/**
 * Zendesk Help Center article
 */
export interface ZendeskArticle {
    id: number;
    url: string;
    html_url: string;
    author_id: number;
    comments_disabled: boolean;
    draft: boolean;
    promoted: boolean;
    position: number;
    vote_sum: number;
    vote_count: number;
    section_id: number;
    created_at: string;
    updated_at: string;
    name: string;
    title: string;
    source_locale: string;
    locale: string;
    outdated: boolean;
    outdated_locales: string[];
    edited_at: string;
    user_segment_id: number | null;
    permission_group_id: number;
    content_tag_ids: number[];
    label_names: string[];
    body: string;
}

/**
 * Zendesk Help Center section
 */
export interface ZendeskSection {
    id: number;
    url: string;
    html_url: string;
    category_id: number;
    position: number;
    sorting: string;
    created_at: string;
    updated_at: string;
    name: string;
    description: string;
    locale: string;
    source_locale: string;
    outdated: boolean;
    parent_section_id: number | null;
    theme_template: string;
}

/**
 * Zendesk Help Center category
 */
export interface ZendeskCategory {
    id: number;
    url: string;
    html_url: string;
    position: number;
    created_at: string;
    updated_at: string;
    name: string;
    description: string;
    locale: string;
    source_locale: string;
    outdated: boolean;
}

/**
 * Zendesk pagination info
 */
export interface ZendeskPagination {
    next_page: string | null;
    previous_page: string | null;
    count: number;
}

/**
 * Zendesk search result
 */
export interface ZendeskSearchResult<T> {
    results: T[];
    facets: unknown | null;
    next_page: string | null;
    previous_page: string | null;
    count: number;
}

/**
 * API Response wrappers
 */
export interface TicketResponse {
    ticket: ZendeskTicket;
}

export interface TicketsResponse extends ZendeskPagination {
    tickets: ZendeskTicket[];
}

export interface UserResponse {
    user: ZendeskUser;
}

export interface UsersResponse extends ZendeskPagination {
    users: ZendeskUser[];
}

export interface ArticleResponse {
    article: ZendeskArticle;
}

export interface ArticlesResponse extends ZendeskPagination {
    articles: ZendeskArticle[];
}

export interface SectionsResponse extends ZendeskPagination {
    sections: ZendeskSection[];
}

export interface CategoriesResponse extends ZendeskPagination {
    categories: ZendeskCategory[];
}

/**
 * Create ticket input
 */
export interface CreateTicketInput {
    subject: string;
    comment: {
        body: string;
        html_body?: string;
        public?: boolean;
    };
    requester_id?: number;
    requester?: {
        name?: string;
        email: string;
        locale_id?: number;
    };
    submitter_id?: number;
    assignee_id?: number;
    assignee_email?: string;
    group_id?: number;
    organization_id?: number;
    collaborator_ids?: number[];
    collaborators?: Array<string | { name?: string; email: string }>;
    type?: TicketType;
    priority?: TicketPriority;
    status?: TicketStatus;
    tags?: string[];
    external_id?: string;
    due_at?: string;
    custom_fields?: Array<{ id: number; value: unknown }>;
}

/**
 * Update ticket input
 */
export interface UpdateTicketInput {
    subject?: string;
    comment?: {
        body: string;
        html_body?: string;
        public?: boolean;
        author_id?: number;
    };
    requester_id?: number;
    assignee_id?: number;
    assignee_email?: string;
    group_id?: number;
    organization_id?: number;
    collaborator_ids?: number[];
    type?: TicketType;
    priority?: TicketPriority;
    status?: TicketStatus;
    tags?: string[];
    external_id?: string;
    due_at?: string;
    custom_fields?: Array<{ id: number; value: unknown }>;
}

/**
 * Create user input
 */
export interface CreateUserInput {
    name: string;
    email: string;
    role?: UserRole;
    organization_id?: number;
    external_id?: string;
    alias?: string;
    details?: string;
    notes?: string;
    phone?: string;
    time_zone?: string;
    locale?: string;
    tags?: string[];
    user_fields?: Record<string, unknown>;
    verified?: boolean;
}

/**
 * Update user input
 */
export interface UpdateUserInput {
    name?: string;
    email?: string;
    role?: UserRole;
    organization_id?: number;
    external_id?: string;
    alias?: string;
    details?: string;
    notes?: string;
    phone?: string;
    time_zone?: string;
    locale?: string;
    tags?: string[];
    user_fields?: Record<string, unknown>;
    suspended?: boolean;
}

/**
 * Create article input
 */
export interface CreateArticleInput {
    title: string;
    body: string;
    locale?: string;
    user_segment_id?: number;
    permission_group_id?: number;
    draft?: boolean;
    promoted?: boolean;
    position?: number;
    label_names?: string[];
}

/**
 * Update article input
 */
export interface UpdateArticleInput {
    title?: string;
    body?: string;
    user_segment_id?: number;
    permission_group_id?: number;
    draft?: boolean;
    promoted?: boolean;
    position?: number;
    label_names?: string[];
}
