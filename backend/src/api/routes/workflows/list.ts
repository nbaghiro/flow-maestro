import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateQuery } from "../../middleware";
import { listWorkflowsQuerySchema } from "../../schemas/workflow-schemas";

export async function listWorkflowsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware, validateQuery(listWorkflowsQuerySchema)]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const query = request.query as { limit?: number; offset?: number };

            const { workflows, total } = await workflowRepository.findByUserId(request.user!.id, {
                limit: query.limit || 50,
                offset: query.offset || 0
            });

            const limit = query.limit || 50;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const pageSize = limit;
            const hasMore = offset + workflows.length < total;

            return reply.send({
                success: true,
                data: {
                    items: workflows,
                    total,
                    page,
                    pageSize,
                    hasMore
                }
            });
        }
    );
}
