/**
 * Trigger Execution Activity
 * Handles workflow executions initiated by triggers
 */

import { WorkflowRepository } from "../../storage/repositories/WorkflowRepository";
import { TriggerRepository } from "../../storage/repositories/TriggerRepository";
import { ExecutionRepository } from "../../storage/repositories/ExecutionRepository";

export interface TriggerExecutionInput {
    triggerId: string;
    workflowId: string;
    payload?: Record<string, any>;
}

export interface TriggerExecutionResult {
    executionId: string;
    workflowDefinition: any;
    inputs: Record<string, any>;
}

/**
 * Prepare workflow for execution triggered by a schedule/webhook/event
 * This activity:
 * 1. Fetches workflow from database
 * 2. Creates execution record
 * 3. Links execution to trigger
 * 4. Returns workflow definition for orchestrator
 */
export async function prepareTriggeredExecution(
    input: TriggerExecutionInput
): Promise<TriggerExecutionResult> {
    const { triggerId, workflowId, payload = {} } = input;

    const workflowRepo = new WorkflowRepository();
    const triggerRepo = new TriggerRepository();
    const executionRepo = new ExecutionRepository();

    try {
        // Fetch workflow definition
        const workflow = await workflowRepo.findById(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        // Verify trigger exists
        const trigger = await triggerRepo.findById(triggerId);
        if (!trigger) {
            throw new Error(`Trigger not found: ${triggerId}`);
        }

        // Create execution record
        const execution = await executionRepo.create({
            workflow_id: workflowId,
            inputs: payload
        });

        // Update execution with trigger info and set to running
        await executionRepo.update(execution.id, {
            status: "running",
            current_state: {
                startedBy: "trigger",
                triggerId: triggerId,
                triggerType: trigger.trigger_type,
                triggerName: trigger.name
            },
            started_at: new Date()
        });

        const executionId = execution.id;

        // Link execution to trigger
        await triggerRepo.createExecution({
            trigger_id: triggerId,
            execution_id: executionId,
            trigger_payload: payload
        });

        // Record trigger fired
        await triggerRepo.recordTrigger(triggerId);

        console.log(`Prepared triggered execution: ${executionId} for workflow ${workflowId}`);

        return {
            executionId,
            workflowDefinition: workflow.definition,
            inputs: payload
        };
    } catch (error) {
        console.error(`Failed to prepare triggered execution:`, error);
        throw error;
    }
}

/**
 * Complete a triggered execution
 * Updates execution and trigger records
 */
export async function completeTriggeredExecution(
    executionId: string,
    success: boolean,
    outputs?: Record<string, any>,
    error?: string
): Promise<void> {
    const executionRepo = new ExecutionRepository();

    try {
        await executionRepo.update(executionId, {
            status: success ? "completed" : "failed",
            outputs: outputs || undefined,
            error: error || undefined,
            completed_at: new Date()
        });

        console.log(`Completed triggered execution: ${executionId} (${success ? 'success' : 'failed'})`);
    } catch (err) {
        console.error(`Failed to complete triggered execution ${executionId}:`, err);
        throw err;
    }
}
