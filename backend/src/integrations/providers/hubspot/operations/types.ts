/**
 * Shared types for HubSpot operations
 */

/**
 * HubSpot property value
 */
export interface HubspotProperty {
    [key: string]: string | number | boolean | null;
}

/**
 * HubSpot object response (generic CRM object)
 */
export interface HubspotObject {
    id: string;
    properties: HubspotProperty;
    createdAt: string;
    updatedAt: string;
    archived?: boolean;
}

/**
 * HubSpot list response (paginated)
 */
export interface HubspotListResponse<T> {
    results: T[];
    paging?: {
        next?: {
            after: string;
            link: string;
        };
    };
}

/**
 * HubSpot batch response
 */
export interface HubspotBatchResponse<T> {
    status: "COMPLETE" | "PENDING";
    results: T[];
    startedAt: string;
    completedAt: string;
}

/**
 * HubSpot association type
 */
export interface HubspotAssociation {
    id: string;
    type: string;
}

/**
 * HubSpot search filter
 */
export interface HubspotFilter {
    propertyName: string;
    operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE" | "CONTAINS" | "NOT_CONTAINS";
    value: string | number | boolean;
}

/**
 * HubSpot search request
 */
export interface HubspotSearchRequest {
    filterGroups?: Array<{
        filters: HubspotFilter[];
    }>;
    sorts?: Array<{
        propertyName: string;
        direction: "ASCENDING" | "DESCENDING";
    }>;
    properties?: string[];
    limit?: number;
    after?: string;
}

/**
 * Contact-specific types
 */
export interface HubspotContact extends HubspotObject {
    properties: {
        email?: string;
        firstname?: string;
        lastname?: string;
        phone?: string;
        company?: string;
        website?: string;
        lifecyclestage?: string;
    } & HubspotProperty;
}

/**
 * Company-specific types
 */
export interface HubspotCompany extends HubspotObject {
    properties: {
        name?: string;
        domain?: string;
        city?: string;
        state?: string;
        country?: string;
        industry?: string;
    } & HubspotProperty;
}

/**
 * Deal-specific types
 */
export interface HubspotDeal extends HubspotObject {
    properties: {
        dealname?: string;
        amount?: string | number;
        closedate?: string;
        dealstage?: string;
        pipeline?: string;
    } & HubspotProperty;
}

/**
 * Ticket-specific types
 */
export interface HubspotTicket extends HubspotObject {
    properties: {
        subject?: string;
        content?: string;
        hs_ticket_priority?: string;
        hs_pipeline_stage?: string;
        hs_pipeline?: string;
    } & HubspotProperty;
}

/**
 * Product-specific types
 */
export interface HubspotProduct extends HubspotObject {
    properties: {
        name?: string;
        description?: string;
        price?: string | number;
        hs_sku?: string;
    } & HubspotProperty;
}

/**
 * Engagement types (Meeting, Task, Note, Call, Email)
 */
export interface HubspotEngagement extends HubspotObject {
    properties: {
        hs_timestamp?: string;
        hs_owner_id?: string;
    } & HubspotProperty;
}
