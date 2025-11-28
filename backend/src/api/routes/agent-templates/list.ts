import { FastifyInstance } from "fastify";
import { AgentTemplateCategory } from "../../../storage/models/AgentTemplate";
import { AgentTemplateRepository } from "../../../storage/repositories";
import { validateQuery } from "../../middleware";
import {
    listAgentTemplatesQuerySchema,
    ListAgentTemplatesQuery
} from "../../schemas/agent-template-schemas";

export async function listAgentTemplatesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [validateQuery(listAgentTemplatesQuerySchema)]
        },
        async (request, reply) => {
            const agentTemplateRepository = new AgentTemplateRepository();
            const query = request.query as ListAgentTemplatesQuery;

            const { templates, total } = await agentTemplateRepository.findAll({
                category: query.category as AgentTemplateCategory | undefined,
                tags: query.tags,
                featured: query.featured,
                search: query.search,
                status: query.status || "active",
                limit: query.limit || 20,
                offset: query.offset || 0
            });

            const limit = query.limit || 20;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const pageSize = limit;
            const hasMore = offset + templates.length < total;

            return reply.send({
                success: true,
                data: {
                    items: templates,
                    total,
                    page,
                    pageSize,
                    hasMore
                }
            });
        }
    );
}
