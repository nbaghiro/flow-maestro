import { WorkflowDefinition } from "@flowmaestro/shared";

export interface WorkflowModel {
    id: string;
    name: string;
    description: string | null;
    definition: WorkflowDefinition;
    user_id: string;
    version: number;
    ai_generated: boolean;
    ai_prompt: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateWorkflowInput {
    name: string;
    description?: string;
    definition: WorkflowDefinition;
    user_id: string;
    ai_generated?: boolean;
    ai_prompt?: string;
}

export interface UpdateWorkflowInput {
    name?: string;
    description?: string;
    definition?: WorkflowDefinition;
    version?: number;
    ai_generated?: boolean;
    ai_prompt?: string;
}
