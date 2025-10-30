import { FastifyInstance } from "fastify";
import { getTemporalClient } from "../../../temporal/client";
import { authMiddleware } from "../../middleware";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { ExecutionRepository } from "../../../storage/repositories/ExecutionRepository";
import { convertFrontendToBackend } from "../../../shared/utils/workflow-converter";
import { ManualTriggerConfig } from "../../../storage/models/Trigger";

interface ExecuteTriggerBody {
    inputs?: Record<string, any>;  // Optional inputs override
}

export async function executeTriggerRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/execute",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as any;
            const body = (request.body || {}) as ExecuteTriggerBody;
            const userId = (request as any).userId;

            try {
                const triggerRepo = new TriggerRepository();
                const workflowRepo = new WorkflowRepository();
                const executionRepo = new ExecutionRepository();

                // Get the trigger
                const trigger = await triggerRepo.findById(id);
                if (!trigger) {
                    return reply.status(404).send({
                        success: false,
                        error: "Trigger not found"
                    });
                }

                // Check if trigger is enabled
                if (!trigger.enabled) {
                    return reply.status(400).send({
                        success: false,
                        error: "Trigger is not enabled"
                    });
                }

                // Get the workflow
                const workflow = await workflowRepo.findById(trigger.workflow_id);
                if (!workflow) {
                    return reply.status(404).send({
                        success: false,
                        error: "Workflow not found"
                    });
                }

                // Determine inputs based on trigger type
                let inputs: Record<string, any> = {};

                if (trigger.trigger_type === 'manual') {
                    const config = trigger.config as ManualTriggerConfig;
                    // Use provided inputs override, or fallback to trigger config inputs
                    inputs = body.inputs || config.inputs || {};
                } else if (trigger.trigger_type === 'webhook') {
                    // For webhook triggers, use provided inputs
                    inputs = body.inputs || {};
                } else if (trigger.trigger_type === 'schedule') {
                    // For schedule triggers, use provided inputs override or empty
                    inputs = body.inputs || {};
                } else {
                    // For other trigger types
                    inputs = body.inputs || {};
                }

                // Create execution record
                const execution = await executionRepo.create({
                    workflow_id: workflow.id,
                    inputs
                });

                // Create trigger execution link
                await triggerRepo.createExecution({
                    trigger_id: trigger.id,
                    execution_id: execution.id,
                    trigger_payload: inputs
                });

                // Update trigger stats
                await triggerRepo.recordTrigger(trigger.id);

                // Start Temporal workflow
                const client = await getTemporalClient();
                const workflowId = `execution-${execution.id}`;

                // Convert frontend workflow definition to backend format if needed
                let backendWorkflowDefinition: any;
                const workflowDef = workflow.definition as any;

                // Check if already in backend format (nodes is an object/Record)
                if (workflowDef.nodes && !Array.isArray(workflowDef.nodes)) {
                    // Already in backend format
                    backendWorkflowDefinition = {
                        name: workflow.name,
                        ...workflowDef,
                    };
                } else if (workflowDef.nodes && Array.isArray(workflowDef.nodes)) {
                    // Frontend format, needs conversion
                    backendWorkflowDefinition = convertFrontendToBackend(
                        workflowDef,
                        workflow.name
                    );
                } else {
                    throw new Error("Invalid workflow definition format");
                }

                // Start the workflow (non-blocking)
                await client.workflow.start('orchestratorWorkflow', {
                    taskQueue: 'flowmaestro-orchestrator',
                    workflowId,
                    args: [{
                        executionId: execution.id,
                        workflowDefinition: backendWorkflowDefinition,
                        inputs,
                        userId
                    }],
                });

                fastify.log.info(`Started workflow execution ${execution.id} from trigger ${trigger.id}`);

                // Return immediately with execution ID
                return reply.send({
                    success: true,
                    data: {
                        executionId: execution.id,
                        workflowId: workflow.id,
                        triggerId: trigger.id,
                        status: execution.status,
                        inputs
                    }
                });
            } catch (error: any) {
                fastify.log.error(`Trigger execution failed: ${error.message}`);
                return reply.status(500).send({
                    success: false,
                    error: error.message || 'Trigger execution failed'
                });
            }
        }
    );
}
