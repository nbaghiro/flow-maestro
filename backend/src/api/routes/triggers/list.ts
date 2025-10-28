import { FastifyInstance } from "fastify";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { authMiddleware } from "../../middleware";

export async function listTriggersRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const triggerRepo = new TriggerRepository();
            const query = request.query as any;

            try {
                // Get triggers for a specific workflow if workflowId provided
                if (query.workflowId) {
                    const triggers = await triggerRepo.findByWorkflowId(query.workflowId);
                    return reply.send({
                        success: true,
                        data: triggers
                    });
                }

                // Get triggers by type if specified
                if (query.type) {
                    const triggers = await triggerRepo.findByType(
                        query.type,
                        query.enabled !== undefined ? query.enabled === 'true' : undefined
                    );
                    return reply.send({
                        success: true,
                        data: triggers
                    });
                }

                // Default: return all scheduled triggers
                const triggers = await triggerRepo.findScheduledTriggersToProcess();
                return reply.send({
                    success: true,
                    data: triggers
                });
            } catch (error) {
                console.error('Error listing triggers:', error);
                return reply.status(500).send({
                    success: false,
                    error: String(error)
                });
            }
        }
    );
}
