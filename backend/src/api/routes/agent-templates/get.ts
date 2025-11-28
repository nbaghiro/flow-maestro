import { FastifyInstance } from "fastify";
import { AgentTemplateRepository } from "../../../storage/repositories";
import { validateParams } from "../../middleware";
import { NotFoundError } from "../../middleware/error-handler";
import {
    agentTemplateIdParamSchema,
    AgentTemplateIdParam
} from "../../schemas/agent-template-schemas";

export async function getAgentTemplateRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [validateParams(agentTemplateIdParamSchema)]
        },
        async (request, reply) => {
            const agentTemplateRepository = new AgentTemplateRepository();
            const { id } = request.params as AgentTemplateIdParam;

            const template = await agentTemplateRepository.findById(id);

            if (!template) {
                throw new NotFoundError("Agent template not found");
            }

            // Increment view count in background (don't wait for it)
            agentTemplateRepository.incrementViewCount(id).catch(() => {
                // Silently ignore view count increment failures
            });

            return reply.send({
                success: true,
                data: template
            });
        }
    );
}
