export interface IntegrationModel {
    id: string;
    name: string;
    type: string;
    config: Record<string, any>;
    credentials: Record<string, any>;
    user_id: string;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateIntegrationInput {
    name: string;
    type: string;
    config: Record<string, any>;
    credentials: Record<string, any>;
    user_id: string;
    enabled?: boolean;
}

export interface UpdateIntegrationInput {
    name?: string;
    config?: Record<string, any>;
    credentials?: Record<string, any>;
    enabled?: boolean;
}
