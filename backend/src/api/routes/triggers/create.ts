import { FastifyInstance } from "fastify";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { SchedulerService } from "../../../temporal/services/SchedulerService";
import { authMiddleware } from "../../middleware";
import { TriggerType, ScheduleTriggerConfig } from "../../../storage/models/Trigger";

export async function createTriggerRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const triggerRepo = new TriggerRepository();
            const body = request.body as any;

            try {
                // Create trigger in database
                const trigger = await triggerRepo.create({
                    workflow_id: body.workflowId,
                    name: body.name,
                    trigger_type: body.triggerType as TriggerType,
                    config: body.config,
                    enabled: body.enabled !== undefined ? body.enabled : true
                });

                // If it's a schedule trigger, register with Temporal
                if (trigger.trigger_type === 'schedule') {
                    const schedulerService = new SchedulerService();
                    await schedulerService.createScheduledTrigger(
                        trigger.id,
                        trigger.workflow_id,
                        trigger.config as ScheduleTriggerConfig
                    );
                }

                return reply.status(201).send({
                    success: true,
                    data: trigger
                });
            } catch (error) {
                console.error('Error creating trigger:', error);
                return reply.status(500).send({
                    success: false,
                    error: String(error)
                });
            }
        }
    );
}
