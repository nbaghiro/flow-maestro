import { ExecutionStatus } from "@flowmaestro/shared";

export interface ExecutionModel {
    id: string;
    workflow_id: string;
    status: ExecutionStatus;
    inputs: Record<string, any> | null;
    outputs: Record<string, any> | null;
    current_state: any | null;
    error: string | null;
    started_at: Date | null;
    completed_at: Date | null;
    created_at: Date;
}

export interface CreateExecutionInput {
    workflow_id: string;
    inputs?: Record<string, any>;
}

export interface UpdateExecutionInput {
    status?: ExecutionStatus;
    outputs?: Record<string, any>;
    current_state?: any;
    error?: string;
    started_at?: Date;
    completed_at?: Date;
}
