import { FastifyInstance } from "fastify";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateParams, validateQuery, NotFoundError } from "../../middleware";
import { executionIdParamSchema, getLogsQuerySchema } from "../../schemas/execution-schemas";

interface GetLogsParams {
    id: string;
}

interface GetLogsQuery {
    limit?: number;
    offset?: number;
    level?: string;
    nodeId?: string;
}

export async function getExecutionLogsRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: GetLogsParams; Querystring: GetLogsQuery }>(
        "/:id/logs",
        {
            preHandler: [
                authMiddleware,
                validateParams(executionIdParamSchema),
                validateQuery(getLogsQuerySchema)
            ]
        },
        async (request, reply) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params;
            const query = request.query;

            const execution = await executionRepository.findById(id);

            if (!execution) {
                throw new NotFoundError("Execution not found");
            }

            // Check if user owns the workflow
            const workflow = await workflowRepository.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== request.user!.id) {
                throw new NotFoundError("Execution not found");
            }

            const { logs, total } = await executionRepository.getLogs(id, {
                limit: query.limit || 100,
                offset: query.offset || 0,
                level: query.level,
                nodeId: query.nodeId
            });

            const limit = query.limit || 100;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const pageSize = limit;
            const hasMore = offset + logs.length < total;

            return reply.send({
                success: true,
                data: {
                    items: logs,
                    total,
                    page,
                    pageSize,
                    hasMore
                }
            });
        }
    );
}
