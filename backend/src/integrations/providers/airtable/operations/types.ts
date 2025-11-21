/**
 * Airtable API response types
 */

export interface AirtableRecord {
    id: string;
    createdTime: string;
    fields: Record<string, unknown>;
}

export interface AirtableListRecordsResponse {
    records: AirtableRecord[];
    offset?: string;
}

export interface AirtableBase {
    id: string;
    name: string;
    permissionLevel: string;
}

export interface AirtableTable {
    id: string;
    name: string;
    description?: string;
    primaryFieldId: string;
    fields: AirtableField[];
    views: AirtableView[];
}

export interface AirtableField {
    id: string;
    name: string;
    type: string;
    description?: string;
    options?: Record<string, unknown>;
}

export interface AirtableView {
    id: string;
    name: string;
    type: string;
}

export interface AirtableComment {
    id: string;
    text: string;
    createdTime: string;
    author: {
        id: string;
        email?: string;
        name?: string;
    };
    mentioned?: Record<string, unknown>;
}

export interface AirtableWebhook {
    id: string;
    macSecretBase64: string;
    expirationTime: string;
    cursor?: number;
    isHookEnabled: boolean;
}

export interface AirtableWebhookPayload {
    cursor: number;
    mightHaveMore: boolean;
    payloads: Array<{
        timestamp: string;
        baseTransactionNumber: number;
        actionMetadata?: Record<string, unknown>;
        changedTablesById?: Record<string, unknown>;
        createdTablesById?: Record<string, unknown>;
        destroyedTableIds?: string[];
    }>;
}
