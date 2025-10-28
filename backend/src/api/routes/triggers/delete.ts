import { FastifyInstance } from "fastify";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { SchedulerService } from "../../../temporal/services/SchedulerService";
import { authMiddleware } from "../../middleware";

export async function deleteTriggerRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const triggerRepo = new TriggerRepository();
            const { id } = request.params as any;

            try {
                const trigger = await triggerRepo.findById(id);
                if (!trigger) {
                    return reply.status(404).send({
                        success: false,
                        error: "Trigger not found"
                    });
                }

                // If it's a schedule trigger, delete from Temporal
                if (trigger.trigger_type === 'schedule') {
                    const schedulerService = new SchedulerService();
                    await schedulerService.deleteScheduledTrigger(id);
                }

                // Soft delete trigger
                await triggerRepo.delete(id);

                return reply.send({
                    success: true,
                    message: "Trigger deleted"
                });
            } catch (error) {
                console.error('Error deleting trigger:', error);
                return reply.status(500).send({
                    success: false,
                    error: String(error)
                });
            }
        }
    );
}
