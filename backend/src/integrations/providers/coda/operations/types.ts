/**
 * Coda operation types and interfaces
 */

export interface CodaDoc {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
    owner: string;
    ownerName: string;
    createdAt: string;
    updatedAt: string;
}

export interface CodaDocsResponse {
    items: CodaDoc[];
    nextPageToken?: string;
    nextPageLink?: string;
}

export interface CodaTable {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
    parent: {
        id: string;
        type: string;
        href: string;
        browserLink: string;
        name: string;
    };
}

export interface CodaTablesResponse {
    items: CodaTable[];
    nextPageToken?: string;
}

export interface CodaRow {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
    index: number;
    values: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface CodaRowsResponse {
    items: CodaRow[];
    nextPageToken?: string;
}

export interface CodaAddRowResponse {
    requestId: string;
    addedRowIds: string[];
}
