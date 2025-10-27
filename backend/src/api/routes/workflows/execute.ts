import { FastifyInstance } from "fastify";
import { getTemporalClient } from "../../../temporal/client";
import { authMiddleware } from "../../middleware";

interface ExecuteWorkflowBody {
    workflowDefinition: {
        nodes: any[];
        edges: any[];
    };
    inputs?: Record<string, any>;
}

export async function executeWorkflowRoute(fastify: FastifyInstance) {
    fastify.post(
        "/execute",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const body = request.body as ExecuteWorkflowBody;

            if (!body.workflowDefinition || !body.workflowDefinition.nodes) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid workflow definition"
                });
            }

            try {
                const client = await getTemporalClient();

                // Generate unique workflow ID
                const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // Start the workflow
                const handle = await client.workflow.start('orchestratorWorkflow', {
                    taskQueue: 'flowmaestro-orchestrator',
                    workflowId,
                    args: [{
                        workflowDefinition: body.workflowDefinition,
                        inputs: body.inputs || {}
                    }],
                });

                fastify.log.info(`Started workflow ${workflowId}`);

                // Wait for the workflow to complete (with timeout)
                const result = await handle.result();

                return reply.send({
                    success: true,
                    data: {
                        workflowId,
                        result
                    }
                });
            } catch (error: any) {
                fastify.log.error(`Workflow execution failed: ${error.message}`);
                return reply.status(500).send({
                    success: false,
                    error: error.message || 'Workflow execution failed'
                });
            }
        }
    );
}
