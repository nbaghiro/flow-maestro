import { FastifyInstance } from "fastify";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateQuery } from "../../middleware";
import { listExecutionsQuerySchema, ListExecutionsQuery } from "../../schemas/execution-schemas";

export async function listExecutionsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware, validateQuery(listExecutionsQuerySchema)]
        },
        async (request, reply) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const query = request.query as ListExecutionsQuery;

            let executions;
            let total;

            // If workflowId is provided, filter by workflow
            if (query.workflowId) {
                // Verify user owns this workflow
                const workflow = await workflowRepository.findById(query.workflowId);
                if (!workflow || workflow.user_id !== request.user!.id) {
                    return reply.send({
                        success: true,
                        data: {
                            items: [],
                            total: 0,
                            page: 1,
                            pageSize: query.limit || 50,
                            hasMore: false
                        }
                    });
                }

                const result = await executionRepository.findByWorkflowId(query.workflowId, {
                    limit: query.limit || 50,
                    offset: query.offset || 0
                });
                executions = result.executions;
                total = result.total;
            } else {
                // List all executions (would need to filter by user's workflows)
                const result = await executionRepository.findAll({
                    status: query.status,
                    limit: query.limit || 50,
                    offset: query.offset || 0
                });
                executions = result.executions;
                total = result.total;

                // Filter to only include user's workflows
                const workflowIds = [...new Set(executions.map((e) => e.workflow_id))];
                const workflows = await Promise.all(
                    workflowIds.map((id) => workflowRepository.findById(id))
                );
                const userWorkflowIds = new Set(
                    workflows.filter((w) => w && w.user_id === request.user!.id).map((w) => w!.id)
                );
                executions = executions.filter((e) => userWorkflowIds.has(e.workflow_id));
            }

            const limit = query.limit || 50;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const pageSize = limit;
            const hasMore = offset + executions.length < total;

            return reply.send({
                success: true,
                data: {
                    items: executions,
                    total,
                    page,
                    pageSize,
                    hasMore
                }
            });
        }
    );
}
